/**
 * Checked Runnable - Error-Safe Void Operations
 *
 * **The Pattern**: Extends standard Runnable with explicit error handling
 * **Simplicity**: No inputs, no outputs, just safe execution
 * **Use Cases**: Cleanup operations, background tasks, void computations
 */

/**
 * A Runnable that can throw errors during execution.
 *
 * **Functional Interface**: Single method with error handling
 * **Extends Pattern**: Provides both checked and unchecked execution
 */
export interface CheckedRunnable<E extends Error = Error> {
  /**
   * Execute the operation, potentially throwing an error.
   *
   * **Primary Method**: This is where the actual work happens
   * **Error Handling**: Caller must handle potential errors
   *
   * @throws E if execution fails
   */
  checkedRun(): void | Promise<void>;

  /**
   * Execute with error wrapping for standard Runnable compatibility.
   *
   * **Safe Wrapper**: Converts checked errors to runtime errors
   * **Default Implementation**: Wraps checkedRun() with error handling
   *
   * @throws RuntimeError wrapping the original error
   */
  run?(): void;
}

/**
 * Static factory and utility methods for CheckedRunnable
 */
export class CheckedRunnableFactory {
  /**
   * Create a CheckedRunnable instance (identity function for type safety).
   *
   * **Java Pattern**: Mimics the static factory method pattern
   * **Type Safety**: Ensures proper generic type inference
   *
   * @param runnable The runnable to wrap
   * @returns The same runnable with proper typing
   */
  static runnable<E extends Error = Error>(runnable: CheckedRunnable<E>): CheckedRunnable<E> {
    return runnable;
  }

  /**
   * Convert CheckedRunnable to standard Runnable with error wrapping.
   *
   * **Bridge Pattern**: Allows use in contexts expecting standard Runnable
   * **Error Conversion**: Wraps checked errors as runtime errors
   */
  static unchecked<E extends Error = Error>(runnable: CheckedRunnable<E>): () => void {
    return () => {
      try {
        const result = runnable.checkedRun();
        if (result instanceof Promise) {
          // For async operations, we can't make this synchronous
          result.catch(e => {
            throw new Error(`Async runnable failed: ${e}`, { cause: e });
          });
        }
      } catch (e) {
        // Convert any error to RuntimeError (unchecked)
        if (e instanceof Error) {
          // Re-throw unchecked errors directly (like the Java ExceptionUtil.throwIfUnchecked)
          throw e;
        } else {
          // Wrap non-Error values
          throw new Error(`Runnable operation failed: ${e}`);
        }
      }
    };
  }

  /**
   * Execute a CheckedRunnable with async error handling.
   *
   * **Async Support**: Properly handles both sync and async operations
   */
  static async runAsync<E extends Error = Error>(runnable: CheckedRunnable<E>): Promise<void> {
    try {
      const result = runnable.checkedRun();
      if (result instanceof Promise) {
        await result;
      }
    } catch (e) {
      if (e instanceof Error) {
        throw e; // Re-throw as-is
      } else {
        throw new Error(`Runnable operation failed: ${e}`);
      }
    }
  }
}

/**
 * Default implementation that provides the run() method automatically
 */
export abstract class AbstractCheckedRunnable<E extends Error = Error> implements CheckedRunnable<E> {
  /**
   * Abstract method - implement your error-prone logic here
   */
  abstract checkedRun(): void | Promise<void>;

  /**
   * Default implementation of run() - wraps checkedRun() with error handling
   */
  run(): void {
    try {
      const result = this.checkedRun();
      if (result instanceof Promise) {
        result.catch(e => {
          throw new Error(`Async runnable failed: ${e}`, { cause: e });
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        throw e; // Re-throw unchecked errors directly
      } else {
        throw new Error(`Runnable operation failed: ${e}`);
      }
    }
  }
}
