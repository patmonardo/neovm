/**
 * Lazy batch collection for efficient parallel processing of large datasets.
 *
 * Creates batches on-demand during iteration, enabling memory-efficient
 * parallel processing of billions of elements without materializing
 * all work chunks simultaneously.
 *
 * Perfect for:
 * - Graph algorithm parallelization (billion-node processing)
 * - Stream processing with backpressure
 * - Memory-constrained batch operations
 *
 * @template T The type of batch objects
 */

/**
 * Function that creates a batch for a given range.
 * @param start Starting index (inclusive)
 * @param length Number of elements in this batch
 * @returns A batch object of type T
 */
export type BatchSupplier<T> = (start: number, length: number) => T;

/**
 * Lazy collection that generates batches on-demand.
 * Implements standard JavaScript iteration protocols.
 */
export class LazyBatchCollection<T> implements Iterable<T> {
  private readonly batchSize: number;
  private readonly nodeCount: number;
  private readonly numberOfBatches: number;
  private readonly supplier: BatchSupplier<T>;
  private readonly saveResults: boolean;

  private cachedBatches?: T[];

  constructor(
    nodeCount: number,
    batchSize: number,
    supplier: BatchSupplier<T>,
    saveResults: boolean = false
  ) {
    this.nodeCount = nodeCount;
    this.batchSize = batchSize;
    this.supplier = supplier;
    this.saveResults = saveResults;
    this.numberOfBatches = Math.ceil(nodeCount / batchSize);
  }

  /**
   * Creates a lazy batch collection.
   *
   * @param nodeCount Total number of elements to process
   * @param batchSize Maximum elements per batch
   * @param supplier Function to create each batch
   * @returns Iterable collection of batches
   *
   * @example
   * ```typescript
   * // Process 1M nodes in 10K batches
   * const batches = LazyBatchCollection.of(1_000_000, 10_000, (start, length) => {
   *   return new NodeProcessingBatch(start, length);
   * });
   *
   * // Batches created lazily during iteration
   * for (const batch of batches) {
   *   await processNodesInParallel(batch);
   * }
   * ```
   */
  public static of<T>(
    nodeCount: number,
    batchSize: number,
    supplier: BatchSupplier<T>
  ): LazyBatchCollection<T> {
    return new LazyBatchCollection(nodeCount, batchSize, supplier, false);
  }

  /**
   * Creates a lazy batch collection that caches results.
   * Useful when you need to iterate multiple times.
   */
  public static ofCached<T>(
    nodeCount: number,
    batchSize: number,
    supplier: BatchSupplier<T>
  ): LazyBatchCollection<T> {
    return new LazyBatchCollection(nodeCount, batchSize, supplier, true);
  }

  /**
   * Returns iterator that creates batches on-demand.
   * Each call to next() creates a new batch using the supplier function.
   */
  public *[Symbol.iterator](): Iterator<T> {
    // If we have cached results, use them
    if (this.cachedBatches) {
      yield* this.cachedBatches;
      return;
    }

    // Initialize cache if saving results
    if (this.saveResults) {
      this.cachedBatches = [];
    }

    // Generate batches lazily
    let start = 0;
    for (let i = 0; i < this.numberOfBatches; i++) {
      const length = Math.min(this.batchSize, this.nodeCount - start);
      const batch = this.supplier(start, length);

      // Cache if requested
      if (this.cachedBatches) {
        this.cachedBatches.push(batch);
      }

      yield batch;
      start += this.batchSize;
    }
  }

  /**
   * Returns the number of batches that will be created.
   * Does not trigger batch creation.
   */
  public get size(): number {
    return this.numberOfBatches;
  }

  /**
   * Returns array of all batches (forces evaluation if not cached).
   * Use sparingly - defeats the lazy evaluation purpose!
   */
  public toArray(): T[] {
    if (this.cachedBatches) {
      return [...this.cachedBatches];
    }

    return Array.from(this);
  }

  /**
   * Processes all batches in parallel using Promise.all.
   * Each batch is processed by the provided async function.
   *
   * @param processor Async function to process each batch
   * @returns Promise that resolves when all batches are processed
   */
  public async processInParallel<R>(
    processor: (batch: T) => Promise<R>
  ): Promise<R[]> {
    const promises: Promise<R>[] = [];

    for (const batch of this) {
      promises.push(processor(batch));
    }

    return Promise.all(promises);
  }

  /**
   * Processes batches sequentially with optional progress callback.
   * More memory efficient than parallel processing for very large datasets.
   */
  public async processSequentially<R>(
    processor: (batch: T, index: number) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    for (const batch of this) {
      const result = await processor(batch, index);
      results.push(result);

      if (onProgress) {
        onProgress(index + 1, this.numberOfBatches);
      }

      index++;
    }

    return results;
  }
}

/**
 * Utility functions for common batch creation patterns.
 */
export namespace BatchUtils {
  /**
   * Creates batches for node range processing.
   */
  export interface NodeBatch {
    readonly startNode: number;
    readonly endNode: number;
    readonly length: number;
  }

  export function createNodeBatches(
    nodeCount: number,
    batchSize: number
  ): LazyBatchCollection<NodeBatch> {
    return LazyBatchCollection.of(nodeCount, batchSize, (start, length) => ({
      startNode: start,
      endNode: start + length - 1,
      length
    }));
  }

  /**
   * Creates batches for array slice processing.
   */
  export interface ArraySliceBatch<T> {
    readonly data: T[];
    readonly startIndex: number;
    readonly endIndex: number;
  }

  export function createArraySliceBatches<T>(
    array: T[],
    batchSize: number
  ): LazyBatchCollection<ArraySliceBatch<T>> {
    return LazyBatchCollection.of(array.length, batchSize, (start, length) => ({
      data: array.slice(start, start + length),
      startIndex: start,
      endIndex: start + length - 1
    }));
  }

  /**
   * Creates batches for HugeArray processing.
   */
  export interface HugeArrayBatch {
    readonly startIndex: number;
    readonly length: number;

    processRange<T>(array: { get(index: number): T }, processor: (value: T, index: number) => void): void;
  }

  export function createHugeArrayBatches(
    totalSize: number,
    batchSize: number
  ): LazyBatchCollection<HugeArrayBatch> {
    return LazyBatchCollection.of(totalSize, batchSize, (start, length) => ({
      startIndex: start,
      length,

      processRange<T>(array: { get(index: number): T }, processor: (value: T, index: number) => void): void {
        for (let i = 0; i < length; i++) {
          const index = start + i;
          const value = array.get(index);
          processor(value, index);
        }
      }
    }));
  }
}
