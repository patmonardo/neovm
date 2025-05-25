import { Concurrency } from '@/core/concurrency';
import { AutoCloseableThreadLocal } from '@/utils';
import { LocalNodesBuilder } from './LocalNodesBuilder';

/**
 * We offer two ways to access thread local NodesBuilder instances:
 * - ThreadLocalProvider: Uses ThreadLocal storage for the NodesBuilder instance.
 * - PooledProvider: Uses an object pool to store the NodesBuilder instances.
 *
 * The thread provider is the default one. It is the fastest variant and should be used
 * if there is a known fixed amount of threads accessing the NodesBuilder.
 *
 * The pooled provider is useful if there is a large and varying amount of threads
 * accessing the NodesBuilder. The access is slower than the thread provider.
 *
 * Access pattern for both providers:
 * ```typescript
 * const provider = LocalNodesBuilderProvider.threadLocal(() => createBuilder());
 * const slot = provider.acquire();
 * try {
 *   const builder = slot.get();
 *   // use the builder
 * } finally {
 *   slot.release();
 * }
 * ```
 */
export abstract class LocalNodesBuilderProvider {

  /**
   * Create a thread-local provider (fastest, for fixed thread count).
   */
  static threadLocal(builderSupplier: () => LocalNodesBuilder): LocalNodesBuilderProvider {
    return new ThreadLocalProvider(builderSupplier);
  }

  /**
   * Create a pooled provider (more flexible, for varying thread count).
   */
  static pooled(
    builderSupplier: () => LocalNodesBuilder,
    concurrency: Concurrency
  ): LocalNodesBuilderProvider {
    return PooledProvider.create(builderSupplier, concurrency);
  }

  /**
   * Acquire a slot containing a LocalNodesBuilder instance.
   */
  abstract acquire(): LocalNodesBuilderSlot;

  /**
   * Close the provider and clean up all resources.
   */
  abstract close(): void;
}

/**
 * Interface for a slot that contains a LocalNodesBuilder instance.
 */
export interface LocalNodesBuilderSlot {
  /**
   * Get the LocalNodesBuilder instance.
   */
  get(): LocalNodesBuilder;

  /**
   * Release the slot back to the provider.
   */
  release(): void;
}

/**
 * ThreadLocal-based provider implementation.
 * Fastest access but uses more memory with many threads.
 */
class ThreadLocalProvider extends LocalNodesBuilderProvider {
  private readonly threadLocal: AutoCloseableThreadLocal<Slot>;

  constructor(builderSupplier: () => LocalNodesBuilder) {
    super();
    this.threadLocal = AutoCloseableThreadLocal.withInitial(() =>
      new Slot(builderSupplier())
    );
  }

  acquire(): LocalNodesBuilderSlot {
    return this.threadLocal.get();
  }

  close(): void {
    this.threadLocal.close();
  }

  /**
   * Thread-local slot implementation.
   */
  private static class Slot implements LocalNodesBuilderSlot, AutoCloseable {
    private readonly builder: LocalNodesBuilder;

    constructor(builder: LocalNodesBuilder) {
      this.builder = builder;
    }

    get(): LocalNodesBuilder {
      return this.builder;
    }

    release(): void {
      // No-op for thread-local slots - they stay bound to the thread
    }

    close(): void {
      this.builder.close();
    }

    [Symbol.dispose](): void {
      this.close();
    }
  }
}

/**
 * Object pool-based provider implementation.
 * More memory efficient but slower access.
 */
class PooledProvider extends LocalNodesBuilderProvider {
  private readonly pool: ObjectPool<PooledSlot>;
  private readonly timeoutMs: number;

  static create(
    builderSupplier: () => LocalNodesBuilder,
    concurrency: Concurrency
  ): LocalNodesBuilderProvider {
    const pool = new ObjectPool<PooledSlot>(
      new SlotAllocator(builderSupplier),
      concurrency.value()
    );
    return new PooledProvider(pool);
  }

  constructor(pool: ObjectPool<PooledSlot>) {
    super();
    this.pool = pool;
    this.timeoutMs = 60 * 60 * 1000; // 1 hour timeout
  }

  acquire(): LocalNodesBuilderSlot {
    try {
      return this.pool.acquire(this.timeoutMs);
    } catch (error) {
      throw new Error(`Failed to acquire builder from pool: ${error.message}`);
    }
  }

  close(): void {
    try {
      this.pool.shutdown(this.timeoutMs);
    } catch (error) {
      throw new Error(`Failed to shutdown pool: ${error.message}`);
    }
  }

  /**
   * Pooled slot implementation.
   */
  private static class PooledSlot implements LocalNodesBuilderSlot, Poolable {
    private readonly poolSlot: PoolSlot;
    private readonly builder: LocalNodesBuilder;

    constructor(poolSlot: PoolSlot, builder: LocalNodesBuilder) {
      this.poolSlot = poolSlot;
      this.builder = builder;
    }

    get(): LocalNodesBuilder {
      return this.builder;
    }

    release(): void {
      this.poolSlot.release(this);
    }

    // Poolable interface
    deallocate(): void {
      this.builder.close();
    }
  }

  /**
   * Allocator for creating pooled slots.
   */
  private static class SlotAllocator implements PoolAllocator<PooledSlot> {
    private readonly builderSupplier: () => LocalNodesBuilder;

    constructor(builderSupplier: () => LocalNodesBuilder) {
      this.builderSupplier = builderSupplier;
    }

    allocate(slot: PoolSlot): PooledSlot {
      return new PooledSlot(slot, this.builderSupplier());
    }

    deallocate(pooledSlot: PooledSlot): void {
      pooledSlot.deallocate();
    }
  }
}

/**
 * Simple object pool implementation.
 * This would typically be replaced with a more sophisticated pooling library.
 */
export class ObjectPool<T extends Poolable> {
  private readonly allocator: PoolAllocator<T>;
  private readonly available: T[] = [];
  private readonly inUse = new Set<T>();
  private readonly maxSize: number;
  private isShutdown = false;

  constructor(allocator: PoolAllocator<T>, maxSize: number) {
    this.allocator = allocator;
    this.maxSize = maxSize;
  }

  acquire(timeoutMs: number): T {
    if (this.isShutdown) {
      throw new Error('Pool is shutdown');
    }

    // Try to get from available pool
    if (this.available.length > 0) {
      const item = this.available.pop()!;
      this.inUse.add(item);
      return item;
    }

    // Create new if under limit
    if (this.inUse.size < this.maxSize) {
      const slot = new SimplePoolSlot(this);
      const item = this.allocator.allocate(slot);
      this.inUse.add(item);
      return item;
    }

    // Wait for available item (simplified - would use proper async waiting)
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.available.length > 0) {
        const item = this.available.pop()!;
        this.inUse.add(item);
        return item;
      }
      // In real implementation, would use proper async waiting
      this.sleep(10);
    }

    throw new Error(`Timeout waiting for pool item after ${timeoutMs}ms`);
  }

  release(item: T): void {
    if (this.inUse.has(item)) {
      this.inUse.delete(item);
      if (!this.isShutdown) {
        this.available.push(item);
      } else {
        this.allocator.deallocate(item);
      }
    }
  }

  shutdown(timeoutMs: number): void {
    this.isShutdown = true;

    // Wait for all items to be returned
    const startTime = Date.now();
    while (this.inUse.size > 0 && Date.now() - startTime < timeoutMs) {
      this.sleep(10);
    }

    // Deallocate all items
    for (const item of this.available) {
      this.allocator.deallocate(item);
    }
    this.available.length = 0;

    // Force deallocate remaining in-use items
    for (const item of this.inUse) {
      this.allocator.deallocate(item);
    }
    this.inUse.clear();
  }

  getStats(): PoolStats {
    return {
      maxSize: this.maxSize,
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
      isShutdown: this.isShutdown
    };
  }

  private sleep(ms: number): void {
    // Synchronous sleep for simplicity - in real implementation would use async
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Busy wait
    }
  }
}

/**
 * Simple pool slot implementation.
 */
class SimplePoolSlot implements PoolSlot {
  private readonly pool: ObjectPool<any>;

  constructor(pool: ObjectPool<any>) {
    this.pool = pool;
  }

  release(item: any): void {
    this.pool.release(item);
  }
}

/**
 * Pool-related interfaces.
 */
export interface Poolable {
  deallocate(): void;
}

export interface PoolSlot {
  release(item: any): void;
}

export interface PoolAllocator<T> {
  allocate(slot: PoolSlot): T;
  deallocate(item: T): void;
}

export interface PoolStats {
  maxSize: number;
  available: number;
  inUse: number;
  total: number;
  isShutdown: boolean;
}

/**
 * Factory for creating providers with common configurations.
 */
export class LocalNodesBuilderProviderFactory {
  /**
   * Create a provider optimized for single-threaded access.
   */
  static singleThreaded(builderSupplier: () => LocalNodesBuilder): LocalNodesBuilderProvider {
    return LocalNodesBuilderProvider.threadLocal(builderSupplier);
  }

  /**
   * Create a provider optimized for fixed multi-threaded access.
   */
  static fixedThreadPool(
    builderSupplier: () => LocalNodesBuilder,
    threadCount: number
  ): LocalNodesBuilderProvider {
    return LocalNodesBuilderProvider.threadLocal(builderSupplier);
  }

  /**
   * Create a provider optimized for variable multi-threaded access.
   */
  static variableThreadPool(
    builderSupplier: () => LocalNodesBuilder,
    maxConcurrency: number
  ): LocalNodesBuilderProvider {
    return LocalNodesBuilderProvider.pooled(builderSupplier, new Concurrency(maxConcurrency));
  }

  /**
   * Create a provider with automatic strategy selection based on concurrency.
   */
  static auto(
    builderSupplier: () => LocalNodesBuilder,
    concurrency: Concurrency
  ): LocalNodesBuilderProvider {
    // Use thread-local for low concurrency, pooled for high concurrency
    if (concurrency.value() <= 8) {
      return LocalNodesBuilderProvider.threadLocal(builderSupplier);
    } else {
      return LocalNodesBuilderProvider.pooled(builderSupplier, concurrency);
    }
  }
}
