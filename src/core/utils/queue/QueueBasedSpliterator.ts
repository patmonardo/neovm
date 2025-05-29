import { TerminationFlag } from '@/termination';

/**
 * A Spliterator implementation that reads from a blocking queue until a tombstone is encountered.
 * This is a key pattern in GDS for streaming results from concurrent/parallel computations.
 *
 * Key Concepts:
 * - SPLITERATOR: JavaScript iterator with splitting capability for parallel processing
 * - TOMBSTONE: Special sentinel value that signals "end of stream"
 * - BLOCKING QUEUE: Thread-safe queue that blocks when empty
 * - TERMINATION GUARD: Allows graceful cancellation of long-running operations
 *
 * Perfect for:
 * - Streaming results from parallel graph algorithms
 * - Processing large result sets without loading everything into memory
 * - Producer-consumer patterns where producer runs in background
 * - Cancellable operations that need to respect termination flags
 *
 * Usage Pattern:
 * 1. Algorithm produces results and puts them in queue
 * 2. When done, algorithm puts TOMBSTONE in queue to signal completion
 * 3. Consumer iterates via this spliterator until tombstone encountered
 * 4. Timeout prevents infinite blocking if producer fails
 *
 * Examples:
 * - PageRank streaming node scores as they're computed
 * - Community detection streaming communities as they're found
 * - Shortest path algorithms streaming paths as they're discovered
 * - Graph export streaming nodes/edges in chunks
 */
export class QueueBasedSpliterator<T> implements Iterator<T> {

  public readonly queue: AsyncQueue<T>;
  private readonly tombstone: T;
  private readonly terminationGuard: TerminationFlag;
  public readonly timeoutInSeconds: number;
  public entry: T | null = null;

  /**
   * Creates a new queue-based iterator.
   *
   * @param queue The blocking queue to read from
   * @param tombstone Special value that signals end of stream
   * @param terminationGuard Flag to check for cancellation requests
   * @param timeoutInSeconds Maximum time to wait for next item (prevents infinite blocking)
   */
  constructor(
    queue: AsyncQueue<T>,
    tombstone: T,
    terminationGuard: TerminationFlag,
    timeoutInSeconds: number
  ) {
    this.queue = queue;
    this.tombstone = tombstone;
    this.terminationGuard = terminationGuard;
    this.timeoutInSeconds = timeoutInSeconds;

    // Pre-fetch the first entry to enable hasNext() pattern
    this.entry = this.poll();
  }

  /**
   * Advances the iterator and executes the provided action on the next element.
   * This is the core iteration method - it:
   * 1. Checks if we've reached the end (null or tombstone)
   * 2. Verifies the operation hasn't been cancelled
   * 3. Executes the action on the current entry
   * 4. Fetches the next entry for the following iteration
   *
   * @param action Function to execute on the current element
   * @returns true if more elements are available, false if at end
   */
  tryAdvance(action: (item: T) => void): boolean {
    // Check if we've reached the end of the stream
    if (this.isEnd()) {
      return false;
    }

    // Ensure the operation hasn't been cancelled
    // This allows long-running iterations to be interrupted gracefully
    this.terminationGuard.assertRunning!();

    // Process the current entry
    action(this.entry!);

    // Fetch the next entry for the following iteration
    this.entry = this.poll();

    // Return true if more elements are available
    return !this.isEnd();
  }

  /**
   * Standard JavaScript Iterator interface implementation.
   * Adapts tryAdvance() to work with for...of loops and other iterator consumers.
   *
   * @returns IteratorResult with value and done flag
   */
  next(): IteratorResult<T> {
    if (this.isEnd()) {
      return { done: true, value: undefined };
    }

    this.terminationGuard.assertRunning!();
    const value = this.entry!;
    this.entry = this.poll();

    return { done: false, value };
  }

  /**
   * Checks if we've reached the end of the stream.
   * End conditions:
   * - entry is null (timeout occurred or queue closed)
   * - entry equals tombstone (producer signaled completion)
   *
   * @returns true if at end of stream
   */
  private isEnd(): boolean {
    return this.entry === null || this.entry === this.tombstone;
  }

  /**
   * Polls the next item from the queue with timeout.
   * This is where the blocking/timeout logic lives:
   * - Waits up to timeoutInSeconds for an item
   * - Returns null if timeout expires (prevents infinite blocking)
   * - Handles interruption gracefully
   *
   * @returns Next item from queue, or null if timeout/interruption
   */
  private poll(): T | null {
    try {
      // In a real implementation, this would use a blocking queue with timeout
      // For TypeScript, we'll need to use Promises with timeout
      return this.pollWithTimeout();
    } catch (error: any) {
      // Handle interruption (e.g., AbortSignal in browsers)
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Implementation of timeout-based polling.
   * In a real system, this would integrate with the actual queue implementation.
   * This is a placeholder that shows the expected behavior.
   */
  private pollWithTimeout(): T | null {
    // This is a simplified version - real implementation would depend on
    // the specific async queue being used (e.g., RxJS, custom implementation)

    // For demonstration purposes, we'll assume a synchronous poll
    // Real implementation would use Promise.race with timeout
    return null; // Placeholder - actual implementation needed
  }

  /**
   * Attempts to split this spliterator for parallel processing.
   * Returns null because queue-based iteration doesn't support splitting
   * (we can't split a single queue into multiple independent streams).
   *
   * This is a key difference from array-based spliterators which can split easily.
   * Queue-based iteration is inherently sequential due to the producer-consumer pattern.
   *
   * @returns null (splitting not supported)
   */
  trySplit(): QueueBasedSpliterator<T> | null {
    return null;
  }

  /**
   * Estimates the number of remaining elements.
   * Returns MAX_VALUE because we don't know how many elements the producer will generate.
   * This is typical for streaming scenarios where the size is unknown upfront.
   *
   * @returns Long.MAX_VALUE indicating unknown/unbounded size
   */
  estimateSize(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * Returns characteristics of this spliterator.
   * NONNULL indicates that this iterator will never yield null values
   * (though it uses null internally for end-of-stream detection).
   *
   * Other characteristics we don't have:
   * - SIZED: We don't know the size upfront
   * - ORDERED: Order depends on queue implementation
   * - SORTED: Results are not necessarily sorted
   * - DISTINCT: Results may contain duplicates
   * - IMMUTABLE: Results may be mutable objects
   *
   * @returns Characteristic flags
   */
  characteristics(): number {
    return SpliteratorCharacteristics.NONNULL;
  }

  /**
   * Makes this object iterable with for...of loops
   */
  [Symbol.iterator](): Iterator<T> {
    return this;
  }
}

/**
 * Spliterator characteristic constants (matching Java's Spliterator interface)
 */
export const SpliteratorCharacteristics = {
  ORDERED: 0x00000010,
  DISTINCT: 0x00000001,
  SORTED: 0x00000004,
  SIZED: 0x00000040,
  NONNULL: 0x00000100,
  IMMUTABLE: 0x00000400,
  CONCURRENT: 0x00001000,
  SUBSIZED: 0x00004000
} as const;

/**
 * Placeholder interface for async queue - would be implemented by actual queue
 */
export interface AsyncQueue<T> {
  /**
   * Polls for an item with timeout
   */
  poll(timeoutSeconds: number): Promise<T | null>;

  /**
   * Adds an item to the queue
   */
  offer(item: T): boolean;

  /**
   * Gets current queue size
   */
  size(): number;
}

/**
 * Example usage factory method
 */
export function createStreamingIterator<T>(
  queue: AsyncQueue<T>,
  tombstone: T,
  terminationFlag: TerminationFlag,
  timeoutSeconds: number = 30
): QueueBasedSpliterator<T> {
  return new QueueBasedSpliterator(queue, tombstone, terminationFlag, timeoutSeconds);
}
