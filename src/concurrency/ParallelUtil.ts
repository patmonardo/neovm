import { Concurrency } from './Concurrency';
import { BiLongConsumer } from './BiLongConsumer';
import { TerminationFlag } from './TerminationFlag';
import { WorkerPool } from './WorkerPool';
import { Future } from './Future';

/**
 * Utility class for running tasks in parallel.
 */
export class ParallelUtil {
  /**
   * Default batch size for partitioning work
   */
  public static readonly DEFAULT_BATCH_SIZE = 10_000;

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("ParallelUtil cannot be instantiated");
  }

  /**
   * Executes a stream operation in parallel using a fork-join pool
   * 
   * @param data The data stream to process
   * @param concurrency The level of concurrency to use
   * @param fn The function to apply to the stream
   * @returns The result of the function
   */
  public static async parallelStream<T, R>(
    data: T[],
    concurrency: Concurrency,
    fn: (data: T[]) => R
  ): Promise<R> {
    const pool = WorkerPool.createForkJoinPool(concurrency);
    
    try {
      // Submit the work to the pool
      const future = pool.submit(() => fn(data));
      return await future.get();
    } finally {
      pool.shutdown();
    }
  }

  /**
   * Executes a stream consumer in parallel
   * 
   * @param data The data stream to process
   * @param concurrency The level of concurrency to use
   * @param terminationFlag Flag to check for early termination
   * @param consumer The consumer function to apply to the stream
   */
  public static async parallelStreamConsume<T>(
    data: T[],
    concurrency: Concurrency,
    terminationFlag: TerminationFlag,
    consumer: (data: T[]) => void
  ): Promise<void> {
    await this.parallelStream(data, concurrency, (d) => {
      terminationFlag.assertRunning();
      consumer(d);
      return null;
    });
  }

  /**
   * Process a range of node IDs in parallel
   * 
   * @param nodeCount Total number of nodes to process
   * @param concurrency The level of concurrency to use
   * @param terminationFlag Flag to check for early termination
   * @param consumer The consumer function to apply to each node ID
   */
  public static async parallelForEachNode(
    nodeCount: number,
    concurrency: Concurrency,
    terminationFlag: TerminationFlag,
    consumer: (nodeId: number) => void
  ): Promise<void> {
    // Create an array of node IDs
    const nodeIds = Array.from({ length: nodeCount }, (_, i) => i);
    
    await this.parallelStreamConsume(
      nodeIds,
      concurrency,
      terminationFlag,
      (ids) => ids.forEach(consumer)
    );
  }

  /**
   * Calculate the number of threads/batches required to process a collection
   * 
   * @param batchSize The size of each batch
   * @param elementCount The total number of elements
   * @returns The number of batches required
   */
  public static threadCount(batchSize: number, elementCount: number): number {
    if (batchSize <= 0) {
      throw new Error(`Invalid batch size: ${batchSize}`);
    }
    
    if (batchSize >= elementCount) {
      return 1;
    }
    
    return Math.ceil(elementCount / batchSize);
  }

  /**
   * Calculate an adjusted batch size for optimal parallelism
   * 
   * @param nodeCount Total number of nodes to process
   * @param concurrency The level of concurrency to use
   * @param minBatchSize Minimum acceptable batch size
   * @returns An adjusted batch size
   */
  public static adjustedBatchSize(
    nodeCount: number,
    concurrency: Concurrency,
    minBatchSize: number
  ): number {
    const targetBatchSize = Math.ceil(nodeCount / concurrency.value());
    return Math.max(minBatchSize, targetBatchSize);
  }

  /**
   * Calculate an adjusted batch size with a maximum cap
   * 
   * @param nodeCount Total number of nodes to process
   * @param concurrency The level of concurrency to use
   * @param minBatchSize Minimum acceptable batch size
   * @param maxBatchSize Maximum acceptable batch size
   * @returns An adjusted batch size
   */
  public static adjustedBatchSizeWithCap(
    nodeCount: number,
    concurrency: Concurrency,
    minBatchSize: number,
    maxBatchSize: number
  ): number {
    return Math.min(
      maxBatchSize, 
      this.adjustedBatchSize(nodeCount, concurrency, minBatchSize)
    );
  }

  /**
   * Calculate a power-of-two batch size
   * 
   * @param nodeCount Total number of nodes to process
   * @param batchSize Initial batch size
   * @returns A power-of-two batch size
   */
  public static powerOfTwoBatchSize(nodeCount: number, batchSize: number): number {
    if (batchSize <= 0) {
      batchSize = 1;
    }
    
    batchSize = this.nextHighestPowerOfTwo(batchSize);
    
    // Ensure batch size doesn't lead to excessive batches
    while (((nodeCount + batchSize + 1) / batchSize) > Number.MAX_SAFE_INTEGER) {
      batchSize = batchSize << 1;
    }
    
    return batchSize;
  }

  /**
   * Check if a worker pool can run tasks in parallel
   * 
   * @param pool The worker pool to check
   * @returns true if the pool can run tasks in parallel
   */
  public static canRunInParallel(pool: WorkerPool | null): boolean {
    return pool != null && !pool.isShutdown();
  }

  /**
   * Process a range in parallel using batch ranges
   * 
   * @param concurrency The level of concurrency to use
   * @param size Total range size to process
   * @param pool The worker pool to use
   * @param task The task to execute for each batch range
   */
  public static async readParallel(
    concurrency: Concurrency,
    size: number,
    pool: WorkerPool,
    task: BiLongConsumer
  ): Promise<void> {
    const batchSize = Math.ceil(size / concurrency.value());
    
    if (!this.canRunInParallel(pool) || concurrency.value() === 1) {
      // Process sequentially
      for (let start = 0; start < size; start += batchSize) {
        const end = Math.min(size, start + batchSize);
        task.apply(start, end);
      }
    } else {
      // Process in parallel
      const tasks: (() => void)[] = [];
      
      for (let start = 0; start < size; start += batchSize) {
        const end = Math.min(size, start + batchSize);
        const finalStart = start;
        tasks.push(() => task.apply(finalStart, end));
      }
      
      await this.run(tasks, pool);
    }
  }

  /**
   * Creates a collection of tasks based on a supplier function
   * 
   * @param concurrency The level of concurrency to use
   * @param newTask A supplier function that creates tasks
   * @returns A collection of task instances
   */
  public static tasks<T extends () => void>(
    concurrency: Concurrency,
    newTask: () => T
  ): T[] {
    const tasks: T[] = [];
    for (let i = 0; i < concurrency.value(); i++) {
      tasks.push(newTask());
    }
    return tasks;
  }

  /**
   * Creates a collection of tasks based on an indexed function
   * 
   * @param concurrency The level of concurrency to use
   * @param newTask A function that creates tasks based on an index
   * @returns A collection of task instances
   */
  public static tasksWithIndex<T extends () => void>(
    concurrency: Concurrency,
    newTask: (index: number) => T
  ): T[] {
    const tasks: T[] = [];
    for (let i = 0; i < concurrency.value(); i++) {
      tasks.push(newTask(i));
    }
    return tasks;
  }

  /**
   * Runs a single task and waits for it to complete
   * 
   * @param task The task to run
   * @param pool The worker pool to use
   */
  public static async runSingle(task: () => void, pool: WorkerPool): Promise<void> {
    await this.awaitTermination([pool.submit(task)]);
  }

  /**
   * Runs a collection of tasks in parallel
   * 
   * @param tasks The tasks to run
   * @param pool The worker pool to use
   */
  public static async run(
    tasks: Array<() => void>,
    pool: WorkerPool
  ): Promise<void> {
    await this.awaitTermination(this.submitAll(tasks, true, pool));
  }

  /**
   * Submits tasks to a worker pool
   * 
   * @param tasks The tasks to submit
   * @param allowSynchronousRun Whether to allow running tasks synchronously if there's only one
   * @param pool The worker pool to use
   * @returns A collection of futures representing the submitted tasks
   */
  public static submitAll(
    tasks: Array<() => void>,
    allowSynchronousRun: boolean,
    pool: WorkerPool
  ): Future<void>[] {
    const noExecutor = !this.canRunInParallel(pool);

    if (allowSynchronousRun && (tasks.length === 1 || noExecutor)) {
      tasks.forEach(task => task());
      return [];
    }

    if (noExecutor) {
      throw new Error("No running executor provided and synchronous execution is not allowed");
    }

    const futures: Future<void>[] = [];
    
    for (const task of tasks) {
      futures.push(pool.submit(task));
    }

    return futures;
  }

  /**
   * Runs tasks with a configurable level of concurrency
   * 
   * @param params Configuration parameters for the run
   */
  public static async runWithConcurrency(params: RunWithConcurrencyParams): Promise<void> {
    const {
      concurrency,
      tasks,
      forceUsageOfExecutor = false,
      waitMillis = 10,
      maxWaitRetries = 100,
      mayInterruptIfRunning = true,
      terminationFlag,
      executor
    } = params;

    // Convert tasks to an iterator-like structure if it's an array
    const taskIterator = Array.isArray(tasks) 
      ? new ArrayIterator(tasks)
      : tasks;

    // If no executor or concurrency is 1 and not forcing usage of executor, run sequentially
    if (!this.canRunInParallel(executor) || (concurrency.value() === 1 && !forceUsageOfExecutor)) {
      while (taskIterator.hasNext()) {
        const task = taskIterator.next();
        terminationFlag.assertRunning();
        task();
      }
      return;
    }

    const completionService = new CompletionService(executor!, concurrency);
    const pushbackIterator = new PushbackIterator(taskIterator);
    
    let error: Error | null = null;
    
    try {
      // Submit initial batch of tasks
      for (let i = concurrency.value(); i-- > 0 && terminationFlag.running();) {
        if (!completionService.trySubmit(pushbackIterator)) {
          break;
        }
      }

      terminationFlag.assertRunning();

      // Process remaining tasks
      let tries = 0;
      while (pushbackIterator.hasNext()) {
        if (completionService.hasTasks()) {
          try {
            if (!await completionService.awaitOrFail()) {
              continue;
            }
          } catch (e) {
            error = this.chainError(error, e instanceof Error ? e : new Error(String(e)));
          }
        }

        terminationFlag.assertRunning();

        if (!completionService.trySubmit(pushbackIterator) && !completionService.hasTasks()) {
          if (++tries >= maxWaitRetries) {
            throw new Error(
              `Attempted to submit tasks for ${tries} times with a ${waitMillis} millisecond delay between each attempt, but ran out of time`
            );
          }
          await new Promise(resolve => setTimeout(resolve, waitMillis));
        }
      }

      // Wait for all tasks to finish
      while (completionService.hasTasks()) {
        terminationFlag.assertRunning();
        try {
          await completionService.awaitOrFail();
        } catch (e) {
          error = this.chainError(error, e instanceof Error ? e : new Error(String(e)));
        }
      }
    } finally {
      // Cancel all tasks regardless of done flag
      completionService.cancelAll(mayInterruptIfRunning);
      
      if (error) {
        throw error;
      }
    }
  }

  /**
   * Waits for all futures to complete
   * 
   * @param futures The futures to wait for
   */
  public static async awaitTermination(futures: Future<any>[]): Promise<void> {
    let done = false;
    let error: Error | null = null;
    
    try {
      for (const future of futures) {
        try {
          await future.get();
        } catch (e) {
          if (e instanceof Error && error !== e) {
            error = this.chainError(error, e);
          }
        }
      }
      done = true;
    } finally {
      if (!done) {
        // Cancel all futures if not done
        for (const future of futures) {
          future.cancel(false);
        }
      }
    }
    
    if (error) {
      throw error;
    }
  }

  /**
   * Chains multiple errors together
   * 
   * @param first The first error
   * @param second The second error to chain
   * @returns A chained error
   */
  private static chainError(first: Error | null, second: Error): Error {
    if (!first) return second;
    
    // In JavaScript, we don't have a direct equivalent of Java's exception chaining
    // So we'll append the message and stack trace
    const combined = new Error(`${first.message}\nCaused by: ${second.message}`);
    combined.stack = `${first.stack}\nCaused by: ${second.stack}`;
    return combined;
  }

  /**
   * Returns the next highest power of two
   * 
   * @param v The input value
   * @returns The next highest power of two
   */
  private static nextHighestPowerOfTwo(v: number): number {
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
  }
}

/**
 * Parameters for running tasks with concurrency
 */
export interface RunWithConcurrencyParams {
  /** The level of concurrency to use */
  concurrency: Concurrency;
  
  /** The tasks to run */
  tasks: Iterator<() => void> | Array<() => void>;
  
  /** Whether to force usage of the executor even for single-threaded execution */
  forceUsageOfExecutor?: boolean;
  
  /** The time to wait between retries in milliseconds */
  waitMillis?: number;
  
  /** The maximum number of retry attempts */
  maxWaitRetries?: number;
  
  /** Whether running tasks can be interrupted when cancelling */
  mayInterruptIfRunning?: boolean;
  
  /** Flag to check for early termination */
  terminationFlag: TerminationFlag;
  
  /** The worker pool to use */
  executor: WorkerPool | null;
}

/**
 * Service for managing task execution and completion
 */
class CompletionService {
  private static readonly AWAIT_TIMEOUT_MILLIS = 100;
  
  private readonly pool: WorkerPool;
  private readonly availableConcurrency: number;
  private readonly running: Set<Future<void>> = new Set();
  private readonly completionQueue: Array<Future<void>> = [];

  /**
   * Create a new completion service
   * 
   * @param pool The worker pool to use
   * @param targetConcurrency The target level of concurrency
   */
  constructor(pool: WorkerPool, targetConcurrency: Concurrency) {
    if (!ParallelUtil.canRunInParallel(pool)) {
      throw new Error("Worker pool already terminated or not usable");
    }
    
    this.pool = pool;
    this.availableConcurrency = pool.getCorePoolSize();
  }

  /**
   * Try to submit a task from the iterator
   * 
   * @param tasks The task iterator
   * @returns true if a task was submitted
   */
  trySubmit(tasks: PushbackIterator<() => void>): boolean {
    if (tasks.hasNext()) {
      const next = tasks.next();
      if (this.submit(next)) {
        return true;
      }
      tasks.pushBack(next);
    }
    return false;
  }

  /**
   * Submit a task to the pool
   * 
   * @param task The task to submit
   * @returns true if the task was submitted
   */
  submit(task: () => void): boolean {
    if (!task) {
      throw new Error("Task cannot be null");
    }
    
    if (this.canSubmit()) {
      const future = this.pool.submit(() => {
        try {
          task();
        } finally {
          this.running.delete(future);
          this.completionQueue.push(future);
        }
      });
      
      this.running.add(future);
      return true;
    }
    
    return false;
  }

  /**
   * Check if there are any tasks running or waiting
   */
  hasTasks(): boolean {
    return !(this.running.size === 0 && this.completionQueue.length === 0);
  }

  /**
   * Wait for a task to complete or timeout
   * 
   * @returns true if a task completed, false on timeout
   */
  async awaitOrFail(): Promise<boolean> {
    if (this.completionQueue.length === 0) {
      await new Promise(resolve => setTimeout(resolve, CompletionService.AWAIT_TIMEOUT_MILLIS));
      return false;
    }
    
    const task = this.completionQueue.shift()!;
    await task.get();
    return true;
  }

  /**
   * Cancel all tasks
   * 
   * @param mayInterruptIfRunning Whether to interrupt running tasks
   */
  cancelAll(mayInterruptIfRunning: boolean): void {
    // Cancel running tasks
    for (const future of this.running) {
      future.cancel(mayInterruptIfRunning);
    }
    this.running.clear();
    
    // Cancel queued tasks
    for (const future of this.completionQueue) {
      future.cancel(mayInterruptIfRunning);
    }
    this.completionQueue.length = 0;
  }

  /**
   * Check if a new task can be submitted
   */
  private canSubmit(): boolean {
    return this.pool.getActiveCount() < this.availableConcurrency;
  }
}

/**
 * Iterator that allows pushing back elements
 */
class PushbackIterator<T> {
  private readonly delegate: Iterator<T>;
  private pushedElement: T | null = null;
  
  /**
   * Create a new pushback iterator
   * 
   * @param delegate The underlying iterator
   */
  constructor(delegate: Iterator<T>) {
    this.delegate = delegate;
  }
  
  /**
   * Check if there are more elements
   */
  hasNext(): boolean {
    return this.pushedElement !== null || !this.delegate.next().done!;
  }
  
  /**
   * Get the next element
   */
  next(): T {
    let el: T;
    if (this.pushedElement !== null) {
      el = this.pushedElement;
      this.pushedElement = null;
      return el;
    }
    
    const result = this.delegate.next();
    if (result.done) {
      throw new Error("No more elements");
    }
    return result.value;
  }
  
  /**
   * Push back an element
   * 
   * @param element The element to push back
   */
  pushBack(element: T): void {
    if (this.pushedElement !== null) {
      throw new Error("Cannot push back twice");
    }
    this.pushedElement = element;
  }
}

/**
 * Iterator adapter for arrays
 */
class ArrayIterator<T> implements Iterator<T> {
  private readonly array: T[];
  private index = 0;
  
  /**
   * Create a new array iterator
   * 
   * @param array The array to iterate
   */
  constructor(array: T[]) {
    this.array = array;
  }
  
  /**
   * Get the next element
   */
  next(): IteratorResult<T> {
    if (this.index < this.array.length) {
      return { 
        value: this.array[this.index++], 
        done: false 
      };
    }
    return { value: undefined as any, done: true };
  }
  
  /**
   * Check if there are more elements
   */
  hasNext(): boolean {
    return this.index < this.array.length;
  }
}