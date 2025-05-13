import { WorkerPool } from './WorkerPool';
import { Concurrency } from './Concurrency';
import { ScheduledWorkerPool } from './ScheduledWorkerPool';
import { WorkerFactory } from './WorkerFactory';
import { Runnable } from './Runnable';
import { Future } from './Future';

/**
 * Utility class for creating and managing worker pools.
 */
export class ExecutorServiceUtil {
  /**
   * Prefix for default worker names
   */
  private static readonly THREAD_NAME_PREFIX = "gds";

  /**
   * Default worker factory that creates daemon workers
   */
  public static readonly DEFAULT_WORKER_FACTORY: WorkerFactory = 
    WorkerFactory.daemon(ExecutorServiceUtil.THREAD_NAME_PREFIX);

  /**
   * Default single-thread worker pool for algorithmic operations
   */
  public static readonly DEFAULT_SINGLE_THREAD_POOL: WorkerPool = 
    ExecutorServiceUtil.createSingleThreadPool("algo");

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("This utility class cannot be instantiated");
  }

  /**
   * Creates a worker pool with a single worker thread
   * 
   * @param workerPrefix Prefix for the worker name
   * @returns A worker pool with a single worker
   */
  public static createSingleThreadPool(workerPrefix: string): WorkerPool {
    return new WorkerPool(1, 1, WorkerFactory.daemon(workerPrefix));
  }

  /**
   * Creates a scheduled worker pool with a single worker thread
   * 
   * @param workerPrefix Prefix for the worker name
   * @returns A scheduled worker pool with a single worker
   */
  public static createSingleThreadScheduler(workerPrefix: string): ScheduledWorkerPool {
    return new ScheduledWorkerPool(1, 1, WorkerFactory.daemon(workerPrefix));
  }

  /**
   * Creates a worker pool with the specified core and max sizes
   * 
   * @param corePoolSize The core number of workers to keep alive
   * @param maxPoolSize The maximum number of workers
   * @returns A new worker pool
   */
  public static createThreadPool(corePoolSize: number, maxPoolSize: number): WorkerPool;

  /**
   * Creates a worker pool with the specified worker prefix, core and max sizes
   * 
   * @param workerPrefix Prefix for the worker names
   * @param corePoolSize The core number of workers to keep alive
   * @param maxPoolSize The maximum number of workers
   * @returns A new worker pool
   */
  public static createThreadPool(
    workerPrefixOrCoreSize: string | number,
    coreOrMaxPoolSize: number,
    maxPoolSize?: number
  ): WorkerPool {
    if (typeof workerPrefixOrCoreSize === 'number') {
      return ExecutorServiceUtil.createThreadPool(
        ExecutorServiceUtil.THREAD_NAME_PREFIX,
        workerPrefixOrCoreSize,
        coreOrMaxPoolSize
      );
    }

    const workerPrefix = workerPrefixOrCoreSize;
    const corePoolSize = coreOrMaxPoolSize;
    const actualMaxPoolSize = maxPoolSize!;

    return new WorkerPool(
      corePoolSize,
      actualMaxPoolSize,
      WorkerFactory.daemon(workerPrefix),
      {
        rejectionHandler: new CallerBlocksPolicy(),
        queueCapacity: corePoolSize * 50
      }
    );
  }

  /**
   * Creates a fork-join style worker pool optimized for divide-and-conquer tasks
   * 
   * @param concurrency The concurrency level for the pool
   * @returns A worker pool configured for fork-join operations
   */
  public static createForkJoinPool(concurrency: Concurrency): WorkerPool {
    return new WorkerPool(
      concurrency.value(),
      concurrency.value(),
      new ForkJoinWorkerFactory(),
      {
        workStealing: true
      }
    );
  }

  /**
   * Creates a new worker for running a task
   * 
   * @param code The task to run
   * @returns A promise that resolves when the worker completes
   */
  public static async runWorker<T>(task: Runnable<T>): Promise<T> {
    const future = ExecutorServiceUtil.DEFAULT_SINGLE_THREAD_POOL.submit(task);
    return future.get();
  }
}

/**
 * A rejection policy that blocks the caller when the queue is full instead of
 * throwing an error, similar to Java's CallerBlocksPolicy.
 */
export class CallerBlocksPolicy implements RejectionHandler {
  /**
   * Handles rejected tasks by periodically trying to resubmit them to the queue.
   * 
   * @param task The rejected task
   * @param pool The worker pool that rejected the task
   * @returns A future representing the result of the task
   */
  public rejectedExecution<T>(task: Runnable<T>, pool: WorkerPool): Future<T> {
    return new Future<T>((resolve, reject) => {
      // Create a function to periodically try submitting the task
      const trySubmit = async () => {
        if (pool.isShutdown()) {
          reject(new Error("Worker pool has been shut down"));
          return;
        }
        
        try {
          // Try to submit the task to the queue with a timeout
          const submitted = await pool.trySubmitToQueue(task, 250);
          
          if (submitted) {
            // Task was accepted, wait for the result
            try {
              const result = await submitted.get();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else {
            // Try again after a short delay
            setTimeout(trySubmit, 250);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      // Start trying to submit the task
      trySubmit();
    });
  }
}

/**
 * Interface for handling rejected tasks
 */
export interface RejectionHandler {
  /**
   * Handles a task that was rejected by a worker pool
   * 
   * @param task The rejected task
   * @param pool The worker pool that rejected the task
   * @returns A future representing the result of the task
   */
  rejectedExecution<T>(task: Runnable<T>, pool: WorkerPool): Future<T>;
}

/**
 * Factory for creating workers optimized for fork-join operations
 */
class ForkJoinWorkerFactory implements WorkerFactory {
  private workerIndex = 0;
  
  /**
   * Creates a new worker
   * 
   * @returns A worker object
   */
  public newWorker(): Worker {
    const worker = new Worker(this.getWorkerScript());
    worker.name = `${ExecutorServiceUtil.THREAD_NAME_PREFIX}-forkjoin-${this.workerIndex++}`;
    return worker;
  }
  
  /**
   * Gets the source for the worker script
   */
  private getWorkerScript(): string {
    // In a real implementation, this would return a URL to a worker script
    // For this example, we'll return a blob URL with a minimal worker script
    const script = `
      self.onmessage = function(e) {
        try {
          const result = e.data.task();
          self.postMessage({ result });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `;
    
    const blob = new Blob([script], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }
}