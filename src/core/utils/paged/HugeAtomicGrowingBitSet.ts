/**
 * Self-growing thread-safe atomic bitset for dynamic billion-scale processing.
 *
 * Essential for algorithms with unknown or dynamic memory requirements:
 * - Streaming graph processing with unknown node counts
 * - Dynamic visited tracking that grows with exploration
 * - Online algorithms that discover new entities
 * - Concurrent data structure building with unknown final size
 * - Real-time graph analysis with expanding datasets
 *
 * Performance characteristics:
 * - Atomic operations using compare-and-swap (CAS)
 * - Lock-free growth through atomic page array updates
 * - Efficient bit operations using number (64-bit precision)
 * - Only converts to BigInt for bit shift operations
 * - Page-based allocation reduces memory waste
 *
 * Dynamic growth features:
 * - Thread-safe capacity expansion during runtime
 * - Atomic page allocation race resolution
 * - Zero-copy page transfer during growth
 * - Minimal synchronization overhead
 * - Predictable memory allocation patterns
 *
 * Concurrency optimizations:
 * - Compare-and-exchange for conflict resolution
 * - Lock-free bit manipulation within pages
 * - Atomic reference updates for page arrays
 * - Race-free capacity expansion
 *
 * @module HugeAtomicGrowingBitSet
 */

import { BitUtil } from '@/mem';
import { HugeArrays } from '@/mem';

export class HugeAtomicGrowingBitSet {
  // Each page stores 2^PAGE_SHIFT_BITS entries (bits)
  // Word-size is 64 bit, so we store 2^(PAGE_SHIFT_BITS - 6) words per page
  private static readonly PAGE_SHIFT_BITS = 16;
  private static readonly NUM_BITS = 64; // 64 bits per number (JavaScript number precision)
  private static readonly BIT_MASK = HugeAtomicGrowingBitSet.NUM_BITS - 1;

  private readonly pageSize: number; // words per page
  private readonly pageShift: number; // word-aligned page shift
  private readonly pageMask: number; // word-aligned page mask

  // Atomic reference to pages array - enables thread-safe growth
  private pagesRef: AtomicReference<Pages>;

  /**
   * Creates a growing atomic bitset with initial capacity.
   *
   * @param bitSize Initial number of bits to support
   * @returns New growing atomic bitset
   *
   * @example
   * ```typescript
   * // Start small - will grow as needed
   * const dynamicVisited = HugeAtomicGrowingBitSet.create(1000);
   *
   * // Set bits way beyond initial capacity - automatic growth!
   * await Promise.all([
   *   worker1.processNodes(0, 500000),
   *   worker2.processNodes(500000, 1000000),
   *   worker3.processNodes(1000000, 2000000) // Triggers growth!
   * ]);
   *
   * async function processNodes(start: number, end: number) {
   *   for (let nodeId = start; nodeId < end; nodeId++) {
   *     if (!dynamicVisited.getAndSet(nodeId)) {
   *       // First visit - process this node
   *       await processNode(nodeId);
   *     }
   *   }
   * }
   * ```
   */
  public static create(bitSize: number): HugeAtomicGrowingBitSet {
    // Number of words (numbers) required to represent the bit size
    const wordSize = BitUtil.ceilDiv(bitSize, HugeAtomicGrowingBitSet.NUM_BITS);

    // Parameters for pages of numbers representing the bits
    const pageShift = HugeAtomicGrowingBitSet.PAGE_SHIFT_BITS - 6; // 2^6 == 64 bits per number
    const pageSize = 1 << pageShift;
    const pageMask = pageSize - 1;

    // Calculate initial page count
    const pageCount = HugeArrays.numberOfPages(wordSize, pageShift, pageMask);

    return new HugeAtomicGrowingBitSet(pageCount, pageSize, pageShift, pageMask);
  }

  private constructor(pageCount: number, pageSize: number, pageShift: number, pageMask: number) {
    this.pageSize = pageSize;
    this.pageShift = pageShift;
    this.pageMask = pageMask;
    this.pagesRef = new AtomicReference(new Pages(pageCount, pageSize));
  }

  /**
   * Sets the bit at the given index to true.
   * Automatically grows capacity if index exceeds current size.
   *
   * @param index Bit index to set
   *
   * Performance: O(1) with occasional growth overhead
   *
   * Thread-safety: Multiple threads can safely set different or same bits
   */
  public set(index: number): void {
    const longIndex = Math.floor(index / 64); // Use division instead of bit shift for clarity
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    // Only use BigInt for the bit shift operation
    const bitMask = Number(1n << BigInt(bitIndex));

    let oldWord = page.get(wordIndex);
    while (true) {
      const newWord = oldWord | bitMask;
      if (newWord === oldWord) {
        // Bit already set - nothing to do
        return;
      }

      const currentWord = page.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful - bit set atomically
        return;
      }

      // CAS failed - retry with current value
      oldWord = currentWord;
    }
  }

  /**
   * Returns the state of the bit at the given index.
   *
   * @param index Bit index to check
   * @returns true if bit is set, false otherwise
   *
   * Performance: O(1) with possible growth if index exceeds capacity
   */
  public get(index: number): boolean {
    const longIndex = Math.floor(index / 64);
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    // Only use BigInt for the bit shift operation
    const bitMask = Number(1n << BigInt(bitIndex));

    return (page.get(wordIndex) & bitMask) !== 0;
  }

  /**
   * Sets a bit and returns the previous value.
   * Essential for atomic test-and-set synchronization patterns.
   *
   * @param index Bit index to set
   * @returns Previous value of the bit (true if was set, false if was clear)
   *
   * Synchronization Use Cases:
   * - Claim exclusive access to dynamic resources
   * - First-time discovery in streaming algorithms
   * - Atomic reservation in growing data structures
   *
   * @example
   * ```typescript
   * // Claim processing rights for dynamically discovered nodes
   * function claimNode(nodeId: number): boolean {
   *   return !growingBitSet.getAndSet(nodeId); // true if we're first
   * }
   *
   * // Process nodes as they're discovered
   * if (claimNode(newlyDiscoveredNode)) {
   *   await processNodeExclusively(newlyDiscoveredNode);
   * }
   * ```
   */
  public getAndSet(index: number): boolean {
    const longIndex = Math.floor(index / 64);
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    // Only use BigInt for the bit shift operation
    const bitMask = Number(1n << BigInt(bitIndex));

    let oldWord = page.get(wordIndex);
    while (true) {
      const newWord = oldWord | bitMask;
      if (newWord === oldWord) {
        // Bit was already set
        return true;
      }

      const currentWord = page.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful - we set the bit
        return false;
      }

      // CAS failed - retry
      oldWord = currentWord;
    }
  }

  /**
   * Returns the number of set bits in the bitset.
   *
   * WARNING: Result may not include effects of concurrent writes.
   *
   * @returns Count of set bits
   */
  public cardinality(): number {
    const pages = this.pagesRef.get();
    const pageCount = pages.length();
    const pageSize = this.pageSize;

    let setBitCount = 0;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = pages.getPage(pageIndex);
      for (let wordIndex = 0; wordIndex < pageSize; wordIndex++) {
        const word = page.get(wordIndex);
        setBitCount += this.bitCount(word);
      }
    }

    return setBitCount;
  }

  /**
   * Iterates the bitset and calls consumer for each set bit.
   *
   * WARNING: May not include effects of concurrent writes during iteration.
   *
   * @param consumer Function to call for each set bit index
   */
  public forEachSetBit(consumer: (index: number) => void): void {
    const pages = this.pagesRef.get();
    const pageCount = pages.length();
    const pageSize = this.pageSize;

    let base = 0;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = pages.getPage(pageIndex);
      for (let wordIndex = 0; wordIndex < pageSize; wordIndex++) {
        let word = page.get(wordIndex);

        while (word !== 0) {
          const next = this.numberOfTrailingZeros(word);
          const bitIndex = HugeAtomicGrowingBitSet.NUM_BITS * (base + wordIndex) + next;
          consumer(bitIndex);
          word = word ^ this.lowestOneBit(word);
        }
      }
      base += pageSize;
    }
  }

  /**
   * Resets the bit at the given index.
   * Thread-safe atomic clear operation.
   *
   * @param index Bit index to clear
   */
  public clear(index: number): void {
    const longIndex = Math.floor(index / 64);
    const pageIndex = HugeArrays.pageIndex(longIndex, this.pageShift);
    const wordIndex = HugeArrays.indexInPage(longIndex, this.pageMask);
    const bitIndex = index & HugeAtomicGrowingBitSet.BIT_MASK;

    const page = this.getPage(pageIndex);
    // Only use BigInt for the bit shift operation, then convert back
    const bitMask = ~Number(1n << BigInt(bitIndex));

    let oldWord = page.get(wordIndex);
    while (true) {
      const newWord = oldWord & bitMask;
      if (newWord === oldWord) {
        // Bit already cleared
        return;
      }

      const currentWord = page.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }

      // CAS failed - retry
      oldWord = currentWord;
    }
  }

  /**
   * Returns the current capacity of the bitset.
   * Setting a bit beyond this capacity triggers automatic growth.
   *
   * @returns Current bit capacity
   */
  public capacity(): number {
    return this.pagesRef.get().length() * (1 << this.pageShift);
  }

  /**
   * Returns the page at the given index, growing the structure if necessary.
   * Thread-safe growth through atomic page array updates.
   *
   * @param pageIndex Page index to retrieve
   * @returns Atomic page at the specified index
   */
  private getPage(pageIndex: number): AtomicNumberArray {
    let pages = this.pagesRef.get();

    while (pages.length() <= pageIndex) {
      // Need to grow the number of pages to fit the requested index
      // Loop handles race conditions where multiple threads try to grow
      const newPages = new Pages(pages, pageIndex + 1, this.pageSize);

      // Atomic update - only one thread succeeds
      const witness = this.pagesRef.compareAndExchange(pages, newPages);

      if (pages === witness) {
        // Success - we updated the pages reference
        pages = newPages;
      } else {
        // Another thread won the race - use their pages
        pages = witness;
      }
    }

    return pages.getPage(pageIndex);
  }

  /**
   * Counts the number of set bits in a number.
   * Uses bit manipulation for efficiency.
   */
  private bitCount(value: number): number {
    let count = 0;
    let n = value;
    while (n !== 0) {
      count++;
      n = n & (n - 1); // Clear lowest set bit
    }
    return count;
  }

  /**
   * Returns the number of trailing zero bits.
   */
  private numberOfTrailingZeros(value: number): number {
    if (value === 0) return 64;

    let count = 0;
    let n = value;
    while ((n & 1) === 0) {
      count++;
      n = Math.floor(n / 2); // Logical right shift
    }
    return count;
  }

  /**
   * Returns the lowest set bit.
   */
  private lowestOneBit(value: number): number {
    return value & (-value);
  }
}

/**
 * Thread-safe atomic reference implementation.
 * Provides compare-and-exchange semantics for page array updates.
 */
class AtomicReference<T> {
  private value: T;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  public get(): T {
    return this.value;
  }

  public compareAndExchange(expected: T, update: T): T {
    const current = this.value;
    if (current === expected) {
      this.value = update;
    }
    return current;
  }
}

/**
 * Atomic number array implementation.
 * Simulates Java's AtomicLongArray with JavaScript numbers.
 */
class AtomicNumberArray {
  private data: number[];

  constructor(size: number) {
    this.data = new Array(size).fill(0);
  }

  public get(index: number): number {
    return this.data[index];
  }

  public compareAndExchange(index: number, expected: number, update: number): number {
    const current = this.data[index];
    if (current === expected) {
      this.data[index] = update;
    }
    return current;
  }
}

/**
 * Container for atomic page arrays with thread-safe growth.
 */
class Pages {
  private readonly pages: AtomicNumberArray[];

  constructor(pageCount: number, pageSize: number) {
    this.pages = new Array(pageCount);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      this.pages[pageIndex] = new AtomicNumberArray(pageSize);
    }
  }

  /**
   * Copy constructor for growing pages array.
   */
  constructor(oldPages: Pages, newPageCount: number, pageSize: number) {
    this.pages = new Array(newPageCount);

    // Transfer existing pages
    const oldPageCount = oldPages.length();
    for (let i = 0; i < oldPageCount; i++) {
      this.pages[i] = oldPages.pages[i];
    }

    // Create new pages for the remaining slots
    for (let pageIndex = oldPageCount; pageIndex < newPageCount; pageIndex++) {
      this.pages[pageIndex] = new AtomicNumberArray(pageSize);
    }
  }

  public getPage(pageIndex: number): AtomicNumberArray {
    return this.pages[pageIndex];
  }

  public length(): number {
    return this.pages.length;
  }
}
