/**
 * Exception Util - Robust Error Handling and Resource Management
 * 
 * **The Clean Design**: Uses our properly translated Checked interfaces
 * **Key Features**:
 * - Root cause analysis for exception chains
 * - Safe resource cleanup with exception chaining
 * - Functional programming support for error-prone operations
 * - Clean separation of concerns with proper imports
 */

import { CheckedConsumer } from './CheckedConsumer';
import { CheckedFunction } from './CheckedFunction';
import { CheckedRunnable } from './CheckedRunnable';
import { CheckedSupplier } from './CheckedSupplier';

export class ExceptionUtil {

  // ============================================================================
  // EXCEPTION ANALYSIS
  // ============================================================================

  /**
   * Returns the root cause of an exception.
   * 
   * **Copied from Neo4j helpers**: Due to deprecation of original utility
   * **Use Case**: Navigate exception chains to find the original cause
   * 
   * @param caughtException Exception to find the root cause of
   * @returns The root cause
   * @throws Error if the provided exception is null
   */
  static rootCause(caughtException: Error | null): Error {
    if (caughtException === null || caughtException === undefined) {
      throw new Error("Cannot obtain rootCause from (null)");
    }

    let root = caughtException;
    while (root.cause && root.cause instanceof Error) {
      root = root.cause;
    }
    return root;
  }

  /**
   * Adds the current exception to the initial exception as suppressed.
   * 
   * **Copied from Neo4j helpers**: Due to deprecation of original utility
   * **Pattern**: Combines multiple exceptions during error handling
   * 
   * @param initial The primary exception (may be null)
   * @param current Additional exception to chain (may be null) 
   * @returns Combined exception with proper causality chain
   */
  static chain<T extends Error>(initial: T | null, current: T | null): T | null {
    if (initial === null) {
      return current;
    }

    if (current !== null) {
      // TypeScript doesn't have addSuppressed, use custom property
      if (!(initial as any).suppressed) {
        (initial as any).suppressed = [];
      }
      (initial as any).suppressed.push(current);
    }
    return initial;
  }

  // ============================================================================
  // STANDARD ERROR HANDLERS
  // ============================================================================

  /**
   * Standard handler that rethrows checked exceptions as-is
   */
  static readonly RETHROW_CHECKED: CheckedConsumer<Error, Error> = {
    checkedAccept: (e: Error) => {
      throw e;
    }
  };

  /**
   * Standard handler that converts checked exceptions to unchecked
   */
  static readonly RETHROW_UNCHECKED: CheckedConsumer<Error, Error> = {
    checkedAccept: (e: Error) => {
      ExceptionUtil.throwIfUnchecked(e);
      throw new Error(`Wrapped exception: ${e.message}`, { cause: e });
    }
  };

  // ============================================================================
  // RESOURCE MANAGEMENT - CLEAN OVERLOADS
  // ============================================================================

  /**
   * Close all resources with default error handling
   */
  static async closeAll(closeables: AsyncDisposable[]): Promise<void>;
  static async closeAll(closeables: Iterator<AsyncDisposable>): Promise<void>;

  /**
   * Close all resources with custom error handler
   */
  static async closeAll<E extends Error>(
    handler: CheckedConsumer<Error, E>,
    ...closeables: AsyncDisposable[]
  ): Promise<void>;
  static async closeAll<E extends Error>(
    handler: CheckedConsumer<Error, E>,
    closeables: AsyncDisposable[]
  ): Promise<void>;
  static async closeAll<E extends Error>(
    handler: CheckedConsumer<Error, E>,
    closeables: Iterable<AsyncDisposable>
  ): Promise<void>;
  static async closeAll<E extends Error>(
    handler: CheckedConsumer<Error, E>,
    closeables: Iterator<AsyncDisposable>
  ): Promise<void>;

  /**
   * Implementation of closeAll with proper overload resolution
   */
  static async closeAll<E extends Error>(
    handlerOrCloseables: CheckedConsumer<Error, E> | AsyncDisposable[] | Iterator<AsyncDisposable>,
    closeablesOrRest?: AsyncDisposable[] | Iterable<AsyncDisposable> | Iterator<AsyncDisposable>,
    ...rest: AsyncDisposable[]
  ): Promise<void> {
    
    let handler: CheckedConsumer<Error, E>;
    let iterator: Iterator<AsyncDisposable>;

    // Resolve overloaded parameters
    if ('checkedAccept' in handlerOrCloseables) {
      // Handler provided as first argument
      handler = handlerOrCloseables;
      
      if (closeablesOrRest) {
        if (Array.isArray(closeablesOrRest)) {
          iterator = closeablesOrRest[Symbol.iterator]();
        } else if ('next' in closeablesOrRest) {
          iterator = closeablesOrRest;
        } else {
          iterator = closeablesOrRest[Symbol.iterator]();
        }
      } else if (rest.length > 0) {
        iterator = rest[Symbol.iterator]();
      } else {
        return; // No closeables
      }
    } else {
      // No handler, use default
      handler = ExceptionUtil.RETHROW_CHECKED as CheckedConsumer<Error, E>;
      
      if (Array.isArray(handlerOrCloseables)) {
        iterator = handlerOrCloseables[Symbol.iterator]();
      } else {
        iterator = handlerOrCloseables;
      }
    }

    // Execute cleanup with exception chaining
    let error: Error | null = null;
    
    let result = iterator.next();
    while (!result.done) {
      const closeable = result.value;
      try {
        if ('dispose' in closeable && typeof closeable.dispose === 'function') {
          await closeable.dispose();
        } else if ('close' in closeable && typeof (closeable as any).close === 'function') {
          await (closeable as any).close();
        }
      } catch (e) {
        const currentError = e instanceof Error ? e : new Error(String(e));
        error = ExceptionUtil.chain(error, currentError);
      }
      result = iterator.next();
    }

    if (error !== null) {
      await handler.checkedAccept(error);
    }
  }

  // ============================================================================
  // EXCEPTION TYPE HANDLING
  // ============================================================================

  /**
   * Rethrows exception if it's unchecked (runtime error).
   * 
   * **Typical Usage**:
   * ```typescript
   * catch (e) {
   *   // ...common error handling...
   *   ExceptionUtil.throwIfUnchecked(e);
   *   throw new Error(`Wrapped: ${e.message}`, { cause: e });
   * }
   * ```
   * 
   * **Note**: In TypeScript, all errors are essentially unchecked,
   * but this maintains Java compatibility patterns.
   */
  static throwIfUnchecked(exception: unknown): void {
    if (exception === null || exception === undefined) {
      throw new Error("Cannot handle null exception");
    }

    if (exception instanceof Error) {
      // All TypeScript errors are "unchecked" - rethrow directly
      throw exception;
    }

    // Convert non-Error values to Error and throw
    throw new Error(String(exception));
  }

  // ============================================================================
  // FUNCTIONAL PROGRAMMING UTILITIES - CLEAN DELEGATION
  // ============================================================================

  /**
   * Convert CheckedRunnable to standard Runnable (unchecked)
   */
  static unchecked<E extends Error>(runnable: CheckedRunnable<E>): () => void {
    return () => {
      try {
        const result = runnable.checkedRun();
        if (result instanceof Promise) {
          result.catch(e => { throw e; });
        }
      } catch (e) {
        ExceptionUtil.throwIfUnchecked(e);
        throw new Error(`Unchecked operation failed: ${e}`, { cause: e });
      }
    };
  }

  /**
   * Execute a CheckedRunnable (with error conversion)
   */
  static async run<E extends Error>(runnable: CheckedRunnable<E>): Promise<void> {
    try {
      const result = runnable.checkedRun();
      if (result instanceof Promise) {
        await result;
      }
    } catch (e) {
      ExceptionUtil.throwIfUnchecked(e);
      throw new Error(`Run operation failed: ${e}`, { cause: e });
    }
  }

  /**
   * Safe execution with exception logging instead of throwing
   */
  static safeRunWithLogException(
    message: () => string,
    runnable: () => void | Promise<void>,
    exceptionConsumer: (msg: string, e: Error) => void
  ): void {
    try {
      const result = runnable();
      if (result instanceof Promise) {
        result.catch(e => {
          const error = e instanceof Error ? e : new Error(String(e));
          exceptionConsumer(message(), error);
        });
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      exceptionConsumer(message(), error);
    }
  }

  /**
   * Convert CheckedConsumer to standard Consumer (unchecked)
   */
  static consumer<T, E extends Error>(consumer: CheckedConsumer<T, E>): (value: T) => void {
    return (value: T) => {
      try {
        const result = consumer.checkedAccept(value);
        if (result instanceof Promise) {
          result.catch(e => { throw e; });
        }
      } catch (e) {
        ExceptionUtil.throwIfUnchecked(e);
        throw new Error(`Consumer operation failed: ${e}`, { cause: e });
      }
    };
  }

  /**
   * Convert CheckedFunction to standard Function (unchecked)
   */
  static function<T, R, E extends Error>(fn: CheckedFunction<T, R, E>): (input: T) => R {
    return (input: T) => {
      try {
        const result = fn.checkedApply(input);
        if (result instanceof Promise) {
          throw new Error("Cannot convert async function to sync function");
        }
        return result;
      } catch (e) {
        ExceptionUtil.throwIfUnchecked(e);
        throw new Error(`Function operation failed: ${e}`, { cause: e });
      }
    };
  }

  /**
   * Convert CheckedSupplier to standard Supplier (unchecked)
   */
  static supplier<T, E extends Error>(supplier: CheckedSupplier<T, E>): () => T {
    return () => {
      try {
        const result = supplier.checkedGet();
        if (result instanceof Promise) {
          throw new Error("Cannot convert async supplier to sync supplier");
        }
        return result;
      } catch (e) {
        ExceptionUtil.throwIfUnchecked(e);
        throw new Error(`Supplier operation failed: ${e}`, { cause: e });
      }
    };
  }

  /**
   * Execute a CheckedSupplier (with error conversion)
   */
  static async supply<T, E extends Error>(supplier: CheckedSupplier<T, E>): Promise<T> {
    try {
      const result = supplier.checkedGet();
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (e) {
      ExceptionUtil.throwIfUnchecked(e);
      throw new Error(`Supply operation failed: ${e}`, { cause: e });
    }
  }

  /**
   * Apply a CheckedFunction (with error conversion)
   */
  static async apply<T, R, E extends Error>(
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
      ExceptionUtil.throwIfUnchecked(e);
      throw new Error(`Apply operation failed: ${e}`, { cause: e });
    }
  }

  // ============================================================================
  // PRIVATE CONSTRUCTOR
  // ============================================================================

  private constructor() {
    throw new Error("No instances - utility class only");
  }
}