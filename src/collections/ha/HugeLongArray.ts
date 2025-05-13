import { HugeCursor } from '../cursor/HugeCursor';
import { HugeArrays } from '../HugeArrays';
import { ArrayUtil } from '../ArrayUtil';
import { PageUtil } from '../PageUtil';
import { Estimate } from '../../mem/Estimate';

/**
 * Interface for functions that generate long values from indices
 */
export interface LongUnaryOperator {
  applyAsLong(value: number): number;
}

/**
 * A long-indexable version of a primitive long array (BigInt64Array) that can contain more elements
 * than JavaScript's standard array size limitations.
 *
 * It is implemented by paging of smaller long-arrays (BigInt64Array[]) to support very large collections.
 * If the provided size is small enough, an optimized view of a single BigInt64Array might be used.
 */
export abstract class HugeLongArray extends HugeArray<BigInt64Array, number, HugeLongArray> {
  /**
   * Estimate memory usage for an array of the given size
   */
  public static memoryEstimation(size: number): number {
    if (size <= 0) {
      return 0;
    }

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      // Single array implementation
      return Estimate.sizeOfInstance(16) + Estimate.sizeOfBigInt64Array(size);
    }

    // Paged implementation
    const instanceSize = Estimate.sizeOfInstance(32);
    const numPages = HugeArrays.numberOfPages(size);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfBigInt64Array(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfBigInt64Array(lastPageSize);

    return instanceSize + memoryUsed;
  }

  /**
   * Get the long value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract get(index: number): number;

  /**
   * Set the long value at the given index
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
  public abstract setAll(gen: LongUnaryOperator): void;

  /**
   * Assigns the specified long value to each element.
   */
  public abstract fill(value: number): void;

  /**
   * Find the index where (values[idx] <= searchValue) && (values[idx + 1] > searchValue).
   * Returns a positive index even if the array does not directly contain the searched value.
   * Returns -1 if the value is smaller than the smallest one in the array.
   */
  public abstract binarySearch(searchValue: number): number;

  /**
   * Creates a new array of the given size
   */
  public static newArray(size: number): HugeLongArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeLongArray.of(size);
    }
    return PagedHugeLongArray.of(size);
  }

  /**
   * Create a long array from the given values
   */
  public static of(...values: number[]): HugeLongArray {
    const bigIntArray = new BigInt64Array(values.length);
    for (let i = 0; i < values.length; i++) {
      bigIntArray[i] = BigInt(values[i]);
    }
    return new SingleHugeLongArray(values.length, bigIntArray);
  }

  /**
   * Create an array from pages of BigInt64Arrays
   */
  public static ofPages(pages: BigInt64Array[], size: number): HugeLongArray {
    const capacity = PageUtil.capacityFor(pages.length, HugeArrays.PAGE_SHIFT);
    if (size > capacity) {
      throw new Error(`Size should be smaller than or equal to capacity ${capacity}, but got size ${size}`);
    }
    return new PagedHugeLongArray(size, pages, PagedHugeLongArray.memoryUsed(pages, capacity));
  }

  /**
   * Create a paged array of the given size (for testing)
   */
  public static newPagedArray(size: number): HugeLongArray {
    return PagedHugeLongArray.of(size);
  }

  /**
   * Create a single array of the given size (for testing)
   */
  public static newSingleArray(size: number): HugeLongArray {
    return SingleHugeLongArray.of(size);
  }
}

/**
 * Implementation for arrays that fit in a single BigInt64Array
 */
export class SingleHugeLongArray extends HugeLongArray {
  private readonly size: number;
  page: BigInt64Array | null;

  /**
   * Create a new array of the given size
   */
  public static of(size: number): HugeLongArray {
    if (size > HugeArrays.MAX_ARRAY_LENGTH) {
      throw new Error(`Array size ${size} exceeds maximum single array length`);
    }
    const page = new BigInt64Array(size);
    return new SingleHugeLongArray(size, page);
  }

  constructor(size: number, page: BigInt64Array) {
    super();
    this.size = size;
    this.page = page;
  }

  public get(index: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return Number(this.page[index]);
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] = BigInt(value);
  }

  public or(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] |= BigInt(value);
  }

  public and(index: number, value: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const result = this.page[index] & BigInt(value);
    this.page[index] = result;
    return Number(result);
  }

  public addTo(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    this.page[index] += BigInt(value);
  }

  public setAll(gen: LongUnaryOperator): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.page.length; i++) {
      this.page[i] = BigInt(gen.applyAsLong(i));
    }
  }

  public fill(value: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    this.page.fill(BigInt(value));
  }

  public binarySearch(searchValue: number): number {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    const searchValueBigInt = BigInt(searchValue);

    // Adapted binary lookup for BigInt64Array
    let low = 0;
    let high = this.page.length - 1;

    // Special case for empty arrays
    if (high < 0) {
      return -1;
    }

    // Return -1 if the search value is smaller than the smallest value
    if (this.page[0] > searchValueBigInt) {
      return -1;
    }

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midValue = this.page[mid];

      if (midValue <= searchValueBigInt) {
        // Check if this is the answer (next element is greater or we're at the end)
        if (mid === this.page.length - 1 || this.page[mid + 1] > searchValueBigInt) {
          return mid;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return -1;
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfBigInt64Array(this.size);
  }

  public release(): number {
    if (this.page) {
      const freed = Estimate.sizeOfBigInt64Array(this.size);
      this.page = null;
      return freed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<BigInt64Array> {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.SinglePageCursor<BigInt64Array>(this.page);
  }

  public copyTo(dest: HugeLongArray, length: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeLongArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }

      // Copy values
      for (let i = 0; i < length; i++) {
        dest.page[i] = this.page[i];
      }

      // Fill remainder with zeros
      if (length < dest.size()) {
        dest.page.fill(BigInt(0), length);
      }
    } else if (dest instanceof PagedHugeLongArray) {
      let start = 0;
      let remaining = length;

      for (let i = 0; i < dest.pages.length && remaining > 0; i++) {
        const dstPage = dest.pages[i];
        if (!dstPage) continue;

        const toCopy = Math.min(remaining, dstPage.length);

        for (let j = 0; j < toCopy; j++) {
          dstPage[j] = this.page[start + j];
        }

        if (toCopy < dstPage.length) {
          dstPage.fill(BigInt(0), toCopy);
        }

        start += toCopy;
        remaining -= toCopy;
      }
    }
  }

  public toArray(): BigInt64Array {
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
    this.setAll({ applyAsLong: gen });
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeLongArray {
    const copy = HugeLongArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public toString(): string {
    if (!this.page) {
      return "[]";
    }
    return "[" + Array.from(this.page, n => Number(n)).join(", ") + "]";
  }
}

/**
 * Implementation for arrays that require paging
 */
export class PagedHugeLongArray extends HugeLongArray {
  private readonly size: number;
  readonly pages: BigInt64Array[] | null;
  private readonly memoryUsed: number;

  /**
   * Calculate memory used by pages
   */
  static memoryUsed(pages: BigInt64Array[], size: number): number {
    const numPages = pages.length;
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfBigInt64Array(HugeArrays.PAGE_SIZE);
    memoryUsed += pageBytes * (numPages - 1);

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfBigInt64Array(lastPageSize);
    return memoryUsed;
  }

  /**
   * Create a new array of the given size
   */
  public static of(size: number): HugeLongArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: BigInt64Array[] = new Array(numPages);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      pages[i] = new BigInt64Array(HugeArrays.PAGE_SIZE);
    }

    // Create last page (might be smaller)
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new BigInt64Array(lastPageSize);

    const memoryUsed = PagedHugeLongArray.memoryUsed(pages, size);

    return new PagedHugeLongArray(size, pages, memoryUsed);
  }

  constructor(size: number, pages: BigInt64Array[], memoryUsed: number) {
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
    return Number(this.pages[pageIndex][indexInPage]);
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] = BigInt(value);
  }

  public or(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] |= BigInt(value);
  }

  public and(index: number, value: number): number {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const result = this.pages[pageIndex][indexInPage] & BigInt(value);
    this.pages[pageIndex][indexInPage] = result;
    return Number(result);
  }

  public addTo(index: number, value: number): void {
    if (index >= this.size || !this.pages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages[pageIndex][indexInPage] += BigInt(value);
  }

  public setAll(gen: LongUnaryOperator): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    for (let i = 0; i < this.pages.length; i++) {
      const t = i << HugeArrays.PAGE_SHIFT;
      const page = this.pages[i];
      for (let j = 0; j < page.length; j++) {
        page[j] = BigInt(gen.applyAsLong(t + j));
      }
    }
  }

  public fill(value: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    const bigValue = BigInt(value);
    for (const page of this.pages) {
      page.fill(bigValue);
    }
  }

  public binarySearch(searchValue: number): number {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    const searchValueBigInt = BigInt(searchValue);

    // Start from last page and work backwards
    for (let pageIndex = this.pages.length - 1; pageIndex >= 0; pageIndex--) {
      const page = this.pages[pageIndex];

      // Binary search within this page
      let low = 0;
      let high = page.length - 1;

      if (high < 0) continue;

      // Skip this page if all values are larger than search value
      if (page[0] > searchValueBigInt) continue;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midValue = page[mid];

        if (midValue <= searchValueBigInt) {
          // Check if this is the answer (next element is greater or we're at the end)
          if (mid === page.length - 1 || page[mid + 1] > searchValueBigInt) {
            return HugeArrays.indexFromPageIndexAndIndexInPage(pageIndex, mid);
          }
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }

    return -1;
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

  public newCursor(): HugeCursor<BigInt64Array> {
    if (!this.pages) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.PagedCursor<BigInt64Array>(this.size, this.pages);
  }

  public copyTo(dest: HugeLongArray, length: number): void {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    if (dest instanceof SingleHugeLongArray) {
      if (!dest.page) {
        throw new Error("Destination array has been released");
      }

      let start = 0;
      let remaining = length;

      for (const page of this.pages) {
        if (remaining <= 0) break;

        const toCopy = Math.min(remaining, page.length);
        for (let i = 0; i < toCopy; i++) {
          dest.page[start + i] = page[i];
        }

        start += toCopy;
        remaining -= toCopy;
      }

      // Fill remainder with zeros
      if (start < dest.size()) {
        dest.page.fill(BigInt(0), start);
      }
    } else if (dest instanceof PagedHugeLongArray) {
      if (!dest.pages) {
        throw new Error("Destination array has been released");
      }

      const pageLen = Math.min(this.pages.length, dest.pages.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        for (let j = 0; j < this.pages[i].length; j++) {
          dest.pages[i][j] = this.pages[i][j];
        }
        remaining -= this.pages[i].length;
      }

      // Copy last page
      if (remaining > 0) {
        for (let j = 0; j < remaining; j++) {
          dest.pages[lastPage][j] = this.pages[lastPage][j];
        }

        // Fill remainder of last page with zeros
        if (remaining < dest.pages[lastPage].length) {
          dest.pages[lastPage].fill(BigInt(0), remaining);
        }
      }

      // Fill any remaining pages with zeros
      for (let i = pageLen; i < dest.pages.length; i++) {
        dest.pages[i].fill(BigInt(0));
      }
    }
  }

  public toArray(): BigInt64Array {
    if (!this.pages) {
      throw new Error("Array has been released");
    }

    // Check if size is within JavaScript array limits
    if (this.size > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array with ${this.size} elements exceeds JavaScript's array size limits`);
    }

    const result = new BigInt64Array(this.size);
    let offset = 0;

    for (const page of this.pages) {
      for (let i = 0; i < page.length; i++) {
        result[offset + i] = page[i];
      }
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
    this.setAll({ applyAsLong: gen });
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  public copyOf(newLength: number): HugeLongArray {
    const copy = HugeLongArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }
}
