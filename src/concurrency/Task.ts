/**
 * A task that can be executed by a worker thread.
 */
export interface Task<T> {
  /**
   * Execute the task and return a result.
   */
  execute(): T;
}

/**
 * A pool of worker threads for parallel task execution.
 */
export class WorkerPool<T> {
  private readonly workers: Worker[] = [];
  private readonly taskQueue: Task<T>[] = [];
  private readonly resultBuffer: T[] = [];
  public readonly maxWorkers: number;
  private readonly sharedCounter: SharedArrayBuffer;
  private readonly counterView: Int32Array;

  /**
   * Creates a new worker pool.
   *
   * @param workerScript Path to the worker script
   * @param maxWorkers Maximum number of workers (defaults to number of CPU cores)
   */
  constructor(workerScript: string, maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = maxWorkers;
    this.sharedCounter = new SharedArrayBuffer(4);
    this.counterView = new Int32Array(this.sharedCounter);

    // Create workers
    for (let i = 0; i < maxWorkers; i++) {
      const worker = new Worker(workerScript);

      worker.onmessage = (event) => {
        // Handle result from worker
        this.resultBuffer.push(event.data.result);

        // Update completion counter
        Atomics.add(this.counterView, 0, 1);

        // Notify anyone waiting on results
        Atomics.notify(this.counterView, 0);

        // Check if there are more tasks to process
        this.assignTaskToWorker(worker);
      };

      this.workers.push(worker);
    }
  }

  /**
   * Assigns a task to a worker if available.
   */
  private assignTaskToWorker(worker: Worker): boolean {
    if (this.taskQueue.length === 0) {
      return false;
    }

    const task = this.taskQueue.shift()!;
    worker.postMessage({ task: task.execute });
    return true;
  }

  /**
   * Submits a task for execution.
   *
   * @param task The task to execute
   */
  public submit(task: Task<T>): void {
    this.taskQueue.push(task);

    // Try to find an idle worker
    for (const worker of this.workers) {
      if (this.assignTaskToWorker(worker)) {
        break;
      }
    }
  }

  /**
   * Waits for all submitted tasks to complete.
   *
   * @returns Array of task results
   */
  public async awaitAll(): Promise<T[]> {
    // Wait until all tasks are processed
    const totalTasks = this.taskQueue.length + this.resultBuffer.length;

    while (Atomics.load(this.counterView, 0) < totalTasks) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Return all results
    const results = [...this.resultBuffer];
    this.resultBuffer.length = 0;
    return results;
  }

  /**
   * Shuts down the worker pool.
   */
  public shutdown(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;
    this.taskQueue.length = 0;
    this.resultBuffer.length = 0;
  }
}
