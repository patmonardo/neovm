import { HugeCursor } from '../cursor/HugeCursor';
import { HugeArray } from './HugeArray';
import { HugeArrays } from '../HugeArrays';
import { Estimate } from '../../mem/Estimate';

/**
 * Interface for functions that generate double values from indices
 */
export interface LongToDoubleFunction {
  applyAsDouble(value: number): number;
}

/**
 * A long-indexable version of a primitive double array (Float64Array) that can contain more elements
 * than JavaScript's standard array size limitations.
 *
 * It is implemented by paging of smaller double-arrays (Float64Array[]) to support very large collections.
 * If the provided size is small enough, an optimized view of a single Float64Array might be used.
 */
export abstract class HugeDoubleArray extends HugeArray<Float64Array, number, HugeDoubleArray> {
  /**
   * Estimate memory usage for an array of the given size
   */
  public static memoryEstimation(size: number): number {
    if (size <= 0) {
      return 0;
    }

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      // Single array implementation
      return Estimate.sizeOfInstance(16) + Estimate.sizeOfFloat64Array(size);
    }

    // Paged implementation
    const instanceSize = Estimate.sizeOfInstance(32);
    const numPages = HugeArrays.numberOfPages(size);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfFloat64Array(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfFloat64Array(lastPageSize);

    return instanceSize + memoryUsed;
  }

  /**
   * Get the double value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract get(index: number): number;

  /**
   * Set the double value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract set(index: number, value: number): void;

  /**
   * Adds (+) the existing value and the provided value at the given index.
   * If there was no previous value, the final result is set to the provided value (x + 0 == x).
   */
  public abstract addTo(index: number, value: number): void;

  /**
   * Set all elements using the provided generator function to compute each element.
   */
  public abstract setAll(gen: LongToDoubleFunction): void;

  /**
   * Assigns the specified double value to each element.
   */
  public abstract fill(value: number): void;

  /**
   * Return a stream of values from this array
   */
  public abstract stream(): number[];

  /**
   * Creates a new array of the given size
   */
  public static newArray(size: number): HugeDoubleArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeDoubleArray.of(size);
    }
    return PagedHugeDoubleArray.of(size);
  }

  /**
   * Create a double array from the given values
   */
  public static of(...values: number[]): HugeDoubleArray {
    return new SingleHugeDoubleArray(values.length, new Float64Array(values));
  }

  /**
   * Create a paged array of the given size (for testing)
   */
  public static newPagedArray(size: number): HugeDoubleArray {
    return PagedHugeDoubleArray.of(size);
  }

  /**
   * Create a single array of the given size (for testing)
   */
  public static newSingleArray(size: number): HugeDoubleArray {
    return SingleHugeDoubleArray.of(size);
  }
}

/**
 * Implementation for arrays that fit in a single Float64Array
 */
export class SingleHugeDoubleArray extends HugeDoubleArray {
  private readonly size: number;
  private page: Float64Array | null;

  /**
   * Create a new array of the given size
   */
  public static of(size: number): HugeDoubleArray {
    if (size > HugeArrays.MAX_ARRAY_LENGTH) {
      throw new Error(`Array size ${size} exceeds maximum single array length`);
    }
    const page = new Float64Array(size);
    return new SingleHugeDoubleArray(size, page);
  }

  constructor(size: number, page: Float64Array) {
    super();
    this.size = size;
    this.page = page;
  }

  public get(index: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return this.page[index];
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] = value;
  }

  public addTo(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] += value;
  }

  public setAll(gen: LongToDoubleFunction): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.page.length; i++) {
      this.page[i] = gen.applyAsDouble(i);
    }
  }

  public fill(value: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    this.page.fill(value);
  }

  public stream(): number[] {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return Array.from(this.page);
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfFloat64Array(this.size);
  }

  public release(): number {
    if (this.page) {
      const freed = Estimate.sizeOfFloat64Array(this.size);
      this.page = null;
      return freed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<Float64Array> {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.SinglePageCursor<Float64Array>(this.page);
  }

  public copyTo(dest: HugeDoubleArray, length: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeDoubleArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }
      dest.page.set(this.page.subarray(0, length));

      // Fill remainder with zeros
      if (length < dest.size()) {
        dest.page.fill(0, length);
      }
    } else if (dest instanceof PagedHugeDoubleArray) {
      let start = 0;
      let remaining = length;

      for (let i = 0; i < dest.pages.length && remaining > 0; i++) {
        const dstPage = dest.pages[i];
        if (!dstPage) continue;

        const toCopy = Math.min(remaining, dstPage.length);
        dstPage.set(this.page.subarray(start, start + toCopy));

        if (toCopy < dstPage.length) {
          dstPage.fill(0, toCopy);
        }

        start += toCopy;
        remaining -= toCopy;
      }
    }
  }

  public toArray(): Float64Array {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return this.page;
  }

  public boxedGet(index: number): number {
    return this.get(index);
  }

  public boxedSet(index: number, value: number): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => number): void {
    this.setAll({ applyAsDouble: gen });
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeDoubleArray {
    const copy = HugeDoubleArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public toString(): string {
    if (!this.page) {
      return "[]";
    }
    return "[" + Array.from(this.page).join(", ") + "]";
  }
}

/**
 * Implementation for arrays that require paging
 */
export class PagedHugeDoubleArray extends HugeDoubleArray {
  private readonly size: number;
  readonly pages: Float64Array[] | null;
  private readonly memoryUsed: number;

  /**
   * Create a new array of the given size
   */
  public static of(size: number): HugeDoubleArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: Float64Array[] = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfFloat64Array(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      memoryUsed += pageBytes;
      pages[i] = new Float64Array(HugeArrays.PAGE_SIZE);
    }

    // Create last page (might be smaller)
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Float64Array(lastPageSize);
    memoryUsed += Estimate.sizeOfFloat64Array(lastPageSize);

    return new PagedHugeDoubleArray(size, pages, memoryUsed);
  }

  constructor(size: number, pages: Float64Array[], memoryUsed: number) {
    super();
    this.size = size;
    this.pages = pages;
    this.memoryUsed = memoryUsed;
  }

  public get(index: number): number {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this.pages[pageIndex][indexInPage];
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] = value;
  }

  public addTo(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] += value;
  }

  public setAll(gen: LongToDoubleFunction): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.pages.length; i++) {
      const t = i << HugeArrays.PAGE_SHIFT;
      const page = this.pages[i];
      for (let j = 0; j < page.length; j++) {
        page[j] = gen.applyAsDouble(t + j);
      }
    }
  }

  public fill(value: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    for (const page of this.pages) {
      page.fill(value);
    }
  }

  public stream(): number[] {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    const result: number[] = [];
    for (const page of this.pages) {
      for (let i = 0; i < page.length; i++) {
        result.push(page[i]);
      }
    }
    return result;
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
      for (let i = 0; i < this.pages.length; i++) {
        this.pages[i] = new Float64Array(0);
      }
      return freed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<Float64Array> {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.PagedCursor<Float64Array>(this.size, this.pages);
  }

  public copyTo(dest: HugeDoubleArray, length: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeDoubleArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }

      let start = 0;
      let remaining = length;

      for (const page of this.pages) {
        if (remaining <= 0) break;

        const toCopy = Math.min(remaining, page.length);
        dest.page.set(page.subarray(0, toCopy), start);

        start += toCopy;
        remaining -= toCopy;
      }

      // Fill remainder with zeros
      if (start < dest.size()) {
        dest.page.fill(0, start);
      }
    } else if (dest instanceof PagedHugeDoubleArray) {
      if (!dest.pages) {
        throw new Error("Destination array has been released");
      }

      const pageLen = Math.min(this.pages.length, dest.pages.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        dest.pages[i].set(this.pages[i]);
        remaining -= this.pages[i].length;
      }

      // Copy last page
      if (remaining > 0) {
        dest.pages[lastPage].set(this.pages[lastPage].subarray(0, remaining));

        // Fill remainder of last page with zeros
        if (remaining < dest.pages[lastPage].length) {
          dest.pages[lastPage].fill(0, remaining);
        }
      }

      // Fill any remaining pages with zeros
      for (let i = pageLen; i < dest.pages.length; i++) {
        dest.pages[i].fill(0);
      }
    }
  }

  public toArray(): Float64Array {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    // Check if size is within JavaScript array limits
    if (this.size > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array with ${this.size} elements exceeds JavaScript's array size limits`);
    }

    const result = new Float64Array(this.size);
    let offset = 0;

    for (const page of this.pages) {
      result.set(page, offset);
      offset += page.length;
    }

    return result;
  }

  public boxedGet(index: number): number {
    return this.get(index);
  }

  public boxedSet(index: number, value: number): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => number): void {
    this.setAll({ applyAsDouble: gen });
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeDoubleArray {
    const copy = HugeDoubleArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }
}
