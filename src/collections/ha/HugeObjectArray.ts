/**
 * Huge Object Array - Generic Object Storage with Massive Scale Support
 *
 * **The Pattern**: Long-indexable generic object array exceeding JavaScript limits
 * **Implementation**: Pages of 4096 elements each with automatic size optimization
 * **Memory Management**: Explicit release() with memory tracking
 * **Type Safety**: Full TypeScript generic support with proper inheritance
 *
 * **Perfect For**: Graph nodes, edges, algorithm state, complex data structures
 */

import { HugeArrays } from '@/mem/HugeArrays';
import { Estimate } from '@/mem/Estimate';
import { HugeCursor, SinglePageCursor, PagedCursor } from '@/collections';
import { HugeArray } from './HugeArray';

/**
 * A long-indexable version of an object array that can contain more than 2 billion elements.
 *
 * This is the **generic object storage variant** of HugeArray designed for storing arbitrary
 * TypeScript objects efficiently while supporting massive datasets that exceed standard
 * JavaScript array limitations. It provides type-safe storage for complex data structures,
 * graph nodes, edges, and any custom objects used in graph analytics.
 *
 * **Design Philosophy:**
 * It is implemented by paging of smaller object arrays (`T[][]`) to support approximately
 * 32,000 billion elements. If the provided size is small enough, an optimized view of a single
 * `T[]` might be used for maximum performance.
 *
 * **Key Characteristics:**
 *
 * **1. Fixed Size Architecture:**
 * - **Immutable capacity**: Cannot grow or shrink after creation
 * - **Predictable memory**: Memory usage determined at creation time
 * - **Performance optimization**: No dynamic resizing overhead
 *
 * **2. Reference Semantics:**
 * - **Object references**: Stores references to objects, not object copies
 * - **Null support**: Unset positions return `null` (matches standard arrays)
 * - **Shared objects**: Multiple positions can reference the same object instance
 *
 * **3. Type Safety:**
 * - **Generic design**: Fully typed with TypeScript generics
 * - **Element class tracking**: Maintains runtime type information
 * - **Type-safe operations**: All methods preserve generic type constraints
 *
 * **Usage Patterns:**
 *
 * **Graph Node Storage:**
 * ```typescript
 * interface GraphNode {
 *   id: number;
 *   properties: Map<string, any>;
 *   edges: Set<number>;
 * }
 *
 * // Store millions of graph nodes efficiently
 * const nodeArray = HugeObjectArray.newArray<GraphNode>(GraphNode, nodeCount);
 * nodeArray.set(nodeId, {
 *   id: nodeId,
 *   properties: new Map(),
 *   edges: new Set()
 * });
 * ```
 *
 * **Algorithm State Management:**
 * ```typescript
 * interface AlgorithmState {
 *   distance: number;
 *   predecessor: number | null;
 *   visited: boolean;
 *   metadata: any;
 * }
 *
 * // Store state for graph algorithms
 * const stateArray = HugeObjectArray.newArray<AlgorithmState>(AlgorithmState, nodeCount);
 * stateArray.fill({
 *   distance: Number.POSITIVE_INFINITY,
 *   predecessor: null,
 *   visited: false,
 *   metadata: {}
 * });
 * ```
 */
export abstract class HugeObjectArray<T> extends HugeArray<(T | null)[], T | null, HugeObjectArray<T>> {

  // ============================================================================
  // STATIC MEMORY ESTIMATION
  // ============================================================================

  /**
   * Estimates the memory required for a HugeObjectArray of the specified size.
   *
   * **Accurate Memory Forecasting**: Considers both array structure overhead
   * and estimated memory usage of stored objects for capacity planning.
   *
   * @param arraySize Number of elements in the array
   * @param objectSize Estimated memory per object in bytes
   * @returns Estimated total memory usage in bytes
   */
  public static memoryEstimation(arraySize: number, objectSize: number): number {
    const sizeOfInstance = arraySize <= HugeArrays.MAX_ARRAY_LENGTH
      ? Estimate.sizeOfInstance(SingleHugeObjectArray)
      : Estimate.sizeOfInstance(PagedHugeObjectArray);

    const numPages = HugeArrays.numberOfPages(arraySize);
    const outArrayMemoryUsage = Estimate.sizeOfObjectArray(numPages);

    const memoryUsagePerPage = Estimate.sizeOfObjectArray(HugeArrays.PAGE_SIZE) +
                              (HugeArrays.PAGE_SIZE * objectSize);
    const pageMemoryUsage = (numPages - 1) * memoryUsagePerPage;

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(arraySize);
    const lastPageMemoryUsage = Estimate.sizeOfObjectArray(lastPageSize) +
                               (lastPageSize * objectSize);

    return sizeOfInstance + outArrayMemoryUsage + pageMemoryUsage + lastPageMemoryUsage;
  }

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Creates a new array of the given size for the specified element type.
   *
   * **Primary Factory Method**: Automatically chooses optimal implementation
   * (Single vs Paged) based on size for best performance.
   *
   * @param elementClass Constructor function for the element type
   * @param size The desired array size in elements
   * @returns A new HugeObjectArray instance optimized for the given size
   */
  public static newArray<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeObjectArray.of(elementClass, size);
    }
    return PagedHugeObjectArray.of(elementClass, size);
  }

  /**
   * Creates a new array initialized with the provided values.
   *
   * @param values Initial objects for the array
   * @returns A new HugeObjectArray containing the provided objects
   */
  public static of<T>(...values: (T | null)[]): HugeObjectArray<T> {
    // TypeScript cannot infer the exact type from spread args, so we'll use Object as fallback
    return new SingleHugeObjectArray(values.length, values, Object as any);
  }

  // Test-only factory methods
  /** @internal */
  public static newPagedArray<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    return PagedHugeObjectArray.of(elementClass, size);
  }

  /** @internal */
  public static newSingleArray<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    return SingleHugeObjectArray.of(elementClass, size);
  }

  // ============================================================================
  // CORE ACCESS METHODS
  // ============================================================================

  /**
   * Gets the object at the specified index.
   *
   * @param index The index to retrieve (must be within [0, size()))
   * @returns The object at the index, or null if unset
   * @throws Error if index is out of bounds
   */
  public abstract get(index: number): T | null;

  /**
   * Gets the object at the specified index, returning a default value if null.
   *
   * **Defensive Programming**: Provides safe access with fallback values
   * for algorithms that cannot handle null references.
   *
   * @param index The index to retrieve
   * @param defaultValue Value to return if the element at index is null
   * @returns The object at index, or defaultValue if null
   */
  public abstract getOrDefault(index: number, defaultValue: T): T;

  /**
   * Sets the object at the specified index.
   *
   * @param index The index to set (must be within [0, size()))
   * @param value The object to store (can be null)
   * @throws Error if index is out of bounds
   */
  public abstract set(index: number, value: T | null): void;

  /**
   * Atomically sets the value at the given index if it is currently null.
   *
   * **Lazy Initialization Pattern**: Enables thread-safe lazy loading of
   * expensive objects without double-initialization risks.
   *
   * **Use Cases:**
   * - Lazy object loading from databases
   * - Caching expensive computations
   * - Default object creation with suppliers
   *
   * @param index The index where to set the value
   * @param supplier Function that provides the value if needed
   * @returns The current value (existing or newly computed), or null if supplier returns null
   */
  public abstract putIfAbsent(index: number, supplier: () => T | null): T | null;

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Sets all elements using the provided generator function.
   *
   * **Functional Initialization**: Enables efficient population of arrays
   * using index-based generation functions. Perfect for creating arrays
   * with computed initial values.
   *
   * @param gen Generator function that computes the value for each index
   */
  public abstract setAll(gen: (index: number) => T | null): void;

  /**
   * Assigns the specified object reference to each element in the array.
   *
   * **Shared Reference Warning**: All array positions will reference the
   * same object instance. Modifications to the object will be visible
   * across all array positions.
   *
   * @param value The object reference to assign to every element (or null to clear all)
   */
  public abstract fill(value: T | null): void;

  // ============================================================================
  // ARRAY OPERATIONS
  // ============================================================================

  /**
   * Copies the content of this array into the target array.
   *
   * **Reference Copying**: This method copies object references (not object contents)
   * from this array to the destination array. Both arrays will reference the same object instances.
   *
   * @param dest Target array to copy data into
   * @param length Number of elements to copy from start of this array
   */
  public abstract copyTo(dest: HugeObjectArray<T>, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * @param newLength The size of the new array
   * @returns A new array instance with the specified length containing copied references
   */
  public abstract copyOf(newLength: number): HugeObjectArray<T>;

  // ============================================================================
  // METADATA AND LIFECYCLE
  // ============================================================================

  /**
   * Returns the logical length of this array in elements.
   */
  public abstract size(): number;

  /**
   * Returns the amount of memory used by this array instance in bytes.
   */
  public abstract sizeOf(): number;

  /**
   * Returns the element class for type information.
   */
  public abstract elementClass(): new (...args: any[]) => T;

  /**
   * Releases the memory used by this array and returns the number of bytes freed.
   */
  public abstract release(): number;

  /**
   * Creates a new cursor for iterating over this array.
   */
  public abstract newCursor(): HugeCursor<(T | null)[]>;

  /**
   * Returns the contents of this array as a flat primitive array.
   */
  public abstract toArray(): (T | null)[];

  // ============================================================================
  // BOXED OPERATIONS (HugeArray Interface Bridge)
  // ============================================================================

  public boxedGet(index: number): T | null {
    return this.get(index);
  }

  public boxedSet(index: number, value: T | null): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => T | null): void {
    this.setAll(gen);
  }

  public boxedFill(value: T | null): void {
    this.fill(value);
  }

  // Helper methods for array operations
  protected getArrayLength(array: (T | null)[]): number {
    return array.length;
  }

  protected getArrayElement(array: (T | null)[], index: number): T | null {
    return array[index];
  }

  protected arrayCopy(source: (T | null)[], sourceIndex: number, dest: (T | null)[], destIndex: number, length: number): void {
    for (let i = 0; i < length; i++) {
      dest[destIndex + i] = source[sourceIndex + i];
    }
  }
}

// ============================================================================
// SINGLE PAGE IMPLEMENTATION
// ============================================================================

/**
 * Single-page implementation for arrays that fit within JavaScript's array size limits.
 *
 * This implementation provides **optimal performance** for smaller object arrays by using
 * a single underlying array with no page management overhead.
 */
class SingleHugeObjectArray<T> extends HugeObjectArray<T> {
  private _size: number;
  private page: (T | null)[] | null;
  private elementClassRef: new (...args: any[]) => T;

  public static of<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    if (size > HugeArrays.MAX_ARRAY_LENGTH) {
      throw new Error(`Size ${size} exceeds maximum single array length`);
    }
    const page = new Array<T | null>(size).fill(null);
    return new SingleHugeObjectArray(size, page, elementClass);
  }

  constructor(size: number, page: (T | null)[], elementClass: new (...args: any[]) => T) {
    super();
    this._size = size;
    this.page = page;
    this.elementClassRef = elementClass;
  }

  public get(index: number): T | null {
    this.checkBounds(index);
    return this.page![index];
  }

  public getOrDefault(index: number, defaultValue: T): T {
    const value = this.get(index);
    return value !== null ? value : defaultValue;
  }

  public set(index: number, value: T | null): void {
    this.checkBounds(index);
    this.page![index] = value;
  }

  public putIfAbsent(index: number, supplier: () => T | null): T | null {
    this.checkBounds(index);
    let value = this.page![index];
    if (value === null) {
      value = supplier();
      if (value !== null) {
        this.page![index] = value;
      }
    }
    return value;
  }

  public setAll(gen: (index: number) => T | null): void {
    for (let i = 0; i < this._size; i++) {
      this.page![i] = gen(i);
    }
  }

  public fill(value: T | null): void {
    this.page!.fill(value);
  }

  public copyTo(dest: HugeObjectArray<T>, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeObjectArray) {
      // Copy to single array
      const dst = dest as SingleHugeObjectArray<T>;
      this.arrayCopy(this.page!, 0, dst.page!, 0, length);
      // Fill remaining positions with null
      dst.page!.fill(null, length, dst.size());
    } else if (dest instanceof PagedHugeObjectArray) {
      // Copy to paged array
      const dst = dest as PagedHugeObjectArray<T>;
      let start = 0;
      let remaining = length;

      for (const dstPage of dst.pages!) {
        const toCopy = Math.min(remaining, dstPage.length);
        if (toCopy === 0) {
          dstPage.fill(null);
        } else {
          this.arrayCopy(this.page!, start, dstPage, 0, toCopy);
          if (toCopy < dstPage.length) {
            dstPage.fill(null, toCopy, dstPage.length);
          }
          start += toCopy;
          remaining -= toCopy;
        }
      }
    }
  }

  public copyOf(newLength: number): HugeObjectArray<T> {
    const copy = HugeObjectArray.newArray(this.elementClassRef, newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfObjectArray(this._size);
  }

  public elementClass(): new (...args: any[]) => T {
    return this.elementClassRef;
  }

  public release(): number {
    if (this.page !== null) {
      this.page = null;
      return Estimate.sizeOfObjectArray(this._size);
    }
    return 0;
  }

  public newCursor(): HugeCursor<(T | null)[]> {
    return new SinglePageCursor<(T | null)[]>(this.page!);
  }

  public toArray(): (T | null)[] {
    return this.page ? [...this.page] : [];
  }

  public toString(): string {
    return this.page ? `[${this.page.join(', ')}]` : '[]';
  }

  private checkBounds(index: number): void {
    if (index < 0 || index >= this._size) {
      throw new Error(`Index ${index} out of bounds for array size ${this._size}`);
    }
  }
}

// ============================================================================
// PAGED IMPLEMENTATION
// ============================================================================

/**
 * Multi-page implementation for arrays that exceed JavaScript's array size limits.
 *
 * This implementation manages multiple smaller arrays (pages) to provide the
 * appearance of a single large object array while working within JavaScript's constraints.
 */
class PagedHugeObjectArray<T> extends HugeObjectArray<T> {
  private _size: number;
  private pages: ((T | null)[])[] | null;
  private memoryUsed: number;
  private elementClassRef: new (...args: any[]) => T;

  public static of<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: ((T | null)[])[] = [];

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfObjectArray(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      pages[i] = new Array<T | null>(HugeArrays.PAGE_SIZE).fill(null);
      memoryUsed += pageBytes;
    }

    // Create last page with exact size
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<T | null>(lastPageSize).fill(null);
    memoryUsed += Estimate.sizeOfObjectArray(lastPageSize);

    return new PagedHugeObjectArray(size, pages, memoryUsed, elementClass);
  }

  constructor(
    size: number,
    pages: ((T | null)[])[],
    memoryUsed: number,
    elementClass: new (...args: any[]) => T
  ) {
    super();
    this._size = size;
    this.pages = pages;
    this.memoryUsed = memoryUsed;
    this.elementClassRef = elementClass;
  }

  public get(index: number): T | null {
    this.checkBounds(index);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this.pages![pageIndex][indexInPage];
  }

  public getOrDefault(index: number, defaultValue: T): T {
    const value = this.get(index);
    return value !== null ? value : defaultValue;
  }

  public set(index: number, value: T | null): void {
    this.checkBounds(index);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages![pageIndex][indexInPage] = value;
  }

  public putIfAbsent(index: number, supplier: () => T | null): T | null {
    this.checkBounds(index);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const page = this.pages![pageIndex];
    let value = page[indexInPage];
    if (value === null) {
      value = supplier();
      if (value !== null) {
        page[indexInPage] = value;
      }
    }
    return value;
  }

  public setAll(gen: (index: number) => T | null): void {
    for (let i = 0; i < this.pages!.length; i++) {
      const page = this.pages![i];
      const baseIndex = i << HugeArrays.PAGE_SHIFT;

      for (let j = 0; j < page.length; j++) {
        page[j] = gen(baseIndex + j);
      }
    }
  }

  public fill(value: T | null): void {
    for (const page of this.pages!) {
      page.fill(value);
    }
  }

  public copyTo(dest: HugeObjectArray<T>, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeObjectArray) {
      // Copy to single array
      const dst = dest as SingleHugeObjectArray<T>;
      let start = 0;
      let remaining = length;

      for (const page of this.pages!) {
        const toCopy = Math.min(remaining, page.length);
        if (toCopy === 0) break;

        this.arrayCopy(page, 0, dst.page!, start, toCopy);
        start += toCopy;7`3`
        remaining -= toCopy;
      }
      // Fill remaining positions with null
      dst.page!.fill(null, start, dst.size());
    } else if (dest instanceof PagedHugeObjectArray) {
      // Copy to another paged array
      const dst = dest as PagedHugeObjectArray<T>;
      const pageLen = Math.min(this.pages!.length, dst.pages!.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        const page = this.pages![i];
        const dstPage = dst.pages![i];
        this.arrayCopy(page, 0, dstPage, 0, page.length);
        remaining -= page.length;
      }

      // Copy last page
      if (remaining > 0) {
        const lastSrcPage = this.pages![lastPage];
        const lastDstPage = dst.pages![lastPage];
        this.arrayCopy(lastSrcPage, 0, lastDstPage, 0, remaining);
        lastDstPage.fill(null, remaining, lastDstPage.length);
      }

      // Fill remaining pages with null
      for (let i = pageLen; i < dst.pages!.length; i++) {
        dst.pages![i].fill(null);
      }
    }
  }

  public copyOf(newLength: number): HugeObjectArray<T> {
    const copy = HugeObjectArray.newArray(this.elementClassRef, newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return this.memoryUsed;
  }

  public elementClass(): new (...args: any[]) => T {
    return this.elementClassRef;
  }

  public release(): number {
    if (this.pages !== null) {
      this.pages = null;
      return this.memoryUsed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<(T | null)[]> {
    return new PagedCursor<(T | null)[]>(this._size, this.pages!);
  }

  public toArray(): (T | null)[] {
    const result: (T | null)[] = new Array(this._size);
    let index = 0;

    for (const page of this.pages!) {
      for (let i = 0; i < page.length; i++) {
        result[index++] = page[i];
      }
    }

    return result;
  }

  private checkBounds(index: number): void {
    if (index < 0 || index >= this._size) {
      throw new Error(`Index ${index} out of bounds for array size ${this._size}`);
    }
  }
}
