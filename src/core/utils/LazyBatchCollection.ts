import { ParallelUtil } from '@/concurrency/ParallelUtil';
import { PrimitiveLongIterable } from "@/collections/primitive/PrimitiveLongIterable";

/**
 * Interface for supplying batch objects based on start position and length.
 */
export interface BatchSupplier<T> {
  /**
   * Creates a new batch.
   *
   * @param start The starting position for this batch
   * @param length The length of this batch
   * @returns A new batch object
   */
  newBatch(start: number, length: number): T;
}

/**
 * A collection that lazily creates batches when iterated.
 * Optionally caches created batches for reuse.
 */
export class LazyBatchCollection<T> implements Iterable<T> {
  private readonly saveResults: boolean;
  private readonly supplier: BatchSupplier<T>;
  private readonly nodeCount: number;
  private readonly batchSize: number;
  private readonly numberOfBatches: number;

  private batches: T[] | null = null;

  /**
   * Creates a new collection of lazily generated batches.
   *
   * @param nodeCount Total number of nodes/items
   * @param batchSize Size of each batch
   * @param supplier Function that creates new batches
   * @returns A new lazy batch collection
   */
  public static of<T>(
    nodeCount: number,
    batchSize: number,
    supplier: BatchSupplier<T>
  ): LazyBatchCollection<T> {
    return new LazyBatchCollection<T>(batchSize, nodeCount, false, supplier);
  }

  /**
   * Creates a new collection of lazily generated batches that are saved for reuse.
   *
   * @param nodeCount Total number of nodes/items
   * @param batchSize Size of each batch
   * @param supplier Function that creates new batches
   * @returns A new lazy batch collection with saved results
   */
  public static cached<T>(
    nodeCount: number,
    batchSize: number,
    supplier: BatchSupplier<T>
  ): LazyBatchCollection<T> {
    return new LazyBatchCollection<T>(batchSize, nodeCount, true, supplier);
  }

  /**
   * Private constructor, use static factory methods instead.
   */
  private constructor(
    batchSize: number,
    nodeCount: number,
    saveResults: boolean,
    supplier: BatchSupplier<T>
  ) {
    this.saveResults = saveResults;
    this.supplier = supplier;
    this.nodeCount = nodeCount;
    this.batchSize = batchSize;
    this.numberOfBatches = Math.floor(
      ParallelUtil.threadCount(batchSize, nodeCount)
    );
  }

  /**
   * Returns an iterator over the batches.
   * Creates batches on-demand as the iterator is consumed.
   *
   * @returns Iterator for the batches
   */
  public [Symbol.iterator](): Iterator<T> {
    if (this.batches !== null) {
      return this.batches[Symbol.iterator]();
    }

    if (this.saveResults) {
      this.batches = [];
    }

    let i = 0;
    let start = 0;

    return {
      next: (): IteratorResult<T> => {
        if (i >= this.numberOfBatches) {
          return { done: true, value: undefined as unknown as T };
        }

        const currentStart = start;
        const length = Math.min(this.batchSize, this.nodeCount - start);

        start += this.batchSize;
        i++;

        const batch = this.supplier.newBatch(currentStart, length);

        if (this.batches !== null) {
          this.batches.push(batch);
        }

        return { done: false, value: batch };
      }
    };
  }

  /**
   * Returns the number of batches in this collection.
   *
   * @returns Number of batches
   */
  public size(): number {
    if (this.batches !== null) {
      return this.batches.length;
    }
    return this.numberOfBatches;
  }

  /**
   * Converts the collection to an array, forcing all lazy batches to be created.
   *
   * @returns Array of all batches
   */
  public toArray(): T[] {
    if (this.batches !== null) {
      return [...this.batches];
    }
    return Array.from(this);
  }

  /**
   * Creates a collection of iterables for batch processing.
   *
   * @param size Total size
   * @param batchSize Size of each batch
   * @param iterableFactory Factory function to create iterables for each batch
   * @returns Array of iterables
   */
  public static of(
    size: number,
    batchSize: number,
    iterableFactory: (start: number, end: number) => PrimitiveLongIterable
  ): PrimitiveLongIterable[] {
    if (size === 0n) {
      return [];
    }

    if (batchSize <= 0n) {
      throw new Error("Batch size must be positive");
    }

    // Calculate number of batches
    const numberOfBatches = Number((size + batchSize - 1n) / batchSize);
    const result: PrimitiveLongIterable[] = new Array(numberOfBatches);

    // Create iterables for each batch
    let start = 0n;
    for (let i = 0; i < numberOfBatches; i++) {
      const end = i === numberOfBatches - 1 ? size : start + batchSize;
      result[i] = iterableFactory(start, end);
      start = end;
    }

    return result;
  }
}
