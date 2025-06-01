/**
 * LOCAL NODES BUILDER PROVIDER - THREAD-SAFE ACCESS TO BUILDERS
 *
 * The Provider pattern solves the fundamental problem of concurrent access
 * to LocalNodesBuilder instances during graph construction.
 *
 * THE PROBLEM:
 * - Multiple threads need to add nodes simultaneously
 * - LocalNodesBuilder is NOT thread-safe (designed for single thread)
 * - Creating new builders is expensive (buffers, contexts, etc.)
 * - Need efficient acquire/release pattern for shared resources
 *
 * THE SOLUTION:
 * Two strategies for providing thread-safe access:
 *
 * 1. THREAD-LOCAL (Fast): Each thread gets its own dedicated builder
 * 2. POOLED (Flexible): Shared pool of builders, acquire when needed
 *
 * USAGE PATTERN:
 * ```
 * const slot = provider.acquire();  // Get a builder safely
 * try {
 *   slot.get().addNode(id, labels);  // Use the builder
 * } finally {
 *   slot.release();                  // Return it safely
 * }
 * ```
 */

import { Concurrency } from '@/concurrency';
import { LocalNodesBuilder } from './LocalNodesBuilder';

/**
 * Abstract provider for thread-safe access to LocalNodesBuilder instances.
 *
 * DESIGN PATTERN:
 * - Provider Pattern: Manages access to expensive-to-create resources
 * - Strategy Pattern: ThreadLocal vs Pooled implementation strategies
 * - Loan Pattern: Acquire/release resource management
 */
export abstract class LocalNodesBuilderProvider {

  /**
   * Create a THREAD-LOCAL provider (fastest access).
   *
   * WHEN TO USE:
   * - Fixed number of threads (known at startup)
   * - Each thread does significant work (worth dedicated builder)
   * - Memory usage acceptable (one builder per thread)
   *
   * PERFORMANCE:
   * - O(1) access time (no contention)
   * - No locking or synchronization overhead
   * - Highest throughput for sustained workloads
   */
  static threadLocal(builderSupplier: () => LocalNodesBuilder): LocalNodesBuilderProvider {
    return new ThreadLocalProvider(builderSupplier);
  }

  /**
   * Create a POOLED provider (flexible access).
   *
   * WHEN TO USE:
   * - Variable number of threads (dynamic thread pools)
   * - Short-lived tasks (not worth dedicated builder)
   * - Memory constrained (limit total builder count)
   *
   * PERFORMANCE:
   * - Slightly slower access (contention possible)
   * - Memory efficient (shared builders)
   * - Better for bursty workloads
   */
  static pooled(
    builderSupplier: () => LocalNodesBuilder,
    concurrency: Concurrency
  ): LocalNodesBuilderProvider {
    return new PooledProvider(builderSupplier, concurrency.value());
  }

  /** Acquire a slot containing a LocalNodesBuilder */
  abstract acquire(): LocalNodesBuilderSlot;

  /** Close provider and cleanup all resources */
  abstract close(): void;
}

/**
 * Slot interface - safe container for LocalNodesBuilder.
 * Enforces proper acquire/release lifecycle.
 */
export interface LocalNodesBuilderSlot {
  /** Get the builder instance */
  get(): LocalNodesBuilder;

  /** Release the builder back to provider */
  release(): void;
}

/**
 * THREAD-LOCAL STRATEGY
 * Each thread gets its own dedicated LocalNodesBuilder.
 */
class ThreadLocalProvider extends LocalNodesBuilderProvider {
  private readonly threadBuilders = new Map<number, LocalNodesBuilder>();
  private readonly builderSupplier: () => LocalNodesBuilder;

  constructor(builderSupplier: () => LocalNodesBuilder) {
    super();
    this.builderSupplier = builderSupplier;
  }

  acquire(): LocalNodesBuilderSlot {
    const threadId = this.getCurrentThreadId();

    if (!this.threadBuilders.has(threadId)) {
      this.threadBuilders.set(threadId, this.builderSupplier());
    }

    return new ThreadLocalSlot(this.threadBuilders.get(threadId)!);
  }

  close(): void {
    for (const builder of this.threadBuilders.values()) {
      builder.close();
    }
    this.threadBuilders.clear();
  }

  private getCurrentThreadId(): number {
    // Simple thread identification for JavaScript
    return 0; // Single-threaded in browser, would use worker ID in Node.js
  }
}

/**
 * Thread-local slot - no actual release needed (builder stays with thread).
 */
class ThreadLocalSlot implements LocalNodesBuilderSlot {
  constructor(private readonly builder: LocalNodesBuilder) {}

  get(): LocalNodesBuilder {
    return this.builder;
  }

  release(): void {
    // No-op: thread keeps its builder
  }
}

/**
 * POOLED STRATEGY
 * Shared pool of builders, acquired/released as needed.
 */
class PooledProvider extends LocalNodesBuilderProvider {
  private readonly available: LocalNodesBuilder[] = [];
  private readonly inUse = new Set<LocalNodesBuilder>();
  private readonly maxSize: number;
  private readonly builderSupplier: () => LocalNodesBuilder;
  private isShutdown = false;

  constructor(builderSupplier: () => LocalNodesBuilder, maxSize: number) {
    super();
    this.builderSupplier = builderSupplier;
    this.maxSize = maxSize;
  }

  acquire(): LocalNodesBuilderSlot {
    if (this.isShutdown) {
      throw new Error('Provider is shutdown');
    }

    // Try to reuse existing builder
    if (this.available.length > 0) {
      const builder = this.available.pop()!;
      this.inUse.add(builder);
      return new PooledSlot(this, builder);
    }

    // Create new builder if under limit
    if (this.inUse.size < this.maxSize) {
      const builder = this.builderSupplier();
      this.inUse.add(builder);
      return new PooledSlot(this, builder);
    }

    throw new Error(`Pool exhausted: ${this.maxSize} builders in use`);
  }

  close(): void {
    this.isShutdown = true;

    // Close all available builders
    for (const builder of this.available) {
      builder.close();
    }
    this.available.length = 0;

    // Close all in-use builders (they should have been released!)
    for (const builder of this.inUse) {
      builder.close();
    }
    this.inUse.clear();
  }

  /** Internal method for returning builder to pool */
  release(builder: LocalNodesBuilder): void {
    if (this.inUse.has(builder)) {
      this.inUse.delete(builder);
      if (!this.isShutdown) {
        this.available.push(builder);
      } else {
        builder.close();
      }
    }
  }
}

/**
 * Pooled slot - must be released back to pool.
 */
class PooledSlot implements LocalNodesBuilderSlot {
  constructor(
    private readonly provider: PooledProvider,
    private readonly builder: LocalNodesBuilder
  ) {}

  get(): LocalNodesBuilder {
    return this.builder;
  }

  release(): void {
    this.provider.release(this.builder);
  }
}
