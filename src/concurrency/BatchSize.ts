/**
 * Represents the size of a batch for parallel processing.
 * Provides a type-safe way to pass batch sizes around.
 */
export class BatchSize {
  /**
   * Create a new BatchSize with the specified value
   * 
   * @param value The size of the batch
   */
  constructor(readonly value: number) {
    if (value < 1) {
      throw new Error("Batch size must be at least 1");
    }
  }

  /**
   * Creates a standard batch size based on the total size and number of threads.
   * 
   * @param totalSize The total number of items to process
   * @param concurrency The number of threads/workers
   * @returns A BatchSize appropriate for the workload
   */
  public static ofTotal(totalSize: number, concurrency: number): BatchSize {
    if (totalSize <= 0) {
      return new BatchSize(1);
    }
    
    if (concurrency <= 0) {
      return new BatchSize(totalSize);
    }
    
    // Calculate batch size with ceiling division to ensure all items are processed
    const batchSize = Math.ceil(totalSize / concurrency);
    return new BatchSize(batchSize);
  }

  /**
   * Creates a batch size that limits each batch to at most the specified maximum size.
   * 
   * @param maxBatchSize Maximum items per batch
   * @returns A BatchSize with the specified maximum
   */
  public static withMax(maxBatchSize: number): BatchSize {
    return new BatchSize(maxBatchSize);
  }

  /**
   * Creates a batch size for optimal cache locality.
   * 
   * @returns A BatchSize that's optimized for cache performance
   */
  public static optimal(): BatchSize {
    // 16KB is often a good cache-friendly size
    // assuming each item is roughly 32-64 bytes
    return new BatchSize(256);
  }

  /**
   * Returns a string representation of this BatchSize
   */
  public toString(): string {
    return `BatchSize(${this.value})`;
  }
}