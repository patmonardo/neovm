import { HugeCursor } from '../cursor/HugeCursor';
import { HugeArrays } from '../HugeArrays';
import { HugeArray } from '@/collections/ha/HugeArray';
import { Estimate } from '../../mem/Estimate';

/**
 * A long-indexable version of an Object array (T[]) that can contain more elements
 * than JavaScript's standard array size limitations.
 *
 * It is implemented by paging of smaller object-arrays (T[][]) to support very large collections.
 * If the provided size is small enough, an optimized view of a single T[] might be used.
 */
export abstract class HugeObjectArray<T> extends HugeArray<Array<T>, T, HugeObjectArray<T>> {
  /**
   * Estimate memory usage for an array of the given size and object size
   */
  public static memoryEstimation(arraySize: number, objectSize: number): number {
    // Size of the instance itself
    const sizeOfInstance = arraySize <= HugeArrays.MAX_ARRAY_LENGTH
      ? Estimate.sizeOfInstance(16) // SingleHugeObjectArray
      : Estimate.sizeOfInstance(32); // PagedHugeObjectArray

    const numPages = HugeArrays.numberOfPages(arraySize);

    // Memory for outer array
    let outArrayMemoryUsage = Estimate.sizeOfObjectArray(numPages);

    // Memory for pages
    const memoryUsagePerPage = Estimate.sizeOfObjectArray(HugeArrays.PAGE_SIZE) +
                              (HugeArrays.PAGE_SIZE * objectSize);
    let pageMemoryUsage = (numPages - 1) * memoryUsagePerPage;

    // Memory for last page which might be shorter
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(arraySize);
    const lastPageMemoryUsage = Estimate.sizeOfObjectArray(lastPageSize) +
                               (lastPageSize * objectSize);

    return sizeOfInstance + outArrayMemoryUsage + pageMemoryUsage + lastPageMemoryUsage;
  }

  /**
   * Get the value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract get(index: number): T;

  /**
   * Returns the value at the given index. If the value at the index is null or undefined,
   * the given defaultValue is returned.
   */
  public abstract getOrDefault(index: number, defaultValue: T): T;

  /**
   * Sets the value at the given index to the given value.
   * @throws Error if the index is not within the array bounds
   */
  public abstract set(index: number, value: T): void;

  /**
   * If the value at the given index is null or undefined, attempts to compute its value using
   * the given supplier and enters it into this array.
   *
   * @returns the current (existing or computed) value associated with
   *          the specified index, or null/undefined if the computed value is null/undefined
   */
  public abstract putIfAbsent(index: number, supplier: () => T): T;

  /**
   * Set all elements using the provided generator function to compute each element.
   */
  public abstract setAll(gen: (index: number) => T): void;

  /**
   * Assigns the specified value to each element.
   */
  public abstract fill(value: T): void;

  /**
   * Creates a new array of the given size
   */
  public static newArray<T>(size: number): HugeObjectArray<T> {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeObjectArray.of<T>(size);
    }
    return PagedHugeObjectArray.of<T>(size);
  }

  /**
   * Create an object array from the given values
   */
  public static of<T>(...values: T[]): HugeObjectArray<T> {
    return new SingleHugeObjectArray<T>(values.length, values);
  }

  /**
   * Create a paged array of the given size (for testing)
   */
  public static newPagedArray<T>(size: number): HugeObjectArray<T> {
    return PagedHugeObjectArray.of<T>(size);
  }

  /**
   * Create a single array of the given size (for testing)
   */
  public static newSingleArray<T>(size: number): HugeObjectArray<T> {
    return SingleHugeObjectArray.of<T>(size);
  }
}

/**
 * Implementation for arrays that fit in a single array
 */
export class SingleHugeObjectArray<T> extends HugeObjectArray<T> {
  private readonly size: number;
  page: T[] | null;

  /**
   * Create a new array of the given size
   */
  public static of<T>(size: number): HugeObjectArray<T> {
    if (size > HugeArrays.MAX_ARRAY_LENGTH) {
      throw new Error(`Array size ${size} exceeds maximum single array length`);
    }
    const page: T[] = new Array<T>(size);
    return new SingleHugeObjectArray<T>(size, page);
  }

  constructor(size: number, page: T[]) {
    super();
    this.size = size;
    this.page = page;
  }

  public get(index: number): T {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return this.page[index];
  }

  public getOrDefault(index: number, defaultValue: T): T {
    try {
      const value = this.get(index);
      return (value === null || value === undefined) ? defaultValue : value;
    } catch (e) {
      return defaultValue;
    }
  }

  public set(index: number, value: T): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] = value;
  }

  public putIfAbsent(index: number, supplier: () => T): T {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    let value = this.page[index];
    if (value === null || value === undefined) {
      value = supplier();
      if (value !== null && value !== undefined) {
        this.page[index] = value;
      }
    }
    return value;
  }

  public setAll(gen: (index: number) => T): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.page.length; i++) {
      this.page[i] = gen(i);
    }
  }

  public fill(value: T): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    this.page.fill(value);
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfObjectArray(this.size);
  }

  public release(): number {
    if (this.page) {
      const freed = Estimate.sizeOfObjectArray(this.size);
      this.page = null;
      return freed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<T[]> {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.SinglePageCursor<T[]>(this.page);
  }

  public copyTo(dest: HugeObjectArray<T>, length: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeObjectArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }

      // Copy values
      for (let i = 0; i < length; i++) {
        dest.page[i] = this.page[i];
      }

      // Fill remainder with nulls
      for (let i = length; i < dest.size(); i++) {
        dest.page[i] = null as any;
      }
    } else if (dest instanceof PagedHugeObjectArray) {
      let start = 0;
      let remaining = length;

      for (let i = 0; i < dest.pages.length && remaining > 0; i++) {
        const dstPage = dest.pages[i];
        if (!dstPage) continue;

        const toCopy = Math.min(remaining, dstPage.length);

        if (toCopy === 0) {
          dstPage.fill(null as any);
        } else {
          // Copy values
          for (let j = 0; j < toCopy; j++) {
            dstPage[j] = this.page[start + j];
          }

          // Fill remainder with nulls
          for (let j = toCopy; j < dstPage.length; j++) {
            dstPage[j] = null as any;
          }

          start += toCopy;
          remaining -= toCopy;
        }
      }
    }
  }

  public toArray(): T[] {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return this.page;
  }

  public boxedGet(index: number): T {
    return this.get(index);
  }

  public boxedSet(index: number, value: T): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => T): void {
    this.setAll(gen);
  }

  public boxedFill(value: T): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeObjectArray<T> {
    const copy = HugeObjectArray.newArray<T>(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public toString(): string {
    if (!this.page) {
      return "[]";
    }
    return "[" + this.page.join(", ") + "]";
  }
}

/**
 * Implementation for arrays that require paging
 */
export class PagedHugeObjectArray<T> extends HugeObjectArray<T> {
  private readonly size: number;
  readonly pages: T[][] | null;
  private readonly memoryUsed: number;

  /**
   * Calculate memory used by pages
   */
  static memoryUsed(pages: any[][], size: number): number {
    const numPages = pages.length;
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfObjectArray(HugeArrays.PAGE_SIZE);
    memoryUsed += pageBytes * (numPages - 1);

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfObjectArray(lastPageSize);
    return memoryUsed;
  }

  /**
   * Create a new array of the given size
   */
  public static of<T>(size: number): HugeObjectArray<T> {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: T[][] = new Array(numPages);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      pages[i] = new Array<T>(HugeArrays.PAGE_SIZE);
    }

    // Create last page (might be smaller)
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<T>(lastPageSize);

    const memoryUsed = PagedHugeObjectArray.memoryUsed(pages, size);

    return new PagedHugeObjectArray<T>(size, pages, memoryUsed);
  }

  constructor(size: number, pages: T[][], memoryUsed: number) {
    super();
    this.size = size;
    this.pages = pages;
    this.memoryUsed = memoryUsed;
  }

  public get(index: number): T {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this.pages[pageIndex][indexInPage];
  }

  public getOrDefault(index: number, defaultValue: T): T {
    try {
      const value = this.get(index);
      return (value === null || value === undefined) ? defaultValue : value;
    } catch (e) {
      return defaultValue;
    }
  }

  public set(index: number, value: T): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] = value;
  }

  public putIfAbsent(index: number, supplier: () => T): T {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    let value = this.pages[pageIndex][indexInPage];
    if (value === null || value === undefined) {
      value = supplier();
      if (value !== null && value !== undefined) {
        this.pages[pageIndex][indexInPage] = value;
      }
    }
    return value;
  }

  public setAll(gen: (index: number) => T): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.pages.length; i++) {
      const t = i << HugeArrays.PAGE_SHIFT;
      const page = this.pages[i];
      for (let j = 0; j < page.length; j++) {
        page[j] = gen(t + j);
      }
    }
  }

  public fill(value: T): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    for (const page of this.pages) {
      page.fill(value);
    }
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return this.memoryUsed;
  }

  public release(): number {
    if (this.pages) {
      const freed = this.memoryUsed;
      this.pages = null;
      return freed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<T[]> {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.PagedCursor<T[]>(this.size, this.pages);
  }

  public copyTo(dest: HugeObjectArray<T>, length: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeObjectArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }

      let start = 0;
      let remaining = length;

      for (const page of this.pages) {
        if (remaining <= 0) break;

        const toCopy = Math.min(remaining, page.length);

        // Copy values
        for (let i = 0; i < toCopy; i++) {
          dest.page[start + i] = page[i];
        }

        start += toCopy;
        remaining -= toCopy;
      }

      // Fill remainder with nulls
      for (let i = start; i < dest.size(); i++) {
        dest.page[i] = null as any;
      }
    } else if (dest instanceof PagedHugeObjectArray) {
      if (!dest.pages) {
        throw new Error("Destination array has been released");
      }

      const pageLen = Math.min(this.pages.length, dest.pages.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        const srcPage = this.pages[i];
        const dstPage = dest.pages[i];

        for (let j = 0; j < srcPage.length; j++) {
          dstPage[j] = srcPage[j];
        }

        remaining -= srcPage.length;
      }

      // Copy last page
      if (remaining > 0) {
        const srcPage = this.pages[lastPage];
        const dstPage = dest.pages[lastPage];

        // Copy values
        for (let i = 0; i < remaining; i++) {
          dstPage[i] = srcPage[i];
        }

        // Fill remainder with nulls
        for (let i = remaining; i < dstPage.length; i++) {
          dstPage[i] = null as any;
        }
      }

      // Fill any remaining pages with nulls
      for (let i = pageLen; i < dest.pages.length; i++) {
        dest.pages[i].fill(null as any);
      }
    }
  }

  public toArray(): T[] {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    // Check if size is within JavaScript array limits
    if (this.size > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array with ${this.size} elements exceeds JavaScript's array size limits`);
    }

    const result: T[] = new Array<T>(this.size);
    let offset = 0;

    for (const page of this.pages) {
      for (let i = 0; i < page.length; i++) {
        result[offset + i] = page[i];
      }
      offset += page.length;
    }

    return result;
  }

  public boxedGet(index: number): T {
    return this.get(index);
  }

  public boxedSet(index: number, value: T): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => T): void {
    this.setAll(gen);
  }

  public boxedFill(value: T): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeObjectArray<T> {
    const copy = HugeObjectArray.newArray<T>(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }
}
