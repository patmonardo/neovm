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

  // Static factory methods for WorkerPool integration

  /**
   * Creates a Future that is already resolved with the given value.
   */
  public static resolved<T>(value: T): Future<T> {
    return new Future<T>((resolve) => {
      resolve(value);
    });
  }

  /**
   * Creates a Future that is already rejected with the given error.
   */
  public static rejected<T>(error: any): Future<T> {
    return new Future<T>((_, reject) => {
      reject(error);
    });
  }

  /**
   * Creates a Future that resolves when all input futures resolve.
   * Similar to Promise.all() but returns a Future.
   */
  public static all<T>(futures: Future<T>[]): Future<T[]> {
    if (futures.length === 0) {
      return Future.resolved([]);
    }

    return new Future<T[]>((resolve, reject) => {
      const results: T[] = new Array(futures.length);
      let completedCount = 0;
      let hasRejected = false;

      futures.forEach((future, index) => {
        future.get()
          .then((value) => {
            if (hasRejected) return;

            results[index] = value;
            completedCount++;

            if (completedCount === futures.length) {
              resolve(results);
            }
          })
          .catch((error) => {
            if (hasRejected) return;
            hasRejected = true;
            reject(error);
          });
      });
    });
  }

  /**
   * Creates a Future that resolves when any input future resolves.
   * Similar to Promise.race() but returns a Future.
   */
  public static race<T>(futures: Future<T>[]): Future<T> {
    if (futures.length === 0) {
      return Future.rejected(new Error('Cannot race empty array of futures'));
    }

    return new Future<T>((resolve, reject) => {
      let hasCompleted = false;

      futures.forEach((future) => {
        future.get()
          .then((value) => {
            if (!hasCompleted) {
              hasCompleted = true;
              resolve(value);
            }
          })
          .catch((error) => {
            if (!hasCompleted) {
              hasCompleted = true;
              reject(error);
            }
          });
      });
    });
  }

  /**
   * Creates a Future from an existing Promise.
   */
  public static fromPromise<T>(promise: Promise<T>): Future<T> {
    return new Future<T>((resolve, reject) => {
      promise.then(resolve, reject);
    });
  }

  /**
   * Creates a Future that resolves after a delay.
   */
  public static delay<T>(value: T, milliseconds: number): Future<T> {
    return new Future<T>((resolve) => {
      setTimeout(() => resolve(value), milliseconds);
    });
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
