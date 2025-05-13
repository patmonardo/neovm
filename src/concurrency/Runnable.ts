/**
 * A task that can be executed by a worker thread.
 */
export interface Runnable<T> {
  /**
   * Execute the task and return a result.
   */
  run(): T;
}