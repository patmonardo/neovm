import { PageUtil } from '@/collections/PageUtil';
import { HugeArrays } from '@/mem/HugeArrays';

/**
 * View of data underlying a Huge array, accessible as slices of one or more primitive arrays.
 *
 * This class provides **efficient iteration** over huge arrays that may be split across multiple
 * pages. The cursor presents a unified view of the data while handling the underlying paging
 * structure transparently.
 *
 * **Design Philosophy:**
 *
 * **1. Zero-Copy Access:**
 * The cursor provides direct access to the underlying array pages without copying data,
 * ensuring maximum performance for large-scale data processing operations.
 *
 * **2. Page-Aware Traversal:**
 * Automatically handles transitions between pages in multi-page arrays, presenting
 * a seamless iteration interface regardless of the underlying storage structure.
 *
 * **3. Range-Based Processing:**
 * Supports efficient processing of arbitrary ranges within huge arrays, enabling
 * parallel processing and windowed operations on large datasets.
 *
 * **Key Characteristics:**
 *
 * **Memory Efficiency:**
 * - **Direct page access**: No intermediate copying or buffering
 * - **Lazy loading**: Pages are accessed only when needed during iteration
 * - **Resource cleanup**: Proper resource management to prevent memory leaks
 *
 * **Performance Profile:**
 * - **Sequential access**: O(1) amortized time per element
 * - **Random access**: O(1) time to seek to any position
 * - **Memory bandwidth**: Optimal cache utilization through page-aligned access
 *
 * **Usage Patterns:**
 *
 * **Basic Iteration:**
 * ```typescript
 * const cursor = array.newCursor();
 * try {
 *   while (cursor.next()) {
 *     const page = cursor.array;
 *     for (let i = cursor.offset; i < cursor.limit; i++) {
 *       const globalIndex = cursor.base + i;
 *       const value = page[i];
 *       // Process value...
 *     }
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 *
 * **Range Processing:**
 * ```typescript
 * const cursor = array.newCursor();
 * cursor.setRange(startIndex, endIndex);
 * try {
 *   while (cursor.next()) {
 *     // Process only the specified range
 *     processPage(cursor.array, cursor.offset, cursor.limit, cursor.base);
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 *
 * **Parallel Processing:**
 * ```typescript
 * // Divide array into chunks for parallel processing
 * const chunkSize = Math.ceil(array.size() / numWorkers);
 *
 * await Promise.all(workers.map(async (worker, index) => {
 *   const start = index * chunkSize;
 *   const end = Math.min(start + chunkSize, array.size());
 *
 *   const cursor = array.newCursor();
 *   cursor.setRange(start, end);
 *
 *   try {
 *     while (cursor.next()) {
 *       await worker.processPage(cursor.array, cursor.offset, cursor.limit, cursor.base);
 *     }
 *   } finally {
 *     cursor.close();
 *   }
 * }));
 * ```
 *
 * @template Array The type of array being accessed (e.g., number[], Int32Array, Float64Array)
 */
export abstract class HugeCursor<Array> {
  /**
   * The base index for calculating global positions.
   *
   * This value represents the global index of the first element in the current page.
   * To get the global index of an element at position `i` in the current page:
   * `globalIndex = base + i`
   */
  public base: number;

  /**
   * A slice of values currently being traversed.
   *
   * This is the actual array page containing the data. The valid range within
   * this array is from `offset` (inclusive) to `limit` (exclusive).
   */
  public array: Array | null;

  /**
   * The offset into the current array page.
   *
   * This is the first valid index within the current `array` page. Elements
   * before this offset should not be accessed.
   */
  public offset: number;

  /**
   * The limit of the current array page (exclusive).
   *
   * This is the first index that should NOT be accessed in the current `array` page.
   * The valid range is `[offset, limit)`.
   *
   * **Note:** This is different from `length`. The actual length of valid data
   * in the current page is `limit - offset`.
   */
  public limit: number;

  protected constructor() {
    this.base = 0;
    this.array = null;
    this.offset = 0;
    this.limit = 0;
  }

  /**
   * Try to load the next page and return the success of this load.
   *
   * This method advances the cursor to the next available page of data. Once it
   * returns `false`, the cursor is exhausted and this method will never return
   * `true` again until the cursor is reset.
   *
   * **State Management:**
   * - **First call**: Loads the first page and sets up initial state
   * - **Subsequent calls**: Advances to next pages until exhausted
   * - **After exhaustion**: Always returns `false`
   *
   * **Thread Safety:**
   * Cursors are NOT thread-safe and should only be used from a single thread.
   *
   * @returns true if the cursor contains new data, false if exhausted
   */
  public abstract next(): boolean;

  /**
   * Releases the reference to the underlying array so that it might be garbage collected.
   *
   * This method **permanently invalidates** the cursor and releases all references
   * to underlying data structures. The cursor can never be used again after calling
   * this method.
   *
   * **Resource Management:**
   * Always call this method when done with a cursor to ensure proper cleanup,
   * especially when processing large datasets where memory pressure is a concern.
   *
   * **Best Practice:**
   * Use try-finally blocks or the cursor as a resource in a using statement to
   * ensure proper cleanup even in the presence of exceptions.
   */
  public abstract close(): void;

  /**
   * Initializes cursor to traverse a range of the underlying array.
   *
   * This method has two forms:
   * - `setRange()` - Sets up the cursor to iterate over the entire capacity
   * - `setRange(start, end)` - Sets up the cursor to iterate over a specific range
   *
   * **Range Semantics (when start and end are provided):**
   * - `start` is inclusive
   * - `end` is exclusive
   * - Range must be valid: `0 <= start <= end <= array.size()`
   *
   * **Use Cases:**
   * - Parallel processing of array chunks
   * - Windowed operations on large datasets
   * - Bounded iteration for algorithm constraints
   *
   * @param start Optional starting index (inclusive)
   * @param end Optional ending index (exclusive)
   */
  public abstract setRange(start?: number, end?: number): void;
}

/**
 * Cursor implementation for single-page arrays.
 *
 * This implementation is optimized for arrays that fit within a single page,
 * providing minimal overhead for smaller datasets while maintaining the same
 * interface as multi-page cursors.
 *
 * **Optimization Benefits:**
 * - **Single iteration**: Only one call to `next()` returns true
 * - **Direct access**: No page management overhead
 * - **Minimal state**: Reduced memory footprint
 *
 * @template Array The type of array being accessed
 */
export class SinglePageCursor<Array> extends HugeCursor<Array> {
  private exhausted: boolean;

  /**
   * Creates a new single-page cursor for the given array.
   *
   * @param page The array to iterate over
   */
  constructor(page: Array) {
    super();
    this.array = page;
    this.base = 0;
    this.exhausted = false;
  }

  /**
   * Sets a new array for this cursor to iterate over.
   *
   * @param page The new array to iterate over
   */
  public setArray(page: Array): void {
    this.array = page;
    this.base = 0;
    this.exhausted = false;
    // Reset to default range
    this.setRange();
  }

  /**
   * Sets the cursor to traverse a range of the array.
   *
   * @param start Optional starting index (inclusive). If not provided, defaults to 0.
   * @param end Optional ending index (exclusive). If not provided, defaults to array length.
   */
  public setRange(start?: number, end?: number): void {
    const arrayLength = Array.isArray(this.array)
      ? this.array.length
      : (this.array as any).length;

    const actualStart = start !== undefined ? Math.floor(start) : 0;
    const actualEnd = end !== undefined ? Math.floor(end) : arrayLength;

    this.setRangeInternal(actualStart, actualEnd);
  }

  private setRangeInternal(start: number, end: number): void {
    this.exhausted = false;
    this.offset = start;
    this.limit = end;
  }

  /**
   * Advances to the next page.
   *
   * For single-page cursors, this returns `true` exactly once, then `false` thereafter.
   *
   * @returns true if data is available, false if exhausted
   */
  public next(): boolean {
    if (this.exhausted) {
      return false;
    }

    // Check if there's actually any data in the range
    if (this.offset >= this.limit) {
      this.exhausted = true;
      return false;
    }

    this.exhausted = true;
    return true;
  }

  /**
   * Releases all references and invalidates the cursor.
   */
  public close(): void {
    this.array = null;
    this.limit = 0;
    this.exhausted = true;
  }
}

/**
 * Cursor implementation for multi-page arrays.
 *
 * This implementation handles arrays that are split across multiple pages,
 * automatically managing page transitions and providing a seamless iteration
 * experience over very large datasets.
 *
 * **Page Management:**
 * - **Lazy loading**: Pages are accessed only when needed
 * - **Automatic transitions**: Seamlessly moves between pages
 * - **Range awareness**: Respects start/end boundaries across page boundaries
 *
 * **Memory Characteristics:**
 * - **Page-aligned access**: Optimizes cache performance
 * - **Minimal overhead**: Only tracks essential state for navigation
 * - **Bounded memory**: Does not load all pages simultaneously
 *
 * @template Array The type of array being accessed
 */
export class PagedCursor<Array> extends HugeCursor<Array> {
  private pages: Array[] | null;
  private pageIndex: number;
  private fromPage: number;
  private maxPage: number;
  private capacity: number;
  private end: number;

  /**
   * Creates a new paged cursor.
   *
   * Use the `setPages` method to configure the pages after construction.
   */
  constructor() {
    super();
    this.pages = null;
    this.pageIndex = -1;
    this.fromPage = -1;
    this.maxPage = -1;
    this.capacity = 0;
    this.end = 0;
  }

  /**
   * Sets the pages for this cursor.
   *
   * @param pages The array of pages to iterate over
   * @param capacity Optional explicit capacity (if not provided, calculated automatically)
   */
  public setPages(pages: Array[], capacity?: number): void {
    if (capacity !== undefined) {
      // Explicit capacity provided
      this.capacity = capacity;
      this.pages = pages;
    } else {
      // Calculate capacity automatically
      const calculatedCapacity = PageUtil.capacityFor(pages.length, HugeArrays.PAGE_SHIFT);
      this.capacity = calculatedCapacity;
      this.pages = pages;
    }
  }

  /**
   * Sets the cursor to traverse a range across pages.
   *
   * @param start Optional starting index (inclusive). If not provided, defaults to 0.
   * @param end Optional ending index (exclusive). If not provided, defaults to capacity.
   */
  public setRange(start?: number, end?: number): void {
    const actualStart = start !== undefined ? start : 0;
    const actualEnd = end !== undefined ? end : this.capacity;

    this.fromPage = HugeArrays.pageIndex(actualStart);
    this.maxPage = HugeArrays.pageIndex(actualEnd - 1);
    this.pageIndex = this.fromPage - 1;
    this.end = actualEnd;
    this.base = this.fromPage * HugeArrays.PAGE_SIZE;
    this.offset = HugeArrays.indexInPage(actualStart);
    this.limit = this.fromPage === this.maxPage
      ? HugeArrays.exclusiveIndexOfPage(actualEnd)
      : HugeArrays.PAGE_SIZE;
  }

  /**
   * Advances to the next page in the sequence.
   *
   * This method handles the complex logic of moving between pages while
   * maintaining proper offset and limit calculations for each page transition.
   *
   * **Page Transition Logic:**
   * 1. **First page**: May have non-zero offset if range doesn't start at page boundary
   * 2. **Middle pages**: Full page access from 0 to PAGE_SIZE
   * 3. **Last page**: May have limit less than PAGE_SIZE if range doesn't end at page boundary
   *
   * @returns true if a new page is available, false if exhausted
   */
  public next(): boolean {
    const current = ++this.pageIndex;
    if (current > this.maxPage) {
      return false;
    }

    if (!this.pages) {
      return false;
    }

    this.array = this.pages[current];

    if (current === this.fromPage) {
      // First page - offset and limit already set in setRange
      return true;
    }

    // Subsequent pages
    this.base += HugeArrays.PAGE_SIZE;
    this.offset = 0;

    if (current === this.maxPage) {
      // Last page - may have partial data
      this.limit = HugeArrays.exclusiveIndexOfPage(this.end);
    } else {
      // Middle page - use full page or array length
      const arrayLength = Array.isArray(this.array)
        ? this.array.length
        : (this.array as any).length;
      this.limit = arrayLength;
    }

    return true;
  }

  /**
   * Releases all references and invalidates the cursor.
   */
  public close(): void {
    this.array = null;
    this.pages = null;
    this.base = 0;
    this.end = 0;
    this.limit = 0;
    this.capacity = 0;
    this.maxPage = -1;
    this.fromPage = -1;
    this.pageIndex = -1;
  }
}

/**
 * Interface for types that support huge cursor creation.
 *
 * This interface defines the contract for collections that can provide
 * efficient cursor-based iteration over their elements.
 *
 * @template Array The type of array being accessed
 */
export interface HugeCursorSupport<Array> {
  /**
   * Creates a new cursor for iterating over this collection.
   *
   * @returns A new cursor instance
   */
  newCursor(): HugeCursor<Array>;

  /**
   * Initializes the provided cursor for iterating over this collection.
   *
   * This method allows for cursor reuse, which can be more efficient than
   * creating new cursors for repeated operations.
   *
   * @param cursor The cursor to initialize
   */
  initCursor(cursor: HugeCursor<Array>): void;
}
