import { Partition } from './Partition';
import { DegreePartition } from './DegreePartition';
import { IteratorPartition } from './IteratorPartition';
import { BitSet } from '../../../collections/BitSet';
import { HugeLongArray } from '../../collections/ha/HugeLongArray';
import { BitUtil } from '../../mem/BitUtil';
import { ParallelUtil } from '../../concurrency/ParallelUtil';
import { Concurrency } from '../../concurrency/Concurrency';
import { Graph } from '../../../api/Graph';
import { SetBitsIterable } from '../SetBitsIterable';

/**
 * Utility class for partitioning nodes in a graph.
 */
export class PartitionUtils {
  /**
   * Minimum partition capacity as a fraction of the target size.
   */
  private static readonly MIN_PARTITION_CAPACITY = 0.67;

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Creates range partitions based on node count and concurrency.
   *
   * @param concurrency Concurrency level
   * @param nodeCount Total number of nodes
   * @param taskCreator Function that creates tasks from partitions
   * @param minBatchSize Optional minimum batch size
   * @returns List of tasks
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
   *
   * @param nodeCount Total number of nodes
   * @param batchSize Size of each batch
   * @param taskCreator Function that creates tasks from partitions
   * @returns List of tasks
   */
  public static rangePartitionWithBatchSize<TASK>(
    nodeCount: number,
    batchSize: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[] {
    return this.tasks(nodeCount, batchSize, taskCreator);
  }

  /**
   * Creates number-aligned partitions.
   *
   * @param concurrency Concurrency level
   * @param nodeCount Total number of nodes
   * @param alignTo Alignment boundary
   * @returns List of partitions
   */
  public static numberAlignedPartitioning(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number
  ): Partition[] {
    return this.numberAlignedPartitioning(concurrency, nodeCount, alignTo, p => p);
  }

  /**
   * Creates number-aligned partitions and transforms them to tasks.
   *
   * @param concurrency Concurrency level
   * @param nodeCount Total number of nodes
   * @param alignTo Alignment boundary
   * @param taskCreator Function that creates tasks from partitions
   * @returns List of tasks
   */
  public static numberAlignedPartitioning<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[] {
    return this.numberAlignedPartitioningWithMaxSize(
      concurrency,
      nodeCount,
      alignTo,
      Number.MAX_SAFE_INTEGER,
      taskCreator
    );
  }

  /**
   * Creates number-aligned partitions with a maximum size.
   *
   * @param concurrency Concurrency level
   * @param nodeCount Total number of nodes
   * @param alignTo Alignment boundary
   * @param maxPartitionSize Maximum size of a partition
   * @returns List of partitions
   */
  public static numberAlignedPartitioningWithMaxSize(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    maxPartitionSize: number
  ): Partition[] {
    return this.numberAlignedPartitioningWithMaxSize(
      concurrency,
      nodeCount,
      alignTo,
      maxPartitionSize,
      p => p
    );
  }

  /**
   * Creates number-aligned partitions with a maximum size and transforms them to tasks.
   *
   * @param concurrency Concurrency level
   * @param nodeCount Total number of nodes
   * @param alignTo Alignment boundary
   * @param maxPartitionSize Maximum size of a partition
   * @param taskCreator Function that creates tasks from partitions
   * @returns List of tasks
   */
  public static numberAlignedPartitioningWithMaxSize<TASK>(
    concurrency: Concurrency,
    nodeCount: number,
    alignTo: number,
    maxPartitionSize: number,
    taskCreator: (partition: Partition) => TASK
  ): TASK[] {
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

    return this.tasks(nodeCount, adjustedBatchSize, taskCreator);
  }

  /**
   * Creates degree-based partitions for a graph.
   *
   * @param graph The graph to partition
   * @param concurrency Concurrency level
   * @param taskCreator Function that creates tasks from partitions
   * @param minBatchSize Optional minimum batch size
   * @returns List of tasks
   */
  public static degreePartition<TASK>(
    graph: Graph,
    concurrency: Concurrency,
    taskCreator: (partition: DegreePartition) => TASK,
    minBatchSize?: number
  ): TASK[] {
    if (concurrency.value() === 1) {
      return [taskCreator(new DegreePartition(0, graph.nodeCount(), graph.relationshipCount()))];
    }

    const batchSize = Math.max(
      minBatchSize ?? ParallelUtil.DEFAULT_BATCH_SIZE,
      BitUtil.ceilDiv(graph.relationshipCount(), concurrency.value())
    );

    return this.degreePartitionWithBatchSize(
      graph.nodeCount(),
      (node: number) => graph.degree(node),
      batchSize,
      taskCreator
    );
  }

  /**
   * Creates degree-based partitions.
   *
   * @param nodeCount Total number of nodes
   * @param relationshipCount Total number of relationships
   * @param degrees Function to get node degrees
   * @param concurrency Concurrency level
   * @param taskCreator Function that creates tasks from partitions
   * @param minBatchSize Optional minimum batch size
   * @returns List of tasks
   */
  public static degreePartition<TASK>(
    nodeCount: number,
    relationshipCount: number,
    degrees: DegreeFunction,
    concurrency: Concurrency,
    taskCreator: (partition: DegreePartition) => TASK,
    minBatchSize?: number
  ): TASK[] {
    if (concurrency.value() === 1) {
      return [taskCreator(new DegreePartition(0, nodeCount, relationshipCount))];
    }

    const batchSize = Math.max(
      minBatchSize ?? ParallelUtil.DEFAULT_BATCH_SIZE,
      BitUtil.ceilDiv(relationshipCount, concurrency.value())
    );

    return this.degreePartitionWithBatchSize(nodeCount, degrees, batchSize, taskCreator);
  }

  /**
   * Creates degree-based partitions with custom degree function.
   *
   * @param graph The graph to partition
   * @param concurrency Concurrency level
   * @param customDegreeFunction Function to get custom node weights
   * @param taskCreator Function that creates tasks from partitions
   * @param minBatchSize Optional minimum batch size
   * @param weightSum Optional pre-calculated sum of weights
   * @returns List of tasks
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

    return this.degreePartitionWithBatchSize(graph.nodeCount(), customDegreeFunction, batchSize, taskCreator);
  }

  /**
   * Creates a stream of degree partitions.
   *
   * @param nodeCount Total number of nodes
   * @param relationshipCount Total number of relationships
   * @param concurrency Concurrency level
   * @param degrees Function to get node degrees
   * @returns Array of degree partitions
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

    // In TypeScript, we'll return an array instead of a stream
    return this.createLazyDegreePartitions(nodeCount, relationshipCount, concurrency, degrees);
  }

  /**
   * Creates degree-based partitions for a graph with a specific batch size.
   *
   * @param graph The graph to partition
   * @param batchSize Size of each batch
   * @param taskCreator Function that creates tasks from partitions
   * @returns List of tasks
   */
  public static degreePartitionWithBatchSize<TASK>(
    graph: Graph,
    batchSize: number,
    taskCreator: (partition: DegreePartition) => TASK
  ): TASK[] {
    return this.degreePartitionWithBatchSize(
      graph.nodeCount(),
      (node: number) => graph.degree(node),
      batchSize,
      taskCreator
    );
  }

  /**
   * Creates degree-based partitions with a specific batch size.
   *
   * @param nodeCount Total number of nodes
   * @param degrees Function to get node degrees
   * @param batchSize Size of each batch in relationships
   * @param taskCreator Function that creates tasks from partitions
   * @returns List of tasks
   */
  public static degreePartitionWithBatchSize<TASK>(
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
      // find the next partition
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

    // the above loop only merges partition i with i+1 to avoid i being too small
    // thus we need to check the last partition manually
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
   * Creates degree-based partitions from a bitset.
   *
   * @param bitset Bitset of node IDs
   * @param degrees Function to get node degrees
   * @param degreesPerBatch Relationships per batch
   * @param taskCreator Function that creates tasks from partitions
   * @returns List of tasks
   */
  public static degreePartitionWithBatchSize<TASK>(
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

  /**
   * Creates an array of tasks based on partitions.
   *
   * @param nodeCount Total number of nodes
   * @param batchSize Size of each batch
   * @param taskCreator Function that creates tasks from partitions
   * @returns Array of tasks
   */
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

  /**
   * Calculates the actual batch size, accounting for the end of the range.
   *
   * @param startNode Start node ID
   * @param batchSize Desired batch size
   * @param nodeCount Total number of nodes
   * @returns Actual batch size
   */
  private static actualBatchSize(startNode: number, batchSize: number, nodeCount: number): number {
    return startNode + batchSize < nodeCount ? batchSize : nodeCount - startNode;
  }

  /**
   * Gets the actual batch sizes for range partitioning.
   *
   * @param concurrency Concurrency level
   * @param nodeCount Total number of nodes
   * @param minBatchSize Optional minimum batch size
   * @returns List of actual batch sizes
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

    const expectedCapacity = BitUtil.ceilDiv(nodeCount, batchSize);
    const batchSizes: number[] = [];

    for (let i = 0; i < nodeCount; i += batchSize) {
      batchSizes.push(this.actualBatchSize(i, batchSize, nodeCount));
    }

    return batchSizes;
  }

  /**
   * Creates block-aligned partitions and returns an iterator.
   *
   * @param sortedIds Sorted node IDs
   * @param blockShift Block shift for alignment
   * @param taskCreator Function that creates tasks from partitions
   * @returns Iterator of tasks
   */
  public static blockAlignedPartitioning<TASK>(
    sortedIds: HugeLongArray,
    blockShift: number,
    taskCreator: (partition: Partition) => TASK
  ): Iterator<TASK> {
    return new BlockAlignedPartitionIterator<TASK>(sortedIds, blockShift, taskCreator);
  }

  /**
   * Calculates the total weight from a custom degree function.
   *
   * @param nodeCount Total number of nodes
   * @param degreeFunction Function to get node weights
   * @returns Sum of all weights
   */
  private static calculateTotalWeight(nodeCount: number, degreeFunction: (nodeId: number) => number): number {
    let sum = 0;
    for (let i = 0; i < nodeCount; i++) {
      sum += degreeFunction(i);
    }
    return sum;
  }

  /**
   * Creates an array of lazy degree partitions.
   *
   * @param nodeCount Total number of nodes
   * @param relationshipCount Total number of relationships
   * @param concurrency Concurrency level
   * @param degrees Function to get node degrees
   * @returns Array of degree partitions
   */
  private static createLazyDegreePartitions(
    nodeCount: number,
    relationshipCount: number,
    concurrency: Concurrency,
    degrees: DegreeFunction
  ): DegreePartition[] {
    // This would be implemented as a lazy iterator in a real implementation
    // For simplicity, we're just returning the result of degreePartitionWithBatchSize
    const batchSize = BitUtil.ceilDiv(relationshipCount, concurrency.value());
    return this.degreePartitionWithBatchSize(nodeCount, degrees, batchSize, p => p);
  }
}

/**
 * Function interface for getting node degrees.
 */
export interface DegreeFunction {
  (node: number): number;
}

/**
 * Iterator for block-aligned partitions.
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

  /**
   * Creates a new block-aligned partition iterator.
   *
   * @param sortedIds Sorted node IDs
   * @param blockShift Block shift for alignment
   * @param taskCreator Function that creates tasks from partitions
   */
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

  /**
   * Gets the next partition.
   */
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
