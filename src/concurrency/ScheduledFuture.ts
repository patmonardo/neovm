import { Future } from './Future';

/**
 * A Future that represents the result of a scheduled task that can be cancelled.
 */
export class ScheduledFuture<T> extends Future<T> {
  /**
   * Creates a new ScheduledFuture
   * 
   * @param promise The underlying Promise
   * @param cancelFn Function to call when cancelling the task
   */
  constructor(
    promise: Promise<T>,
    private readonly cancelFn: () => boolean
  ) {
    super((resolve, reject) => {
      promise.then(resolve).catch(reject);
    });
  }
  
  /**
   * Attempts to cancel execution of this task
   * 
   * @returns true if the task was cancelled
   */
  public override cancel(): boolean {
    if (super.cancel()) {
      return this.cancelFn();
    }
    return false;
  }
  
  /**
   * Gets the delay before this task is scheduled to execute
   * Not implemented in this example
   */
  public getDelay(): number {
    throw new Error("Not implemented");
  }
}