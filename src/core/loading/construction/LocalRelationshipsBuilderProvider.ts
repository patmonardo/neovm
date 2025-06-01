/**
 * LOCAL RELATIONSHIPS BUILDER PROVIDER - THREAD-SAFE ACCESS TO RELATIONSHIP BUILDERS
 *
 * Provides thread-safe access to LocalRelationshipsBuilder instances using two strategies:
 * 1. THREAD-LOCAL: Each thread gets its own dedicated builder
 * 2. POOLED: Shared pool of builders with acquire/release pattern
 *
 * USAGE PATTERN:
 * ```
 * const slot = provider.acquire();  // Get a builder safely
 * try {
 *   slot.get().addRelationship(src, target);  // Use the builder
 * } finally {
 *   slot.release();                  // Return it safely
 * }
 * ```
 */

import { Concurrency } from '@/concurrency';
import { AutoCloseableThreadLocal } from '@/utils';
import { LocalRelationshipsBuilder } from './LocalRelationshipsBuilder';

/**
 * Abstract provider for thread-safe access to LocalRelationshipsBuilder instances.
 */
export abstract class LocalRelationshipsBuilderProvider {

  /**
   * Create a THREAD-LOCAL provider (fastest access).
   * Each thread gets its own dedicated builder.
   */
  static threadLocal(builderSupplier: () => LocalRelationshipsBuilder): LocalRelationshipsBuilderProvider {
    return new LocalRelationshipsBuilderProvider.ThreadLocalProvider(builderSupplier);
  }

  /**
   * Create a POOLED provider (flexible access).
   * Shared pool of builders with acquire/release pattern.
   */
  static pooled(
    builderSupplier: () => LocalRelationshipsBuilder,
    concurrency: Concurrency
  ): LocalRelationshipsBuilderProvider {
    return LocalRelationshipsBuilderProvider.PooledProvider.create(builderSupplier, concurrency);
  }

  /** Acquire a slot containing a LocalRelationshipsBuilder */
  abstract acquire(): LocalRelationshipsBuilderProvider.Slot;

  /** Close provider and cleanup all resources */
  abstract close(): void;
}

/**
 * Namespace containing all Provider-related classes and interfaces.
 * Organizes the complex inner class hierarchy outside the main class.
 */
export namespace LocalRelationshipsBuilderProvider {

  /**
   * Slot interface - safe container for LocalRelationshipsBuilder.
   * Enforces proper acquire/release lifecycle.
   */
  export interface Slot {
    /** Get the builder instance */
    get(): LocalRelationshipsBuilder;

    /** Release the builder back to provider */
    release(): void;
  }

  /**
   * THREAD-LOCAL STRATEGY IMPLEMENTATION
   * Each thread gets its own dedicated LocalRelationshipsBuilder.
   */
  export class ThreadLocalProvider extends LocalRelationshipsBuilderProvider {
    private readonly threadLocal: AutoCloseableThreadLocal<ThreadLocalSlot>;

    constructor(builderSupplier: () => LocalRelationshipsBuilder) {
      super();
      this.threadLocal = AutoCloseableThreadLocal.withInitial(() =>
        new ThreadLocalSlot(builderSupplier())
      );
    }

    acquire(): Slot {
      return this.threadLocal.get();
    }

    close(): void {
      this.threadLocal.close();
    }
  }

  /**
   * Thread-local slot implementation.
   * No actual release needed since builder stays with thread.
   */
  export class ThreadLocalSlot implements Slot, AutoCloseable {
    constructor(private readonly builder: LocalRelationshipsBuilder) {}

    get(): LocalRelationshipsBuilder {
      return this.builder;
    }

    release(): void {
      // No-op: thread keeps its builder
    }

    close(): void {
      this.builder.close();
    }
  }

  /**
   * POOLED STRATEGY IMPLEMENTATION
   * Uses external stormpot library for sophisticated object pooling.
   */
  export class PooledProvider extends LocalRelationshipsBuilderProvider {
    private readonly pool: Pool<PooledSlot>;
    private readonly timeout = new Timeout(1, TimeUnit.HOURS);

    /**
     * Create a pooled provider with proper resource management.
     */
    static create(
      builderSupplier: () => LocalRelationshipsBuilder,
      concurrency: Concurrency
    ): LocalRelationshipsBuilderProvider {
      const pool = Pool
        .fromInline(new PooledSlotAllocator(builderSupplier))
        .setSize(concurrency.value())
        .build();

      return new PooledProvider(pool);
    }

    private constructor(pool: Pool<PooledSlot>) {
      super();
      this.pool = pool;
    }

    acquire(): Slot {
      try {
        return this.pool.claim(this.timeout);
      } catch (error) {
        if (error instanceof InterruptedException) {
          throw new Error(`Pool acquisition interrupted: ${error.message}`);
        }
        throw error;
      }
    }

    async close(): Promise<void> {
      await this.pool.shutdown().await(this.timeout);
    }
  }

  /**
   * Pooled slot implementation.
   * Must be released back to pool after use.
   */
  export class PooledSlot implements Slot, Poolable {
    constructor(
      private readonly slot: stormpot.Slot,
      private readonly builder: LocalRelationshipsBuilder
    ) {}

    get(): LocalRelationshipsBuilder {
      return this.builder;
    }

    release(): void {
      this.slot.release(this);
    }
  }

  /**
   * Allocator for creating and destroying pooled slots.
   * Handles the lifecycle of LocalRelationshipsBuilder instances in the pool.
   */
  export class PooledSlotAllocator implements stormpot.Allocator<PooledSlot> {
    constructor(private readonly builderSupplier: () => LocalRelationshipsBuilder) {}

    allocate(slot: stormpot.Slot): PooledSlot {
      return new PooledSlot(slot, this.builderSupplier());
    }

    async deallocate(slot: PooledSlot): Promise<void> {
      await slot.get().close();
    }
  }
}

// =============================================================================
// EXTERNAL LIBRARY INTERFACES (stormpot)
// =============================================================================

/**
 * External pooling library interfaces.
 * These would normally come from @stormpot npm package.
 */

export interface Poolable {
  // Marker interface for poolable objects
}

export interface Pool<T extends Poolable> {
  claim(timeout: Timeout): T;
  shutdown(): PoolShutdown;
}

export interface PoolShutdown {
  await(timeout: Timeout): Promise<void>;
}

export namespace stormpot {
  export interface Slot {
    release<T extends Poolable>(poolable: T): void;
  }

  export interface Allocator<T extends Poolable> {
    allocate(slot: Slot): T;
    deallocate(slot: T): Promise<void>;
  }
}

export class Pool<T extends Poolable> {
  static fromInline<T extends Poolable>(allocator: stormpot.Allocator<T>): PoolBuilder<T> {
    return new PoolBuilder(allocator);
  }
}

export class PoolBuilder<T extends Poolable> {
  constructor(private allocator: stormpot.Allocator<T>) {}

  setSize(size: number): this {
    // Configuration method
    return this;
  }

  build(): Pool<T> {
    // Build the actual pool
    return new ConcretePool(this.allocator);
  }
}

class ConcretePool<T extends Poolable> implements Pool<T> {
  constructor(public allocator: stormpot.Allocator<T>) {}

  claim(timeout: Timeout): T {
    // Pool implementation would go here
    throw new Error('Pool implementation required');
  }

  shutdown(): PoolShutdown {
    return new ConcretePoolShutdown();
  }
}

class ConcretePoolShutdown implements PoolShutdown {
  async await(timeout: Timeout): Promise<void> {
    // Shutdown implementation
  }
}

export class Timeout {
  constructor(
    public value: number,
    public unit: TimeUnit
  ) {}
}

export enum TimeUnit {
  HOURS = 'HOURS',
  MINUTES = 'MINUTES',
  SECONDS = 'SECONDS'
}

export class InterruptedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterruptedException';
  }
}

export interface AutoCloseable {
  close(): void;
}
