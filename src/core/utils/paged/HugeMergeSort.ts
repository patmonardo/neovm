import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { WorkStealingPool } from '../../concurrency/WorkStealingPool';

/**
 * Parallel merge sort implementation for HugeLongArray.
 * Uses a work-stealing approach for efficient parallel sorting.
 */
export class HugeMergeSort {
  /**
   * The minimum size of array segment to sort sequentially.
   * Below this threshold, insertion sort is used instead of further recursion.
   */
  private static readonly SEQUENTIAL_THRESHOLD = 100;

  /**
   * Sort the provided array in parallel using merge sort.
   * 
   * @param array The array to sort
   * @param concurrency Number of concurrent workers to use
   */
  public static sort(array: HugeLongArray, concurrency: number): void {
    const temp = HugeLongArray.newArray(array.size());
    const pool = new WorkStealingPool(concurrency);
    
    try {
      // Create and submit the root task
      const task = new MergeSortTask(
        null, 
        array, 
        temp, 
        0, 
        array.size() - 1,
        pool
      );
      
      // Wait for the sort to complete
      task.compute();
      task.join();
    } finally {
      pool.shutdown();
    }
  }

  /**
   * Merge two sorted subarrays into one.
   */
  private static merge(
    array: HugeLongArray, 
    temp: HugeLongArray, 
    startIndex: number, 
    endIndex: number, 
    midIndex: number
  ): void {
    // Copy only left range into temp
    for (let i = startIndex; i <= midIndex; i++) {
      temp.set(i, array.get(i));
    }

    // Left points to the next element in the left range
    let left = startIndex;
    // Right points to the next element in the right range
    let right = midIndex + 1;

    // i points to the next element in the full range
    let i = startIndex;
    while (left <= midIndex && right <= endIndex) {
      // Each iteration inserts an element into array at position i
      if (temp.get(left) < array.get(right)) {
        array.set(i++, temp.get(left++));
      } else {
        array.set(i++, array.get(right++));
      }
    }

    // If we still have elements in the temp range, copy them
    if (left <= midIndex) {
      for (let k = i; k <= endIndex; k++) {
        array.set(k, temp.get(left++));
      }
    }
  }

  /**
   * Sort a small segment using insertion sort.
   */
  private static insertionSort(
    array: HugeLongArray, 
    startIndex: number, 
    endIndex: number
  ): void {
    for (let i = startIndex, j = i; i < endIndex; j = ++i) {
      // Try to find a spot for current
      const current = array.get(i + 1);

      // Copy values greater than `current` to the right
      while (current < array.get(j)) {
        array.set(j + 1, array.get(j));

        if (j-- === startIndex) {
          break;
        }
      }

      // We found the right position for "current"
      array.set(j + 1, current);
    }
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}

/**
 * A task for sorting a segment of an array in parallel.
 * Provides a fork/join model similar to Java's CountedCompleter.
 */
class MergeSortTask {
  private readonly array: HugeLongArray;
  private readonly temp: HugeLongArray;
  private readonly startIndex: number;
  private readonly endIndex: number;
  private readonly pool: WorkStealingPool;
  private readonly completer: MergeSortTask | null;
  
  private midIndex: number = 0;
  private pendingTasks: number = 0;
  private completed: boolean = false;

  /**
   * Create a new merge sort task.
   * 
   * @param completer Parent task that should be notified when this task completes
   * @param array The array to sort
   * @param temp Temporary array for merging
   * @param startIndex Start index of segment to sort
   * @param endIndex End index of segment to sort
   * @param pool Thread pool for submitting subtasks
   */
  constructor(
    completer: MergeSortTask | null,
    array: HugeLongArray,
    temp: HugeLongArray,
    startIndex: number,
    endIndex: number,
    pool: WorkStealingPool
  ) {
    this.completer = completer;
    this.array = array;
    this.temp = temp;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.pool = pool;
  }

  /**
   * Execute this task.
   */
  public compute(): void {
    if (this.endIndex - this.startIndex >= HugeMergeSort['SEQUENTIAL_THRESHOLD']) {
      // We split the range in half and spawn two
      // new subtasks for left and right ranges
      this.midIndex = Math.floor((this.startIndex + this.endIndex) >>> 1);
      
      const leftTask = new MergeSortTask(
        this,
        this.array,
        this.temp,
        this.startIndex,
        this.midIndex,
        this.pool
      );
      
      const rightTask = new MergeSortTask(
        this,
        this.array,
        this.temp,
        this.midIndex + 1,
        this.endIndex,
        this.pool
      );

      // Set pending count and fork subtasks
      this.pendingTasks = 2;
      this.pool.submit(() => leftTask.compute());
      this.pool.submit(() => rightTask.compute());
    } else {
      // We sort the range sequentially 
      HugeMergeSort['insertionSort'](this.array, this.startIndex, this.endIndex);
      // Complete this task
      this.tryComplete();
    }
  }

  /**
   * Called when a subtask completes. Decrements pending count and
   * completes this task if all subtasks are done.
   */
  public onCompletion(): void {
    if (this.midIndex === 0) {
      // No merging for leaf tasks
      return;
    }

    // Merge the sorted subarrays
    HugeMergeSort['merge'](
      this.array,
      this.temp,
      this.startIndex,
      this.endIndex,
      this.midIndex
    );
  }

  /**
   * Try to complete this task. If all subtasks are done, 
   * perform merge and notify parent.
   */
  private tryComplete(): void {
    if (--this.pendingTasks <= 0) {
      this.completed = true;
      this.onCompletion();
      
      if (this.completer) {
        this.completer.tryComplete();
      }
    }
  }

  /**
   * Wait for this task to complete.
   */
  public join(): void {
    while (!this.completed) {
      // Cooperative yielding to allow other tasks to progress
      if (typeof setImmediate === 'function') {
        setImmediate(() => {});
      } else {
        // Browser environment fallback
        setTimeout(() => {}, 0);
      }
    }
  }
}

/**
 * Simple work-stealing thread pool implementation.
 * In a real implementation, this would use Web Workers or worker_threads.
 */
class WorkStealingPool {
  private active = true;

  /**
   * Create a new pool with the given number of worker threads.
   * 
   * @param concurrency Number of threads
   */
  constructor(private concurrency: number) {}

  /**
   * Submit a task to be executed by the pool.
   * 
   * @param task The task to execute
   */
  public submit(task: () => void): void {
    if (!this.active) {
      throw new Error("Pool has been shut down");
    }
    
    // In a real implementation, this would submit to a worker thread
    // For now, we execute on the main thread with setTimeout to allow
    // other tasks to be scheduled
    setTimeout(() => {
      task();
    }, 0);
  }

  /**
   * Shut down the pool.
   */
  public shutdown(): void {
    this.active = false;
  }
}