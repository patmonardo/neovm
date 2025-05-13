import { HugeArrays } from '../HugeArrays';
import { HugeCursor } from '../cursor/HugeCursor';
import { PageUtil } from '../PageUtil';
import { Estimate } from '../../mem/Estimate';

/**
 * Interface for functions that generate byte values from indices
 */
export interface LongToByteFunction {
  valueOf(value: number): number;
}

/**
 * A long-indexable version of a primitive byte array (Uint8Array) that can contain more elements
 * than JavaScript's standard array size limitations.
 *
 * It is implemented by paging of smaller byte-arrays (Uint8Array[]) to support very large collections.
 * If the provided size is small enough, an optimized view of a single Uint8Array might be used.
 */
export abstract class HugeByteArray extends HugeArray<Uint8Array, number, HugeByteArray> {
  /**
   * Estimate memory usage for an array of the given size
   */
  public static memoryEstimation(size: number): number {
    if (size <= 0) {
      return 0;
    }

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      // Single array implementation
      return Estimate.sizeOfInstance(16) + Estimate.sizeOfUint8Array(size);
    }

    // Paged implementation
    const instanceSize = Estimate.sizeOfInstance(32);
    const numPages = HugeArrays.numberOfPages(size);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfUint8Array(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfUint8Array(lastPageSize);

    return instanceSize + memoryUsed;
  }

  /**
   * Get the byte value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract get(index: number): number;

  /**
   * Get the current value and add delta to it
   * @returns the original value before adding
   */
  public abstract getAndAdd(index: number, delta: number): number;

  /**
   * Set the byte value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract set(index: number, value: number): void;

  /**
   * Computes the bit-wise OR (|) of the existing value and the provided value at the given index.
   * If there was no previous value, the final result is set to the provided value (x | 0 == x).
   */
  public abstract or(index: number, value: number): void;

  /**
   * Computes the bit-wise AND (&) of the existing value and the provided value at the given index.
   * If there was no previous value, the final result is set to the 0 (x & 0 == 0).
   * @return the now current value after the operation
   */
  public abstract and(index: number, value: number): number;

  /**
   * Adds (+) the existing value and the provided value at the given index and stored the result into the given index.
   * If there was no previous value, the final result is set to the provided value (x + 0 == x).
   */
  public abstract addTo(index: number, value: number): void;

  /**
   * Set all elements using the provided generator function to compute each element.
   */
  public abstract setAll(gen: LongToByteFunction): void;

  /**
   * Assigns the specified byte value to each element.
   */
  public abstract fill(value: number): void;

  /**
   * Creates a new array of the given size
   */
  public static newArray(size: number): HugeByteArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeByteArray.of(size);
    }
    return PagedHugeByteArray.of(size);
  }

  /**
   * Create a byte array from the given values
   */
  public static of(...values: number[]): HugeByteArray {
    return new SingleHugeByteArray(values.length, new Uint8Array(values));
  }

  /**
   * Create a paged array of the given size (for testing)
   */
  public static newPagedArray(size: number): HugeByteArray {
    return PagedHugeByteArray.of(size);
  }

  /**
   * Create a single array of the given size (for testing)
   */
  public static newSingleArray(size: number): HugeByteArray {
    return SingleHugeByteArray.of(size);
  }
}

/**
 * Implementation for arrays that fit in a single Uint8Array
 */
export class SingleHugeByteArray extends HugeByteArray {
  private readonly size: number;
  private page: Uint8Array | null;

  /**
   * Create a new array of the given size
   */
  public static of(size: number): HugeByteArray {
    if (size > HugeArrays.MAX_ARRAY_LENGTH) {
      throw new Error(`Array size ${size} exceeds maximum single array length`);
    }
    const page = new Uint8Array(size);
    return new SingleHugeByteArray(size, page);
  }

  constructor(size: number, page: Uint8Array) {
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

  public getAndAdd(index: number, delta: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const value = this.page[index];
    this.page[index] = (value + delta) & 0xFF; // Keep in byte range
    return value;
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] = value & 0xFF; // Keep in byte range
  }

  public or(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] |= value & 0xFF;
  }

  public and(index: number, value: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return this.page[index] &= value & 0xFF;
  }

  public addTo(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] = (this.page[index] + value) & 0xFF;
  }

  public setAll(gen: LongToByteFunction): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.page.length; i++) {
      this.page[i] = gen.valueOf(i) & 0xFF;
    }
  }

  public fill(value: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    this.page.fill(value & 0xFF);
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfUint8Array(this.size);
  }

  public release(): number {
    if (this.page) {
      const freed = Estimate.sizeOfUint8Array(this.size);
      this.page = null;
      return freed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<Uint8Array> {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.SinglePageCursor<Uint8Array>(this.page);
  }

  public copyTo(dest: HugeByteArray, length: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeByteArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }
      dest.page.set(this.page.subarray(0, length));

      // Fill remainder with zeros
      if (length < dest.size()) {
        dest.page.fill(0, length);
      }
    } else if (dest instanceof PagedHugeByteArray) {
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

  public toArray(): Uint8Array {
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
    this.setAll({ valueOf: gen });
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeByteArray {
    const copy = HugeByteArray.newArray(newLength);
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
export class PagedHugeByteArray extends HugeByteArray {
  private readonly size: number;
  pages: Uint8Array[] | null;
  private readonly memoryUsed: number;

  /**
   * Create a new array of the given size
   */
  public static of(size: number): HugeByteArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: Uint8Array[] = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfUint8Array(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      memoryUsed += pageBytes;
      pages[i] = new Uint8Array(HugeArrays.PAGE_SIZE);
    }

    // Create last page (might be smaller)
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Uint8Array(lastPageSize);
    memoryUsed += Estimate.sizeOfUint8Array(lastPageSize);

    return new PagedHugeByteArray(size, pages, memoryUsed);
  }

  constructor(size: number, pages: Uint8Array[], memoryUsed: number) {
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

  public getAndAdd(index: number, delta: number): number {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const value = this.pages[pageIndex][indexInPage];
    this.pages[pageIndex][indexInPage] = (value + delta) & 0xFF; // Keep in byte range
    return value;
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] = value & 0xFF; // Keep in byte range
  }

  public or(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] |= value & 0xFF;
  }

  public and(index: number, value: number): number {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this.pages[pageIndex][indexInPage] &= value & 0xFF;
  }

  public addTo(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] = (this.pages[pageIndex][indexInPage] + value) & 0xFF;
  }

  public setAll(gen: LongToByteFunction): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.pages.length; i++) {
      const t = i << HugeArrays.PAGE_SHIFT;
      const page = this.pages[i];
      for (let j = 0; j < page.length; j++) {
        page[j] = gen.valueOf(t + j) & 0xFF;
      }
    }
  }

  public fill(value: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    const byteValue = value & 0xFF;
    for (const page of this.pages) {
      page.fill(byteValue);
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

  public newCursor(): HugeCursor<Uint8Array> {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.PagedCursor<Uint8Array>(this.size, this.pages);
  }

  public copyTo(dest: HugeByteArray, length: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeByteArray) {
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
    } else if (dest instanceof PagedHugeByteArray) {
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

  public toArray(): Uint8Array {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    // Check if size is within JavaScript array limits
    if (this.size > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array with ${this.size} elements exceeds JavaScript's array size limits`);
    }

    const result = new Uint8Array(this.size);
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
    this.setAll({ valueOf: gen });
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeByteArray {
    const copy = HugeByteArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }
}
