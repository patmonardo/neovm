/**
 * Auto Closeable Thread Local - Automatic Resource Management
 *
 * **The Enhancement**: Extends CloseableThreadLocal specifically for AutoCloseable
 * resources, providing automatic cleanup and lifecycle management.
 *
 * **Key Features**:
 * - Tracks all created instances across all threads/contexts
 * - Automatic cleanup when close() is called
 * - Custom destructor support for specialized cleanup
 * - Exception chaining for robust error handling
 * - Supplier interface for easy factory pattern integration
 *
 * **Use Cases**:
 * - Database connections per thread
 * - File handles per context
 * - Network connections per worker
 * - Any resource that needs automatic cleanup
 */

import { CloseableThreadLocal } from './CloseableThreadLocal';
import { ExceptionUtil } from './ExceptionUtil';
import { CheckedConsumer } from './CheckedConsumer';
import { CheckedFunction } from './CheckedFunction';
import { CheckedRunnable } from './CheckedRunnable';



/**
 * AutoCloseable interface for TypeScript (matching Java pattern)
 */
export interface AutoCloseable {
  close(): void | Promise<void>;
}

/**
 * Builder pattern support for constructor parameters
 */
interface AutoCloseableThreadLocalConfig<T extends AutoCloseable> {
  constructor: () => T | Promise<T>;
  destructor?: (item: T) => void | Promise<void>;
}

export class AutoCloseableThreadLocal<T extends AutoCloseable>
  implements CheckedSupplier<T, Error>, AutoCloseable {

  // ============================================================================
  // CORE COMPONENTS
  // ============================================================================

  /**
   * Underlying thread-local storage
   */
  private readonly closeableThreadLocal: CloseableThreadLocal<T>;

  /**
   * Custom destructor for specialized cleanup
   */
  private readonly destructor: (item: T) => void | Promise<void>;

  /**
   * Track all created instances across all threads/contexts.
   * **Critical**: This allows us to clean up ALL instances on close(),
   * not just the current thread's instance.
   */
  private readonly copies: Set<T> = new Set();

  /**
   * Concurrent access protection for the copies set
   */
  private readonly copyLock = new AsyncLock();

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create with initial value supplier (matches Java's withInitial pattern)
   */
  static withInitial<T extends AutoCloseable>(
    initial: () => T | Promise<T>
  ): AutoCloseableThreadLocal<T> {
    return new AutoCloseableThreadLocal({
      constructor: initial
    });
  }

  /**
   * Create with custom destructor
   */
  static withDestructor<T extends AutoCloseable>(
    constructor: () => T | Promise<T>,
    destructor: (item: T) => void | Promise<void>
  ): AutoCloseableThreadLocal<T> {
    return new AutoCloseableThreadLocal({
      constructor,
      destructor
    });
  }

  // ============================================================================
  // CONSTRUCTION
  // ============================================================================

  constructor(config: AutoCloseableThreadLocalConfig<T>) {
    this.destructor = config.destructor || (() => {});

    // Create the underlying thread-local with instance tracking
    this.closeableThreadLocal = CloseableThreadLocal.withInitial(() => {
      const newElement = config.constructor();

      if (newElement instanceof Promise) {
        // Handle async construction
        return newElement.then(element => {
          this.copyLock.acquire(() => {
            this.copies.add(element);
          });
          return element;
        });
      } else {
        // Handle sync construction
        this.copyLock.acquire(() => {
          this.copies.add(newElement);
        });
        return newElement;
      }
    });
  }

  // ============================================================================
  // SUPPLIER INTERFACE
  // ============================================================================

  /**
   * Get the instance for the current thread/context.
   * **Implements Supplier<T>**: Provides factory-like access pattern
   */
  get(): T;
  checkedGet(): T | Promise<T> {
    const result = this.closeableThreadLocal.get();
    if (result === null) {
      throw new Error("AutoCloseableThreadLocal returned null");
    }
    return result;
  }

  /**
   * Synchronous get (throws if async)
   */
  get(): T {
    const result = this.checkedGet();
    if (result instanceof Promise) {
      throw new Error("Cannot get async result synchronously");
    }
    return result;
  }

  // ============================================================================
  // ITERATION SUPPORT
  // ============================================================================

  /**
   * Apply a function to all created instances across all threads.
   *
   * **Cross-Thread Access**: This is powerful - you can operate on
   * instances created in other threads/contexts.
   *
   * **Use Cases**:
   * - Broadcast configuration changes
   * - Collect statistics from all instances
   * - Apply maintenance operations
   */
  async forEach(consumer: (item: T) => void | Promise<void>): Promise<void> {
    const copiesSnapshot = await this.copyLock.acquire(() => {
      return Array.from(this.copies);
    });

    for (const item of copiesSnapshot) {
      try {
        await consumer(item);
      } catch (error) {
        // Log but continue with other items
        console.error('Error in forEach consumer:', error);
      }
    }
  }

  /**
   * Get count of all created instances
   */
  getInstanceCount(): number {
    return this.copies.size;
  }

  /**
   * Check if any instances exist
   */
  hasInstances(): boolean {
    return this.copies.size > 0;
  }

  // ============================================================================
  // RESOURCE CLEANUP
  // ============================================================================

  /**
   * Close all instances across all threads and clean up resources.
   *
   * **The Cleanup Process**:
   * 1. Iterate through all tracked instances
   * 2. Call custom destructor for each
   * 3. Call close() on each AutoCloseable
   * 4. Chain any exceptions that occur
   * 5. Close the underlying thread-local storage
   *
   * **Exception Handling**: Uses ExceptionUtil.chain to collect all
   * cleanup errors and throw them together.
   */
  async close(): Promise<void> {
    let error: Error | null = null;

    // Get snapshot of all copies
    const copiesToClose = await this.copyLock.acquire(() => {
      const snapshot = Array.from(this.copies);
      this.copies.clear(); // Clear the set
      return snapshot;
    });

    // Close each instance with error collection
    for (const item of copiesToClose) {
      try {
        // Call custom destructor first
        await this.destructor(item);

        // Then call AutoCloseable.close()
        await item.close();
      } catch (e) {
        // Chain exceptions together
        const currentError = e instanceof Error ? e : new Error(String(e));
        error = ExceptionUtil.chain(error, currentError);
      }
    }

    // Close the underlying thread-local
    try {
      this.closeableThreadLocal.close();
    } catch (e) {
      const currentError = e instanceof Error ? e : new Error(String(e));
      error = ExceptionUtil.chain(error, currentError);
    }

    // Throw chained exceptions if any occurred
    if (error !== null) {
      throw error;
    }
  }

  /**
   * Async dispose support for 'await using'
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

// ============================================================================
// ASYNC LOCK UTILITY
// ============================================================================

/**
 * Simple async lock for protecting critical sections
 */
class AsyncLock {
  private locked = false;
  private waiting: Array<() => void> = [];

  async acquire<T>(fn: () => T | Promise<T>): Promise<T> {
    while (this.locked) {
      await new Promise<void>(resolve => this.waiting.push(resolve));
    }

    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}
