/**
 * Closeable Thread Local - Memory-Safe Thread Storage
 *
 * **The Problem**: Standard ThreadLocal in Java can cause memory leaks
 * because the master map only periodically purges stale entries.
 *
 * **The Solution**: Use WeakReferences in ThreadLocal + hard references
 * that can be explicitly cleared via close().
 *
 * **TypeScript Adaptation**: Since we don't have true threads, we adapt
 * this for async contexts, Workers, and future thread-like abstractions.
 *
 * **Key Features**:
 * - Explicit cleanup via close() method
 * - Prevents memory leaks from long-lived thread-local storage
 * - WeakRef support for automatic GC when contexts disappear
 * - Factory pattern for easy initialization
 */

/**
 * Abstract thread/context identifier
 * Future-proof for different threading models
 */
type ContextId = string | number | symbol;

/**
 * Context provider interface - abstracts away the threading model
 */
interface ContextProvider {
  getCurrentContext(): ContextId;
  onContextExit?(callback: () => void): void;
}

/**
 * Default context provider for single-threaded Node.js
 */
class AsyncLocalContextProvider implements ContextProvider {
  private static contextCounter = 0;
  private contextId: ContextId;

  constructor() {
    this.contextId = `async-${++AsyncLocalContextProvider.contextCounter}`;
  }

  getCurrentContext(): ContextId {
    // In real implementation, could use AsyncLocalStorage
    return this.contextId;
  }
}

/**
 * Worker thread context provider (for future worker support)
 */
class WorkerContextProvider implements ContextProvider {
  getCurrentContext(): ContextId {
    if (typeof Worker !== 'undefined' && typeof self !== 'undefined') {
      // In a Web Worker or Node.js Worker Thread
      return 'worker-' + (self as any).threadId || 'main';
    }
    return 'main-thread';
  }

  onContextExit(callback: () => void): void {
    if (typeof process !== 'undefined') {
      process.on('exit', callback);
    } else if (typeof self !== 'undefined') {
      self.addEventListener('beforeunload', callback);
    }
  }
}

export class CloseableThreadLocal<T> implements AsyncDisposable {

  // ============================================================================
  // CORE STORAGE
  // ============================================================================

  /**
   * Factory function for creating initial values
   */
  private readonly initialValueSupplier: () => T;

  /**
   * Context provider for thread/async context identification
   */
  private readonly contextProvider: ContextProvider;

  /**
   * WeakRef storage mapped by context - allows GC when context disappears
   */
  private contextToWeakRef: Map<ContextId, WeakRef<T>> = new Map();

  /**
   * Hard references to prevent premature GC - this is the key to the pattern!
   * **Critical**: These are cleared in close() to enable proper cleanup
   */
  private hardRefs: Map<ContextId, T> = new Map();

  /**
   * Cleanup registry for automatic resource management
   */
  private readonly cleanupRegistry = new FinalizationRegistry<ContextId>((contextId) => {
    this.contextToWeakRef.delete(contextId);
    this.hardRefs.delete(contextId);
  });

  /**
   * Track if this instance has been closed
   */
  private closed = false;

  // ============================================================================
  // CONSTRUCTION
  // ============================================================================

  /**
   * Factory method matching Java's withInitial pattern
   */
  static withInitial<T>(initialValueSupplier: () => T): CloseableThreadLocal<T> {
    return new CloseableThreadLocal(initialValueSupplier);
  }

  /**
   * Constructor with custom context provider
   */
  static withProvider<T>(
    initialValueSupplier: () => T,
    contextProvider: ContextProvider
  ): CloseableThreadLocal<T> {
    return new CloseableThreadLocal(initialValueSupplier, contextProvider);
  }

  constructor(
    initialValueSupplier: () => T,
    contextProvider: ContextProvider = new AsyncLocalContextProvider()
  ) {
    this.initialValueSupplier = initialValueSupplier;
    this.contextProvider = contextProvider;

    // Register cleanup when context exits (if supported)
    if (contextProvider.onContextExit) {
      contextProvider.onContextExit(() => this.cleanup());
    }
  }

  // ============================================================================
  // CORE API
  // ============================================================================

  /**
   * Get the value for the current context.
   *
   * **Lazy Initialization**: Creates value on first access
   * **Memory Pattern**: Stores both weak and hard references
   */
  get(): T | null {
    if (this.closed) {
      throw new Error("CloseableThreadLocal has been closed");
    }

    const contextId = this.contextProvider.getCurrentContext();

    // Check if we have a WeakRef for this context
    const weakRef = this.contextToWeakRef.get(contextId);

    if (weakRef) {
      const value = weakRef.deref();
      if (value !== undefined) {
        return value;
      }
      // WeakRef was collected, remove stale entry
      this.contextToWeakRef.delete(contextId);
      this.hardRefs.delete(contextId);
    }

    // No value exists, create initial value
    const initialValue = this.initialValue();
    if (initialValue !== null && initialValue !== undefined) {
      this.set(initialValue);
      return initialValue;
    }

    return null;
  }

  /**
   * Set the value for the current context.
   *
   * **Dual Storage**: Stores both weak reference (for ThreadLocal)
   * and hard reference (to prevent premature GC)
   */
  set(value: T): void {
    if (this.closed) {
      throw new Error("CloseableThreadLocal has been closed");
    }

    const contextId = this.contextProvider.getCurrentContext();

    // Store WeakRef for GC-friendly storage
    this.contextToWeakRef.set(contextId, new WeakRef(value));

    // Store hard reference to prevent GC until close()
    this.hardRefs.set(contextId, value);

    // Register for cleanup when value is GC'd
    this.cleanupRegistry.register(value, contextId);
  }

  /**
   * Remove the value for the current context.
   */
  remove(): void {
    const contextId = this.contextProvider.getCurrentContext();
    this.contextToWeakRef.delete(contextId);
    this.hardRefs.delete(contextId);
  }

  /**
   * Get the initial value (can be overridden in subclasses).
   */
  protected initialValue(): T {
    return this.initialValueSupplier();
  }

  // ============================================================================
  // RESOURCE MANAGEMENT
  // ============================================================================

  /**
   * Close and cleanup all stored values across all contexts.
   *
   * **Critical Method**: This is what prevents memory leaks!
   * Clears hard references, allowing GC to reclaim memory.
   *
   * **Usage**: Call when no more threads will use this instance
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Clear hard references - this is the key to enabling GC!
    this.hardRefs.clear();

    // Clear weak references
    this.contextToWeakRef.clear();

    // Note: Individual WeakRefs will be cleaned up by GC naturally
  }

  /**
   * Async dispose support for using with 'await using'
   */
  async [Symbol.asyncDispose](): Promise<void> {
    this.close();
  }

  /**
   * Cleanup method for context exit handlers
   */
  private cleanup(): void {
    const contextId = this.contextProvider.getCurrentContext();
    this.contextToWeakRef.delete(contextId);
    this.hardRefs.delete(contextId);
  }

  // ============================================================================
  // DEBUGGING AND MONITORING
  // ============================================================================

  /**
   * Get count of active contexts (for debugging)
   */
  getActiveContextCount(): number {
    return this.hardRefs.size;
  }

  /**
   * Get all active context IDs (for debugging)
   */
  getActiveContexts(): ContextId[] {
    return Array.from(this.hardRefs.keys());
  }

  /**
   * Check if a specific context has a value
   */
  hasValue(contextId?: ContextId): boolean {
    const id = contextId || this.contextProvider.getCurrentContext();
    return this.hardRefs.has(id);
  }
}

// ============================================================================
// CONVENIENCE FACTORIES
// ============================================================================

/**
 * Create a CloseableThreadLocal for async contexts
 */
export function createAsyncLocal<T>(initializer: () => T): CloseableThreadLocal<T> {
  return CloseableThreadLocal.withProvider(initializer, new AsyncLocalContextProvider());
}

/**
 * Create a CloseableThreadLocal for worker contexts
 */
export function createWorkerLocal<T>(initializer: () => T): CloseableThreadLocal<T> {
  return CloseableThreadLocal.withProvider(initializer, new WorkerContextProvider());
}

/**
 * Convenience decorator for methods that need thread-local cleanup
 */
export function withThreadLocal<T, R>(
  threadLocal: CloseableThreadLocal<T>,
  fn: (value: T) => R | Promise<R>
): () => R | Promise<R> {
  return async () => {
    try {
      const value = threadLocal.get();
      if (value === null) {
        throw new Error("ThreadLocal value is null");
      }
      return await fn(value);
    } finally {
      threadLocal.remove(); // Cleanup current context
    }
  };
}
