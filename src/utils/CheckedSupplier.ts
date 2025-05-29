/**
 * Checked Supplier - Simple Error-Safe Value Production
 *
 * **The Original**: Clean, minimal functional interface matching Java exactly
 * **Extends Pattern**: Provides both checked and unchecked value production
 * **Functional Interface**: Single abstract method with default implementation
 */

/**
 * A Supplier that can throw errors during value production.
 *
 * **Functional Interface**: Extends standard supplier pattern
 * **Error Handling**: Provides both safe and unsafe access methods
 * **Generic Types**: T (return type), E (error type extends Error)
 */
export interface CheckedSupplier<T, E extends Error = Error> {
  /**
   * Produce a value, potentially throwing an error.
   *
   * **Abstract Method**: Must be implemented by concrete types
   * **Error Handling**: Caller must handle potential errors
   *
   * @returns The produced value
   * @throws E if production fails
   */
  checkedGet(): T | Promise<T>;

  /**
   * Produce a value with error wrapping (default implementation).
   *
   * **Default Method**: Automatically wraps checkedGet() with error handling
   * **Matches Java**: Exactly mirrors the Java default implementation
   * **Error Conversion**: Uses ExceptionUtil.throwIfUnchecked pattern
   *
   * @returns The produced value
   * @throws RuntimeError wrapping the original error
   */
  get?(): T;
}

/**
 * Static factory method matching Java's exact pattern
 */
export class CheckedSupplierFactory {
  /**
   * Identity function for type-safe supplier creation.
   *
   * **Java Compatibility**: Matches `CheckedSupplier.supplier()` exactly
   * **Type Safety**: Ensures proper generic type inference
   *
   * @param supplier The supplier to return (identity function)
   * @returns The same supplier with proper typing
   */
  static supplier<T, E extends Error = Error>(supplier: CheckedSupplier<T, E>): CheckedSupplier<T, E> {
    return supplier;
  }
}

/**
 * Default implementation that provides automatic get() method
 */
export abstract class AbstractCheckedSupplier<T, E extends Error = Error> implements CheckedSupplier<T, E> {
  /**
   * Abstract method - implement your error-prone value production here
   */
  abstract checkedGet(): T | Promise<T>;

  /**
   * Default implementation matching Java exactly:
   *
   * ```java
   * default T get() {
   *     try {
   *         return checkedGet();
   *     } catch (Exception e) {
   *         ExceptionUtil.throwIfUnchecked(e);
   *         throw new RuntimeException(e);
   *     }
   * }
   * ```
   */
  get(): T {
    try {
      const result = this.checkedGet();
      if (result instanceof Promise) {
        throw new Error("Cannot use async supplier in sync context");
      }
      return result;
    } catch (e) {
      // Mirror Java's ExceptionUtil.throwIfUnchecked(e)
      if (e instanceof Error) {
        throw e; // Re-throw unchecked errors directly
      } else {
        // Mirror Java's "throw new RuntimeException(e)"
        throw new Error(`Supplier operation failed: ${e}`);
      }
    }
  }
}

/**
 * Convenience functions matching Java static import pattern
 */
export const CheckedSupplierUtils = {
  /**
   * Static factory method (matches Java exactly)
   */
  supplier: CheckedSupplierFactory.supplier,

  /**
   * Convert to unchecked supplier
   */
  unchecked: <T, E extends Error = Error>(supplier: CheckedSupplier<T, E>): (() => T) => {
    return () => supplier.get?.() || supplier.checkedGet() as T;
  }
};

// Re-export for convenience
export const { supplier } = CheckedSupplierUtils;
