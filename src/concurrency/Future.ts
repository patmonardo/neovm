/**
 * Represents the result of an asynchronous computation.
 */
export class Future<T> implements Promise<T> {
  private readonly promise: Promise<T>;
  private _isCancelled: boolean = false;
  
  constructor(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void) {
    this.promise = new Promise<T>(executor);
  }
  
  /**
   * Returns true if this Future was cancelled
   */
  public isCancelled(): boolean {
    return this._isCancelled;
  }
  
  /**
   * Attempts to cancel execution of this task
   * 
   * @returns true if the task was cancelled
   */
  public cancel(): boolean {
    if (this._isCancelled) {
      return false;
    }
    this._isCancelled = true;
    return true;
  }
  
  /**
   * Gets the result of this Future, waiting if necessary
   */
  public async get(): Promise<T> {
    if (this._isCancelled) {
      throw new Error("Task was cancelled");
    }
    return this.promise;
  }
  
  // Promise implementation methods
  
  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onFulfilled, onRejected);
  }
  
  public catch<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.promise.catch(onRejected);
  }
  
  public finally(onFinally?: (() => void) | null): Promise<T> {
    return this.promise.finally(onFinally);
  }
  
  public [Symbol.toStringTag]: string = 'Future';
}