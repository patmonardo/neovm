import { BitUtil } from '../../../mem/BitUtil';
import { HugeArrays } from '../../../mem/HugeArrays';
import { AtomicReference } from '../../../concurrency/AtomicReference';

/**
 * A thread-safe bit set that grows automatically to accommodate new indices.
 * Uses a paged structure for efficient memory management.
 */
export class HugeAtomicGrowingBitSet {
  /**
   * Each page stores 2^PAGE_SHIFT_BITS entries.
   * Word-size is 64 bit (long), which means we
   * store 2^(PAGE_SHIFT_BITS - 6) words per page.
   */
  static readonly PAGE_SHIFT_BITS = 16;

  /**
   * Number of bits per word (long).
   */
  private static readonly NUM_BITS = 64;

  /**
   * Mask for extracting bit index within a word.
   */
  private static readonly BIT_MASK = HugeAtomicGrowingBitSet.NUM_BITS - 1;

  /**
   * Number of words per page.
   */
  private readonly pageSize: number;

  /**
   * Word-aligned page shift.
   */
  private readonly pageShift: number;

  /**
   * Word-aligned page mask.
   */
  private readonly pageMask: number;

  /**
   * Reference to the pages structure - must be updated atomically.
   */
  private readonly pages: AtomicReference<Pages>;

  /**
   * Creates a new bit set with the given initial bit size.
   *
   * @param bitSize Initial number of bits to allocate
   * @returns A new HugeAtomicGrowingBitSet
   */
  public static create(bitSize: number): HugeAtomicGrowingBitSet {
    // Number of words required to represent the bit size.
    const wordSize = BitUtil.ceilDiv(bitSize, this.NUM_BITS);

    // Parameters for long pages representing the bits.
    const pageShift = this.PAGE_SHIFT_BITS - 6; // 2^6 == 64 Bits for a long
    const pageSize = 1 << pageShift;
    const pageMask = pageSize - 1;

    // We allocate in pages of fixed size, so the last page
    // might have extra space, which is fine as this is a
    // growing data structure anyway. The capacity will be
    // larger than the specified size.
    const pageCount = HugeArrays.numberOfPages(wordSize, pageShift, pageMask);

    return new HugeAtomicGrowingBitSet(pageCount, pageSize, pageShift, pageMask);
  }

  /**
   * Creates a new bit set with the given parameters.
   *
   * @param pageCount Initial number of pages
   * @param pageSize Number of words per page
   * @param pageShift Word-aligned page shift
   * @param pageMask Word-aligned page mask
   */
  private constructor(pageCount: number, pageSize: number, pageShift: number, pageMask: number) {
    this.pageSize = pageSize;
    this.pageShift = pageShift;
    this.pageMask = pageMask;
    this.pages = new AtomicReference<Pages>(new Pages(pageCount, pageSize));
  }

  /**
   * Sets the bit at the given index to true.
   *
   * @param index Bit index
   */
  public set(index: number): void {
    const longIndex = index >>> 6;
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    const bitMask = 1n << BigInt(bitIndex);

    let oldWord = BigInt(page.get(wordIndex));
    while (true) {
      const newWord = oldWord | bitMask;
      if (newWord === oldWord) {
        // nothing to set
        return;
      }
      const currentWord = BigInt(page.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }
      // CAS unsuccessful, try again
      oldWord = currentWord;
    }
  }

  /**
   * Returns the state of the bit at the given index.
   *
   * @param index Bit index
   * @returns True if the bit is set, false otherwise
   */
  public get(index: number): boolean {
    const longIndex = index >>> 6;
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    const bitMask = 1n << BigInt(bitIndex);
    return (BigInt(page.get(wordIndex)) & bitMask) !== 0n;
  }

  /**
   * Sets a bit and returns the previous value.
   *
   * @param index Bit index
   * @returns True if the bit was already set
   */
  public getAndSet(index: number): boolean {
    const longIndex = index >>> 6;
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    const bitMask = 1n << BigInt(bitIndex);

    let oldWord = BigInt(page.get(wordIndex));
    while (true) {
      const newWord = oldWord | bitMask;
      if (newWord === oldWord) {
        // already set
        return true;
      }
      const currentWord = BigInt(page.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return false;
      }
      // CAS unsuccessful, try again
      oldWord = currentWord;
    }
  }

  /**
   * Returns the number of set bits in the bit set.
   *
   * The result of the method does not include the effects
   * of concurrent write operations that occur while the
   * cardinality is computed.
   *
   * @returns Number of set bits
   */
  public cardinality(): number {
    const pages = this.pages.get();
    const pageCount = pages.length();
    const pageSize = this.pageSize;

    let setBitCount = 0;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = pages.getPage(pageIndex);
      for (let wordIndex = 0; wordIndex < pageSize; wordIndex++) {
        const word = BigInt(page.get(wordIndex));
        setBitCount += this.popCount(word);
      }
    }

    return setBitCount;
  }

  /**
   * Iterates the bit set in increasing index order and calls the
   * given consumer for each index with a set bit.
   *
   * The result of the method does not include the effects
   * of concurrent write operations that occur while the
   * bit set is traversed.
   *
   * @param consumer Function called for each set bit index
   */
  public forEachSetBit(consumer: (index: number) => void): void {
    const pages = this.pages.get();
    const pageCount = pages.length();
    const pageSize = this.pageSize;

    let base = 0;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = pages.getPage(pageIndex);
      for (let wordIndex = 0; wordIndex < pageSize; wordIndex++) {
        let word = BigInt(page.get(wordIndex));

        while (word !== 0n) {
          const next = this.numberOfTrailingZeros(word);
          consumer(HugeAtomicGrowingBitSet.NUM_BITS * (base + wordIndex) + next);
          word = word ^ (1n << BigInt(next));
        }
      }
      base += pageSize;
    }
  }

  /**
   * Resets the bit at the given index.
   *
   * @param index Bit index
   */
  public clear(index: number): void {
    const longIndex = index >>> 6;
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    const bitMask = ~(1n << BigInt(bitIndex));

    let oldWord = BigInt(page.get(wordIndex));
    while (true) {
      const newWord = oldWord & bitMask;
      if (newWord === oldWord) {
        // already cleared
        return;
      }
      const currentWord = BigInt(page.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }
      // CAS unsuccessful, try again
      oldWord = currentWord;
    }
  }

  /**
   * The current capacity of the bit set. Setting a bit at an index
   * exceeding the capacity, leads to a resize operation.
   * The capacity is a multiple of the underlying page size.
   *
   * @returns Current capacity in bits
   */
  public capacity(): number {
    return this.pages.get().length() * (1 << this.pageShift);
  }

  /**
   * Returns the page at the given index, potentially growing the underlying pages
   * to fit the requested page index.
   *
   * @param pageIndex Index of the requested page
   * @returns The page at the given index
   */
  private getPage(pageIndex: number): AtomicLongArray {
    let pages = this.pages.get();

    while (pages.length() <= pageIndex) {
      // We need to grow the number of pages to fit the requested page index.
      // This needs to happen in a loop since we can't guarantee that if the
      // current thread is not successful in updating the pages, the newly
      // created pages contain enough space.
      const newPages = new Pages(pages, pageIndex + 1, this.pageSize);

      // Atomically updating the reference. If we're successful, the witness will
      // be the prior `pages` value, and we're done. If we're unsuccessful, we
      // already read the new `pages` value due to CAX call and repeat with that one.
      const witness = this.pages.compareAndExchange(pages, newPages);

      if (pages === witness) {
        // Success.
        pages = newPages;
      } else {
        // Throw away the created pages and try again with the new current value.
        pages = witness;
      }
    }

    return pages.getPage(pageIndex);
  }

  /**
   * Returns the number of trailing zeros in the binary representation of the specified value.
   *
   * @param value The value to examine
   * @returns The number of trailing zeros
   */
  private numberOfTrailingZeros(value: number): number {
    // Implementation of trailing zeros for BigInt
    if (value === 0n) return 64;

    let count = 0;
    while ((value & 1n) === 0n) {
      value = value >> 1n;
      count++;
    }
    return count;
  }

  /**
   * Returns the population count (number of set bits) in the binary representation of the specified value.
   *
   * @param value The value to examine
   * @returns The number of set bits
   */
  private popCount(value: number): number {
    // Implementation of population count for BigInt
    let count = 0;
    while (value !== 0n) {
      if ((value & 1n) === 1n) count++;
      value = value >> 1n;
    }
    return count;
  }
}

/**
 * Container for pages of atomic long arrays.
 */
class Pages {
  private readonly pages: AtomicLongArray[];

  /**
   * Creates a new Pages container with the given number of pages.
   *
   * @param pageCount Number of pages to create
   * @param pageSize Size of each page in words
   */
  constructor(pageCount: number, pageSize: number);

  /**
   * Creates a new Pages container based on an existing one, but with more pages.
   *
   * @param oldPages Existing pages container
   * @param newPageCount Total number of pages in the new container
   * @param pageSize Size of each page in words
   */
  constructor(oldPages: Pages, newPageCount: number, pageSize: number);

  constructor(pageCountOrOldPages: number | Pages, newPageCountOrPageSize: number, pageSize?: number) {
    if (typeof pageCountOrOldPages === 'number') {
      // Creating a new Pages object with empty pages
      const pageCount = pageCountOrOldPages;
      const pageSize = newPageCountOrPageSize;
      this.pages = new Array<AtomicLongArray>(pageCount);

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        this.pages[pageIndex] = new AtomicLongArray(pageSize);
      }
    } else {
      // Creating a new Pages object based on an existing one
      const oldPages = pageCountOrOldPages;
      const newPageCount = newPageCountOrPageSize;
      const pageSize = pageSize!;

      this.pages = new Array<AtomicLongArray>(newPageCount);

      // We transfer the existing pages to the new pages.
      const oldPageCount = oldPages.length();
      for (let i = 0; i < oldPageCount; i++) {
        this.pages[i] = oldPages.getPage(i);
      }

      // And add new pages for the remaining ones until we reach the page count.
      // This is potential garbage since the thread creating those might not win
      // the race to grow the pages.
      for (let pageIndex = oldPageCount; pageIndex < newPageCount; pageIndex++) {
        this.pages[pageIndex] = new AtomicLongArray(pageSize);
      }
    }
  }

  /**
   * Gets the page at the given index.
   *
   * @param pageIndex Index of the page to get
   * @returns The page at the given index
   */
  public getPage(pageIndex: number): AtomicLongArray {
    return this.pages[pageIndex];
  }

  /**
   * Returns the number of pages in this container.
   *
   * @returns Number of pages
   */
  public length(): number {
    return this.pages.length;
  }
}

/**
 * An array of longs that supports atomic operations.
 */
class AtomicLongArray {
  private readonly array: Int32Array;

  /**
   * Creates a new array of the given length.
   *
   * @param length Length of the array
   */
  constructor(length: number) {
    // We use SharedArrayBuffer to enable atomic operations across worker threads
    // Each long (64-bit) is represented by two Int32 values (32-bit each)
    this.array = new Int32Array(new SharedArrayBuffer(length * 8));
  }

  /**
   * Gets the value at the given index.
   *
   * @param index Index to get
   * @returns Value at the index
   */
  public get(index: number): number {
    // In JavaScript, we need to handle 64-bit values as two 32-bit values
    const lowIndex = index * 2;
    const highIndex = lowIndex + 1;

    // Create a DataView to read the 64-bit value
    const view = new DataView(this.array.buffer);
    return Number(BigInt(view.getInt32(highIndex * 4, true)) << 32n | BigInt(view.getInt32(lowIndex * 4, true)) & 0xffffffffn);
  }

  /**
   * Sets the value at the given index.
   *
   * @param index Index to set
   * @param value Value to set
   */
  public set(index: number, value: number): void {
    const lowIndex = index * 2;
    const highIndex = lowIndex + 1;

    const view = new DataView(this.array.buffer);
    const bigValue = BigInt(value);

    view.setInt32(lowIndex * 4, Number(bigValue & 0xffffffffn), true);
    view.setInt32(highIndex * 4, Number(bigValue >> 32n), true);
  }

  /**
   * Atomically updates the value at the given index if it equals the expected value.
   *
   * @param index Index to update
   * @param expectedValue Expected current value
   * @param newValue Value to set if the current value matches the expected value
   * @returns The value before the update
   */
  public compareAndExchange(index: number, expectedValue: number, newValue: number): number {
    // JavaScript's Atomics API works on individual elements of typed arrays,
    // so we need to handle 64-bit operations carefully

    const lowIndex = index * 2;
    const highIndex = lowIndex + 1;

    const view = new DataView(this.array.buffer);
    const expectedBigValue = BigInt(expectedValue);
    const newBigValue = BigInt(newValue);

    // Split values into low and high 32-bit components
    const expectedLow = Number(expectedBigValue & 0xffffffffn);
    const expectedHigh = Number(expectedBigValue >> 32n);
    const newLow = Number(newBigValue & 0xffffffffn);
    const newHigh = Number(newBigValue >> 32n);

    // We need a lock to make the 64-bit operation atomic
    // This is a simplified implementation - in production you'd want a more
    // sophisticated approach using Atomics.wait/notify

    // First, try to acquire the lock
    while (Atomics.compareExchange(new Int32Array(this.array.buffer, lowIndex * 4, 1), 0, 0, 1) !== 0) {
      // Spin until we get the lock
      Atomics.wait(new Int32Array(this.array.buffer, lowIndex * 4, 1), 0, 10);
    }

    try {
      // Read current values
      const currentLow = view.getInt32(lowIndex * 4, true);
      const currentHigh = view.getInt32(highIndex * 4, true);

      // Combine into 64-bit value
      const currentValue = Number(BigInt(currentHigh) << 32n | BigInt(currentLow) & 0xffffffffn);

      // If values match, update
      if (currentLow === expectedLow && currentHigh === expectedHigh) {
        view.setInt32(lowIndex * 4, newLow, true);
        view.setInt32(highIndex * 4, newHigh, true);
      }

      return currentValue;
    } finally {
      // Release the lock
      Atomics.store(new Int32Array(this.array.buffer, lowIndex * 4, 1), 0, 0);
      Atomics.notify(new Int32Array(this.array.buffer, lowIndex * 4, 1), 0);
    }
  }
}
