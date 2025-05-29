import { HugeCursor, SinglePageCursor, PagedCursor } from "@/collections";
import { HugeArrays } from "@/mem";
import { Estimate } from "@/mem";
import { HugeArray } from "./HugeArray";

/**
 * A number-indexable version of a primitive byte array that can contain more than 2 billion elements.
 *
 * This is the **byte-optimized variant** of HugeArray designed specifically for storing 8-bit
 * integer values efficiently while supporting massive datasets that exceed standard JavaScript
 * array limitations. It provides compact storage for flags, small integers, and binary data.
 *
 * **Design Philosophy:**
 * It is implemented by paging of smaller number arrays (`number[][]`) to support approximately
 * 32,000 billion elements. If the provided size is small enough, an optimized view of a single
 * `number[]` might be used for maximum performance.
 *
 * **Key Characteristics:**
 *
 * **1. Fixed Size Architecture:**
 * - The array is of a **fixed size** and cannot grow or shrink dynamically
 * - Size is determined at creation time and remains constant throughout lifecycle
 * - This enables optimal memory layout and performance optimization
 *
 * **2. Dense Storage Optimization:**
 * - Not optimized for sparseness and has a large memory overhead if values are very sparse
 * - For sparse data, consider `HugeSparseByteArray` which can benefit from sparse patterns
 * - Every element position consumes memory regardless of whether it contains meaningful data
 *
 * **3. Zero Default Values:**
 * - Does not support custom default values
 * - Returns the same default for unset values that a regular `number[]` does (`0`)
 * - All elements are automatically initialized to `0` when the array is created
 *
 * **Byte-Specific Optimizations:**
 *
 * **Memory Efficiency:**
 * While JavaScript uses `number` type for all numeric values, this implementation is designed
 * with byte semantics in mind:
 * - **Value range**: Optimized for 8-bit values (0 to 255 unsigned, -128 to 127 signed)
 * - **Bit operations**: Full support for bitwise operations (OR, AND) on byte values
 * - **Compact storage**: Ideal for flags, small counters, and categorical data
 * - **Memory estimation**: Accounts for byte-specific memory usage patterns
 *
 * **Performance Characteristics:**
 *
 * **Byte Operations:**
 * ```
 * Bitwise Operations:
 * - OR (|): Set flags and combine bitmasks
 * - AND (&): Clear flags and apply masks
 * - Addition: Accumulate small counters
 *
 * Memory Access:
 * - Single array: Direct access, optimal for < 2^31 elements
 * - Paged array: Page-based lookup for larger datasets
 * - Cache-friendly: Sequential access via cursors
 * ```
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Boolean Flags and States:**
 * ```typescript
 * // Store node visit flags during traversal
 * const visitedFlags = HugeByteArray.newArray(nodeCount);
 * visitedFlags.set(nodeId, 1); // Mark as visited
 *
 * // Check if node was visited
 * const wasVisited = visitedFlags.get(nodeId) !== 0;
 * ```
 *
 * **Small Integer Counters:**
 * ```typescript
 * // Count small values (0-255 range)
 * const smallCounts = HugeByteArray.newArray(nodeCount);
 * for (const nodeId of activeNodes) {
 *   if (smallCounts.get(nodeId) < 255) {
 *     smallCounts.addTo(nodeId, 1);
 *   }
 * }
 * ```
 *
 * **Categorical Data:**
 * ```typescript
 * // Store node types (categories 0-255)
 * const nodeTypes = HugeByteArray.newArray(nodeCount);
 * nodeTypes.setAll(nodeId => getNodeType(nodeId));
 *
 * // Filter by type
 * const typeOfInterest = 42;
 * const matchingNodes = [];
 * for (let i = 0; i < nodeCount; i++) {
 *   if (nodeTypes.get(i) === typeOfInterest) {
 *     matchingNodes.push(i);
 *   }
 * }
 * ```
 *
 * **Bit Flag Operations:**
 * ```typescript
 * // Store multiple boolean flags per element using bit operations
 * const nodeFlags = HugeByteArray.newArray(nodeCount);
 *
 * const FLAG_ACTIVE = 1;    // Bit 0
 * const FLAG_DIRTY = 2;     // Bit 1
 * const FLAG_LOCKED = 4;    // Bit 2
 *
 * // Set multiple flags
 * nodeFlags.or(nodeId, FLAG_ACTIVE | FLAG_DIRTY);
 *
 * // Clear specific flag while keeping others
 * nodeFlags.and(nodeId, ~FLAG_LOCKED);
 *
 * // Check specific flag
 * const isActive = (nodeFlags.get(nodeId) & FLAG_ACTIVE) !== 0;
 * ```
 */
export abstract class HugeByteArray extends HugeArray<
  number[],
  number,
  HugeByteArray
> {
  // Common properties used by implementations
  public _size: number = 0;
  public _page?: number[] | null;
  public _pages?: number[][] | null;

  /**
   * Creates a new array of the given size.
   *
   * @param size The desired array size in elements
   * @returns A new HugeByteArray instance optimized for the given size
   */
  public static newArray(size: number): HugeByteArray {
    if (size <= HugeArrays.PAGE_SIZE) {
      return SingleHugeByteArray.singleOf(size);
    }
    return PagedHugeByteArray.pagedOf(size);
  }

  // Test-only factory methods
  /** @internal */
  public static newPagedArray(size: number): HugeByteArray {
    return PagedHugeByteArray.of(size);
  }

  /** @internal */
  public static newSingleArray(size: number): HugeByteArray {
    return SingleHugeByteArray.of(size);
  }
  /**
   * Creates a new array initialized with the provided values.
   *
   * @param values Initial byte values for the array
   * @returns A new HugeByteArray containing the provided values
   */
  // In abstract parent HugeLongArray:
  public static of(values: number[]): HugeByteArray; // Array form
  public static of(...values: number[]): HugeByteArray; // Varargs form
  public static of(pages: number[][], size: number): HugeByteArray; // Pages form

  public static of(
    arg: number[] | number[][] | number,
    ...moreArgs: any[]
  ): HugeByteArray {
    // Varargs: of(1, 2, 3, 4, 5)
    if (typeof arg === "number") {
      const values = [arg, ...(moreArgs as number[])];
      return new SingleHugeByteArray(values.length, values);
    }

    // Array: of([1, 2, 3, 4, 5])
    if (
      Array.isArray(arg) &&
      (arg.length === 0 || typeof arg[0] === "number")
    ) {
      const values = arg as number[];
      return new SingleHugeByteArray(values.length, values);
    }

    // Pages: of([[1,2], [3,4]], 4)
    const pages = arg as number[][];
    const size = moreArgs[0] as number;
    const memoryUsed = PagedHugeByteArray.memoryUsed(pages, size);
    return new PagedHugeByteArray(size, pages, memoryUsed);
  }

  /**
   * Estimates the memory required for a HugeByteArray of the specified size.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    console.assert(size >= 0, `Size must be non-negative, got ${size}`);

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return (
        Estimate.sizeOfInstance(SingleHugeByteArray.name) +
        Estimate.sizeOfByteArray(size)
      );
    }

    const sizeOfInstance = Estimate.sizeOfInstance(PagedHugeByteArray.name);
    const numPages = HugeArrays.numberOfPages(size);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfByteArray(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);

    return sizeOfInstance + memoryUsed + Estimate.sizeOfByteArray(lastPageSize);
  }

  /**
   * Returns the byte value at the given index.
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The byte value at the specified index (0-255)
   * @throws Error if index is negative or >= size()
   */
  public abstract get(index: number): number;

  /**
   * Atomically reads the current value and adds a delta to it.
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param delta The value to add to the existing value
   * @returns The original value before the addition
   * @throws Error if index is negative or >= size()
   */
  public abstract getAndAdd(index: number, delta: number): number;

  /**
   * Sets the byte value at the given index to the given value.
   *
   * @param index The index where to store the value (must be in [0, size()))
   * @param value The byte value to store (0-255)
   * @throws Error if index is negative or >= size()
   */
  public abstract set(index: number, value: number): void;

  /**
   * Computes the bit-wise OR (|) of the existing value and the provided value at the given index.
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to OR with the existing value
   * @throws Error if index is negative or >= size()
   */
  public abstract or(index: number, value: number): void;

  /**
   * Computes the bit-wise AND (&) of the existing value and the provided value at the given index.
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to AND with the existing value
   * @returns The current value after the AND operation
   * @throws Error if index is negative or >= size()
   */
  public abstract and(index: number, value: number): number;

  /**
   * Adds the existing value and the provided value at the given index and stores the result.
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to add to the existing value
   * @throws Error if index is negative or >= size()
   */
  public abstract addTo(index: number, value: number): void;

  /**
   * Sets all elements using the provided generator function to compute each element.
   *
   * @param gen Generator function that computes the byte value for each index
   */
  public abstract setAll(gen: (index: number) => number): void;

  /**
   * Assigns the specified byte value to each element in the array.
   *
   * @param value The byte value to assign to every element in the array
   */
  public abstract fill(value: number): void;

  /**
   * Returns the logical length of this array in elements.
   *
   * @returns The total number of elements in this array
   */
  public abstract size(): number;

  /**
   * Returns the amount of memory used by this array instance in bytes.
   *
   * @returns The memory footprint of this array in bytes
   */
  public abstract sizeOf(): number;

  /**
   * Destroys the array data and releases all associated memory for garbage collection.
   *
   * @returns The amount of memory freed in bytes (0 for subsequent calls)
   */
  public abstract release(): number;

  /**
   * Creates a new cursor for iterating over this array.
   *
   * @returns A new, uninitialized cursor for this array
   */
  public abstract newCursor(): HugeCursor<number[]>;

  /**
   * Copies the content of this array into the target array.
   *
   * @param dest Target array to copy data into
   * @param length Number of elements to copy from start of this array
   */
  public abstract copyTo(dest: HugeByteArray, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * @param newLength The size of the new array
   * @returns A new array instance with the specified length containing copied data
   */
  public copyOf(newLength: number): HugeByteArray {
    const copy = HugeByteArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  // Boxed operation implementations (bridge to HugeArray interface)
  public boxedGet(index: number): number {
    return this.get(index);
  }

  public boxedSet(index: number, value: number): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => number): void {
    this.setAll(gen);
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  /**
   * Returns the contents of this array as a flat primitive array.
   *
   * @returns A flat array containing all elements from this HugeArray
   */
  public toArray(): number[] {
    return this.dumpToArray(Array) as number[];
  }

  // Helper methods for array operations
  protected getArrayLength(array: number[]): number {
    return array.length;
  }

  protected getArrayElement(array: number[], index: number): number {
    return array[index];
  }

  protected arrayCopy(
    source: number[],
    sourceIndex: number,
    dest: number[],
    destIndex: number,
    length: number
  ): void {
    for (let i = 0; i < length; i++) {
      dest[destIndex + i] = source[sourceIndex + i];
    }
  }
}

/**
 * Single-page implementation for arrays that fit within JavaScript's array size limits.
 */
class SingleHugeByteArray extends HugeByteArray {
  public _size: number;
  public _page: number[] | null;

  public static singleOf(size: number): HugeByteArray {
    console.assert(
      size <= HugeArrays.MAX_ARRAY_LENGTH,
      `Size ${size} exceeds maximum array length`
    );
    const intSize = Math.floor(size);
    const page = new Array<number>(intSize).fill(0);
    return new SingleHugeByteArray(intSize, page);
  }

  constructor(size: number, page: number[]) {
    super();
    this._size = size;
    this._page = page;
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    return this._page![index];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    const idx = Math.floor(index);
    const value = this._page![idx];
    this._page![idx] += delta;
    return value;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    this._page![Math.floor(index)] = value;
  }

  public or(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![Math.floor(index)] |= value;
  }

  public and(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    return (this._page![Math.floor(index)] &= value);
  }

  public addTo(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![Math.floor(index)] += value;
  }

  public setAll(gen: (index: number) => number): void {
    for (let i = 0; i < this._page!.length; i++) {
      this._page![i] = gen(i);
    }
  }

  public fill(value: number): void {
    this._page!.fill(value);
  }

  public copyTo(dest: HugeByteArray, length: number): void {
    length = Math.min(length, this._size, dest._size);

    if (dest instanceof SingleHugeByteArray) {
      this.arrayCopy(this._page!, 0, dest._page!, 0, length);
      dest._page!.fill(0, length, dest._size);
    } else if (dest instanceof PagedHugeByteArray) {
      let start = 0;
      let remaining = length;

      for (const dstPage of dest._pages!) {
        const toCopy = Math.min(remaining, dstPage.length);
        if (toCopy === 0) {
          dstPage.fill(0);
        } else {
          this.arrayCopy(this._page!, start, dstPage, 0, toCopy);
          if (toCopy < dstPage.length) {
            dstPage.fill(0, toCopy, dstPage.length);
          }
          start += toCopy;
          remaining -= toCopy;
        }
      }
    }
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfByteArray(this._size);
  }

  public release(): number {
    if (this._page !== null) {
      this._page = null;
      return Estimate.sizeOfByteArray(this._size);
    }
    return 0;
  }

  public newCursor(): HugeCursor<number[]> {
    return new SinglePageCursor<number[]>(this._page!);
  }

  public toArray(): number[] {
    return this._page ? [...this._page] : [];
  }

  public toString(): string {
    return this._page ? `[${this._page.join(", ")}]` : "[]";
  }
}

/**
 * Multi-page implementation for arrays that exceed JavaScript's array size limits.
 */
class PagedHugeByteArray extends HugeByteArray {
  public _size: number;
  public _pages: number[][] | null;
  private _memoryUsed: number;

  public static pagedOf(size: number): HugeByteArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: number[][] = new Array(numPages);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      pages[i] = new Array<number>(HugeArrays.PAGE_SIZE).fill(0);
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<number>(lastPageSize).fill(0);

    const memoryUsed = this.memoryUsed(pages, size);
    return new PagedHugeByteArray(size, pages, memoryUsed);
  }

  /**
   * Calculates memory usage for a given page array configuration.
   *
   * @param pages Array of pages
   * @param size Logical array size
   * @returns Memory usage in bytes
   */
  public static memoryUsed(pages: number[][], size: number): number {
    const numPages = pages.length;
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);

    const pageBytes = Estimate.sizeOfByteArray(HugeArrays.PAGE_SIZE);
    memoryUsed += pageBytes * (numPages - 1);

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfByteArray(lastPageSize);

    return memoryUsed;
  }

  constructor(size: number, pages: number[][], memoryUsed: number) {
    super();
    this._size = size;
    this._pages = pages;
    this._memoryUsed = memoryUsed;
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this._pages![pageIndex][indexInPage];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const value = this._pages![pageIndex][indexInPage];
    this._pages![pageIndex][indexInPage] += delta;
    return value;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] = value;
  }

  public or(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] |= value;
  }

  public and(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return (this._pages![pageIndex][indexInPage] &= value);
  }

  public addTo(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] += value;
  }

  public setAll(gen: (index: number) => number): void {
    for (let i = 0; i < this._pages!.length; i++) {
      const page = this._pages![i];
      const baseIndex = i << HugeArrays.PAGE_SHIFT;

      for (let j = 0; j < page.length; j++) {
        page[j] = gen(baseIndex + j);
      }
    }
  }

  public fill(value: number): void {
    for (const page of this._pages!) {
      page.fill(value);
    }
  }

  public copyTo(dest: HugeByteArray, length: number): void {
    length = Math.min(length, this._size, dest._size);

    if (dest instanceof SingleHugeByteArray) {
      let start = 0;
      let remaining = length;

      for (const page of this._pages!) {
        const toCopy = Math.min(remaining, page.length);
        if (toCopy === 0) break;

        this.arrayCopy(page, 0, dest._page!, start, toCopy);
        start += toCopy;
        remaining -= toCopy;
      }
      dest._page!.fill(0, start, dest._size);
    } else if (dest instanceof PagedHugeByteArray) {
      const pageLen = Math.min(this._pages!.length, dest._pages!.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      for (let i = 0; i < lastPage; i++) {
        const page = this._pages![i];
        const dstPage = dest._pages![i];
        this.arrayCopy(page, 0, dstPage, 0, page.length);
        remaining -= page.length;
      }

      if (remaining > 0) {
        const lastSrcPage = this._pages![lastPage];
        const lastDstPage = dest._pages![lastPage];
        this.arrayCopy(lastSrcPage, 0, lastDstPage, 0, remaining);
        lastDstPage.fill(0, remaining, lastDstPage.length);
      }

      for (let i = pageLen; i < dest._pages!.length; i++) {
        dest._pages![i].fill(0);
      }
    }
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return this._memoryUsed;
  }

  public release(): number {
    if (this._pages !== null) {
      this._pages = null;
      return this._memoryUsed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<number[]> {
    const cursor = new PagedCursor<number[]>();
    cursor.setPages(this._pages!, this._size);
    return cursor;
  }
}

/**
 * Functional interface for generating byte values from indices.
 */
export interface LongToByteFunction {
  (value: number): number;
}
