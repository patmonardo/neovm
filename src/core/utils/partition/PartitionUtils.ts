import { BitUtil } from '@/mem';
import { BitSet } from '@/collections';
import { HugeLongArray } from '@/collections';
import { ParallelUtil } from '@/concurrency';
import { Concurrency } from '@/concurrency';
import { Graph } from '@/api';
import { SetBitsIterable } from '../SetBitsIterable';
import { Partition } from './Partition';
import { DegreePartition } from './DegreePartition';
import { IteratorPartition } from './IteratorPartition';

/**
 * High-performance graph partitioning utilities with proper TypeScript overloads.
 *
 * **Key Algorithms**:
 * - Range partitioning: Simple node ID-based splits
 * - Degree partitioning: Relationship-aware load balancing
 * - Number-aligned partitioning: Memory-efficient page boundaries
 * - Block-aligned partitioning: Cache-friendly access patterns
 */
export class PartitionUtils {
  private static readonly MIN_PARTITION_CAPACITY = 0.67;

  private constructor() {}

  // ============================================================================
  // RANGE PARTITIONING OVERLOADS
  // ============================================================================

  /**
   * Creates range partitions based on node count and concurrency.
   */
  public static rangePartition<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    taskCreator: (partition: Partition) => TASK,
    minBatchSize?: number
  ): TASK[] {
    const batchSize = ParallelUtil.adjustedBatchSize(
      nodeCount,
      concurrency,
      minBatchSize ?? ParallelUtil.DEFAULT_BATCH_SIZE
    );
    return this.rangePartitionWithBatchSize(nodeCount, batchSize, taskCreator);
  }

  /**
   * Creates range partitions with a specified batch size.
   */
  public static rangePartitionWithBatchSize<TASK>(
    nodeCount: number,
    batchSize: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[] {
    return this.tasks(nodeCount, batchSize, taskCreator);
  }

  // ============================================================================
  // NUMBER-ALIGNED PARTITIONING OVERLOADS (Java Pattern)
  // ============================================================================

  /**
   * Java overload: numberAlignedPartitioning(Concurrency, long, long) → List<Partition>
   */
  public static numberAlignedPartitioning(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number
  ): Partition[];

  /**
   * Java overload: numberAlignedPartitioning(Concurrency, long, long, Function) → List<TASK>
   */
  public static numberAlignedPartitioning<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[];

  /**
   * Implementation for both overloads
   */
  public static numberAlignedPartitioning<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    taskCreator?: (partition: Partition) => TASK
  ): Partition[] | TASK[] {
    // Default identity function for Partition return
    const creator = taskCreator ?? ((p: Partition) => p as any);

    return this.numberAlignedPartitioningWithMaxSize(
      concurrency,
      nodeCount,
      alignTo,
      Number.MAX_SAFE_INTEGER,
      creator
    );
  }

  /**
   * Java overload: numberAlignedPartitioningWithMaxSize(Concurrency, long, long, long) → List<Partition>
   */
  public static numberAlignedPartitioningWithMaxSize(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    maxPartitionSize: number
  ): Partition[];

  /**
   * Java overload: numberAlignedPartitioningWithMaxSize(Concurrency, long, long, long, Function) → List<TASK>
   */
  public static numberAlignedPartitioningWithMaxSize<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    maxPartitionSize: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[];

  /**
   * Implementation for both overloads
   */
  public static numberAlignedPartitioningWithMaxSize<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    maxPartitionSize: number,
    taskCreator?: (partition: Partition) => TASK
  ): Partition[] | TASK[] {
    if (maxPartitionSize < alignTo) {
      throw new Error(
        `Maximum size of a partition must be at least as much as its desired alignment ` +
        `but got align=${alignTo} and maxPartitionSize=${maxPartitionSize}`
      );
    }

    const initialBatchSize = ParallelUtil.adjustedBatchSize(nodeCount, concurrency, alignTo);
    const remainder = initialBatchSize % alignTo;
    let adjustedBatchSize = remainder === 0 ? initialBatchSize : initialBatchSize + (alignTo - remainder);

    if (adjustedBatchSize > maxPartitionSize) {
      const overflow = maxPartitionSize % alignTo;
      adjustedBatchSize = maxPartitionSize - overflow;
    }

    // Default identity function for Partition return
    const creator = taskCreator ?? ((p: Partition) => p as any);
    return this.tasks(nodeCount, adjustedBatchSize, creator);
  }

  // ============================================================================
  // DEGREE PARTITIONING OVERLOADS (Complex Java Pattern)
  // ============================================================================

  /**
   * Java overload: degreePartition(Graph, Concurrency, Function, Optional<Integer>) → List<TASK>
   */
  public static degreePartition<TASK>(
    graph: Graph,
    concurrency: Concurrency,
    taskCreator: (partition: DegreePartition) => TASK,
    minBatchSize?: number
  ): TASK[];

  /**
   * Java overload: degreePartition(long, long, DegreeFunction, Concurrency, Function, Optional<Integer>) → List<TASK>
   */
  public static degreePartition<TASK>(
    nodeCount: number,
    relationshipCount: number,
    degrees: DegreeFunction,
    concurrency: Concurrency,
    taskCreator: (partition: DegreePartition) => TASK,
    minBatchSize?: number
  ): TASK[];

  /**
   * Implementation for both degree partition overloads
   */
  public static degreePartition<TASK>(
    graphOrNodeCount: Graph | number,
    concurrencyOrRelationshipCount: Concurrency | number,
    taskCreatorOrDegrees: ((partition: DegreePartition) => TASK) | DegreeFunction,
    minBatchSizeOrConcurrency?: number | Concurrency,
    taskCreator?: (partition: DegreePartition) => TASK,
    minBatchSize?: number
  ): TASK[] {
    // Type guard to determine which overload was called
    if (typeof graphOrNodeCount === 'object' && 'nodeCount' in graphOrNodeCount) {
      // First overload: (Graph, Concurrency, Function, Optional<Integer>)
      const graph = graphOrNodeCount as Graph;
      const concurrency = concurrencyOrRelationshipCount as Concurrency;
      const creator = taskCreatorOrDegrees as (partition: DegreePartition) => TASK;
      const minBatch = minBatchSizeOrConcurrency as number | undefined;

      if (concurrency.value() === 1) {
        return [creator(new DegreePartition(0, graph.nodeCount(), graph.relationshipCount()))];
      }

      const batchSize = Math.max(
        minBatch ?? ParallelUtil.DEFAULT_BATCH_SIZE,
        BitUtil.ceilDiv(graph.relationshipCount(), concurrency.value())
      );

      return this.degreePartitionWithBatchSize(
        graph.nodeCount(),
        (node: number) => graph.degree(node),
        batchSize,
        creator
      );
    } else {
      // Second overload: (long, long, DegreeFunction, Concurrency, Function, Optional<Integer>)
      const nodeCount = graphOrNodeCount as number;
      const relationshipCount = concurrencyOrRelationshipCount as number;
      const degrees = taskCreatorOrDegrees as DegreeFunction;
      const concurrency = minBatchSizeOrConcurrency as Concurrency;
      const creator = taskCreator!;
      const minBatch = minBatchSize;

      if (concurrency.value() === 1) {
        return [creator(new DegreePartition(0, nodeCount, relationshipCount))];
      }

      const batchSize = Math.max(
        minBatch ?? ParallelUtil.DEFAULT_BATCH_SIZE,
        BitUtil.ceilDiv(relationshipCount, concurrency.value())
      );

      return this.degreePartitionWithBatchSize(nodeCount, degrees, batchSize, creator);
    }
  }

  // ============================================================================
  // DEGREE PARTITION WITH BATCH SIZE OVERLOADS
  // ============================================================================

  /**
   * Java overload: degreePartitionWithBatchSize(Graph, long, Function) → List<TASK>
   */
  public static degreePartitionWithBatchSize<TASK>(
    graph: Graph,
    batchSize: number,
    taskCreator: (partition: DegreePartition) => TASK
  ): TASK[];

  /**
   * Java overload: degreePartitionWithBatchSize(long, DegreeFunction, long, Function) → List<TASK>
   */
  public static degreePartitionWithBatchSize<TASK>(
    nodeCount: number,
    degrees: DegreeFunction,
    batchSize: number,
    taskCreator: (partition: DegreePartition) => TASK
  ): TASK[];

  /**
   * Java overload: degreePartitionWithBatchSize(BitSet, DegreeFunction, long, Function) → List<TASK>
   */
  public static degreePartitionWithBatchSize<TASK>(
    bitset: BitSet,
    degrees: DegreeFunction,
    degreesPerBatch: number,
    taskCreator: (partition: IteratorPartition) => TASK
  ): TASK[];

  /**
   * Implementation for all degree partition with batch size overloads
   */
  public static degreePartitionWithBatchSize<TASK>(
    graphOrNodeCountOrBitset: Graph | number | BitSet,
    degreesOrBatchSize: DegreeFunction | number,
    batchSizeOrDegreesPerBatch: number,
    taskCreator: ((partition: DegreePartition) => TASK) | ((partition: IteratorPartition) => TASK)
  ): TASK[] {
    // Type guards to determine which overload
    if (typeof graphOrNodeCountOrBitset === 'object' && 'nodeCount' in graphOrNodeCountOrBitset) {
      // First overload: (Graph, long, Function)
      const graph = graphOrNodeCountOrBitset as Graph;
      const batchSize = degreesOrBatchSize as number;
      const creator = taskCreator as (partition: DegreePartition) => TASK;

      return this.degreePartitionWithBatchSizeCore(
        graph.nodeCount(),
        (node: number) => graph.degree(node),
        batchSize,
        creator
      );
    } else if (typeof graphOrNodeCountOrBitset === 'number') {
      // Second overload: (long, DegreeFunction, long, Function)
      const nodeCount = graphOrNodeCountOrBitset as number;
      const degrees = degreesOrBatchSize as DegreeFunction;
      const batchSize = batchSizeOrDegreesPerBatch;
      const creator = taskCreator as (partition: DegreePartition) => TASK;

      return this.degreePartitionWithBatchSizeCore(nodeCount, degrees, batchSize, creator);
    } else {
      // Third overload: (BitSet, DegreeFunction, long, Function)
      const bitset = graphOrNodeCountOrBitset as BitSet;
      const degrees = degreesOrBatchSize as DegreeFunction;
      const degreesPerBatch = batchSizeOrDegreesPerBatch;
      const creator = taskCreator as (partition: IteratorPartition) => TASK;

      return this.degreePartitionWithBatchSizeBitSet(bitset, degrees, degreesPerBatch, creator);
    }
  }

  // ============================================================================
  // CORE IMPLEMENTATION METHODS
  // ============================================================================

  /**
   * Core degree partitioning algorithm
   */
  private static degreePartitionWithBatchSizeCore<TASK>(
    nodeCount: number,
    degrees: DegreeFunction,
    batchSize: number,
    taskCreator: (partition: DegreePartition) => TASK
  ): TASK[] {
    const partitions: DegreePartition[] = [];
    let start = 0;

    console.assert(batchSize > 0, "Batch size must be positive");

    const minPartitionSize = Math.round(batchSize * this.MIN_PARTITION_CAPACITY);

    while (start < nodeCount) {
      let partitionSize = 0;
      let nodeId = start - 1;

      // Find the next partition boundary
      while (nodeId < nodeCount - 1 && nodeId - start < Partition.MAX_NODE_COUNT) {
        const degree = degrees(nodeId + 1);
        const partitionIsLargeEnough = partitionSize >= minPartitionSize;

        if (partitionSize + degree > batchSize && partitionIsLargeEnough) {
          break;
        }

        nodeId++;
        partitionSize += degree;
      }

      const end = nodeId + 1;
      partitions.push(DegreePartition.of(start, end - start, partitionSize));
      start = end;
    }

    // Merge small last partition with previous one
    const minLastPartitionSize = Math.round(0.2 * batchSize);
    if (partitions.length > 1 && partitions[partitions.length - 1].relationshipCount() < minLastPartitionSize) {
      const lastPartition = partitions.pop()!;
      const partitionToMerge = partitions.pop()!;

      const mergedPartition = DegreePartition.of(
        partitionToMerge.startNode(),
        lastPartition.nodeCount() + partitionToMerge.nodeCount(),
        partitionToMerge.relationshipCount() + lastPartition.relationshipCount()
      );

      partitions.push(mergedPartition);
    }

    return partitions.map(taskCreator);
  }

  /**
   * BitSet-based degree partitioning
   */
  private static degreePartitionWithBatchSizeBitSet<TASK>(
    bitset: BitSet,
    degrees: DegreeFunction,
    degreesPerBatch: number,
    taskCreator: (partition: IteratorPartition) => TASK
  ): TASK[] {
    console.assert(degreesPerBatch > 0, "Degrees per batch must be positive");

    const iterator = bitset.iterator();
    const totalSize = bitset.cardinality();
    const result: TASK[] = [];
    let seen = 0;

    while (seen < totalSize) {
      let setBit = iterator.nextSetBit();
      let currentDegrees = degrees(setBit);
      let currentLength = 1;
      const startIdx = setBit;
      seen++;

      while (seen < totalSize && currentDegrees < degreesPerBatch && currentLength < Partition.MAX_NODE_COUNT) {
        setBit = iterator.nextSetBit();
        currentDegrees += degrees(setBit);
        currentLength++;
        seen++;
      }

      const iteratorPartition = new IteratorPartition(
        new SetBitsIterable(bitset, startIdx).iterator(),
        currentLength
      );

      result.push(taskCreator(iteratorPartition));
    }

    return result;
  }

  // ============================================================================
  // ADDITIONAL METHODS
  // ============================================================================

  /**
   * Custom degree partitioning with batch size
   */
  public static customDegreePartitionWithBatchSize<TASK>(
    graph: Graph,
    concurrency: Concurrency,
    customDegreeFunction: (nodeId: number) => number,
    taskCreator: (partition: DegreePartition) => TASK,
    minBatchSize?: number,
    weightSum?: number
  ): TASK[] {
    const actualWeightSum = weightSum ?? this.calculateTotalWeight(graph.nodeCount(), customDegreeFunction);

    const batchSize = Math.max(
      minBatchSize ?? ParallelUtil.DEFAULT_BATCH_SIZE,
      BitUtil.ceilDiv(actualWeightSum, concurrency.value())
    );

    return this.degreePartitionWithBatchSizeCore(graph.nodeCount(), customDegreeFunction, batchSize, taskCreator);
  }

  /**
   * Stream of degree partitions (returns array in TypeScript)
   */
  public static degreePartitionStream(
    nodeCount: number,
    relationshipCount: number,
    concurrency: Concurrency,
    degrees: DegreeFunction
  ): DegreePartition[] {
    if (concurrency.value() === 1) {
      return [new DegreePartition(0, nodeCount, relationshipCount)];
    }

    const batchSize = BitUtil.ceilDiv(relationshipCount, concurrency.value());
    return this.degreePartitionWithBatchSizeCore(nodeCount, degrees, batchSize, p => p);
  }

  /**
   * Range partition actual batch sizes
   */
  public static rangePartitionActualBatchSizes(
    concurrency: Concurrency,
    nodeCount: number,
    minBatchSize?: number
  ): number[] {
    const batchSize = ParallelUtil.adjustedBatchSize(
      nodeCount,
      concurrency,
      minBatchSize ?? ParallelUtil.DEFAULT_BATCH_SIZE
    );

    const batchSizes: number[] = [];
    for (let i = 0; i < nodeCount; i += batchSize) {
      batchSizes.push(this.actualBatchSize(i, batchSize, nodeCount));
    }

    return batchSizes;
  }

  /**
   * Block-aligned partitioning iterator
   */
  public static blockAlignedPartitioning<TASK>(
    sortedIds: HugeLongArray,
    blockShift: number,
    taskCreator: (partition: Partition) => TASK
  ): Iterator<TASK> {
    return new BlockAlignedPartitionIterator<TASK>(sortedIds, blockShift, taskCreator);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private static tasks<TASK>(
    nodeCount: number,
    batchSize: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[] {
    const expectedCapacity = BitUtil.ceilDiv(nodeCount, batchSize);
    const result: TASK[] = [];

    for (let i = 0; i < nodeCount; i += batchSize) {
      result.push(taskCreator(Partition.of(i, this.actualBatchSize(i, batchSize, nodeCount))));
    }

    return result;
  }

  private static actualBatchSize(startNode: number, batchSize: number, nodeCount: number): number {
    return startNode + batchSize < nodeCount ? batchSize : nodeCount - startNode;
  }

  private static calculateTotalWeight(nodeCount: number, degreeFunction: (nodeId: number) => number): number {
    let sum = 0;
    for (let i = 0; i < nodeCount; i++) {
      sum += degreeFunction(i);
    }
    return sum;
  }
}

// ============================================================================
// SUPPORTING TYPES AND CLASSES
// ============================================================================

/**
 * Function interface for getting node degrees
 */
export interface DegreeFunction {
  (node: number): number;
}

/**
 * Block-aligned partition iterator
 */
class BlockAlignedPartitionIterator<TASK> implements Iterator<TASK> {
  private cursor: HugeLongArray.Cursor;
  private readonly size: number;
  private readonly blockShift: number;
  private readonly taskCreator: (partition: Partition) => TASK;

  private prevBlockId: number;
  private blockStart: number;
  private done: boolean;
  private lastIndex: number;

  constructor(
    sortedIds: HugeLongArray,
    blockShift: number,
    taskCreator: (partition: Partition) => TASK
  ) {
    this.size = sortedIds.size();
    this.blockShift = blockShift;
    this.taskCreator = taskCreator;
    this.cursor = sortedIds.initCursor(sortedIds.newCursor());
    this.prevBlockId = 0;
    this.blockStart = 0;
    this.done = false;
    this.lastIndex = Number.MAX_SAFE_INTEGER;
  }

  public next(): IteratorResult<TASK> {
    if (this.done) {
      return { done: true, value: undefined };
    }

    const base = this.cursor.base;
    const limit = this.cursor.limit;
    const array = this.cursor.array;
    let prevBlockId = this.prevBlockId;
    const blockShift = this.blockShift;

    for (let i = this.lastIndex; i < limit; i++) {
      const originalId = array[i];
      const blockId = (originalId >>> blockShift);

      if (blockId !== prevBlockId) {
        const internalId = base + i;
        prevBlockId = blockId;

        if (internalId > 0) {
          const partition = Partition.of(this.blockStart, internalId - this.blockStart);
          this.blockStart = internalId;
          this.prevBlockId = prevBlockId;
          this.lastIndex = i;
          return { done: false, value: this.taskCreator(partition) };
        }
      }
    }

    if (this.cursor.next()) {
      this.prevBlockId = prevBlockId;
      this.lastIndex = this.cursor.offset;
      return this.next();
    }

    const partition = Partition.of(this.blockStart, this.size - this.blockStart);
    this.done = true;

    return { done: false, value: this.taskCreator(partition) };
  }
}
