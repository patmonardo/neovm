/**
 * Checked Function - Error-Safe Value Transformation
 *
 * **The Pattern**: Extends standard Function with explicit error handling
 * **Transformation**: Takes input T, returns R, may throw E
 * **Use Cases**: Data transformation, parsing, computation, mapping operations
 */

/**
 * A Function that can throw errors during transformation.
 *
 * **Functional Interface**: Single method with error handling
 * **Generic Types**: T (input), R (output), E (error type)
 * **Extends Pattern**: Provides both checked and unchecked transformation
 */
export interface CheckedFunction<T, R, E extends Error = Error> {
  /**
   * Transform the input value, potentially throwing an error.
   *
   * **Primary Method**: This is where the actual transformation happens
   * **Error Handling**: Caller must handle potential errors
   *
   * @param input The input value to transform
   * @returns The transformed value
   * @throws E if transformation fails
   */
  checkedApply(input: T): R | Promise<R>;

  /**
   * Transform with error wrapping for standard Function compatibility.
   *
   * **Safe Wrapper**: Converts checked errors to runtime errors
   * **Default Implementation**: Wraps checkedApply() with error handling
   *
   * @param input The input value to transform
   * @returns The transformed value
   * @throws RuntimeError wrapping the original error
   */
  apply?(input: T): R;
}

/**
 * Static factory and utility methods for CheckedFunction
 */
export class CheckedFunctionFactory {
  /**
   * Create a CheckedFunction instance (identity function for type safety).
   *
   * **Java Pattern**: Mimics the static factory method pattern
   * **Type Safety**: Ensures proper generic type inference
   *
   * @param fn The function to wrap
   * @returns The same function with proper typing
   */
  static function<T, R, E extends Error = Error>(fn: CheckedFunction<T, R, E>): CheckedFunction<T, R, E> {
    return fn;
  }

  /**
   * Convert CheckedFunction to standard Function with error wrapping.
   *
   * **Bridge Pattern**: Allows use in contexts expecting standard Function
   * **Error Conversion**: Wraps checked errors as runtime errors
   */
  static unchecked<T, R, E extends Error = Error>(fn: CheckedFunction<T, R, E>): (input: T) => R {
    return (input: T) => {
      try {
        const result = fn.checkedApply(input);
        if (result instanceof Promise) {
          throw new Error("Cannot convert async function to sync function");
        }
        return result;
      } catch (e) {
        // Mirror Java's ExceptionUtil.throwIfUnchecked behavior
        if (e instanceof Error) {
          throw e; // Re-throw unchecked errors directly
        } else {
          throw new Error(`Function operation failed: ${e}`);
        }
      }
    };
  }

  /**
   * Execute a CheckedFunction with async error handling.
   *
   * **Async Support**: Properly handles both sync and async operations
   */
  static async applyAsync<T, R, E extends Error = Error>(
    fn: CheckedFunction<T, R, E>,
    input: T
  ): Promise<R> {
    try {
      const result = fn.checkedApply(input);
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (e) {
      if (e instanceof Error) {
        throw e; // Re-throw as-is
      } else {
        throw new Error(`Function operation failed: ${e}`);
      }
    }
  }

  /**
   * Compose two CheckedFunctions together.
   *
   * **Function Composition**: f(g(x)) pattern with error handling
   */
  static compose<T, U, R, E extends Error = Error>(
    f: CheckedFunction<U, R, E>,
    g: CheckedFunction<T, U, E>
  ): CheckedFunction<T, R, E> {
    return {
      checkedApply: async (input: T) => {
        const intermediate = await CheckedFunctionFactory.applyAsync(g, input);
        return await CheckedFunctionFactory.applyAsync(f, intermediate);
      }
    };
  }

  /**
   * Create an identity function that never throws.
   */
  static identity<T>(): CheckedFunction<T, T, never> {
    return {
      checkedApply: (input: T) => input
    };
  }
}

/**
 * Default implementation that provides the apply() method automatically
 */
export abstract class AbstractCheckedFunction<T, R, E extends Error = Error> implements CheckedFunction<T, R, E> {
  /**
   * Abstract method - implement your error-prone transformation here
   */
  abstract checkedApply(input: T): R | Promise<R>;

  /**
   * Default implementation of apply() - wraps checkedApply() with error handling
   *
   * **Matches Java Implementation**: Mirrors the exact error handling logic
   */
  apply(input: T): R {
    try {
      const result = this.checkedApply(input);
      if (result instanceof Promise) {
        throw new Error("Cannot use async function in sync context");
      }
      return result;
    } catch (e) {
      // Mirror Java's exact logic from the original
      if (e instanceof Error) {
        // This mirrors ExceptionUtil.throwIfUnchecked(e)
        throw e; // Re-throw unchecked errors directly
      } else {
        // This mirrors "throw new RuntimeException(e)"
        throw new Error(`Function operation failed: ${e}`);
      }
    }
  }
}
