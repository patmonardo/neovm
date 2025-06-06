/**
 * High-performance bump allocator inspired by JVM TLAB (Thread Local Allocation Buffers).
 *
 * **Algorithm**: Fast-path allocation by bumping a pointer, with atomic operations
 * for the common case. Falls back to synchronized growth only when needed.
 *
 * **Research Source**: https://shipilev.net/jvm/anatomy-quarks/4-tlab-allocation
 *
 * **Key Innovation**:
 * - Thread-local allocators avoid contention
 * - Page-based growth with atomic operations
 * - Oversized allocation handling for large adjacency lists
 */

import { ModifiableSlice } from "@/api/compress/ModifiableSlice";
import { PageUtil } from "@/collections/PageUtil";

// ============================================================================
// FACTORY INTERFACES
// ============================================================================

export interface BumpAllocatorFactory<PAGE> {
  newEmptyPages(): PAGE[];
  newPage(length: number): PAGE;
}

export interface PositionalFactory<PAGE> {
  copyOfPage(page: PAGE, length: number): PAGE;
  lengthOfPage(page: PAGE): number;
}

// ============================================================================
// CONSTANTS CLASS
// ============================================================================

export class BumpAllocatorConstants {
  static readonly PAGE_SHIFT = 18; // 256KB pages
  static readonly PAGE_SIZE = 1 << BumpAllocatorConstants.PAGE_SHIFT; // 262,144 bytes
  static readonly PAGE_MASK = BumpAllocatorConstants.PAGE_SIZE - 1;
  private static readonly NO_SKIP = -1;

  // Make NO_SKIP accessible for internal use
  static get NO_SKIP_VALUE(): number {
    return BumpAllocatorConstants.NO_SKIP;
  }
}

// ============================================================================
// ASYNC LOCK UTILITY
// ============================================================================

class AsyncLock {
  private _locked = false;
  private readonly _waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this._locked) {
        this._locked = true;
        resolve();
      } else {
        this._waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this._waitQueue.length > 0) {
      const next = this._waitQueue.shift()!;
      next();
    } else {
      this._locked = false;
    }
  }

  get isLocked(): boolean {
    return this._locked;
  }
}

// ============================================================================
// MAIN BUMP ALLOCATOR CLASS
// ============================================================================

export class BumpAllocator<PAGE> {
  // Atomic fields (using modern JavaScript approach)
  private _allocatedPages = 0;
  private _pages: PAGE[];

  private readonly _pageFactory: BumpAllocatorFactory<PAGE>;
  private readonly _growLock = new AsyncLock();

  constructor(pageFactory: BumpAllocatorFactory<PAGE>) {
    this._pageFactory = pageFactory;
    this._pages = pageFactory.newEmptyPages();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  newLocalAllocator(): LocalAllocator<PAGE> {
    return new LocalAllocator(this);
  }

  newLocalPositionalAllocator(
    positionalFactory: PositionalFactory<PAGE>
  ): LocalPositionalAllocator<PAGE> {
    return new LocalPositionalAllocator(this, positionalFactory);
  }

  intoPages(): PAGE[] {
    return [...this._pages]; // Return defensive copy
  }

  // ============================================================================
  // ATOMIC OPERATIONS (Modern TypeScript)
  // ============================================================================

  private get allocatedPages(): number {
    return this._allocatedPages;
  }

  public get pages(): PAGE[] {
    return this._pages;
  }

  private getAndAddAllocatedPages(delta: number): number {
    const old = this._allocatedPages;
    this._allocatedPages += delta;
    return old;
  }

  private compareAndExchangeAllocatedPages(
    expected: number,
    update: number
  ): number {
    if (this._allocatedPages === expected) {
      this._allocatedPages = update;
      return expected;
    }
    return this._allocatedPages;
  }

  private setPages(newPages: PAGE[]): void {
    this._pages = newPages;
  }

  // ============================================================================
  // INTERNAL ALLOCATION METHODS (Java Overloads Pattern)
  // ============================================================================

  // Java overload: insertDefaultSizedPage()
  private async insertDefaultSizedPage(): Promise<number> {
    const pageIndex = this.getAndAddAllocatedPages(1);
    await this.grow(pageIndex + 1, BumpAllocatorConstants.NO_SKIP_VALUE);
    return PageUtil.capacityFor(pageIndex, BumpAllocatorConstants.PAGE_SHIFT);
  }

  // Java overload: insertMultiplePages(int uptoPage, PAGE page)
  private async insertMultiplePages(
    uptoPage: number,
    page?: PAGE
  ): Promise<number> {
    let currentNumPages = this.allocatedPages;
    const newNumPages = uptoPage + 1;

    if (currentNumPages < newNumPages) {
      const pageToSkip =
        page === undefined ? BumpAllocatorConstants.NO_SKIP_VALUE : uptoPage;
      await this.grow(newNumPages, pageToSkip);
    }

    if (page !== undefined) {
      await this._growLock.acquire();
      try {
        this._pages[uptoPage] = page;
      } finally {
        this._growLock.release();
      }
    }

    // Atomic CAS loop
    while (currentNumPages < newNumPages) {
      const nextNumPages = this.compareAndExchangeAllocatedPages(
        currentNumPages,
        newNumPages
      );
      if (nextNumPages === currentNumPages) {
        currentNumPages = newNumPages;
        break;
      }
      currentNumPages = nextNumPages;
    }

    return PageUtil.capacityFor(
      currentNumPages,
      BumpAllocatorConstants.PAGE_SHIFT
    );
  }

  // Java overload: insertExistingPage(PAGE page)
  private async insertExistingPage(page: PAGE): Promise<number> {
    const pageIndex = this.getAndAddAllocatedPages(1);
    await this.grow(pageIndex + 1, pageIndex);

    await this._growLock.acquire();
    try {
      this._pages[pageIndex] = page;
    } finally {
      this._growLock.release();
    }

    return PageUtil.capacityFor(pageIndex, BumpAllocatorConstants.PAGE_SHIFT);
  }

  // Java overload: grow(int newNumPages, int skipPage)
  private async grow(newNumPages: number, skipPage: number): Promise<void> {
    if (this.capacityLeft(newNumPages)) {
      return;
    }

    await this._growLock.acquire();
    try {
      if (this.capacityLeft(newNumPages)) {
        return;
      }
      await this.setPagesSynchronized(newNumPages, skipPage);
    } finally {
      this._growLock.release();
    }
  }

  private capacityLeft(newNumPages: number): boolean {
    return newNumPages <= this._pages.length;
  }

  /**
   * Grows and re-assigns the pages array.
   * **Thread Safety**: Must be called under _growLock
   */
  private async setPagesSynchronized(
    newNumPages: number,
    skipPage: number
  ): Promise<void> {
    const currentPages = this._pages;
    const newPages = new Array<PAGE>(newNumPages);

    // Copy existing pages
    for (let i = 0; i < currentPages.length; i++) {
      newPages[i] = currentPages[i];
    }

    // Create new pages for expanded slots
    for (let i = currentPages.length; i < newNumPages; i++) {
      if (i !== skipPage) {
        newPages[i] = this._pageFactory.newPage(
          BumpAllocatorConstants.PAGE_SIZE
        );
      }
    }

    this.setPages(newPages);
  }

  // ============================================================================
  // INTERNAL ACCESS FOR LOCAL ALLOCATORS
  // ============================================================================

  /** @internal */
  get pageFactory(): BumpAllocatorFactory<PAGE> {
    return this._pageFactory;
  }

  /** @internal */
  async insertDefaultSizedPageInternal(): Promise<number> {
    return await this.insertDefaultSizedPage();
  }

  /** @internal */
  async insertMultiplePagesInternal(
    uptoPage: number,
    page?: PAGE
  ): Promise<number> {
    return await this.insertMultiplePages(uptoPage, page);
  }

  /** @internal */
  async insertExistingPageInternal(page: PAGE): Promise<number> {
    return await this.insertExistingPage(page);
  }
}

// ============================================================================
// LOCAL ALLOCATOR (Modern TypeScript)
// ============================================================================

export class LocalAllocator<PAGE> {
  private readonly _globalAllocator: BumpAllocator<PAGE>;
  private _top = 0;
  private _page?: PAGE;
  private _offset: number;

  constructor(globalAllocator: BumpAllocator<PAGE>) {
    this._globalAllocator = globalAllocator;
    this._offset = BumpAllocatorConstants.PAGE_SIZE; // Force initial allocation
  }

  /**
   * Fast-path allocation with bump pointer optimization.
   *
   * **Algorithm**:
   * 1. Check if current page has space (FAST PATH)
   * 2. If yes: bump pointer and return
   * 3. If no: request new page (SLOW PATH)
   */
  async insertInto(
    length: number,
    slice: ModifiableSlice<PAGE>
  ): Promise<number> {
    const maxOffset = BumpAllocatorConstants.PAGE_SIZE - length;

    if (maxOffset >= this._offset) {
      // ✅ FAST PATH: Bump allocation
      const address = this._top;
      this.bumpAllocate(length, slice);
      return address;
    }

    // ❌ SLOW PATH: Need new page or oversized allocation
    return await this.slowPathAllocate(length, maxOffset, slice);
  }

  /**
   * The magic: just bump the pointer! (Inlined for performance)
   */
  private bumpAllocate(length: number, slice: ModifiableSlice<PAGE>): void {
    if (!this._page) {
      throw new Error("No page available for bump allocation");
    }

    slice.setSlice(this._page);
    slice.setOffset(this._offset);
    slice.setLength(length);
    this._offset += length;
    this._top += length;
  }

  // Java overload: slowPathAllocate(length, maxOffset, slice)
  private async slowPathAllocate(
    length: number,
    maxOffset: number,
    slice: ModifiableSlice<PAGE>
  ): Promise<number> {
    if (maxOffset < 0) {
      // Oversized allocation - larger than page size
      return await this.oversizingAllocate(length, slice);
    }
    // Normal allocation - just need new page
    return await this.prefetchAllocateAndInsert(length, slice);
  }

  /**
   * Handle allocations larger than page size.
   * **Strategy**: Create a single oversized page to hold all data.
   */
  private async oversizingAllocate(
    length: number,
    slice: ModifiableSlice<PAGE>
  ): Promise<number> {
    const page = this._globalAllocator.pageFactory.newPage(length);
    slice.setSlice(page);
    slice.setOffset(0);
    slice.setLength(length);
    return await this._globalAllocator.insertExistingPageInternal(page);
  }

  // Java overload: prefetchAllocate(length, slice)
  private async prefetchAllocateAndInsert(
    length: number,
    slice: ModifiableSlice<PAGE>
  ): Promise<number> {
    const address = await this.prefetchAllocate();
    this.bumpAllocate(length, slice);
    return address;
  }

  // Java overload: prefetchAllocate()
  private async prefetchAllocate(): Promise<number> {
    this._top = await this._globalAllocator.insertDefaultSizedPageInternal();

    console.assert(
      PageUtil.indexInPage(this._top, BumpAllocatorConstants.PAGE_MASK) === 0,
      "Page allocation must be page-aligned"
    );

    const currentPageIndex = PageUtil.pageIndex(
      this._top,
      BumpAllocatorConstants.PAGE_SHIFT
    );
    this._page = this._globalAllocator.pages[currentPageIndex];
    this._offset = 0;
    return this._top;
  }
}

// ============================================================================
// LOCAL POSITIONAL ALLOCATOR (Modern TypeScript)
// ============================================================================

export class LocalPositionalAllocator<PAGE> {
  private readonly _globalAllocator: BumpAllocator<PAGE>;
  private readonly _pageFactory: PositionalFactory<PAGE>;
  private _capacity = 0;

  constructor(
    globalAllocator: BumpAllocator<PAGE>,
    pageFactory: PositionalFactory<PAGE>
  ) {
    this._globalAllocator = globalAllocator;
    this._pageFactory = pageFactory;
  }

  /**
   * Insert data at a specific position.
   */
  async insertAt(offset: number, page: PAGE, length: number): Promise<void> {
    const targetLength = this._pageFactory.lengthOfPage(page);
    await this.insertData(
      offset,
      page,
      Math.min(length, targetLength),
      this._capacity,
      targetLength
    );
  }

  // Java overload: insertData(offset, page, length, capacity, targetsLength)
  private async insertData(
    offset: number,
    page: PAGE,
    length: number,
    capacity: number,
    targetsLength: number
  ): Promise<void> {
    let pageToInsert: PAGE | undefined = page;

    if (offset + length > capacity) {
      pageToInsert = await this.allocateNewPages(
        offset,
        page,
        length,
        targetsLength
      );
    }

    if (pageToInsert !== undefined) {
      const pageId = PageUtil.pageIndex(
        offset,
        BumpAllocatorConstants.PAGE_SHIFT
      );
      const pageOffset = PageUtil.indexInPage(
        offset,
        BumpAllocatorConstants.PAGE_MASK
      );
      const allocatedPage = this._globalAllocator.pages[pageId];

      await this.copyArray(pageToInsert, 0, allocatedPage, pageOffset, length);
    }
  }

  // Java overload: allocateNewPages(offset, page, length, targetsLength)
  private async allocateNewPages(
    offset: number,
    page: PAGE,
    length: number,
    targetsLength: number
  ): Promise<PAGE | undefined> {
    const pageId = PageUtil.pageIndex(
      offset,
      BumpAllocatorConstants.PAGE_SHIFT
    );

    // Handle oversized pages
    let existingPage: PAGE | undefined = undefined;
    let processedPage = page;

    if (length > BumpAllocatorConstants.PAGE_SIZE) {
      if (length < targetsLength) {
        // Create exact-sized copy for oversized page with buffer
        processedPage = this._pageFactory.copyOfPage(page, length);
      }
      existingPage = processedPage;
    }

    this._capacity = await this._globalAllocator.insertMultiplePagesInternal(
      pageId,
      existingPage
    );

    if (existingPage !== undefined) {
      // Oversized page already inserted
      return undefined;
    }
    return processedPage;
  }
  /**
   * Simplified array copy - throws on incompatible types
   */
  private async copyArray(
    src: PAGE,
    srcPos: number,
    dest: PAGE,
    destPos: number,
    length: number
  ): Promise<void> {
    if (this.isTypedArray(src) && this.isTypedArray(dest)) {
      // Validate type compatibility first
      if (this.isBigIntArray(src) !== this.isBigIntArray(dest)) {
        throw new Error(
          `Incompatible array types: cannot copy ${src.constructor.name} to ${dest.constructor.name}. ` +
            `Use arrays of the same numeric type (both BigInt or both numeric).`
        );
      }

      // Safe to cast since we validated compatibility
      const slice = (src as any).subarray(srcPos, srcPos + length);
      (dest as any).set(slice, destPos);
    } else if (Array.isArray(src) && Array.isArray(dest)) {
      for (let i = 0; i < length; i++) {
        dest[destPos + i] = src[srcPos + i];
      }
    } else {
      throw new Error(
        `Unsupported PAGE type for array copy: ${typeof src} → ${typeof dest}`
      );
    }
  }

  private isBigIntArray(obj: TypedArray): boolean {
    return obj instanceof BigInt64Array || obj instanceof BigUint64Array;
  }

  private isTypedArray(obj: any): obj is TypedArray {
    return (
      obj && typeof obj === "object" && "buffer" in obj && "byteLength" in obj
    );
  }
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;
