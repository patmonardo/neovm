import { PageUtil } from '../../../collections/PageUtil';
import { PaddedAtomicLong } from './PaddedAtomicLong';
import { PageAllocator } from './PageAllocator';

/**
 * Base class for paged data structures that efficiently handle large data sets.
 * Uses a page-based approach to overcome JavaScript array size limitations.
 */
export class PagedDataStructure<T> {
  /**
   * Number of elements per page.
   */
  protected readonly pageSize: number;

  /**
   * Bit shift for dividing by pageSize.
   */
  protected readonly pageShift: number;

  /**
   * Bit mask for modulo pageSize.
   */
  protected readonly pageMask: number;

  /**
   * Maximum supported size of the data structure.
   */
  private readonly maxSupportedSize: number;

  /**
   * Array of pages holding the actual data.
   */
  protected pages: T[];

  /**
   * Current size (number of elements).
   */
  private readonly size = new PaddedAtomicLong();

  /**
   * Current capacity (maximum number of elements without growing).
   */
  private readonly capacity = new PaddedAtomicLong();

  /**
   * Lock for growing the structure.
   * Since JavaScript is single-threaded in the main thread,
   * we're using a simple boolean flag for locking.
   */
  private growLock = false;

  /**
   * Page allocator for creating new pages.
   */
  private readonly allocator: PageAllocator<T>;

  /**
   * Creates a new paged data structure.
   *
   * @param size Initial size
   * @param allocator Allocator for creating new pages
   */
  protected constructor(size: number, allocator: PageAllocator<T>) {
    this.pageSize = allocator.pageSize();
    this.pageShift = Math.log2(this.pageSize);
    this.pageMask = this.pageSize - 1;

    // Calculate maximum supported size
    // In JavaScript, we're limited by safe integer range
    const maxIndexShift = 53 - 1 + this.pageShift; // 53 bits for safe integers
    this.maxSupportedSize = 2 ** maxIndexShift;
    console.assert(size <= this.maxSupportedSize, "Size exceeds maximum supported size");

    this.size.set(BigInt(size));
    this.allocator = allocator;
    this.pages = allocator.emptyPages();
    this.setPages(this.numPages(size));
  }

  /**
   * Returns the current size of this data structure.
   * Indices up to this value (exclusive) have been filled with data.
   *
   * @returns The current size
   */
  public size(): number {
    return Number(this.size.get());
  }

  /**
   * Returns the current capacity of this data structure.
   * The structure can safely be written up to this index (exclusive).
   *
   * @returns The current capacity
   */
  public capacity(): number {
    return Number(this.capacity.get());
  }

  /**
   * Releases memory held by this data structure.
   *
   * @returns Estimated number of bytes freed
   */
  public release(): number {
    this.size.set(0n);
    const freed = this.allocator.estimateMemoryUsage(Number(this.capacity.getAndSet(0n)));
    this.pages = [];
    return freed;
  }

  /**
   * Calculates the number of pages needed for the given capacity.
   *
   * @param capacity The desired capacity
   * @returns Number of pages required
   */
  protected numPages(capacity: number): number {
    return PageUtil.numPagesFor(capacity, this.pageShift, this.pageMask);
  }

  /**
   * Calculates the capacity for the given number of pages.
   *
   * @param numPages Number of pages
   * @returns Capacity
   */
  protected capacityFor(numPages: number): number {
    return numPages << this.pageShift;
  }

  /**
   * Calculates the page index for the given element index.
   *
   * @param index Element index
   * @returns Page index
   */
  protected pageIndex(index: number): number {
    return index >>> this.pageShift;
  }

  /**
   * Calculates the index within a page for the given element index.
   *
   * @param index Element index
   * @returns Index within the page
   */
  protected indexInPage(index: number): number {
    return index & this.pageMask;
  }

  /**
   * Grows the page structure to the new size. The existing content is preserved.
   * If the current size is large enough, this is no-op and no downsizing happens.
   *
   * @param newSize New desired size
   */
  protected grow(newSize: number): void {
    this.grow(newSize, -1);
  }

  /**
   * Grows the page structure to the new size while skipping a specific page.
   * The existing content is preserved.
   *
   * @param newSize New desired size
   * @param skipPage Index of page to skip (or -1 for none)
   */
  protected grow(newSize: number, skipPage: number): void {
    console.assert(newSize <= this.maxSupportedSize, "New size exceeds maximum supported size");

    let cap = Number(this.capacity.get());
    if (cap >= newSize) {
      this.growSize(newSize);
      return;
    }

    // Attempt to acquire lock (JavaScript is single-threaded in the main thread,
    // but this pattern still helps with reentrancy protection)
    if (this.growLock) {
      throw new Error("Reentrant call to grow() detected");
    }

    this.growLock = true;
    try {
      cap = Number(this.capacity.get());
      if (cap >= newSize) {
        this.growSize(newSize);
        return;
      }

      this.setPages(this.numPages(newSize), this.pages.length, skipPage);
      this.growSize(newSize);
    } finally {
      // Release lock
      this.growLock = false;
    }
  }

  /**
   * Increases the size field atomically if the new size is larger.
   *
   * @param newSize New size value
   */
  private growSize(newSize: number): void {
    const newSizeBigInt = BigInt(newSize);
    let currentSize: number;

    do {
      currentSize = this.size.get();
      if (currentSize >= newSizeBigInt) {
        return;
      }
    } while (!this.size.compareAndSet(currentSize, newSizeBigInt));
  }

  /**
   * Sets the pages array to the specified number of pages.
   *
   * @param numPages Number of pages
   */
  private setPages(numPages: number): void {
    if (numPages > 0) {
      this.setPages(numPages, 0, -1);
    }
  }

  /**
   * Sets the pages array to the specified number of pages,
   * preserving current pages and allocating new ones.
   *
   * @param numPages New number of pages
   * @param currentNumPages Current number of pages
   * @param skipPage Index of page to skip (or -1 for none)
   */
  private setPages(numPages: number, currentNumPages: number, skipPage: number): void {
    // Create new pages array with the target size
    const pages: T[] = [...this.pages];
    pages.length = numPages;

    // Allocate new pages
    for (let i = currentNumPages; i < numPages; i++) {
      if (i !== skipPage) {
        pages[i] = this.allocateNewPage();
      }
    }

    this.pages = pages;
    this.capacity.set(BigInt(this.capacityFor(numPages)));
  }

  /**
   * Allocates a new page.
   *
   * @returns A new page
   */
  protected allocateNewPage(): T {
    return this.allocator.newPage();
  }
}
