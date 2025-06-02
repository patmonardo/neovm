import { Concurrency } from "./Concurrency";
import { BiLongConsumer } from "./BiLongConsumer";
import { TerminationFlag } from "@/termination/TerminationFlag";
import { WorkerPool } from "./WorkerPool";
import { Future } from "./Future";
import { Runnable } from "./Runnable";
import { NamedThreadFactory } from "./NamedThreadFactory";
import { PoolSizes } from "./PoolSizes";
import { Log } from "@/utils/Log";

/**
 * Utility class for running tasks in parallel.
 * TypeScript port of Neo4j GDS ParallelUtil.
 */
export class ParallelUtil {
  public static readonly DEFAULT_BATCH_SIZE = 10_000;

  private constructor() {
    throw new Error("ParallelUtil cannot be instantiated");
  }

  /**
   * Executes a function in parallel on the given data using a ForkJoin pool.
   */
  public static async parallelStream<T, R>(
    data: T[],
    concurrency: Concurrency,
    fn: (data: T[]) => R
  ): Promise<R> {
    const pool = new WorkerPool(
      PoolSizes.fixed(concurrency.value()),
      NamedThreadFactory.named("parallel-stream"),
      Log.noOp()
    );

    try {
      const future = pool.submit({
        run: () => fn(data),
      });
      return await future.get();
    } finally {
      pool.shutdown();
    }
  }

  /**
   * Executes a stream consumer in parallel with termination support.
   */
  public static async parallelStreamConsume<T>(
    data: T[],
    concurrency: Concurrency,
    terminationFlag: TerminationFlag,
    consumer: (data: T[]) => void
  ): Promise<void> {
    await this.parallelStream(data, concurrency, (d) => {
      terminationFlag.assertRunning?.();
      consumer(d);
      return null;
    });
  }

  /**
   * Process node IDs in parallel with termination support.
   */
  public static async parallelForEachNode(
    nodeCount: number,
    concurrency: Concurrency,
    terminationFlag: TerminationFlag,
    consumer: (nodeId: number) => void
  ): Promise<void> {
    // Create ranges for parallel processing
    const ranges: number[][] = [];
    const batchSize = Math.ceil(nodeCount / concurrency.value());

    for (let start = 0; start < nodeCount; start += batchSize) {
      const end = Math.min(nodeCount, start + batchSize);
      const range = Array.from({ length: end - start }, (_, i) => start + i);
      ranges.push(range);
    }

    await this.parallelStreamConsume(
      ranges,
      concurrency,
      terminationFlag,
      (range) => range.forEach(consumer)
    );
  }

  /**
   * Calculate number of threads needed for processing.
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
   * Calculate adjusted batch size for optimal distribution.
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
   * Calculate adjusted batch size with max cap.
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
   * Calculate power-of-two aligned batch size.
   */
  public static powerOfTwoBatchSize(
    nodeCount: number,
    batchSize: number
  ): number {
    if (batchSize <= 0) {
      batchSize = 1;
    }

    batchSize = this.nextHighestPowerOfTwo(batchSize);

    while ((nodeCount + batchSize + 1) / batchSize > Number.MAX_SAFE_INTEGER) {
      batchSize = batchSize << 1;
    }

    return batchSize;
  }

  /**
   * Check if worker pool can run in parallel.
   */
  public static canRunInParallel(pool: WorkerPool | null): boolean {
    return pool !== null && !pool.isShutdown();
  }

  /**
   * Process ranges in parallel with batch processing.
   */
  public static async readParallel(
    concurrency: Concurrency,
    size: number,
    executor: WorkerPool,
    task: BiLongConsumer
  ): Promise<void> {
    const batchSize = Math.ceil(size / concurrency.value());

    if (!this.canRunInParallel(executor) || concurrency.value() === 1) {
      // Sequential processing
      for (let start = 0; start < size; start += batchSize) {
        const end = Math.min(size, start + batchSize);
        task.apply(start, end);
      }
    } else {
      // Parallel processing
      const runnables: Runnable<void>[] = [];

      for (let start = 0; start < size; start += batchSize) {
        const end = Math.min(size, start + batchSize);
        const finalStart = start;
        runnables.push({
          run: () => task.apply(finalStart, end),
        });
      }

      await this.run(runnables, executor);
    }
  }

  /**
   * Create collection of tasks from supplier.
   */
  public static tasks(
    concurrency: Concurrency,
    newTask: () => Runnable<void>
  ): Runnable<void>[] {
    const tasks: Runnable<void>[] = [];
    for (let i = 0; i < concurrency.value(); i++) {
      tasks.push(newTask());
    }
    return tasks;
  }

  /**
   * Create collection of tasks with index parameter.
   */
  public static tasksWithIndex(
    concurrency: Concurrency,
    newTask: (index: number) => Runnable<void>
  ): Runnable<void>[] {
    const tasks: Runnable<void>[] = [];
    for (let i = 0; i < concurrency.value(); i++) {
      tasks.push(newTask(i));
    }
    return tasks;
  }

  /**
   * Run single task and wait for completion.
   */
  public static async runSingle(
    task: Runnable<void>,
    executor: WorkerPool
  ): Promise<void> {
    await this.awaitTermination([executor.submit(task)]);
  }

  /**
   * Run collection of tasks in parallel.
   */
  public static async run(
    tasks: Runnable<void>[],
    executor: WorkerPool
  ): Promise<void> {
    await this.run(tasks, executor, null);
  }

  /**
   * Run collection of tasks with futures collection.
   */
  public static async run(
    tasks: Runnable<void>[],
    executor: WorkerPool,
    futures: Future<void>[] | null
  ): Promise<void> {
    await this.awaitTermination(this.submitAll(tasks, true, executor, futures));
  }

  /**
   * Submit all tasks to executor.
   */
  public static submitAll(
    tasks: Runnable<void>[],
    allowSynchronousRun: boolean,
    executor: WorkerPool,
    futures?: Future<void>[] | null
  ): Future<void>[] {
    const noExecutor = !this.canRunInParallel(executor);

    if (allowSynchronousRun && (tasks.length === 1 || noExecutor)) {
      tasks.forEach((task) => task.run());
      return [];
    }

    if (noExecutor) {
      throw new Error(
        "No running executor provided and synchronous execution is not allowed"
      );
    }

    if (futures) {
      futures.length = 0; // Clear existing futures
    } else {
      futures = [];
    }

    for (const task of tasks) {
      futures.push(executor.submit(task));
    }

    return futures;
  }

  /**
   * Run tasks with advanced concurrency control.
   */
  public static async runWithConcurrency(
    params: RunWithConcurrencyParams
  ): Promise<void> {
    const {
      concurrency,
      tasks,
      forceUsageOfExecutor = false,
      waitMillis = 10,
      maxWaitRetries = 100,
      mayInterruptIfRunning = true,
      terminationFlag,
      executor,
    } = params;

    // Convert to iterator if needed
    const taskIterator = Array.isArray(tasks)
      ? new ArrayIterator(tasks)
      : tasks;

    // Check for sequential execution
    if (
      !this.canRunInParallel(executor) ||
      (concurrency.value() === 1 && !forceUsageOfExecutor)
    ) {
      while (taskIterator.hasNext()) {
        const task = taskIterator.next();
        terminationFlag.assertRunning?.();
        task.run();
      }
      return;
    }

    const completionService = new CompletionService(executor!, concurrency);
    const pushbackIterator = new PushbackIterator(taskIterator);

    let error: Error | null = null;

    try {
      // Submit initial tasks
      for (
        let i = concurrency.value();
        i-- > 0 && terminationFlag.running();

      ) {
        if (!completionService.trySubmit(pushbackIterator)) {
          break;
        }
      }

      terminationFlag.assertRunning?.();

      // Process remaining tasks
      let tries = 0;
      while (pushbackIterator.hasNext()) {
        if (completionService.hasTasks()) {
          try {
            if (!(await completionService.awaitOrFail())) {
              continue;
            }
          } catch (e) {
            error = this.chainError(
              error,
              e instanceof Error ? e : new Error(String(e))
            );
          }
        }

        terminationFlag.assertRunning?.();

        if (
          !completionService.trySubmit(pushbackIterator) &&
          !completionService.hasTasks()
        ) {
          if (++tries >= maxWaitRetries) {
            throw new Error(
              `Attempted to submit tasks for ${tries} times with a ${waitMillis}ms delay, but ran out of time`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, waitMillis));
        }
      }

      // Wait for completion
      while (completionService.hasTasks()) {
        terminationFlag.assertRunning?.();
        try {
          await completionService.awaitOrFail();
        } catch (e) {
          error = this.chainError(
            error,
            e instanceof Error ? e : new Error(String(e))
          );
        }
      }
    } finally {
      completionService.cancelAll(mayInterruptIfRunning);
      if (error) {
        throw error;
      }
    }
  }

  /**
   * Wait for all futures to complete.
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
        for (const future of futures) {
          future.cancel();
        }
      }
    }

    if (error) {
      throw error;
    }
  }

  // Private utility methods

  private static chainError(first: Error | null, second: Error): Error {
    if (!first) return second;
    const combined = new Error(
      `${first.message}\nCaused by: ${second.message}`
    );
    combined.stack = `${first.stack}\nCaused by: ${second.stack}`;
    return combined;
  }

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

// Supporting interfaces and classes

export interface RunWithConcurrencyParams {
  concurrency: Concurrency;
  tasks: Iterator<Runnable<void>> | Runnable<void>[];
  forceUsageOfExecutor?: boolean;
  waitMillis?: number;
  maxWaitRetries?: number;
  mayInterruptIfRunning?: boolean;
  terminationFlag: TerminationFlag;
  executor: WorkerPool | null;
}

/**
 * Completion service for managing task execution.
 */
class CompletionService {
  private static readonly AWAIT_TIMEOUT_MILLIS = 100;

  private readonly executor: WorkerPool;
  private readonly availableConcurrency: number;
  private readonly running: Set<Future<void>> = new Set();
  private readonly completionQueue: Future<void>[] = [];

  constructor(executor: WorkerPool, targetConcurrency: Concurrency) {
    if (!ParallelUtil.canRunInParallel(executor)) {
      throw new Error("Executor already terminated or not usable");
    }

    this.executor = executor;
    this.availableConcurrency = executor.getCorePoolSize();
  }

  trySubmit(tasks: PushbackIterator<Runnable<void>>): boolean {
    if (tasks.hasNext()) {
      const next = tasks.next();
      if (this.submit(next)) {
        return true;
      }
      tasks.pushBack(next);
    }
    return false;
  }

  submit(task: Runnable<void>): boolean {
    if (!task) {
      throw new Error("Task cannot be null");
    }

    if (this.canSubmit()) {
      const future = this.executor.submit(task);
      this.running.add(future);

      // Move to completion queue when done
      future
        .then(() => {
          this.running.delete(future);
          this.completionQueue.push(future);
        })
        .catch(() => {
          this.running.delete(future);
          this.completionQueue.push(future);
        });

      return true;
    }

    return false;
  }

  hasTasks(): boolean {
    return this.running.size > 0 || this.completionQueue.length > 0;
  }

  async awaitOrFail(): Promise<boolean> {
    if (this.completionQueue.length === 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, CompletionService.AWAIT_TIMEOUT_MILLIS)
      );
      return false;
    }

    const task = this.completionQueue.shift()!;
    await task.get();
    return true;
  }

  cancelAll(mayInterruptIfRunning: boolean): void {
    for (const future of this.running) {
      future.cancel();
    }
    this.running.clear();

    for (const future of this.completionQueue) {
      future.cancel();
    }
    this.completionQueue.length = 0;
  }

  private canSubmit(): boolean {
    return this.executor.getActiveCount() < this.availableConcurrency;
  }
}

/**
 * Iterator with pushback capability.
 */
class PushbackIterator<T> {
  private readonly delegate: Iterator<T>;
  private pushedElement: T | null = null;

  constructor(delegate: Iterator<T>) {
    this.delegate = delegate;
  }

  hasNext(): boolean {
    return this.pushedElement !== null || !this.delegate.next().done;
  }

  next(): T {
    if (this.pushedElement !== null) {
      const el = this.pushedElement;
      this.pushedElement = null;
      return el;
    }

    const result = this.delegate.next();
    if (result.done) {
      throw new Error("No more elements");
    }
    return result.value;
  }

  pushBack(element: T): void {
    if (this.pushedElement !== null) {
      throw new Error("Cannot push back twice");
    }
    this.pushedElement = element;
  }
}

/**
 * Array iterator implementation.
 */
class ArrayIterator<T> implements Iterator<T> {
  private readonly array: T[];
  private index = 0;

  constructor(array: T[]) {
    this.array = array;
  }

  next(): IteratorResult<T> {
    if (this.index < this.array.length) {
      return {
        value: this.array[this.index++],
        done: false,
      };
    }
    return { value: undefined as any, done: true };
  }

  hasNext(): boolean {
    return this.index < this.array.length;
  }
}
