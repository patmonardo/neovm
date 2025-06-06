import { ArrayUtil } from '@/collections/ArrayUtil';
import { DrainingIterator } from '@/collections/DrainingIterator';
import { HugeSparseCollections } from '@/collections';
import { HugeSparseByteArrayList } from '@/collections/hsl/HugeSparseByteArrayList';
import { HugeSparseIntList } from '@/collections/hsl/HugeSparseIntList';
import { HugeSparseLongArrayList } from '@/collections/hsl/HugeSparseLongArrayList';
import { HugeSparseLongList } from '@/collections/hsl/HugeSparseLongList';
import { VarLongEncoding } from '@/core/compression/common/VarLongEncoding';
import { AdjacencyPreAggregation } from '@/core/loading/AdjacencyPreAggregation';
import { MemoryEstimation, MemoryEstimations } from '@/mem';
import { MemoryRange } from '@/mem/MemoryRange';
import { BitUtil } from '@/mem/BitUtil';
import { Estimate } from '@/mem/Estimate';
import { formatWithLocale } from '@/utils/StringFormatting';

/**
 * Highly optimized compressed storage for graph adjacency lists.
 *
 * ChunkedAdjacencyLists provides memory-efficient storage of graph relationships
 * using advanced compression techniques:
 *
 * 1. Delta encoding: Stores differences between consecutive node IDs
 * 2. Zigzag encoding: Maps signed values to unsigned values for better compression
 * 3. Variable-length encoding: Uses fewer bytes for smaller values
 *
 * This implementation can drastically reduce memory requirements for large graphs,
 * sometimes achieving up to 70-80% memory reduction compared to uncompressed formats.
 * It's a critical component for loading large-scale graphs efficiently.
 */
export class ChunkedAdjacencyLists {
    private static readonly EMPTY_BYTES = new Uint8Array(0);
    private static readonly EMPTY_PROPERTIES = new BigInt64Array(0);

    /**
     * Compressed adjacency list targets (node IDs) stored as byte arrays
     */
    private readonly targetLists: HugeSparseByteArrayList;

    /**
     * Relationship properties storage (multiple property values per relationship)
     */
    private readonly properties: HugeSparseLongArrayList[] | null;

    /**
     * Current positions within each compressed adjacency list
     */
    private readonly positions: HugeSparseIntList;

    /**
     * Last value seen for each node (for delta encoding)
     */
    private readonly lastValues: HugeSparseLongList;

    /**
     * Lengths of each adjacency list (number of relationships per node)
     */
    private readonly lengths: HugeSparseIntList;

    /**
     * Estimates memory requirements for storing adjacency lists.
     *
     * @param avgDegree Average number of relationships per node
     * @param nodeCount Total number of nodes in the graph
     * @param propertyCount Number of relationship properties
     * @returns Memory estimation with best and worst cases
     */
    public static memoryEstimation(avgDegree: number, nodeCount: number, propertyCount: number): MemoryEstimation {
        // Best case scenario:
        // Difference between node identifiers in each adjacency list is 1.
        // This leads to ideal compression through delta encoding.
        const deltaBestCase = 1;
        const bestCaseCompressedTargetsSize = this.compressedTargetSize(avgDegree, nodeCount, deltaBestCase);

        // Worst case scenario:
        // Relationships are equally distributed across nodes, i.e. each node has the same number of rels.
        // Within each adjacency list, all identifiers have the highest possible difference between each other.
        // Highest possible difference is the number of nodes divided by the average degree.
        const deltaWorstCase = (avgDegree > 0) ? BitUtil.ceilDiv(nodeCount, avgDegree) : 0;
        const worstCaseCompressedTargetsSize = this.compressedTargetSize(avgDegree, nodeCount, deltaWorstCase);

        return MemoryEstimations.builder(ChunkedAdjacencyLists.name)
            .fixed("compressed targets", MemoryRange.of(bestCaseCompressedTargetsSize, worstCaseCompressedTargetsSize))
            .fixed("positions", HugeSparseCollections.estimateInt(nodeCount, nodeCount))
            .fixed("lengths", HugeSparseCollections.estimateInt(nodeCount, nodeCount))
            .fixed("lastValues", HugeSparseCollections.estimateLong(nodeCount, nodeCount))
            .fixed(
                "properties",
                HugeSparseCollections.estimateLongArray(nodeCount, nodeCount, avgDegree).times(propertyCount)
            )
            .build();
    }

    /**
     * Estimates the size of compressed target storage based on graph characteristics.
     */
    private static compressedTargetSize(avgDegree: number, nodeCount: number, delta: number): number {
        const firstAdjacencyIdAvgByteSize = (avgDegree > 0) ?
            BitUtil.ceilDiv(VarLongEncoding.encodedVLongSize(nodeCount), 2) : 0;
        const relationshipByteSize = VarLongEncoding.encodedVLongSize(delta);
        const compressedAdjacencyByteSize = relationshipByteSize * Math.max(0, (avgDegree - 1));
        return nodeCount * Estimate.sizeOfByteArray(firstAdjacencyIdAvgByteSize + compressedAdjacencyByteSize);
    }

    /**
     * Creates a new ChunkedAdjacencyLists instance
     *
     * @param numberOfProperties Number of relationship properties to store
     * @param initialCapacity Initial capacity for the data structures
     * @returns A new ChunkedAdjacencyLists instance
     */
    public static of(numberOfProperties: number, initialCapacity: number): ChunkedAdjacencyLists {
        return new ChunkedAdjacencyLists(numberOfProperties, initialCapacity);
    }

    /**
     * Constructor
     */
    private constructor(numberOfProperties: number, initialCapacity: number) {
        this.targetLists = HugeSparseByteArrayList.of(ChunkedAdjacencyLists.EMPTY_BYTES, initialCapacity);
        this.positions = HugeSparseIntList.of(0, initialCapacity);
        this.lastValues = HugeSparseLongList.of(0, initialCapacity);
        this.lengths = HugeSparseIntList.of(0, initialCapacity);

        if (numberOfProperties > 0) {
            this.properties = new Array(numberOfProperties);
            for (let i = 0; i < numberOfProperties; i++) {
                this.properties[i] = HugeSparseLongArrayList.of(ChunkedAdjacencyLists.EMPTY_PROPERTIES, initialCapacity);
            }
        } else {
            this.properties = null;
        }
    }

    /**
     * Adds target nodes to the adjacency list for a source node.
     * For memory efficiency, we reuse the `targets` array. It cannot be reused after calling this method.
     *
     * @param index Source node ID
     * @param targets Target node IDs to write
     * @param start Start index in targets array
     * @param end End index in targets array
     * @param valuesToAdd Number of values to actually add (due to pre-aggregation some may be ignored)
     */
    public add(
        index: number,
        targets: bigint[],
        start: number,
        end: number,
        valuesToAdd: number
    ): void {
        // Not inlined to avoid field access
        let currentLastValue = this.lastValues.get(index);
        let delta: bigint;
        let compressedValue: bigint;
        let requiredBytes = 0;

        for (let i = start; i < end; i++) {
            if (targets[i] === AdjacencyPreAggregation.IGNORE_VALUE) {
                continue;
            }
            delta = targets[i] - currentLastValue;
            compressedValue = VarLongEncoding.zigZag(delta);
            currentLastValue = targets[i];
            targets[i] = compressedValue;
            requiredBytes += VarLongEncoding.encodedVLongSize(Number(compressedValue));
        }

        const position = this.positions.get(index);
        const compressedTargets = this.ensureCompressedTargetsCapacity(index, position, requiredBytes);

        const newPosition = VarLongEncoding.encodeVLongs(targets, start, end, compressedTargets, position);

        this.positions.set(index, newPosition);
        this.lastValues.set(index, currentLastValue);
        this.lengths.addTo(index, valuesToAdd);
    }

    /**
     * Adds target nodes and their properties to the adjacency list for a source node.
     * For memory efficiency, we reuse the arrays. They cannot be reused after calling this method.
     *
     * @param index Source node ID
     * @param targets Target node IDs
     * @param allProperties Properties for each relationship
     * @param start Start index in targets and properties arrays
     * @param end End index in targets and properties arrays
     * @param targetsToAdd Number of targets to actually add
     */
    public add2(
        index: number,
        targets: bigint[],
        allProperties: bigint[][],
        start: number,
        end: number,
        targetsToAdd: number
    ): void {
        // Write properties
        for (let i = 0; i < allProperties.length; i++) {
            this.addProperties(index, targets, allProperties[i], start, end, i, targetsToAdd);
        }

        // Write target values
        this.add(index, targets, start, end, targetsToAdd);
    }

    /**
     * Adds property values for relationships.
     */
    private addProperties(
        index: number,
        targets: bigint[],
        properties: bigint[],
        start: number,
        end: number,
        propertyIndex: number,
        propertiesToAdd: number
    ): void {
        if (this.properties === null) {
            throw new Error("No properties storage initialized");
        }

        const length = this.lengths.get(index);
        const currentProperties = this.ensurePropertyCapacity(index, length, propertiesToAdd, propertyIndex);

        if (propertiesToAdd === end - start) {
            // Fast path: copy all properties
            for (let i = 0; i < propertiesToAdd; i++) {
                currentProperties[length + i] = properties[start + i];
            }
        } else {
            // Selective copy: only copy properties for non-ignored targets
            let writePos = length;
            for (let i = 0; i < (end - start); i++) {
                if (targets[start + i] !== AdjacencyPreAggregation.IGNORE_VALUE) {
                    currentProperties[writePos++] = properties[start + i];
                }
            }
        }
    }

    /**
     * Ensures that the compressed targets array has enough capacity.
     */
    private ensureCompressedTargetsCapacity(index: number, pos: number, required: number): Uint8Array {
        const targetLength = pos + required;
        let compressedTargets = this.targetLists.get(index);

        if (targetLength < 0) {
            throw new Error(
                formatWithLocale(
                    "Encountered numeric overflow in internal buffer. Was at position %d and needed to grow by %d.",
                    pos,
                    required
                )
            );
        } else if (compressedTargets.length <= targetLength) {
            const newLength = ChunkedAdjacencyLists.getNewLength(targetLength);
            compressedTargets = new Uint8Array(newLength);
            // Copy existing data
            compressedTargets.set(this.targetLists.get(index));
            this.targetLists.set(index, compressedTargets);
        }

        return compressedTargets;
    }

    /**
     * Ensures that the property arrays have enough capacity.
     */
    private ensurePropertyCapacity(
        index: number,
        pos: number,
        required: number,
        propertyIndex: number
    ): BigInt64Array {
        if (this.properties === null) {
            throw new Error("No properties storage initialized");
        }

        const targetLength = pos + required;
        let currentProperties = this.properties[propertyIndex].get(index);

        if (targetLength < 0) {
            throw new Error(
                formatWithLocale(
                    "Encountered numeric overflow in internal buffer. Was at position %d and needed to grow by %d.",
                    pos,
                    required
                )
            );
        } else if (currentProperties.length <= pos + required) {
            const newLength = ChunkedAdjacencyLists.getNewLength(pos + required);
            const newArray = new BigInt64Array(newLength);
            // Copy existing data
            newArray.set(currentProperties);
            currentProperties = newArray;
            this.properties[propertyIndex].set(index, currentProperties);
        }

        return currentProperties;
    }

    /**
     * Calculates a new length for growing arrays.
     */
    static getNewLength(minLength: number): number {
        let newLength = BitUtil.nextHighestPowerOfTwo(minLength);
        if (newLength < 0) {
            // If we overflow, we try to grow by ~1/8th and hope it's enough
            newLength = ArrayUtil.oversize(minLength, 8); // 8 bytes for BigInt64
        }
        if (newLength < 0) {
            throw new Error(
                formatWithLocale(
                    "Encountered numeric overflow in compressed buffer. Required a minimum length of %d.",
                    minLength
                )
            );
        }
        return newLength;
    }

    /**
     * Returns the capacity of the adjacency lists.
     */
    public capacity(): number {
        return this.targetLists.capacity();
    }

    /**
     * Checks if the given index contains an adjacency list.
     */
    public contains(index: number): boolean {
        return this.targetLists.contains(index);
    }

    /**
     * Processes all adjacency lists with the provided consumer.
     */
    public consume(consumer: ChunkedAdjacencyLists.Consumer): void {
        new CompositeDrainingIterator(
            this.targetLists,
            this.properties,
            this.positions,
            this.lastValues,
            this.lengths
        ).consume(consumer);
    }
}

/**
 * Namespace for related interfaces and classes
 */
export namespace ChunkedAdjacencyLists {
    /**
     * Consumer interface for processing compressed adjacency lists.
     */
    export interface Consumer {
        accept(
            sourceId: number,
            targets: Uint8Array,
            properties: BigInt64Array[],
            compressedByteSize: number,
            numberOfCompressedTargets: number
        ): void;
    }
}

/**
 * Helper class for draining and consuming the adjacency lists.
 */
class CompositeDrainingIterator {
    private readonly targetListIterator: DrainingIterator<Uint8Array[]>;
    private readonly targetListBatch: DrainingIterator.DrainingBatch<Uint8Array[]>;
    private readonly positionsListIterator: DrainingIterator<Int32Array>;
    private readonly positionsListBatch: DrainingIterator.DrainingBatch<Int32Array>;
    private readonly lastValuesListIterator: DrainingIterator<BigInt64Array>;
    private readonly lastValuesListBatch: DrainingIterator.DrainingBatch<BigInt64Array>;
    private readonly lengthsListIterator: DrainingIterator<Int32Array>;
    private readonly lengthsListBatch: DrainingIterator.DrainingBatch<Int32Array>;
    private readonly propertyIterators: DrainingIterator<BigInt64Array[]>[];
    private readonly propertyBatches: DrainingIterator.DrainingBatch<BigInt64Array[]>[];

    private readonly propertiesBuffer: BigInt64Array[] | null;

    constructor(
        targets: HugeSparseByteArrayList,
        properties: HugeSparseLongArrayList[] | null,
        positions: HugeSparseIntList,
        lastValues: HugeSparseLongList,
        lengths: HugeSparseIntList
    ) {
        this.targetListIterator = targets.drainingIterator();
        this.targetListBatch = this.targetListIterator.drainingBatch();
        this.positionsListIterator = positions.drainingIterator();
        this.positionsListBatch = this.positionsListIterator.drainingBatch();
        this.lastValuesListIterator = lastValues.drainingIterator();
        this.lastValuesListBatch = this.lastValuesListIterator.drainingBatch();
        this.lengthsListIterator = lengths.drainingIterator();
        this.lengthsListBatch = this.lengthsListIterator.drainingBatch();

        if (properties === null) {
            this.propertyIterators = [];
            this.propertyBatches = [];
            this.propertiesBuffer = null;
        } else {
            this.propertyIterators = properties.map(prop => prop.drainingIterator());
            this.propertyBatches = this.propertyIterators.map(iter => iter.drainingBatch());
            this.propertiesBuffer = new Array(properties.length) as BigInt64Array[];
        }
    }

    consume(consumer: ChunkedAdjacencyLists.Consumer): void {
        while (this.targetListIterator.next(this.targetListBatch)) {
            this.positionsListIterator.next(this.positionsListBatch);
            this.lastValuesListIterator.next(this.lastValuesListBatch);
            this.lengthsListIterator.next(this.lengthsListBatch);

            for (let i = 0; i < this.propertyIterators.length; i++) {
                this.propertyIterators[i].next(this.propertyBatches[i]);
            }

            const targetsPage = this.targetListBatch.page;
            const positionsPage = this.positionsListBatch.page;
            const lengthsPage = this.lengthsListBatch.page;

            const offset = this.targetListBatch.offset;

            for (let indexInPage = 0; indexInPage < targetsPage.length; indexInPage++) {
                const targets = targetsPage[indexInPage];
                if (targets.length === 0) {
                    continue;
                }

                const position = positionsPage[indexInPage];
                const length = lengthsPage[indexInPage];

                if (this.propertiesBuffer !== null) {
                    for (let propertyIndex = 0; propertyIndex < this.propertyBatches.length; propertyIndex++) {
                        const page = this.propertyBatches[propertyIndex].page;
                        this.propertiesBuffer[propertyIndex] = page[indexInPage];
                        // Make properties eligible for GC
                        page[indexInPage] = null as unknown as BigInt64Array;
                    }
                }

                // Make targets eligible for GC
                targetsPage[indexInPage] = null as unknown as Uint8Array;

                consumer.accept(
                    offset + indexInPage,
                    targets,
                    this.propertiesBuffer || [],
                    position,
                    length
                );
            }
        }
    }
}
