/**
 * Universal base class for all paged data structures.
 *
 * Provides the essential infrastructure for billion-scale data storage:
 * - Thread-safe dynamic growth with lock-based coordination
 * - Efficient page-based indexing with bit manipulation
 * - Memory capacity management and estimation
 * - Atomic size and capacity tracking
 * - Generic page allocation through PageAllocator
 *
 * Foundation for all huge data structures:
 * - HugeLongArray: billion-element integer arrays
 * - HugeDoubleArray: massive floating-point datasets
 * - HugeObjectArray: large-scale object collections
 * - Matrix implementations: 2D paged storage
 * - Map/Set implementations: hash table backing
 *
 * Performance characteristics:
 * - O(1) index calculation using bit shifts and masks
 * - Minimal locking (only during growth operations)
 * - Power-of-2 page sizes for optimal bit manipulation
 * - Atomic operations for thread-safe size tracking
 * - Efficient memory estimation and capacity planning
 *
 * Concurrency features:
 * - Thread-safe growth with ReentrantLock semantics
 * - Atomic size and capacity counters
 * - Lock-free reads during normal operations
 * - Safe concurrent access during structure growth
 *
 * @module PagedDataStructure
 */

import { PageUtil } from "@/collections";
import { PageAllocator } from "./PageAllocator";

/**
 * Thread-safe atomic counter with padding to avoid false sharing.
 * Simulates Java's AtomicLong with cache line padding.
 */
class PaddedAtomicLong {
  private value: number = 0;

  // Padding to prevent false sharing (simulate cache line isolation)
  public readonly padding = new Array(8).fill(0);

  public get(): number {
    return this.value;
  }

  public set(newValue: number): void {
    this.value = newValue;
  }

  public getAndSet(newValue: number): number {
    const oldValue = this.value;
    this.value = newValue;
    return oldValue;
  }

  public compareAndSet(expected: number, update: number): boolean {
    if (this.value === expected) {
      this.value = update;
      return true;
    }
    return false;
  }
}

/**
 * Simple mutex implementation for TypeScript.
 * Provides ReentrantLock-like semantics for growth operations.
 */
class ReentrantLock {
  private locked: boolean = false;
  private lockCount: number = 0;
  private owner: string | null = null;
  public readonly fair: boolean;

  constructor(fair: boolean = false) {
    this.fair = fair;
  }

  public async lock(): Promise<void> {
    const currentOwner = this.getCurrentThreadId();

    // Reentrant check - same thread can acquire lock multiple times
    if (this.owner === currentOwner) {
      this.lockCount++;
      return;
    }

    // Wait for lock to be available
    while (this.locked) {
      await this.sleep(1);
    }

    this.locked = true;
    this.owner = currentOwner;
    this.lockCount = 1;
  }

  public unlock(): void {
    const currentOwner = this.getCurrentThreadId();

    if (this.owner !== currentOwner) {
      throw new Error("Cannot unlock from different thread");
    }

    this.lockCount--;
    if (this.lockCount === 0) {
      this.owner = null;
      this.locked = false;
    }
  }

  private getCurrentThreadId(): string {
    // In browser/Node.js, simulate thread ID
    return "main-thread";
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
/**
 * Base class for all paged data structures.
 * Provides thread-safe growth, efficient indexing, and memory management.
 */
export class PagedDataStructure<T> {
  protected readonly pageSize: number;
  protected readonly pageShift: number;
  protected readonly pageMask: number;
  private readonly maxSupportedSize: bigint;

  protected pages: T[] = [];

  private readonly sizeCounter = new PaddedAtomicLong();
  private readonly capacityCounter = new PaddedAtomicLong();
  private readonly growLock = new ReentrantLock(true); // Fair lock

  private readonly allocator: PageAllocator<T>;

  constructor(size: number, allocator: PageAllocator<T>) {
    this.pageSize = allocator.pageSize();
    this.pageShift = Math.floor(Math.log2(this.pageSize));
    this.pageMask = this.pageSize - 1;

    // Calculate maximum supported size based on bit manipulation limits
    const maxIndexShift = 31 + this.pageShift; // 32-bit int limit + page shift
    this.maxSupportedSize = 1n << BigInt(maxIndexShift);

    console.assert(
      size <= this.maxSupportedSize,
      `Size ${size} exceeds maximum supported size ${this.maxSupportedSize}`
    );

    this.sizeCounter.set(size);
    this.allocator = allocator;
    this.pages = allocator.emptyPages();

    // Initialize pages for the requested size
    this.initializePages(this.numPages(size));
  }

  private initializePages(numPages: number): void {
    if (numPages <= 0) return;

    this.pages = new Array<T>(numPages);
    for (let i = 0; i < numPages; i++) {
      this.pages[i] = this.allocateNewPage();
    }
    this.capacityCounter.set(this.capacityFor(numPages));
  }

  /**
   * Returns the current size of the data structure.
   * Indices up to this size have been filled with data.
   */
  public size(): number {
    return this.sizeCounter.get();
  }

  /**
   * Returns the current capacity of the data structure.
   * The structure can safely be written up to this index (exclusive).
   */
  public capacity(): number {
    return this.capacityCounter.get();
  }

  /**
   * Releases all resources and returns freed memory estimate.
   * Invalidates the data structure - do not use after calling this!
   *
   * @returns Estimated bytes freed
   */
  public release(): number {
    this.sizeCounter.set(0);
    const freed = this.allocator.estimateMemoryUsage(
      this.capacityCounter.getAndSet(0)
    );
    this.pages = [];
    return freed;
  }

  /**
   * Returns memory usage estimation in bytes.
   */
  public sizeOf(): number {
    return this.allocator.estimateMemoryUsage(this.capacity());
  }

  /**
   * Calculates the number of pages needed for given capacity.
   */
  protected numPages(capacity: number): number {
    return PageUtil.numPagesFor(capacity, this.pageShift, this.pageMask);
  }

  /**
   * Calculates capacity for a given number of pages.
   */
  protected capacityFor(numPages: number): number {
    return numPages << this.pageShift;
  }

  /**
   * Efficiently calculates page index for a given element index.
   * Uses bit shifting for O(1) performance.
   *
   * @param index Element index
   * @returns Page index containing the element
   */
  protected pageIndex(index: number): number {
    return Math.floor(index / (1 << this.pageShift));
  }

  /**
   * Efficiently calculates index within page for a given element index.
   * Uses bit masking for O(1) performance.
   *
   * @param index Element index
   * @returns Index within the page
   */
  protected indexInPage(index: number): number {
    return index & this.pageMask;
  }

  /**
   * Thread-safe growth to accommodate new size.
   * Preserves existing content and is no-op if already large enough.
   *
   * @param newSize Target size for the structure
   * @param skipPage Optional page index to skip during allocation
   */
  protected async grow(newSize: number, skipPage: number = -1): Promise<void> {
    console.assert(
      newSize <= this.maxSupportedSize,
      `New size ${newSize} exceeds maximum ${this.maxSupportedSize}`
    );

    let cap = this.capacityCounter.get();
    if (cap >= newSize) {
      this.growSize(newSize);
      return;
    }

    // Thread-safe growth with locking
    await this.growLock.lock();
    try {
      cap = this.capacityCounter.get();
      if (cap >= newSize) {
        this.growSize(newSize);
        return;
      }

      // Allocate new pages and update capacity
      await this.setPages(this.numPages(newSize), this.pages.length, skipPage);
      this.growSize(newSize);
    } finally {
      this.growLock.unlock();
    }
  }

  /**
   * Atomically updates the size counter.
   * Uses compare-and-swap for thread safety.
   */
  private growSize(newSize: number): void {
    let currentSize: number;
    do {
      currentSize = this.sizeCounter.get();
    } while (
      currentSize < newSize &&
      !this.sizeCounter.compareAndSet(currentSize, newSize)
    );
  }

  /**
   * Initial page allocation setup with simplified overloading.
   */
  private setPages(numPages: number): void;
  private setPages(
    numPages: number,
    currentNumPages: number,
    skipPage: number
  ): Promise<void>;
  private setPages(
    numPages: number,
    currentNumPages?: number,
    skipPage?: number
  ): void | Promise<void> {
    if (currentNumPages === undefined) {
      // Simple synchronous case for initial setup
      if (numPages > 0) {
        return this.setPages(numPages, 0, -1) as Promise<void>;
      }
      return;
    }

    // Asynchronous case for growth operations
    return this.setPagesAsync(numPages, currentNumPages, skipPage ?? -1);
  }

  /**
   * Extends page array with new pages.
   * Thread-safe allocation of additional pages.
   *
   * @param numPages Total number of pages needed
   * @param currentNumPages Current number of allocated pages
   * @param skipPage Page index to skip during allocation (-1 for none)
   */
  private async setPagesAsync(
    numPages: number,
    currentNumPages: number,
    skipPage: number
  ): Promise<void> {
    // Extend pages array
    const newPages = new Array<T>(numPages);

    // Copy existing pages
    for (let i = 0; i < Math.min(currentNumPages, this.pages.length); i++) {
      newPages[i] = this.pages[i];
    }

    // Allocate new pages
    for (let i = currentNumPages; i < numPages; i++) {
      if (i !== skipPage) {
        newPages[i] = this.allocateNewPage();
      }
    }

    this.pages = newPages;
    this.capacityCounter.set(this.capacityFor(numPages));
  }

  /**
   * Allocates a new page using the configured allocator.
   */
  protected allocateNewPage(): T {
    return this.allocator.newPage();
  }
}
