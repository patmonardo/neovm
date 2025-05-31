/**
 * High-performance bump allocator inspired by JVM TLAB (Thread Local Allocation Buffers).
 *
 * **Algorithm**: Fast-path allocation by bumping a pointer, with lock-free operation
 * for the common case. Falls back to synchronized growth only when needed.
 *
 * **Research Source**: https://shipilev.net/jvm/anatomy-quarks/4-tlab-allocation
 *
 * **Key Innovation**:
 * - Thread-local allocators avoid contention
 * - Page-based growth with atomic operations
 * - Oversized allocation handling for large adjacency lists
 */

import { ModifiableSlice } from '@/api/compress';

export interface BumpAllocatorFactory<PAGE> {
  newEmptyPages(): PAGE[];
  newPage(length: number): PAGE;
}

export interface PositionalFactory<PAGE> {
  copyOfPage(page: PAGE, length: number): PAGE;
  lengthOfPage(page: PAGE): number;
}

/**
 * Page size constants - matches Java exactly
 */
export class BumpAllocatorConstants {
  static readonly PAGE_SHIFT = 18;           // 256KB pages
  static readonly PAGE_SIZE = 1 << BumpAllocatorConstants.PAGE_SHIFT;  // 262,144 bytes
  static readonly PAGE_MASK = BumpAllocatorConstants.PAGE_SIZE - 1;

  private static readonly NO_SKIP = -1;
}

export class BumpAllocator<PAGE> {

  // ============================================================================
  // ATOMIC FIELDS (using JavaScript approach)
  // ============================================================================

  private _allocatedPages: number = 0;
  private _pages: PAGE[];

  private readonly pageFactory: BumpAllocatorFactory<PAGE>;
  private readonly growLock: AsyncLock; // Simplified mutex for JavaScript

  constructor(pageFactory: BumpAllocatorFactory<PAGE>) {
    this.pageFactory = pageFactory;
    this.growLock = new AsyncLock();
    this._pages = pageFactory.newEmptyPages();
  }

  // ============================================================================
  // ATOMIC OPERATIONS (JavaScript adaptation)
  // ============================================================================

  private get allocatedPages(): number {
    return this._allocatedPages;
  }

  private set allocatedPages(value: number) {
    this._allocatedPages = value;
  }

  private get pages(): PAGE[] {
    return this._pages;
  }

  private set pages(value: PAGE[]) {
    this._pages = value;
  }

  /**
   * Atomic get-and-add operation
   */
  private getAndAddAllocatedPages(delta: number): number {
    const old = this._allocatedPages;
    this._allocatedPages += delta;
    return old;
  }

  /**
   * Atomic compare-and-exchange operation
   */
  private compareAndExchangeAllocatedPages(expected: number, update: number): number {
    if (this._allocatedPages === expected) {
      this._allocatedPages = update;
      return expected;
    }
    return this._allocatedPages;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  newLocalAllocator(): LocalAllocator<PAGE> {
    return new LocalAllocator(this);
  }

  newLocalPositionalAllocator(positionalFactory: PositionalFactory<PAGE>): LocalPositionalAllocator<PAGE> {
    return new LocalPositionalAllocator(this, positionalFactory);
  }

  intoPages(): PAGE[] {
    return this.pages;
  }

  // ============================================================================
  // INTERNAL ALLOCATION METHODS
  // ============================================================================

  private insertDefaultSizedPage(): number {
    const pageIndex = this.getAndAddAllocatedPages(1);
    this.grow(pageIndex + 1, BumpAllocatorConstants.NO_SKIP);
    return PageUtil.capacityFor(pageIndex, BumpAllocatorConstants.PAGE_SHIFT);
  }

  private async insertMultiplePages(uptoPage: number, page?: PAGE): Promise<number> {
    let currentNumPages = this.allocatedPages;
    const newNumPages = uptoPage + 1;

    if (currentNumPages < newNumPages) {
      const pageToSkip = page === undefined ? BumpAllocatorConstants.NO_SKIP : uptoPage;
      await this.grow(newNumPages, pageToSkip);
    }

    if (page !== undefined) {
      await this.growLock.acquire();
      try {
        this.pages[uptoPage] = page;
      } finally {
        this.growLock.release();
      }
    }

    // Atomic CAS loop to update allocated pages
    while (currentNumPages < newNumPages) {
      const nextNumPages = this.compareAndExchangeAllocatedPages(currentNumPages, newNumPages);
      if (nextNumPages === currentNumPages) {
        currentNumPages = newNumPages;
        break;
      }
      currentNumPages = nextNumPages;
    }

    return PageUtil.capacityFor(currentNumPages, BumpAllocatorConstants.PAGE_SHIFT);
  }

  private async insertExistingPage(page: PAGE): Promise<number> {
    const pageIndex = this.getAndAddAllocatedPages(1);
    await this.grow(pageIndex + 1, pageIndex);

    // Insert the page under lock to avoid races
    await this.growLock.acquire();
    try {
      this.pages[pageIndex] = page;
    } finally {
      this.growLock.release();
    }

    return PageUtil.capacityFor(pageIndex, BumpAllocatorConstants.PAGE_SHIFT);
  }

  private async grow(newNumPages: number, skipPage: number): Promise<void> {
    if (this.capacityLeft(newNumPages)) {
      return;
    }

    await this.growLock.acquire();
    try {
      if (this.capacityLeft(newNumPages)) {
        return;
      }
      this.setPages(newNumPages, skipPage);
    } finally {
      this.growLock.release();
    }
  }

  private capacityLeft(newNumPages: number): boolean {
    return newNumPages <= this.pages.length;
  }

  /**
   * Grows and re-assigns the pages array.
   *
   * **Thread Safety**: Must be called under growLock
   */
  private setPages(newNumPages: number, skipPage: number): void {
    const currentPages = this.pages;
    const newPages = [...currentPages];

    // Extend array to new size
    newPages.length = newNumPages;

    // Create new pages for expanded slots
    for (let i = currentPages.length; i < newNumPages; i++) {
      if (i !== skipPage) {
        newPages[i] = this.pageFactory.newPage(BumpAllocatorConstants.PAGE_SIZE);
      }
    }

    this.pages = newPages;
  }
}

/**
 * Thread-local allocator for fast-path allocation.
 *
 * **Performance**: Bumps a local pointer until page exhausted,
 * then requests new page from global allocator.
 */
export class LocalAllocator<PAGE> {

  private readonly globalAllocator: BumpAllocator<PAGE>;

  private top: number = 0;
  private page?: PAGE;
  private offset: number;

  constructor(globalAllocator: BumpAllocator<PAGE>) {
    this.globalAllocator = globalAllocator;
    this.offset = BumpAllocatorConstants.PAGE_SIZE; // Force initial allocation
  }

  /**
   * Fast-path allocation - just bump the pointer!
   *
   * **Algorithm**:
   * 1. Check if current page has space
   * 2. If yes: bump pointer (FAST PATH)
   * 3. If no: get new page from global allocator (SLOW PATH)
   */
  async insertInto(length: number, slice: ModifiableSlice<PAGE>): Promise<number> {
    const maxOffset = BumpAllocatorConstants.PAGE_SIZE - length;

    if (maxOffset >= this.offset) {
      // ✅ FAST PATH: Bump allocation
      const address = this.top;
      this.bumpAllocate(length, slice);
      return address;
    }

    // ❌ SLOW PATH: Need new page or oversized allocation
    return await this.slowPathAllocate(length, maxOffset, slice);
  }

  /**
   * The magic: just bump the pointer!
   */
  private bumpAllocate(length: number, slice: ModifiableSlice<PAGE>): void {
    slice.setSlice(this.page!);
    slice.setOffset(this.offset);
    slice.setLength(length);
    this.offset += length;
    this.top += length;
  }

  private async slowPathAllocate(length: number, maxOffset: number, slice: ModifiableSlice<PAGE>): Promise<number> {
    if (maxOffset < 0) {
      // Oversized allocation - larger than page size
      return await this.oversizingAllocate(length, slice);
    }
    // Normal allocation - just need new page
    return await this.prefetchAllocate(length, slice);
  }

  /**
   * Handle allocations larger than page size.
   *
   * **Strategy**: Create a single oversized page to hold all data.
   * This maintains the illusion of page-based allocation.
   */
  private async oversizingAllocate(length: number, slice: ModifiableSlice<PAGE>): Promise<number> {
    const page = this.globalAllocator.pageFactory.newPage(length);
    slice.setSlice(page);
    slice.setOffset(0);
    slice.setLength(length);
    return await this.globalAllocator.insertExistingPage(page);
  }

  private async prefetchAllocate(length: number, slice: ModifiableSlice<PAGE>): Promise<number> {
    const address = await this.prefetchAllocate();
    this.bumpAllocate(length, slice);
    return address;
  }

  private async prefetchAllocate(): Promise<number> {
    this.top = await this.globalAllocator.insertDefaultSizedPage();
    console.assert(PageUtil.indexInPage(this.top, BumpAllocatorConstants.PAGE_MASK) === 0);

    const currentPageIndex = PageUtil.pageIndex(this.top, BumpAllocatorConstants.PAGE_SHIFT);
    this.page = this.globalAllocator.pages[currentPageIndex];
    this.offset = 0;
    return this.top;
  }
}

/**
 * Positional allocator for inserting data at specific offsets.
 *
 * **Use Case**: When you know exactly where data should go
 * (e.g., based on node IDs or pre-computed positions).
 */
export class LocalPositionalAllocator<PAGE> {

  private readonly globalAllocator: BumpAllocator<PAGE>;
  private readonly pageFactory: PositionalFactory<PAGE>;
  private capacity: number = 0;

  constructor(globalAllocator: BumpAllocator<PAGE>, pageFactory: PositionalFactory<PAGE>) {
    this.globalAllocator = globalAllocator;
    this.pageFactory = pageFactory;
  }

  /**
   * Insert data at a specific position.
   */
  async insertAt(offset: number, page: PAGE, length: number): Promise<void> {
    const targetLength = this.pageFactory.lengthOfPage(page);
    await this.insertData(offset, page, Math.min(length, targetLength), this.capacity, targetLength);
  }

  private async insertData(offset: number, page: PAGE, length: number, capacity: number, targetsLength: number): Promise<void> {
    let pageToInsert: PAGE | undefined = page;

    if (offset + length > capacity) {
      pageToInsert = await this.allocateNewPages(offset, page, length, targetsLength);
    }

    if (pageToInsert !== undefined) {
      const pageId = PageUtil.pageIndex(offset, BumpAllocatorConstants.PAGE_SHIFT);
      const pageOffset = PageUtil.indexInPage(offset, BumpAllocatorConstants.PAGE_MASK);
      const allocatedPage = this.globalAllocator.pages[pageId];

      // Copy data into the allocated page
      this.copyArray(pageToInsert, 0, allocatedPage, pageOffset, length);
    }
  }

  private async allocateNewPages(offset: number, page: PAGE, length: number, targetsLength: number): Promise<PAGE | undefined> {
    const pageId = PageUtil.pageIndex(offset, BumpAllocatorConstants.PAGE_SHIFT);

    // Handle oversized pages
    let existingPage: PAGE | undefined = undefined;
    if (length > BumpAllocatorConstants.PAGE_SIZE) {
      if (length < targetsLength) {
        // Create exact-sized copy for oversized page with buffer
        page = this.pageFactory.copyOfPage(page, length);
      }
      existingPage = page;
    }

    this.capacity = await this.globalAllocator.insertMultiplePages(pageId, existingPage);

    if (existingPage !== undefined) {
      // Oversized page already inserted
      return undefined;
    }
    return page;
  }

  /**
   * Array copy utility (JavaScript adaptation of System.arraycopy)
   */
  private copyArray(src: PAGE, srcPos: number, dest: PAGE, destPos: number, length: number): void {
    // Type-specific implementations would go here
    // For now, assume PAGE is an array-like structure
    if (Array.isArray(src) && Array.isArray(dest)) {
      for (let i = 0; i < length; i++) {
        dest[destPos + i] = src[srcPos + i];
      }
    } else {
      throw new Error("copyArray not implemented for this PAGE type");
    }
  }
}

/**
 * Simple async lock for JavaScript (since we don't have ReentrantLock)
 */
class AsyncLock {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}
