import {
  ArrayUtil,
  BitUtil,
  StringFormatting,
  AdjacencyPreAggregation,
  VarLongEncoding,
  MemoryEstimation,
  MemoryEstimations,
  MemoryRange,
  Estimate,
  HugeSparseCollections,
  HugeSparseByteArrayList,
  HugeSparseIntList,
  HugeSparseLongArrayList,
  HugeSparseLongList,
  DrainingIterator,
  DrainingBatch,
  ChunkedAdjacencyListsConsumer,
} from './chunkedAdjacencyListsTypes'; // Adjust path as needed

export class ChunkedAdjacencyLists {
  private static readonly EMPTY_BYTES = new Uint8Array(0);
  private static readonly EMPTY_PROPERTIES = new BigInt64Array(0); // Or number[]

  private readonly targetLists: HugeSparseByteArrayList;
  private readonly properties: HugeSparseLongArrayList[] | null; // Array of HSLAL
  private readonly positions: HugeSparseIntList;
  private readonly lastValues: HugeSparseLongList;
  private readonly lengths: HugeSparseIntList;

  public static memoryEstimation(avgDegree: number | number, nodeCount: number | number, propertyCount: number): MemoryEstimation {
    const avgDeg = BigInt(avgDegree);
    const nCount = BigInt(nodeCount);

    // Best case scenario
    const deltaBestCase = 1n;
    const bestCaseCompressedTargetsSize = ChunkedAdjacencyLists.compressedTargetSize(avgDeg, nCount, deltaBestCase);

    // Worst case scenario
    const deltaWorstCase = (avgDeg > 0n) ? BitUtil.ceilDiv(nCount, avgDeg) : 0n;
    const worstCaseCompressedTargetsSize = ChunkedAdjacencyLists.compressedTargetSize(avgDeg, nCount, deltaWorstCase);

    return MemoryEstimations.builder(ChunkedAdjacencyLists)
      .fixed("compressed targets", MemoryRange.of(bestCaseCompressedTargetsSize, worstCaseCompressedTargetsSize))
      .fixed("positions", HugeSparseCollections.estimateInt(nCount, nCount))
      .fixed("lengths", HugeSparseCollections.estimateInt(nCount, nCount))
      .fixed("lastValues", HugeSparseCollections.estimateLong(nCount, nCount))
      .fixed(
        "properties",
        HugeSparseCollections.estimateLongArray(nCount, nCount, Number(avgDeg)).times(propertyCount)
      )
      .build();
  }

  private static compressedTargetSize(avgDegree: number, nodeCount: number, delta: number): number {
    const firstAdjacencyIdAvgByteSize = (avgDegree > 0n)
      ? BitUtil.ceilDiv(BigInt(VarLongEncoding.encodedVLongSize(nodeCount)), 2n)
      : 0n;
    const relationshipByteSize = BigInt(VarLongEncoding.encodedVLongSize(delta));
    const compressedAdjacencyByteSize = relationshipByteSize * BigInt(Math.max(0, Number(avgDegree) - 1)); // Math.max needs number
    return nodeCount * Estimate.sizeOfByteArray(firstAdjacencyIdAvgByteSize + compressedAdjacencyByteSize);
  }

  public static of(numberOfProperties: number, initialCapacity: number | number): ChunkedAdjacencyLists {
    return new ChunkedAdjacencyLists(numberOfProperties, initialCapacity);
  }

  private constructor(numberOfProperties: number, initialCapacity: number | number) {
    this.targetLists = HugeSparseByteArrayList.of(ChunkedAdjacencyLists.EMPTY_BYTES, initialCapacity);
    this.positions = HugeSparseIntList.of(0, initialCapacity);
    this.lastValues = HugeSparseLongList.of(0n, initialCapacity);
    this.lengths = HugeSparseIntList.of(0, initialCapacity);

    if (numberOfProperties > 0) {
      this.properties = new Array<HugeSparseLongArrayList>(numberOfProperties);
      for (let i = 0; i < numberOfProperties; i++) {
        // Ensure EMPTY_PROPERTIES is compatible with what HugeSparseLongArrayList expects (number[])
        this.properties[i] = HugeSparseLongArrayList.of(Array.from(ChunkedAdjacencyLists.EMPTY_PROPERTIES), initialCapacity);
      }
    } else {
      this.properties = null;
    }
  }

  public add(index: number | number, targets: number[], start: number, end: number, valuesToAdd: number): void {
    let currentLastValue = this.lastValues.get(index);
    let delta: number;
    let compressedValue: number;
    let requiredBytes = 0;

    // First pass: calculate requiredBytes and modify targets array in-place with zigZagged deltas
    for (let i = start; i < end; i++) {
      if (targets[i] === AdjacencyPreAggregation.IGNORE_VALUE) {
        continue;
      }
      delta = targets[i] - currentLastValue;
      compressedValue = VarLongEncoding.zigZag(delta);
      currentLastValue = targets[i]; // Update lastValue with the original target value
      targets[i] = compressedValue; // Store zigZagged delta back into targets array for encoding
      requiredBytes += VarLongEncoding.encodedVLongSize(compressedValue);
    }

    const position = this.positions.get(index);
    const compressedTargetsBuffer = this.ensureCompressedTargetsCapacity(index, position, requiredBytes);
    const newPosition = VarLongEncoding.encodeVLongs(targets, start, end, compressedTargetsBuffer, position);

    this.positions.set(index, newPosition);
    this.lastValues.set(index, currentLastValue); // Store the actual last original target value
    this.lengths.addTo(index, valuesToAdd);
  }

  public addWithProperties( // Renamed from 'add' to avoid signature clash if targetsToAdd was optional
    index: number | number,
    targets: number[],
    allProperties: number[][], // Array of property arrays
    start: number,
    end: number,
    targetsToAdd: number
  ): void {
    if (this.properties) {
        for (let i = 0; i < allProperties.length; i++) {
            this.addProperties(index, targets, allProperties[i], start, end, i, targetsToAdd);
        }
    }
    this.add(index, targets, start, end, targetsToAdd);
  }

  private addProperties(
    index: number | number,
    targetsFilter: number[], // Used to filter which properties to add
    propertiesToAdd: number[], // Single property array for current propertyIndex
    start: number,
    end: number,
    propertyIndex: number,
    numActualPropertiesToAdd: number // Count of non-IGNORE_VALUE targets
  ): void {
    if (!this.properties) return;

    const currentLength = this.lengths.get(index); // This is count of items, not byte length
    const currentPropertiesArray = this.ensurePropertyCapacity(index, currentLength, numActualPropertiesToAdd, propertyIndex);

    // If all targets in the range [start, end) are valid (not IGNORE_VALUE)
    if (numActualPropertiesToAdd === (end - start)) {
      // Optimized copy: propertiesToAdd contains exactly what we need for this segment
      // We need to copy from propertiesToAdd[start...end-1] to currentPropertiesArray[currentLength...]
      for (let i = 0; i < numActualPropertiesToAdd; i++) {
        currentPropertiesArray[currentLength + i] = propertiesToAdd[start + i];
      }
    } else {
      // Selective copy
      let writePos = currentLength;
      for (let i = 0; i < (end - start); i++) {
        if (targetsFilter[start + i] !== AdjacencyPreAggregation.IGNORE_VALUE) {
          currentPropertiesArray[writePos++] = propertiesToAdd[start + i];
        }
      }
    }
  }


  private ensureCompressedTargetsCapacity(index: number | number, pos: number, required: number): Uint8Array {
    const targetLength = pos + required;
    let compressedTargets = this.targetLists.get(index);

    if (targetLength < 0) { // Should not happen with positive pos and required
      throw new Error(
        StringFormatting.formatWithLocale(
          "Encountered numeric overflow in internal buffer. Was at position %d and needed to grow by %d.",
          pos, required
        )
      );
    } else if (compressedTargets.length < targetLength) { // Strict less than, as targetLength is the minimum required
      const newLength = ChunkedAdjacencyLists.getNewLength(targetLength);
      const newBuffer = new Uint8Array(newLength);
      newBuffer.set(compressedTargets); // Copy existing data
      compressedTargets = newBuffer;
      this.targetLists.set(index, compressedTargets);
    }
    return compressedTargets;
  }

  private ensurePropertyCapacity(
    index: number | number,
    currentStoredPropertiesCount: number, // Number of properties already stored for this index
    numNewPropertiesToAdd: number,
    propertyIndex: number
  ): number[] {
    if (!this.properties) throw new Error("Properties array is null");

    const targetTotalPropertiesCount = currentStoredPropertiesCount + numNewPropertiesToAdd;
    let currentPropertiesArray = this.properties[propertyIndex].get(index);

    if (targetTotalPropertiesCount < 0) { // Should not happen
        throw new Error(
            StringFormatting.formatWithLocale(
                "Encountered numeric overflow in property buffer. Current count %d, needed to add %d.",
                currentStoredPropertiesCount, numNewPropertiesToAdd
            )
        );
    } else if (currentPropertiesArray.length < targetTotalPropertiesCount) {
        const newLength = ChunkedAdjacencyLists.getNewLength(targetTotalPropertiesCount);
        const newArray = new Array(newLength).fill(0n); // Or BigInt64Array
        for(let i=0; i < currentPropertiesArray.length; ++i) newArray[i] = currentPropertiesArray[i]; // Copy existing
        currentPropertiesArray = newArray;
        this.properties[propertyIndex].set(index, currentPropertiesArray);
    }
    return currentPropertiesArray;
  }

  static getNewLength(minLength: number): number {
    let newLength = BitUtil.nextHighestPowerOfTwo(minLength);
    if (newLength < 0 || newLength < minLength) { // Check for overflow or insufficient growth
      newLength = ArrayUtil.oversize(minLength, 1); // Assuming 1 byte per element for generic oversize
    }
    if (newLength < minLength) { // Final check if oversize also failed or was too small
      throw new Error(
        StringFormatting.formatWithLocale(
          "Encountered numeric overflow or insufficient growth in buffer. Required a minimum length of %d.",
          minLength
        )
      );
    }
    return newLength;
  }

  public capacity(): number {
    return this.targetLists.capacity();
  }

  public contains(index: number | number): boolean {
    return this.targetLists.contains(index);
  }

  public consume(consumer: ChunkedAdjacencyListsConsumer): void {
    new CompositeDrainingIterator(
      this.targetLists,
      this.properties,
      this.positions,
      this.lastValues, // lastValues is not used by CompositeDrainingIterator in Java
      this.lengths
    ).consume(consumer);
  }
}

class CompositeDrainingIterator {
  private readonly targetListIterator: DrainingIterator<Uint8Array>;
  private readonly targetListBatch: DrainingBatch<Uint8Array>;
  private readonly positionsListIterator: DrainingIterator<number>;
  private readonly positionsListBatch: DrainingBatch<number>;
  // private readonly lastValuesListIterator: DrainingIterator<number>; // Not used in Java version's consume
  // private readonly lastValuesListBatch: DrainingBatch<number>;
  private readonly lengthsListIterator: DrainingIterator<number>;
  private readonly lengthsListBatch: DrainingBatch<number>;
  private readonly propertyIterators: DrainingIterator<number[]>[] | null;
  private readonly propertyBatches: DrainingBatch<number[]>[] | null;

  private readonly propertiesBuffer: number[][] | null; // To hold properties for a single sourceId

  constructor(
    targets: HugeSparseByteArrayList,
    properties: HugeSparseLongArrayList[] | null,
    positions: HugeSparseIntList,
    lastValues: HugeSparseLongList, // Present in constructor but not used in consume
    lengths: HugeSparseIntList
  ) {
    this.targetListIterator = targets.drainingIterator();
    this.targetListBatch = this.targetListIterator.drainingBatch();
    this.positionsListIterator = positions.drainingIterator();
    this.positionsListBatch = this.positionsListIterator.drainingBatch();
    // this.lastValuesListIterator = lastValues.drainingIterator(); // Not used
    // this.lastValuesListBatch = this.lastValuesListIterator.drainingBatch();
    this.lengthsListIterator = lengths.drainingIterator();
    this.lengthsListBatch = this.lengthsListIterator.drainingBatch();

    if (properties == null) {
      this.propertyIterators = null;
      this.propertyBatches = null;
      this.propertiesBuffer = null;
    } else {
      this.propertyIterators = properties.map(p => p.drainingIterator());
      this.propertyBatches = this.propertyIterators.map(iter => iter.drainingBatch());
      this.propertiesBuffer = new Array(properties.length).fill(null).map(() => []);
    }
  }

  voidConsume(consumer: ChunkedAdjacencyListsConsumer): void { // Renamed to avoid conflict
    while (this.targetListIterator.next(this.targetListBatch)) {
      this.positionsListIterator.next(this.positionsListBatch);
      // this.lastValuesListIterator.next(this.lastValuesListBatch); // Not used
      this.lengthsListIterator.next(this.lengthsListBatch);

      if (this.propertyIterators && this.propertyBatches) {
        for (let i = 0; i < this.propertyIterators.length; i++) {
          this.propertyIterators[i].next(this.propertyBatches[i]);
        }
      }

      const targetsPage = this.targetListBatch.page;
      const positionsPage = this.positionsListBatch.page;
      const lengthsPage = this.lengthsListBatch.page;
      const pageOffset = this.targetListBatch.offset; // Global start index for this page

      for (let indexInPage = 0; indexInPage < targetsPage.length; indexInPage++) {
        const currentTargets = targetsPage[indexInPage];
        if (currentTargets === ChunkedAdjacencyLists['EMPTY_BYTES']) { // Access static via class name
          continue;
        }

        const position = positionsPage[indexInPage]; // This is compressedByteSize
        const length = lengthsPage[indexInPage];     // This is numberOfCompressedTargets

        let currentPropertiesForSource: number[][] | null = null;
        if (this.propertiesBuffer && this.propertyBatches) {
            currentPropertiesForSource = this.propertiesBuffer; // Re-use buffer
            for (let propertyIndex = 0; propertyIndex < this.propertyBatches.length; propertyIndex++) {
                const propPage = this.propertyBatches[propertyIndex].page;
                currentPropertiesForSource[propertyIndex] = propPage[indexInPage];
                // Make properties eligible for GC (as in Java)
                propPage[indexInPage] = null as any; // Or some empty marker
            }
        }

        // Make targets eligible for GC
        targetsPage[indexInPage] = null as any; // Or EMPTY_BYTES

        consumer.accept(
            BigInt(pageOffset + indexInPage), // sourceId
            currentTargets,                   // actual compressed targets byte array
            currentPropertiesForSource,       // collected properties for this sourceId
            position,                         // compressedByteSize
            length                            // numberOfCompressedTargets
        );
      }
    }
  }
  // Alias for external call
  public consume(consumer: ChunkedAdjacencyListsConsumer): void {
      this.voidConsume(consumer);
  }
}
