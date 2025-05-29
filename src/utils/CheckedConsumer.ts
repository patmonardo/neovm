/**
 * Checked Consumer - Functional Interface for Error-Prone Operations
 *
 * **The Pattern**: Like standard Consumer but can throw errors during processing.
 * **TypeScript Advantage**: No checked exceptions, but we maintain the pattern
 * for compatibility and explicit error handling.
 *
 * **Use Cases**:
 * - Processing collections where each item might fail
 * - Resource cleanup operations
 * - Event handlers that can throw
 * - Functional pipeline operations with error handling
 */

// ============================================================================
// CHECKED CONSUMER
// ============================================================================

/**
 * A Consumer that can throw errors during processing.
 *
 * **Extends**: Standard Consumer interface with error-safe wrapper
 * **Pattern**: Provides both checked and unchecked access methods
 */
export interface CheckedConsumer<T, E extends Error = Error> {
  /**
   * Process the input value, potentially throwing an error.
   *
   * **Primary Method**: This is where the actual work happens
   * **Error Handling**: Caller must handle potential errors
   *
   * @param value Input value to process
   * @throws E if processing fails
   */
  checkedAccept(value: T): void | Promise<void>;

  /**
   * Process the input value, converting errors to unchecked exceptions.
   *
   * **Safe Wrapper**: Converts checked errors to runtime errors
   * **Use Case**: When you need Consumer<T> compatibility
   *
   * @param value Input value to process
   * @throws RuntimeError wrapping the original error
   */
  accept?(value: T): void;
}

/**
 * Static factory and utility methods for CheckedConsumer
 */
export class CheckedConsumerUtil {
  /**
   * Create a CheckedConsumer instance (identity function for type safety)
   */
  static consumer<T, E extends Error = Error>(consumer: CheckedConsumer<T, E>): CheckedConsumer<T, E> {
    return consumer;
  }

  /**
   * Convert CheckedConsumer to standard Consumer with error wrapping
   */
  static unchecked<T, E extends Error = Error>(consumer: CheckedConsumer<T, E>): (value: T) => void {
    return (value: T) => {
      try {
        const result = consumer.checkedAccept(value);
        if (result instanceof Promise) {
          result.catch(e => { throw new Error(`Async consumer failed: ${e}`, { cause: e }); });
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        throw new Error(`Consumer operation failed: ${error.message}`, { cause: error });
      }
    };
  }
}
