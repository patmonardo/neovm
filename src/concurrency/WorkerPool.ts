import { Runnable } from './Runnable';
import { Future } from './Future';

/**
 * A pool of workers for executing tasks in parallel.
 */
export class WorkerPool {
  private readonly corePoolSize: number;
  private readonly maxPoolSize: number;
  private readonly workers: Worker[] = [];
  private readonly taskQueue: Array<{
    task: Runnable<any>,
    resolve: (value: any) => void,
    reject: (error: any) => void
  }> = [];
  private readonly activeWorkers: Set<Worker> = new Set();
  
  /**
   * Creates a new worker pool
   * 
   * @param corePoolSize The core number of workers to keep alive
   * @param maxPoolSize The maximum number of workers
   */
  constructor(corePoolSize: number, maxPoolSize: number) {
    this.corePoolSize = corePoolSize;
    this.maxPoolSize = maxPoolSize;
    
    // Initialize core workers
    for (let i = 0; i < corePoolSize; i++) {
      this.createWorker();
    }
  }
  
  /**
   * Creates a new worker
   */
  private createWorker(): Worker {
    // In a real implementation, you'd create an actual Web Worker or Node.js Worker
    // For this example, we'll simulate with a timeout-based worker
    const worker = {
      busy: false,
      execute: <T>(task: Runnable<T>): Promise<T> => {
        worker.busy = true;
        this.activeWorkers.add(worker as any);
        
        return new Promise((resolve, reject) => {
          // Execute the task asynchronously
          setTimeout(() => {
            try {
              const result = task.run();
              resolve(result);
            } catch (error) {
              reject(error);
            } finally {
              worker.busy = false;
              this.activeWorkers.delete(worker as any);
              this.processNextTask();
            }
          }, 0);
        });
      }
    } as any as Worker;
    
    this.workers.push(worker);
    return worker;
  }
  
  /**
   * Process the next task in the queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) {
      return;
    }
    
    // Find an idle worker
    let worker = this.workers.find(w => !w.busy);
    
    // If no idle workers and below maxPoolSize, create a new one
    if (!worker && this.workers.length < this.maxPoolSize) {
      worker = this.createWorker();
    }
    
    // If we have an available worker, assign a task
    if (worker && !worker.busy) {
      const nextTask = this.taskQueue.shift()!;
      worker.execute(nextTask.task)
        .then(nextTask.resolve)
        .catch(nextTask.reject);
    }
  }
  
  /**
   * Executes a task and returns a Future representing the result
   * 
   * @param task The task to execute
   * @returns A Future representing the pending result
   */
  public submit<T>(task: Runnable<T>): Future<T> {
    return new Future<T>((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processNextTask();
    });
  }
  
  /**
   * Executes multiple tasks and returns a Future representing all results
   * 
   * @param tasks The tasks to execute
   * @returns A Future representing all pending results
   */
  public invokeAll<T>(tasks: Runnable<T>[]): Future<T[]> {
    return new Future<T[]>((resolve, reject) => {
      if (tasks.length === 0) {
        resolve([]);
        return;
      }
      
      const results: T[] = new Array(tasks.length);
      let completed = 0;
      let hasError = false;
      
      tasks.forEach((task, index) => {
        this.submit(task)
          .then(result => {
            if (hasError) return;
            
            results[index] = result;
            completed++;
            
            if (completed === tasks.length) {
              resolve(results);
            }
          })
          .catch(error => {
            if (hasError) return;
            
            hasError = true;
            reject(error);
          });
      });
    });
  }
  
  /**
   * Shuts down the worker pool, stopping all workers
   */
  public shutdown(): void {
    // In a real implementation with actual Workers, terminate them here
    this.workers.length = 0;
    this.activeWorkers.clear();
    this.taskQueue.length = 0;
  }
}