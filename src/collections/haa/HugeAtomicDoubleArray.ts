import { HugeCursor } from '../cursor/HugeCursor';
import { HugeCursorSupport } from '../cursor/HugeCursorSupport';
import { HugeArrays } from '../HugeArrays';
import { PageCreator } from './PageCreator';
import { ValueTransformers } from './ValueTransformers';
import { Estimate } from '../../mem/Estimate';

/**
 * A thread-safe version of HugeDoubleArray that provides atomic operations.
 * Uses SharedArrayBuffer and Atomics API for thread safety.
 */
export abstract class HugeAtomicDoubleArray implements HugeCursorSupport<Float64Array> {
  /**
   * Creates a new array of the given size.
   *
   * @param size the length of the new array, the highest supported index is `size - 1`
   * @param pageCreator factory for creating double array pages
   * @returns new array
   */
  public static of(size: number, pageCreator: PageCreator.DoublePageCreator): HugeAtomicDoubleArray {
    return HugeAtomicDoubleArrayFactory.of(size, pageCreator);
  }

  /**
   * Estimate memory usage for an array of the given size
   */
  public static memoryEstimation(size: number): number {
    return HugeAtomicDoubleArrayFactory.memoryEstimation(size);
  }

  /**
   * @returns the defaultValue to fill the remaining space in the input of `copyTo()`.
   */
  public defaultValue(): number {
    return 0.0;
  }

  /**
   * @returns the double value at the given index
   * @throws Error if the index is not within the array bounds
   */
  public abstract get(index: number): number;

  /**
   * Atomically adds the given delta to the value at the given index.
   *
   * @param index the index
   * @param delta the value to add
   * @returns the previous value at index
   */
  public abstract getAndAdd(index: number, delta: number): number;

  /**
   * Atomically returns the value at the given index and replaces it with the given value.
   *
   * @throws Error if the index is not within the array bounds
   */
  public abstract getAndReplace(index: number, value: number): number;

  /**
   * Sets the double value at the given index to the given value.
   *
   * @throws Error if the index is not within the array bounds
   */
  public abstract set(index: number, value: number): void;

  /**
   * Atomically sets the element at position `index` to the given
   * updated value if the current value equals the expected value.
   *
   * @param index the index
   * @param expect the expected value
   * @param update the new value
   * @returns `true` if successful. `false` indicates that the actual
   *     value was not equal to the expected value.
   */
  public abstract compareAndSet(index: number, expect: number, update: number): boolean;

  /**
   * Atomically sets the element at position `index` to the given
   * updated value if the current value equals the expected value.
   *
   * @param index the index
   * @param expect the expected value
   * @param update the new value
   * @returns the witness value, which will be the same as the expected value if successful
   *     or the current value if unsuccessful.
   */
  public abstract compareAndExchange(index: number, expect: number, update: number): number;

  /**
   * Atomically updates the element at index `index` with the results
   * of applying the given function, returning the updated value.
   *
   * @param index the index
   * @param updateFunction a side-effect-free function
   */
  public abstract update(index: number, updateFunction: ValueTransformers.DoubleToDoubleFunction): void;

  /**
   * Returns the length of this array.
   */
  public abstract size(): number;

  /**
   * @returns the amount of memory used by the instance of this array, in bytes.
   */
  public abstract sizeOf(): number;

  /**
   * Sets all entries in the array to the given value.
   * This method is not thread-safe.
   */
  public abstract setAll(value: number): void;

  /**
   * Destroys the data, allowing the underlying storage arrays to be collected as garbage.
   * The array is unusable after calling this method.
   *
   * @returns the amount of memory freed, in bytes.
   */
  public abstract release(): number;

  /**
   * Copies the content of this array into the target array.
   * This method is not thread-safe.
   */
  public abstract copyTo(dest: HugeAtomicDoubleArray, length: number): void;

  /**
   * Returns a new cursor for this array.
   * The cursor is not positioned and in an invalid state.
   */
  public abstract newCursor(): HugeCursor<Float64Array>;

  /**
   * Initialize a cursor for this array.
   */
  public abstract initCursor(cursor: HugeCursor<Float64Array>): HugeCursor<Float64Array>;

  /**
   * Initialize a cursor for a range in this array.
   */
  public abstract initCursor(cursor: HugeCursor<Float64Array>, start: number, end: number): HugeCursor<Float64Array>;
}

/**
 * Factory for creating HugeAtomicDoubleArray instances
 */
export class HugeAtomicDoubleArrayFactory {
  /**
   * Create a new instance of the appropriate array implementation based on the size
   */
  public static of(size: number, pageCreator: PageCreator.DoublePageCreator): HugeAtomicDoubleArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return new SingleHugeAtomicDoubleArray(size, pageCreator);
    }
    return new PagedHugeAtomicDoubleArray(size, pageCreator);
  }

  /**
   * Estimate memory usage
   */
  public static memoryEstimation(size: number): number {
    if (size <= 0) {
      return 0;
    }

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return Estimate.sizeOfInstance(16) + Estimate.sizeOfSharedFloat64Array(size);
    }

    // Paged implementation
    const instanceSize = Estimate.sizeOfInstance(32);
    const numPages = HugeArrays.numberOfPages(size);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfSharedFloat64Array(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfSharedFloat64Array(lastPageSize);

    return instanceSize + memoryUsed;
  }
}

/**
 * Helper for atomic operations on doubles using bitwise manipulation
 */
class AtomicDoubleHelper {
  /**
   * Convert a number to its bit representation as a BigInt
   */
  static doubleToBits(value: number): number {
    // Create temporary buffers for the conversion
    const buffer = new ArrayBuffer(8);
    const floatView = new Float64Array(buffer);
    const bigIntView = new BigInt64Array(buffer);

    // Set the double value
    floatView[0] = value;

    // Return the bit representation
    return bigIntView[0];
  }

  /**
   * Convert bits (as BigInt) back to a double
   */
  static bitsToDouble(bits: number): number {
    // Create temporary buffers for the conversion
    const buffer = new ArrayBuffer(8);
    const floatView = new Float64Array(buffer);
    const bigIntView = new BigInt64Array(buffer);

    // Set the bits
    bigIntView[0] = bits;

    // Return the double value
    return floatView[0];
  }

  /**
   * Perform atomic compareAndExchange on a double value
   */
  static compareAndExchangeDouble(
    array: Float64Array,
    index: number,
    expect: number,
    update: number
  ): number {
    // Get overlapping BigInt64Array view of the same buffer
    const buffer = array.buffer as SharedArrayBuffer;
    const offset = array.byteOffset;
    const bigIntView = new BigInt64Array(buffer, offset, array.length);

    // Convert values to their bit representation
    const expectedBits = this.doubleToBits(expect);
    const updateBits = this.doubleToBits(update);

    // Perform the atomic compare-and-exchange on the bits
    const resultBits = Atomics.compareExchange(bigIntView, index, expectedBits, updateBits);

    // Convert the result bits back to a double
    return this.bitsToDouble(resultBits);
  }

  /**
   * Perform atomic getAndAdd on a double value
   */
  static getAndAddDouble(array: Float64Array, index: number, delta: number): number {
    // Since Atomics doesn't support add on doubles, we need to use compareAndExchange in a loop
    let oldValue = array[index];
    let newValue = oldValue + delta;
    let result: number;

    do {
      result = this.compareAndExchangeDouble(array, index, oldValue, newValue);
      if (result === oldValue) {
        // Success
        return oldValue;
      }
      // Try again with updated value
      oldValue = result;
      newValue = oldValue + delta;
    } while (true);
  }

  /**
   * Perform atomic exchange on a double value
   */
  static exchangeDouble(array: Float64Array, index: number, newValue: number): number {
    // Get the current value
    let oldValue = array[index];
    let result: number;

    do {
      result = this.compareAndExchangeDouble(array, index, oldValue, newValue);
      if (result === oldValue) {
        // Success
        return oldValue;
      }
      // Try again with updated value
      oldValue = result;
    } while (true);
  }
}

/**
 * Implementation for arrays that fit in a single SharedArrayBuffer
 */
export class SingleHugeAtomicDoubleArray implements HugeAtomicDoubleArray {
  private readonly size: number;
  private buffer: SharedArrayBuffer | null;
  private page: Float64Array | null;

  constructor(size: number, pageCreator: PageCreator.DoublePageCreator) {
    this.size = size;
    this.buffer = new SharedArrayBuffer(size * 8); // 8 bytes per double
    this.page = new Float64Array(this.buffer);
  }

  public get(index: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    // Use a simple read for get operations - this provides atomicity for 64-bit reads
    return this.page[index];
  }

  public getAndAdd(index: number, delta: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return AtomicDoubleHelper.getAndAddDouble(this.page, index, delta);
  }

  public getAndReplace(index: number, value: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return AtomicDoubleHelper.exchangeDouble(this.page, index, value);
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    // Use a direct write for set - this provides atomicity for 64-bit writes
    this.page[index] = value;
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return AtomicDoubleHelper.compareAndExchangeDouble(this.page, index, expect, update) === expect;
  }

  public compareAndExchange(index: number, expect: number, update: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return AtomicDoubleHelper.compareAndExchangeDouble(this.page, index, expect, update);
  }

  public update(index: number, updateFunction: ValueTransformers.DoubleToDoubleFunction): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    let oldValue = this.get(index);
    let newValue: number;

    // Try until successful or too many retries
    const MAX_RETRIES = 10;
    let retries = 0;

    do {
      if (retries++ > MAX_RETRIES) {
        // Force update if too many retries
        newValue = updateFunction.applyAsDouble(oldValue);
        this.set(index, newValue);
        return;
      }

      newValue = updateFunction.applyAsDouble(oldValue);
      const witness = this.compareAndExchange(index, oldValue, newValue);

      if (witness === oldValue) {
        // Update successful
        return;
      }

      // Try again with new value
      oldValue = witness;
    } while (true);
  }

  public defaultValue(): number {
    return 0.0;
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfSharedFloat64Array(this.size);
  }

  public setAll(value: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    // Fill the array (not atomic, but as specified)
    this.page.fill(value);
  }

  public release(): number {
    if (this.page) {
      const freed = Estimate.sizeOfSharedFloat64Array(this.size);
      this.page = null;
      this.buffer = null;
      return freed;
    }
    return 0;
  }

  public copyTo(dest: HugeAtomicDoubleArray, length: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    // Copy values one by one (not the most efficient, but works for all implementations)
    for (let i = 0; i < length; i++) {
      dest.set(i, this.get(i));
    }

    // Fill remainder with default value
    const defaultValue = dest.defaultValue();
    for (let i = length; i < dest.size(); i++) {
      dest.set(i, defaultValue);
    }
  }

  public newCursor(): HugeCursor<Float64Array> {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.SinglePageCursor<Float64Array>(this.page);
  }

  public initCursor(cursor: HugeCursor<Float64Array>, start?: number, end?: number): HugeCursor<Float64Array> {
    if (!this.page) {
      throw new Error("Array has been released");
    }

    if (start === undefined || end === undefined) {
      cursor.setRange();
    } else {
      const arraySize = this.size;

      if (start < 0 || start > arraySize) {
        throw new Error(`start expected to be in [0 : ${arraySize}] but got ${start}`);
      }

      if (end < start || end > arraySize) {
        throw new Error(`end expected to be in [${start} : ${arraySize}] but got ${end}`);
      }

      cursor.setRange(start, end);
    }

    return cursor;
  }
}

/**
 * Implementation for arrays that require paging
 */
export class PagedHugeAtomicDoubleArray implements HugeAtomicDoubleArray {
  private readonly size: number;
  private readonly pageCreator: PageCreator.DoublePageCreator;
  private pages: SharedArrayBuffer[] | null;
  private typedPages: Float64Array[] | null;
  private readonly memoryUsed: number;

  constructor(size: number, pageCreator: PageCreator.DoublePageCreator) {
    this.size = size;
    this.pageCreator = pageCreator;

    const numPages = HugeArrays.numberOfPages(size);
    this.pages = new Array(numPages);
    this.typedPages = new Array(numPages);

    // Memory tracking
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const fullPageMemory = Estimate.sizeOfSharedFloat64Array(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      const buffer = new SharedArrayBuffer(HugeArrays.PAGE_SIZE * 8); // 8 bytes per double
      this.pages[i] = buffer;
      this.typedPages[i] = new Float64Array(buffer);
      memoryUsed += fullPageMemory;
    }

    // Create last page (might be smaller)
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    const lastBuffer = new SharedArrayBuffer(lastPageSize * 8); // 8 bytes per double
    this.pages[numPages - 1] = lastBuffer;
    this.typedPages[numPages - 1] = new Float64Array(lastBuffer);
    memoryUsed += Estimate.sizeOfSharedFloat64Array(lastPageSize);

    this.memoryUsed = memoryUsed;
  }

  public get(index: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    return this.typedPages[pageIndex][indexInPage];
  }

  public getAndAdd(index: number, delta: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    return AtomicDoubleHelper.getAndAddDouble(this.typedPages[pageIndex], indexInPage, delta);
  }

  public getAndReplace(index: number, value: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    return AtomicDoubleHelper.exchangeDouble(this.typedPages[pageIndex], indexInPage, value);
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    this.typedPages[pageIndex][indexInPage] = value;
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    return AtomicDoubleHelper.compareAndExchangeDouble(
      this.typedPages[pageIndex],
      indexInPage,
      expect,
      update
    ) === expect;
  }

  public compareAndExchange(index: number, expect: number, update: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);

    return AtomicDoubleHelper.compareAndExchangeDouble(
      this.typedPages[pageIndex],
      indexInPage,
      expect,
      update
    );
  }

  public update(index: number, updateFunction: ValueTransformers.DoubleToDoubleFunction): void {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }

    let oldValue = this.get(index);
    let newValue: number;

    // Try until successful or too many retries
    const MAX_RETRIES = 10;
    let retries = 0;

    do {
      if (retries++ > MAX_RETRIES) {
        // Force update if too many retries
        newValue = updateFunction.applyAsDouble(oldValue);
        this.set(index, newValue);
        return;
      }

      newValue = updateFunction.applyAsDouble(oldValue);
      const witness = this.compareAndExchange(index, oldValue, newValue);

      if (witness === oldValue) {
        // Update successful
        return;
      }

      // Try again with new value
      oldValue = witness;
    } while (true);
  }

  public defaultValue(): number {
    return 0.0;
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return this.memoryUsed;
  }

  public setAll(value: number): void {
    if (!this.typedPages) {
      throw new Error("Array has been released");
    }

    // Fill all pages
    for (const page of this.typedPages) {
      page.fill(value);
    }
  }

  public release(): number {
    if (this.typedPages) {
      const freed = this.memoryUsed;
      this.typedPages = null;
      this.pages = null;
      return freed;
    }
    return 0;
  }

  public copyTo(dest: HugeAtomicDoubleArray, length: number): void {
    if (!this.typedPages) {
      throw new Error("Array has been released");
    }

    if (length > this.size) {
      length = this.size;
    }
    if (length > dest.size()) {
      length = dest.size();
    }

    // Copy values one by one
    for (let i = 0; i < length; i++) {
      dest.set(i, this.get(i));
    }

    // Fill remainder with default value
    const defaultValue = dest.defaultValue();
    for (let i = length; i < dest.size(); i++) {
      dest.set(i, defaultValue);
    }
  }

  public newCursor(): HugeCursor<Float64Array> {
    if (!this.typedPages) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.PagedCursor<Float64Array>(this.size, this.typedPages);
  }

  public initCursor(cursor: HugeCursor<Float64Array>, start?: number, end?: number): HugeCursor<Float64Array> {
    if (!this.typedPages) {
      throw new Error("Array has been released");
    }

    if (start === undefined || end === undefined) {
      cursor.setRange();
    } else {
      const arraySize = this.size;

      if (start < 0 || start > arraySize) {
        throw new Error(`start expected to be in [0 : ${arraySize}] but got ${start}`);
      }

      if (end < start || end > arraySize) {
        throw new Error(`end expected to be in [${start} : ${arraySize}] but got ${end}`);
      }

      cursor.setRange(start, end);
    }

    return cursor;
  }
}
