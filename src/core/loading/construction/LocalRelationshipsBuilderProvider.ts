import { Concurrency } from '@/core/concurrency';
import { AutoCloseableThreadLocal } from '@/utils';
import { LocalRelationshipsBuilder } from './LocalRelationshipsBuilder';

/**
 * Provides thread-local or pooled access to LocalRelationshipsBuilder instances.
 * Uses the same strategy pattern as LocalNodesBuilderProvider for resource management.
 *
 * Access pattern:
 * ```typescript
 * const provider = LocalRelationshipsBuilderProvider.threadLocal(() => createBuilder());
 * const slot = provider.acquire();
 * try {
 *   const builder = slot.get();
 *   // use the builder for relationships
 * } finally {
 *   slot.release();
 * }
 * ```
 */
export abstract class LocalRelationshipsBuilderProvider implements AutoCloseable {

  /**
   * Create a thread-local provider (fastest, for fixed thread count).
   */
  static threadLocal(builderSupplier: () => LocalRelationshipsBuilder): LocalRelationshipsBuilderProvider {
    return new ThreadLocalProvider(builderSupplier);
  }

  /**
   * Create a pooled provider (more flexible, for varying thread count).
   */
  static pooled(
    builderSupplier: () => LocalRelationshipsBuilder,
    concurrency: Concurrency
  ): LocalRelationshipsBuilderProvider {
    return PooledProvider.create(builderSupplier, concurrency);
  }

  /**
   * Acquire a slot containing a LocalRelationshipsBuilder instance.
   */
  abstract acquire(): LocalRelationshipsBuilderSlot;

  /**
   * Close the provider and clean up all resources.
   */
  abstract close(): void;
}

/**
 * Interface for a slot that contains a LocalRelationshipsBuilder instance.
 */
export interface LocalRelationshipsBuilderSlot {
  /**
   * Get the LocalRelationshipsBuilder instance.
   */
  get(): LocalRelationshipsBuilder;

  /**
   * Release the slot back to the provider.
   */
  release(): void;
}

/**
 * ThreadLocal-based provider implementation.
 * Fastest access but uses more memory with many threads.
 */
class ThreadLocalProvider extends LocalRelationshipsBuilderProvider {
  private readonly threadLocal: AutoCloseableThreadLocal<Slot>;

  constructor(builderSupplier: () => LocalRelationshipsBuilder) {
    super();
    this.threadLocal = AutoCloseableThreadLocal.withInitial(() =>
      new Slot(builderSupplier())
    );
  }

  acquire(): LocalRelationshipsBuilderSlot {
    return this.threadLocal.get();
  }

  close(): void {
    this.threadLocal.close();
  }

  /**
   * Thread-local slot implementation.
   */
  private static class Slot implements LocalRelationshipsBuilderSlot, AutoCloseable {
    private readonly builder: LocalRelationshipsBuilder;

    constructor(builder: LocalRelationshipsBuilder) {
      this.builder = builder;
    }

    get(): LocalRelationshipsBuilder {
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
class PooledProvider extends LocalRelationshipsBuilderProvider {
  private readonly pool: ObjectPool<PooledSlot>;
  private readonly timeoutMs: number;

  static create(
    builderSupplier: () => LocalRelationshipsBuilder,
    concurrency: Concurrency
  ): LocalRelationshipsBuilderProvider {
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

  acquire(): LocalRelationshipsBuilderSlot {
    try {
      return this.pool.acquire(this.timeoutMs);
    } catch (error) {
      throw new Error(`Failed to acquire relationship builder from pool: ${error.message}`);
    }
  }

  close(): void {
    try {
      this.pool.shutdown(this.timeoutMs);
    } catch (error) {
      throw new Error(`Failed to shutdown relationship builder pool: ${error.message}`);
    }
  }

  /**
   * Pooled slot implementation.
   */
  private static class PooledSlot implements LocalRelationshipsBuilderSlot, Poolable {
    private readonly poolSlot: PoolSlot;
    private readonly builder: LocalRelationshipsBuilder;

    constructor(poolSlot: PoolSlot, builder: LocalRelationshipsBuilder) {
      this.poolSlot = poolSlot;
      this.builder = builder;
    }

    get(): LocalRelationshipsBuilder {
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
    private readonly builderSupplier: () => LocalRelationshipsBuilder;

    constructor(builderSupplier: () => LocalRelationshipsBuilder) {
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
 * Object pool implementation (reused from LocalNodesBuilderProvider).
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

    // Wait for available item (simplified implementation)
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.available.length > 0) {
        const item = this.available.pop()!;
        this.inUse.add(item);
        return item;
      }
      this.sleep(10);
    }

    throw new Error(`Timeout waiting for relationship builder after ${timeoutMs}ms`);
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
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Busy wait (simplified)
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
 * Pool-related interfaces (reused from LocalNodesBuilderProvider).
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
 * Factory for creating relationship builder providers with common configurations.
 */
export class LocalRelationshipsBuilderProviderFactory {
  /**
   * Create a provider optimized for single-threaded relationship processing.
   */
  static singleThreaded(builderSupplier: () => LocalRelationshipsBuilder): LocalRelationshipsBuilderProvider {
    return LocalRelationshipsBuilderProvider.threadLocal(builderSupplier);
  }

  /**
   * Create a provider optimized for fixed multi-threaded relationship processing.
   */
  static fixedThreadPool(
    builderSupplier: () => LocalRelationshipsBuilder,
    threadCount: number
  ): LocalRelationshipsBuilderProvider {
    return LocalRelationshipsBuilderProvider.threadLocal(builderSupplier);
  }

  /**
   * Create a provider optimized for variable multi-threaded relationship processing.
   */
  static variableThreadPool(
    builderSupplier: () => LocalRelationshipsBuilder,
    maxConcurrency: number
  ): LocalRelationshipsBuilderProvider {
    return LocalRelationshipsBuilderProvider.pooled(builderSupplier, new Concurrency(maxConcurrency));
  }

  /**
   * Create a provider with automatic strategy selection based on concurrency.
   */
  static auto(
    builderSupplier: () => LocalRelationshipsBuilder,
    concurrency: Concurrency
  ): LocalRelationshipsBuilderProvider {
    // Use thread-local for low concurrency, pooled for high concurrency
    if (concurrency.value() <= 8) {
      return LocalRelationshipsBuilderProvider.threadLocal(builderSupplier);
    } else {
      return LocalRelationshipsBuilderProvider.pooled(builderSupplier, concurrency);
    }
  }

  /**
   * Create a provider optimized for directed graph processing.
   */
  static forDirectedGraphs(
    builderSupplier: () => LocalRelationshipsBuilder,
    concurrency: Concurrency
  ): LocalRelationshipsBuilderProvider {
    return this.auto(builderSupplier, concurrency);
  }

  /**
   * Create a provider optimized for undirected graph processing.
   * Undirected graphs typically require more memory per relationship (stored in both directions),
   * so we favor pooled providers to control memory usage.
   */
  static forUndirectedGraphs(
    builderSupplier: () => LocalRelationshipsBuilder,
    concurrency: Concurrency
  ): LocalRelationshipsBuilderProvider {
    if (concurrency.value() <= 4) {
      return LocalRelationshipsBuilderProvider.threadLocal(builderSupplier);
    } else {
      return LocalRelationshipsBuilderProvider.pooled(builderSupplier, concurrency);
    }
  }
}

/**
 * AutoCloseable interface for TypeScript.
 */
export interface AutoCloseable {
  close(): void;
}
