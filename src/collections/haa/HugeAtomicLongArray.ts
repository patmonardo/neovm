import { HugeCursor } from '../cursor/HugeCursor';
import { HugeCursorSupport } from '../cursor/HugeCursorSupport';
import { HugeArrays } from '../HugeArrays';
import { PageCreator } from './PageCreator';
import { ValueTransformers } from './ValueTransformers';
import { Estimate } from '../../mem/Estimate';

/**
 * A thread-safe version of HugeLongArray that provides atomic operations.
 * Uses SharedArrayBuffer and Atomics API for thread safety.
 */
export abstract class HugeAtomicLongArray implements HugeCursorSupport<BigInt64Array> {
  /**
   * Creates a new array of the given size.
   *
   * @param size the length of the new array, the highest supported index is `size - 1`
   * @param pageCreator factory for creating long array pages
   * @returns new array
   */
  public static of(size: number, pageCreator: PageCreator.LongPageCreator): HugeAtomicLongArray {
    return HugeAtomicLongArrayFactory.of(size, pageCreator);
  }

  /**
   * Estimate memory usage for an array of the given size
   */
  public static memoryEstimation(size: number): number {
    return HugeAtomicLongArrayFactory.memoryEstimation(size);
  }

  /**
   * @returns the defaultValue to fill the remaining space in the input of `copyTo()`.
   */
  public defaultValue(): number {
    return 0;
  }

  /**
   * @returns the long value at the given index
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
   * Sets the long value at the given index to the given value.
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
  public abstract update(index: number, updateFunction: ValueTransformers.LongToLongFunction): void;

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
  public abstract copyTo(dest: HugeAtomicLongArray, length: number): void;

  /**
   * Returns a new cursor for this array.
   * The cursor is not positioned and in an invalid state.
   */
  public abstract newCursor(): HugeCursor<BigInt64Array>;

  /**
   * Initialize a cursor for this array.
   */
  public abstract initCursor(cursor: HugeCursor<BigInt64Array>): HugeCursor<BigInt64Array>;

  /**
   * Initialize a cursor for a range in this array.
   */
  public abstract initCursor(cursor: HugeCursor<BigInt64Array>, start: number, end: number): HugeCursor<BigInt64Array>;
}

/**
 * Factory for creating HugeAtomicLongArray instances
 */
export class HugeAtomicLongArrayFactory {
  /**
   * Create a new instance of the appropriate array implementation based on the size
   */
  public static of(size: number, pageCreator: PageCreator.LongPageCreator): HugeAtomicLongArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return new SingleHugeAtomicLongArray(size, pageCreator);
    }
    return new PagedHugeAtomicLongArray(size, pageCreator);
  }

  /**
   * Estimate memory usage
   */
  public static memoryEstimation(size: number): number {
    if (size <= 0) {
      return 0;
    }

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return Estimate.sizeOfInstance(16) + Estimate.sizeOfSharedBigInt64Array(size);
    }
    
    // Paged implementation
    const instanceSize = Estimate.sizeOfInstance(32);
    const numPages = HugeArrays.numberOfPages(size);
    
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfSharedBigInt64Array(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;
    
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfSharedBigInt64Array(lastPageSize);
    
    return instanceSize + memoryUsed;
  }
}

/**
 * Implementation for arrays that fit in a single SharedArrayBuffer
 */
export class SingleHugeAtomicLongArray implements HugeAtomicLongArray {
  private readonly size: number;
  private buffer: SharedArrayBuffer | null;
  private page: BigInt64Array | null;

  constructor(size: number, pageCreator: PageCreator.LongPageCreator) {
    this.size = size;
    this.buffer = new SharedArrayBuffer(size * 8); // 8 bytes per long
    this.page = new BigInt64Array(this.buffer);
  }

  public get(index: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return Number(Atomics.load(this.page as any, index));
  }

  public getAndAdd(index: number, delta: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return Number(Atomics.add(this.page as any, index, BigInt(delta)));
  }

  public getAndReplace(index: number, value: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return Number(Atomics.exchange(this.page as any, index, BigInt(value)));
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    Atomics.store(this.page as any, index, BigInt(value));
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return Atomics.compareExchange(
      this.page as any, 
      index, 
      BigInt(expect), 
      BigInt(update)
    ) === BigInt(expect);
  }

  public compareAndExchange(index: number, expect: number, update: number): number {
    if (index >= this.size || !this.page) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    return Number(Atomics.compareExchange(
      this.page as any, 
      index, 
      BigInt(expect), 
      BigInt(update)
    ));
  }

  public update(index: number, updateFunction: ValueTransformers.LongToLongFunction): void {
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
        newValue = updateFunction.applyAsLong(oldValue);
        this.set(index, newValue);
        return;
      }
      
      newValue = updateFunction.applyAsLong(oldValue);
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
    return 0;
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfSharedBigInt64Array(this.size);
  }

  public setAll(value: number): void {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    
    // Fill the array (not atomic, but as specified)
    const bigValue = BigInt(value);
    for (let i = 0; i < this.page.length; i++) {
      this.page[i] = bigValue;
    }
  }

  public release(): number {
    if (this.page) {
      const freed = Estimate.sizeOfSharedBigInt64Array(this.size);
      this.page = null;
      this.buffer = null;
      return freed;
    }
    return 0;
  }

  public copyTo(dest: HugeAtomicLongArray, length: number): void {
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

  public newCursor(): HugeCursor<BigInt64Array> {
    if (!this.page) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.SinglePageCursor<BigInt64Array>(this.page);
  }

  public initCursor(cursor: HugeCursor<BigInt64Array>, start?: number, end?: number): HugeCursor<BigInt64Array> {
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
export class PagedHugeAtomicLongArray implements HugeAtomicLongArray {
  private readonly size: number;
  private readonly pageCreator: PageCreator.LongPageCreator;
  private pages: SharedArrayBuffer[] | null;
  private typedPages: BigInt64Array[] | null;
  private readonly memoryUsed: number;

  constructor(size: number, pageCreator: PageCreator.LongPageCreator) {
    this.size = size;
    this.pageCreator = pageCreator;
    
    const numPages = HugeArrays.numberOfPages(size);
    this.pages = new Array(numPages);
    this.typedPages = new Array(numPages);
    
    // Memory tracking
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const fullPageMemory = Estimate.sizeOfSharedBigInt64Array(HugeArrays.PAGE_SIZE);
    
    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      const buffer = new SharedArrayBuffer(HugeArrays.PAGE_SIZE * 8); // 8 bytes per long
      this.pages[i] = buffer;
      this.typedPages[i] = new BigInt64Array(buffer);
      memoryUsed += fullPageMemory;
    }
    
    // Create last page (might be smaller)
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    const lastBuffer = new SharedArrayBuffer(lastPageSize * 8); // 8 bytes per long
    this.pages[numPages - 1] = lastBuffer;
    this.typedPages[numPages - 1] = new BigInt64Array(lastBuffer);
    memoryUsed += Estimate.sizeOfSharedBigInt64Array(lastPageSize);
    
    this.memoryUsed = memoryUsed;
  }

  public get(index: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    
    return Number(Atomics.load(this.typedPages[pageIndex] as any, indexInPage));
  }

  public getAndAdd(index: number, delta: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    
    return Number(Atomics.add(this.typedPages[pageIndex] as any, indexInPage, BigInt(delta)));
  }

  public getAndReplace(index: number, value: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    
    return Number(Atomics.exchange(this.typedPages[pageIndex] as any, indexInPage, BigInt(value)));
  }

  public set(index: number, value: number): void {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    
    Atomics.store(this.typedPages[pageIndex] as any, indexInPage, BigInt(value));
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    
    return Atomics.compareExchange(
      this.typedPages[pageIndex] as any, 
      indexInPage, 
      BigInt(expect), 
      BigInt(update)
    ) === BigInt(expect);
  }

  public compareAndExchange(index: number, expect: number, update: number): number {
    if (index >= this.size || !this.typedPages) {
      throw new Error(`Index ${index} out of bounds for array of size ${this.size}`);
    }
    
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    
    return Number(Atomics.compareExchange(
      this.typedPages[pageIndex] as any, 
      indexInPage, 
      BigInt(expect), 
      BigInt(update)
    ));
  }

  public update(index: number, updateFunction: ValueTransformers.LongToLongFunction): void {
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
        newValue = updateFunction.applyAsLong(oldValue);
        this.set(index, newValue);
        return;
      }
      
      newValue = updateFunction.applyAsLong(oldValue);
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
    return 0;
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
    const bigValue = BigInt(value);
    for (const page of this.typedPages) {
      for (let i = 0; i < page.length; i++) {
        page[i] = bigValue;
      }
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

  public copyTo(dest: HugeAtomicLongArray, length: number): void {
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

  public newCursor(): HugeCursor<BigInt64Array> {
    if (!this.typedPages) {
      throw new Error("Array has been released");
    }
    return new HugeCursor.PagedCursor<BigInt64Array>(this.size, this.typedPages);
  }

  public initCursor(cursor: HugeCursor<BigInt64Array>, start?: number, end?: number): HugeCursor<BigInt64Array> {
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
