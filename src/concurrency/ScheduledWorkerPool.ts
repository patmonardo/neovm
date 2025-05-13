import { WorkerPool } from './WorkerPool';
import { WorkerFactory } from './WorkerFactory';
import { Runnable } from './Runnable';
import { Future } from './Future';
import { ScheduledFuture } from './ScheduledFuture';

/**
 * A worker pool that can schedule tasks to run after a delay or periodically.
 */
export class ScheduledWorkerPool extends WorkerPool {
  private readonly scheduledTasks: Map<number, NodeJS.Timeout> = new Map();
  private nextTaskId = 0;
  
  /**
   * Schedules a task to run after a delay
   * 
   * @param task The task to run
   * @param delay The delay in milliseconds
   * @returns A ScheduledFuture representing the pending result
   */
  public schedule<T>(task: Runnable<T>, delay: number): ScheduledFuture<T> {
    const taskId = this.nextTaskId++;
    
    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.scheduledTasks.delete(taskId);
        
        this.submit(task)
          .then(resolve)
          .catch(reject);
      }, delay);
      
      this.scheduledTasks.set(taskId, timeout);
    });
    
    return new ScheduledFuture<T>(promise, () => {
      const timeout = this.scheduledTasks.get(taskId);
      if (timeout) {
        clearTimeout(timeout);
        this.scheduledTasks.delete(taskId);
        return true;
      }
      return false;
    });
  }
  
  /**
   * Schedules a task to run periodically
   * 
   * @param task The task to run
   * @param initialDelay The initial delay in milliseconds
   * @param period The period between executions in milliseconds
   * @returns A ScheduledFuture representing the pending results
   */
  public scheduleAtFixedRate<T>(
    task: Runnable<T>, 
    initialDelay: number, 
    period: number
  ): ScheduledFuture<T[]> {
    const taskId = this.nextTaskId++;
    const results: T[] = [];
    
    const promise = new Promise<T[]>((resolve, reject) => {
      let initialTimeout: NodeJS.Timeout;
      let intervalId: NodeJS.Timeout;
      
      // Set up the initial delay
      initialTimeout = setTimeout(() => {
        // Start the periodic execution
        intervalId = setInterval(() => {
          this.submit(task)
            .then(result => results.push(result))
            .catch(error => {
              clearInterval(intervalId);
              this.scheduledTasks.delete(taskId);
              reject(error);
            });
        }, period);
        
        // Store the interval ID
        this.scheduledTasks.set(taskId, intervalId);
        
        // Execute the task for the first time
        this.submit(task)
          .then(result => results.push(result))
          .catch(error => {
            clearInterval(intervalId);
            this.scheduledTasks.delete(taskId);
            reject(error);
          });
      }, initialDelay);
      
      this.scheduledTasks.set(taskId, initialTimeout);
    });
    
    return new ScheduledFuture<T[]>(promise, () => {
      const timeout = this.scheduledTasks.get(taskId);
      if (timeout) {
        clearTimeout(timeout);
        clearInterval(timeout as any);
        this.scheduledTasks.delete(taskId);
        return true;
      }
      return false;
    });
  }
  
  /**
   * Shuts down the worker pool, stopping all workers and cancelling all scheduled tasks
   */
  public override shutdown(): void {
    // Cancel all scheduled tasks
    for (const timeout of this.scheduledTasks.values()) {
      clearTimeout(timeout);
      clearInterval(timeout as any);
    }
    this.scheduledTasks.clear();
    
    // Shutdown the worker pool
    super.shutdown();
  }
}