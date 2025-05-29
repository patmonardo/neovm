/**
 * Cache-line padded atomic long to prevent false sharing in multi-threaded scenarios.
 *
 * Essential for high-performance concurrent programming:
 * - Prevents false sharing between CPU cache lines
 * - Optimizes memory access patterns in multi-threaded code
 * - Reduces cache coherency traffic between CPU cores
 * - Maximizes throughput for heavily contended atomic operations
 * - Critical for scalable concurrent data structures
 *
 * Performance benefits:
 * - Eliminates cache line ping-ponging between cores
 * - Reduces memory bandwidth consumption
 * - Improves atomic operation throughput
 * - Scales better with increasing thread count
 * - Essential for NUMA-aware programming
 *
 * Technical details:
 * - Cache lines are typically 64 bytes on modern CPUs
 * - AtomicLong is 8 bytes, leaving 56 bytes for padding
 * - Padding fields prevent other variables sharing the cache line
 * - Volatile fields ensure proper memory visibility
 * - sum() method prevents compiler optimization removal
 *
 * Use Cases:
 * - High-contention counters and accumulators
 * - Concurrent data structure coordination
 * - Performance-critical atomic operations
 * - Multi-threaded graph processing coordination
 * - Lock-free algorithm implementations
 *
 * @see http://mechanical-sympathy.blogspot.ch/2011/08/false-sharing-java-7.html
 * @module PaddedAtomicLong
 */

/**
 * Cache-line padded atomic long for optimal multi-threaded performance.
 *
 * Prevents false sharing by padding to cache line boundaries.
 * Critical for high-performance concurrent operations.
 *
 * @example
 * ```typescript
 * // High-contention counter scenario
 * class HighThroughputCounter {
 *   private readonly counter = new PaddedAtomicLong();
 *
 *   public async benchmarkConcurrentIncrement(workerCount: number): Promise<void> {
 *     console.log(`Benchmarking ${workerCount} workers with padded atomic counter`);
 *
 *     const incrementsPerWorker = 1000000;
 *     const startTime = performance.now();
 *
 *     // Spawn concurrent workers
 *     const workers = Array.from({ length: workerCount }, (_, workerId) =>
 *       this.workerIncrement(workerId, incrementsPerWorker)
 *     );
 *
 *     await Promise.all(workers);
 *
 *     const endTime = performance.now();
 *     const totalIncrements = workerCount * incrementsPerWorker;
 *     const actualValue = this.counter.get();
 *
 *     console.log(`Results:`);
 *     console.log(`  Expected: ${totalIncrements}`);
 *     console.log(`  Actual: ${actualValue}`);
 *     console.log(`  Time: ${endTime - startTime}ms`);
 *     console.log(`  Throughput: ${(totalIncrements / ((endTime - startTime) / 1000)).toLocaleString()} ops/sec`);
 *   }
 *
 *   private async workerIncrement(workerId: number, increments: number): Promise<void> {
 *     for (let i = 0; i < increments; i++) {
 *       this.counter.incrementAndGet();
 *
 *       if (i % 100000 === 0) {
 *         console.log(`Worker ${workerId}: ${i} increments complete`);
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class PaddedAtomicLong {
  // Core atomic value
  private value: number = 0;
  private readonly lock = new AsyncLock();

  // Cache line padding to prevent false sharing
  // Modern CPU cache lines are typically 64 bytes
  // AtomicLong (8 bytes) + padding = 64 bytes total
  public volatile p1: number = 1;
  public volatile p2: number = 2;
  public volatile p3: number = 3;
  public volatile p4: number = 4;
  public volatile p5: number = 5;
  public volatile p6: number = 6;
  public volatile p7: number = 7;

  /**
   * Prevents compiler optimization from removing padding fields.
   * The sum operation ensures fields are not optimized away.
   */
  public sum(): number {
    return this.p1 + this.p2 + this.p3 + this.p4 + this.p5 + this.p6 + this.p7;
  }

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  /**
   * Gets the current value atomically.
   */
  public get(): number {
    return this.value;
  }

  /**
   * Sets the value atomically.
   */
  public async set(newValue: number): Promise<void> {
    const release = await this.lock.acquire();
    try {
      this.value = newValue;
    } finally {
      release();
    }
  }

  /**
   * Atomically adds the given value and returns the new value.
   */
  public async addAndGet(delta: number): Promise<number> {
    const release = await this.lock.acquire();
    try {
      this.value += delta;
      return this.value;
    } finally {
      release();
    }
  }

  /**
   * Atomically increments by one and returns the new value.
   */
  public async incrementAndGet(): Promise<number> {
    return this.addAndGet(1);
  }

  /**
   * Atomically decrements by one and returns the new value.
   */
  public async decrementAndGet(): Promise<number> {
    return this.addAndGet(-1);
  }

  /**
   * Atomically sets to the given value and returns the old value.
   */
  public async getAndSet(newValue: number): Promise<number> {
    const release = await this.lock.acquire();
    try {
      const oldValue = this.value;
      this.value = newValue;
      return oldValue;
    } finally {
      release();
    }
  }

  /**
   * Atomically sets the value to the given updated value if the current value equals the expected value.
   */
  public async compareAndSet(expect: number, update: number): Promise<boolean> {
    const release = await this.lock.acquire();
    try {
      if (this.value === expect) {
        this.value = update;
        return true;
      }
      return false;
    } finally {
      release();
    }
  }

  /**
   * Returns the current value and atomically increments by one.
   */
  public async getAndIncrement(): Promise<number> {
    const release = await this.lock.acquire();
    try {
      const oldValue = this.value;
      this.value++;
      return oldValue;
    } finally {
      release();
    }
  }

  /**
   * Returns the current value and atomically decrements by one.
   */
  public async getAndDecrement(): Promise<number> {
    const release = await this.lock.acquire();
    try {
      const oldValue = this.value;
      this.value--;
      return oldValue;
    } finally {
      release();
    }
  }

  /**
   * Returns the current value and atomically adds the given value.
   */
  public async getAndAdd(delta: number): Promise<number> {
    const release = await this.lock.acquire();
    try {
      const oldValue = this.value;
      this.value += delta;
      return oldValue;
    } finally {
      release();
    }
  }

  /**
   * Returns string representation of the current value.
   */
  public toString(): string {
    return this.value.toString();
  }

  /**
   * Returns the current value as a number.
   */
  public valueOf(): number {
    return this.value;
  }
}

/**
 * Simple async lock implementation for atomic operations.
 */
class AsyncLock {
  private locked = false;
  private waiting: Array<() => void> = [];

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => resolve(() => this.release()));
      }
    });
  }

  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}
