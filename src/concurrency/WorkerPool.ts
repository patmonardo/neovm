import { Runnable } from './Runnable';
import { Future } from './Future';
import { WorkerFactory } from './WorkerFactory';
import { PoolSizes } from './PoolSizes';
import { Log } from '@/utils/Log';

/**
 * Task message sent to workers
 */
interface TaskMessage {
  id: string;
  type: 'task';
  taskData: any;
  functionCode: string;
}

/**
 * Result message from workers
 */
interface ResultMessage {
  id: string;
  type: 'result' | 'error';
  result?: any;
  error?: string;
  stack?: string;
}

/**
 * Worker wrapper with state tracking
 */
interface ManagedWorker {
  worker: Worker;
  busy: boolean;
  currentTaskId: string | null;
}

/**
 * Pending task awaiting execution
 */
interface PendingTask<T> {
  id: string;
  task: Runnable<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  cancelled: boolean;
}

/**
 * A pool of Web Workers for executing tasks in parallel.
 *
 * This implementation:
 * - Creates actual Web Workers for true parallel execution
 * - Manages worker lifecycle and task distribution
 * - Handles serialization/deserialization of tasks and results
 * - Provides proper error handling and cancellation
 */
export class WorkerPool {
  private readonly corePoolSize: number;
  private readonly maxPoolSize: number;
  private readonly workerFactory: WorkerFactory;
  private readonly log: Log;

  // Worker management
  private readonly workers: ManagedWorker[] = [];
  private readonly taskQueue: PendingTask<any>[] = [];
  private readonly pendingTasks = new Map<string, PendingTask<any>>();

  // State tracking
  private _isShutdown = false;
  private nextScheduledTaskId: number = 0;

  /**
   * Creates a new worker pool with the specified pool sizes.
   */
  constructor(
    poolSizes: PoolSizes,
    workerFactory: WorkerFactory = WorkerFactory.daemon('worker-pool'),
    log: Log = Log.noOp()
  ) {
    this.corePoolSize = poolSizes.corePoolSize();
    this.maxPoolSize = poolSizes.maxPoolSize();
    this.workerFactory = workerFactory;
    this.log = log;

    // Initialize core workers
    for (let i = 0; i < this.corePoolSize; i++) {
      this.createWorker();
    }

    this.log.debug('WorkerPool created with %d core workers, %d max workers',
      this.corePoolSize, this.maxPoolSize);
  }

  /**
   * Creates a new managed worker and sets up message handling.
   */
  private createWorker(): ManagedWorker {
    if (this._isShutdown) {
      throw new Error('WorkerPool has been shut down');
    }

    const worker = this.workerFactory.newWorker();
    const managedWorker: ManagedWorker = {
      worker,
      busy: false,
      currentTaskId: null
    };

    // Set up message handling
    worker.onmessage = (event: MessageEvent<ResultMessage>) => {
      this.handleWorkerMessage(managedWorker, event.data);
    };

    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(managedWorker, error);
    };

    this.workers.push(managedWorker);
    this.log.debug('Created worker, total workers: %d', this.workers.length);

    return managedWorker;
  }

  /**
   * Handles messages from workers.
   */
  private handleWorkerMessage(managedWorker: ManagedWorker, message: ResultMessage): void {
    const task = this.pendingTasks.get(message.id);
    if (!task) {
      this.log.warn('Received result for unknown task: %s', message.id);
      return;
    }

    // Clean up task tracking
    this.pendingTasks.delete(message.id);
    managedWorker.busy = false;
    managedWorker.currentTaskId = null;

    // Handle the result
    if (task.cancelled) {
      this.log.debug('Task %s was cancelled, ignoring result', message.id);
    } else if (message.type === 'error') {
      const error = new Error(message.error || 'Worker task failed');
      if (message.stack) {
        error.stack = message.stack;
      }
      task.reject(error);
    } else {
      task.resolve(message.result);
    }

    // Process next task if any
    this.processNextTask();
  }

  /**
   * Handles worker errors.
   */
  private handleWorkerError(managedWorker: ManagedWorker, error: ErrorEvent): void {
    this.log.error('Worker error: %s', error.message, error.error);

    // If there's a current task, reject it
    if (managedWorker.currentTaskId) {
      const task = this.pendingTasks.get(managedWorker.currentTaskId);
      if (task && !task.cancelled) {
        task.reject(new Error(`Worker error: ${error.message}`));
      }
      this.pendingTasks.delete(managedWorker.currentTaskId);
    }

    // Mark worker as not busy and remove from pool
    managedWorker.busy = false;
    managedWorker.currentTaskId = null;
    const index = this.workers.indexOf(managedWorker);
    if (index >= 0) {
      this.workers.splice(index, 1);
    }

    // Terminate the faulty worker
    managedWorker.worker.terminate();

    // Create a replacement worker if we're below core size
    if (this.workers.length < this.corePoolSize && !this._isShutdown) {
      this.createWorker();
    }

    // Process next task
    this.processNextTask();
  }

  /**
   * Processes the next task in the queue.
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0 || this._isShutdown) {
      return;
    }

    // Find an idle worker
    let managedWorker = this.workers.find(w => !w.busy);

    // If no idle workers and below maxPoolSize, create a new one
    if (!managedWorker && this.workers.length < this.maxPoolSize) {
      managedWorker = this.createWorker();
    }

    // If we have an available worker, assign a task
    if (managedWorker && !managedWorker.busy) {
      const task = this.taskQueue.shift()!;

      if (task.cancelled) {
        // Task was cancelled while waiting, try next task
        this.processNextTask();
        return;
      }

      this.executeTaskOnWorker(managedWorker, task);
    }
  }

  /**
   * Executes a task on the specified worker.
   */
  private executeTaskOnWorker<T>(managedWorker: ManagedWorker, task: PendingTask<T>): void {
    managedWorker.busy = true;
    managedWorker.currentTaskId = task.id;

    try {
      // Serialize the task function for the worker
      const functionCode = this.serializeTask(task.task);

      const message: TaskMessage = {
        id: task.id,
        type: 'task',
        taskData: null, // Tasks are functions, not data
        functionCode
      };

      managedWorker.worker.postMessage(message);
      this.log.debug('Task %s sent to worker', task.id);

    } catch (error) {
      // Failed to serialize or send task
      managedWorker.busy = false;
      managedWorker.currentTaskId = null;

      if (!task.cancelled) {
        task.reject(new Error(`Failed to send task to worker: ${(error as Error).message}`));
      }

      // Try next task
      this.processNextTask();
    }
  }

  /**
   * Serializes a task function for execution in a worker.
   */
  private serializeTask<T>(task: Runnable<T>): string {
    if (typeof task.run !== 'function') {
      throw new Error('Task must have a run() method');
    }

    // Convert the function to a string
    const functionString = task.run.toString();

    // Create a wrapper that calls the function and returns the result
    return `
      (function() {
        const taskFunction = ${functionString};
        try {
          const result = taskFunction.call(this);
          return result;
        } catch (error) {
          throw error;
        }
      })()
    `;
  }

  /**
   * Submits a task for execution and returns a Future representing the result.
   */
  public submit<T>(task: Runnable<T>): Future<T> {
    if (this._isShutdown) {
      return Future.rejected(new Error('WorkerPool has been shut down'));
    }

    return new Future<T>((resolve, reject) => {
      const taskId = `task-${this.nextScheduledTaskId++}`;

      const pendingTask: PendingTask<T> = {
        id: taskId,
        task,
        resolve,
        reject,
        cancelled: false
      };

      this.pendingTasks.set(taskId, pendingTask);
      this.taskQueue.push(pendingTask);

      this.log.debug('Task %s queued, queue size: %d', taskId, this.taskQueue.length);

      // Try to process immediately
      this.processNextTask();
    });
  }

  /**
   * Submits multiple tasks and returns a Future representing all results.
   */
  public invokeAll<T>(tasks: Runnable<T>[]): Future<T[]> {
    if (tasks.length === 0) {
      return Future.resolved([]);
    }

    const futures = tasks.map(task => this.submit(task));
    return Future.all(futures);
  }

  /**
   * Cancels a pending task if it hasn't started yet.
   */
  public cancelTask(taskId: string): boolean {
    const task = this.pendingTasks.get(taskId);
    if (task && !task.cancelled) {
      task.cancelled = true;

      // If the task is still in the queue, remove it
      const queueIndex = this.taskQueue.indexOf(task);
      if (queueIndex >= 0) {
        this.taskQueue.splice(queueIndex, 1);
        this.pendingTasks.delete(taskId);
        task.reject(new Error('Task was cancelled'));
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the current number of active workers.
   */
  public getActiveWorkerCount(): number {
    return this.workers.filter(w => w.busy).length;
  }

  /**
   * Returns the current queue size.
   */
  public getQueueSize(): number {
    return this.taskQueue.length;
  }

  /**
   * Returns true if the pool can accept more work.
   */
  public canAcceptWork(): boolean {
    return !this._isShutdown && (
      this.workers.some(w => !w.busy) ||
      this.workers.length < this.maxPoolSize
    );
  }

  /**
   * Initiates an orderly shutdown of the worker pool.
   */
  public shutdown(): void {
    if (this._isShutdown) {
      return;
    }

    this.log.info('Shutting down WorkerPool with %d workers', this.workers.length);
    this._isShutdown = true;

    // Cancel all pending tasks
    for (const task of this.taskQueue) {
      if (!task.cancelled) {
        task.cancelled = true;
        task.reject(new Error('WorkerPool is shutting down'));
      }
    }
    this.taskQueue.length = 0;

    // Terminate all workers
    for (const managedWorker of this.workers) {
      managedWorker.worker.terminate();
    }
    this.workers.length = 0;
    this.pendingTasks.clear();
  }

  /**
   * Attempts to stop all actively executing tasks and returns a list of tasks
   * that were awaiting execution.
   */
  public shutdownNow(): PendingTask<any>[] {
    const pendingTasks = [...this.taskQueue];
    this.shutdown();
    return pendingTasks;
  }

  /**
   * Returns true if this pool has been shut down.
   */
  public isShutdown(): boolean {
    return this._isShutdown;
  }

  /**
   * Returns true if all tasks have completed following shut down.
   */
  public isTerminated(): boolean {
    return this._isShutdown &&
           this.workers.length === 0 &&
           this.pendingTasks.size === 0;
  }
}
