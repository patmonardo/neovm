/**
 * Thread-safe atomic bitset for billion-scale concurrent graph processing.
 *
 * Essential for parallel graph algorithms requiring shared state:
 * - Concurrent visited node tracking in parallel BFS/DFS
 * - Thread-safe membership testing in distributed algorithms
 * - Atomic flag setting in parallel graph construction
 * - Lock-free synchronization in multi-threaded processing
 * - Parallel community detection with shared membership
 * - Concurrent duplicate detection in graph streaming
 *
 * Performance characteristics:
 * - Atomic operations using compare-and-swap (CAS)
 * - Lock-free bit manipulation for high concurrency
 * - Word-level operations for bulk bit setting
 * - Cache-friendly long word alignment
 * - Billion-bit capacity with paged backing storage
 *
 * Concurrency features:
 * - Thread-safe set/get/flip operations
 * - Atomic getAndSet for synchronization primitives
 * - Range setting with consistent intermediate states
 * - Safe iteration while other threads modify
 * - Compare-and-exchange for conflict resolution
 *
 * Memory efficiency:
 * - Packed bit storage (64 bits per long word)
 * - Paged memory layout for huge capacity
 * - Efficient word-level bulk operations
 * - Minimal atomic operation overhead
 *
 * @module HugeAtomicBitSet
 */

import { BitUtil } from '@/mem';
import { Estimate } from '@/mem';
import { HugeAtomicLongArray } from '@/collections';

export class HugeAtomicBitSet {
  private static readonly NUM_BITS = 64; // 64 bits per Long/BigInt

  private readonly bits: HugeAtomicLongArray;
  private readonly numBits: bigint;
  private readonly remainder: number;

  /**
   * Memory estimation for capacity planning.
   * Essential for resource allocation in large-scale processing.
   *
   * @param size Number of bits in the bitset
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: bigint): number {
    const wordsSize = BitUtil.ceilDiv(size, BigInt(HugeAtomicBitSet.NUM_BITS));
    return HugeAtomicLongArray.memoryEstimation(wordsSize) +
           Estimate.sizeOfInstance('HugeAtomicBitSet');
  }

  /**
   * Creates a new atomic bitset with specified size.
   *
   * @param size Number of bits in the bitset
   * @returns New atomic bitset instance
   *
   * @example
   * ```typescript
   * // Bitset for tracking visited nodes in parallel BFS
   * const nodeCount = 1000000000n;
   * const visited = HugeAtomicBitSet.create(nodeCount);
   *
   * // Thread-safe concurrent access
   * await Promise.all(workers.map(async worker => {
   *   worker.nodes.forEach(nodeId => {
   *     if (!visited.getAndSet(BigInt(nodeId))) {
   *       // First thread to visit this node
   *       processNode(nodeId, worker);
   *     }
   *   });
   * }));
   * ```
   */
  public static create(size: bigint): HugeAtomicBitSet {
    const wordsSize = BitUtil.ceilDiv(size, BigInt(HugeAtomicBitSet.NUM_BITS));
    const remainder = Number(size % BigInt(HugeAtomicBitSet.NUM_BITS));
    const bits = HugeAtomicLongArray.of(wordsSize);

    return new HugeAtomicBitSet(bits, size, remainder);
  }

  private constructor(bits: HugeAtomicLongArray, numBits: bigint, remainder: number) {
    this.bits = bits;
    this.numBits = numBits;
    this.remainder = remainder;
  }

  /**
   * Returns the state of the bit at the given index.
   * Thread-safe read operation.
   *
   * @param index Bit index (0-based)
   * @returns true if bit is set, false otherwise
   *
   * Performance: O(1) atomic read
   *
   * Concurrency: Safe to call while other threads modify the bitset
   */
  public get(index: bigint): boolean {
    console.assert(index < this.numBits, `Index ${index} out of bounds (size: ${this.numBits})`);

    const wordIndex = index / BigInt(HugeAtomicBitSet.NUM_BITS);
    const bitIndex = Number(index % BigInt(HugeAtomicBitSet.NUM_BITS));
    const bitmask = 1n << BigInt(bitIndex);

    return (this.bits.get(wordIndex) & bitmask) !== 0n;
  }

  /**
   * Sets the bit at the given index to true.
   * Thread-safe atomic operation using compare-and-swap.
   *
   * @param index Bit index to set
   *
   * Performance: O(1) with possible CAS retry loops
   *
   * Concurrency: Multiple threads can safely set different or same bits
   *
   * Graph Algorithm Use Cases:
   * - Mark node as visited in concurrent traversal
   * - Set membership flags in parallel clustering
   * - Atomic state updates in distributed algorithms
   */
  public set(index: bigint): void {
    console.assert(index < this.numBits, `Index ${index} out of bounds (size: ${this.numBits})`);

    const wordIndex = index / BigInt(HugeAtomicBitSet.NUM_BITS);
    const bitIndex = Number(index % BigInt(HugeAtomicBitSet.NUM_BITS));
    const bitmask = 1n << BigInt(bitIndex);

    let oldWord = this.bits.get(wordIndex);
    while (true) {
      const newWord = oldWord | bitmask;
      if (newWord === oldWord) {
        // Bit already set - nothing to do
        return;
      }

      const currentWord = this.bits.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful - bit set atomically
        return;
      }

      // CAS failed - retry with current value
      oldWord = currentWord;
    }
  }

  /**
   * Sets the bits from startIndex (inclusive) to endIndex (exclusive).
   * Efficient bulk operation for range setting.
   *
   * @param startIndex First bit index to set (inclusive)
   * @param endIndex Last bit index to set (exclusive)
   *
   * Optimizations:
   * - Word-aligned operations for interior words
   * - Bit masking for partial words at boundaries
   * - Atomic operations maintain consistency
   */
  public setRange(startIndex: bigint, endIndex: bigint): void {
    console.assert(startIndex <= endIndex, `Invalid range: [${startIndex}, ${endIndex})`);
    console.assert(endIndex <= this.numBits, `End index ${endIndex} out of bounds (size: ${this.numBits})`);

    const startWordIndex = startIndex / BigInt(HugeAtomicBitSet.NUM_BITS);
    // Since endIndex is exclusive, we need the word before that index
    const endWordIndex = (endIndex - 1n) / BigInt(HugeAtomicBitSet.NUM_BITS);

    const startBitMask = (-1n) << startIndex;
    const endBitMask = (-1n) >> (-endIndex);

    if (startWordIndex === endWordIndex) {
      // Set within single word
      this.setWord(startWordIndex, startBitMask & endBitMask);
    } else {
      // Set within range - start word, full interior words, end word
      this.setWord(startWordIndex, startBitMask);

      // Set all bits in interior words
      for (let wordIndex = startWordIndex + 1n; wordIndex < endWordIndex; wordIndex++) {
        this.bits.set(wordIndex, -1n); // All bits set
      }

      this.setWord(endWordIndex, endBitMask);
    }
  }

  /**
   * Sets a bit and returns the previous value.
   * Atomic test-and-set operation essential for synchronization.
   *
   * @param index Bit index to set
   * @returns Previous value of the bit
   *
   * Synchronization Use Cases:
   * - Claim exclusive access to graph nodes
   * - Implement atomic locks on graph regions
   * - Coordinate parallel algorithm phases
   * - Detect first-time visitation in concurrent traversal
   *
   * @example
   * ```typescript
   * // Claim exclusive processing rights to a node
   * const wasAlreadyClaimed = bitset.getAndSet(BigInt(nodeId));
   * if (!wasAlreadyClaimed) {
   *   // First thread to claim this node - process it
   *   processNodeExclusively(nodeId);
   * }
   * ```
   */
  public getAndSet(index: bigint): boolean {
    console.assert(index < this.numBits, `Index ${index} out of bounds (size: ${this.numBits})`);

    const wordIndex = index / BigInt(HugeAtomicBitSet.NUM_BITS);
    const bitIndex = Number(index % BigInt(HugeAtomicBitSet.NUM_BITS));
    const bitmask = 1n << BigInt(bitIndex);

    let oldWord = this.bits.get(wordIndex);
    while (true) {
      const newWord = oldWord | bitmask;
      if (newWord === oldWord) {
        // Bit was already set
        return true;
      }

      const currentWord = this.bits.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful - we set the bit
        return false;
      }

      // CAS failed - retry
      oldWord = currentWord;
    }
  }

  /**
   * Toggles the bit at the given index.
   * Atomic flip operation using XOR.
   *
   * @param index Bit index to flip
   */
  public flip(index: bigint): void {
    console.assert(index < this.numBits, `Index ${index} out of bounds (size: ${this.numBits})`);

    const wordIndex = index / BigInt(HugeAtomicBitSet.NUM_BITS);
    const bitIndex = Number(index % BigInt(HugeAtomicBitSet.NUM_BITS));
    const bitmask = 1n << BigInt(bitIndex);

    let oldWord = this.bits.get(wordIndex);
    while (true) {
      const newWord = oldWord ^ bitmask;
      const currentWord = this.bits.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }

      // CAS failed - retry
      oldWord = currentWord;
    }
  }

  /**
   * Iterates the bitset in increasing order and calls the consumer for each set bit.
   *
   * WARNING: This method is not thread-safe. Use only when no concurrent modifications occur.
   *
   * @param consumer Function to call for each set bit index
   */
  public forEachSetBit(consumer: (index: bigint) => void): void {
    const cursor = this.bits.initCursor();

    while (cursor.next()) {
      const block = cursor.array;
      const offset = cursor.offset;
      const limit = cursor.limit;
      const base = cursor.base;

      for (let i = offset; i < limit; i++) {
        let word = block[i];
        while (word !== 0n) {
          const next = this.numberOfTrailingZeros(word);
          const bitIndex = BigInt(HugeAtomicBitSet.NUM_BITS) * (base + BigInt(i)) + BigInt(next);
          consumer(bitIndex);
          word = word ^ this.lowestOneBit(word);
        }
      }
    }
  }

  /**
   * Returns the number of set bits in the bitset.
   *
   * WARNING: This method is not thread-safe.
   *
   * @returns Count of set bits
   */
  public cardinality(): bigint {
    let setBitCount = 0n;

    for (let wordIndex = 0n; wordIndex < this.bits.size(); wordIndex++) {
      setBitCount += BigInt(this.bitCount(this.bits.get(wordIndex)));
    }

    return setBitCount;
  }

  /**
   * Returns true if no bit is set.
   *
   * WARNING: This method is not thread-safe.
   */
  public isEmpty(): boolean {
    for (let wordIndex = 0n; wordIndex < this.bits.size(); wordIndex++) {
      if (this.bitCount(this.bits.get(wordIndex)) > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns true if all bits are set.
   *
   * WARNING: This method is not thread-safe.
   */
  public allSet(): boolean {
    const size = this.bits.size();

    // Check all complete words
    for (let wordIndex = 0n; wordIndex < size - 1n; wordIndex++) {
      if (this.bitCount(this.bits.get(wordIndex)) < HugeAtomicBitSet.NUM_BITS) {
        return false;
      }
    }

    // Check last (potentially partial) word
    const lastWordBitCount = this.bitCount(this.bits.get(size - 1n));
    return lastWordBitCount >= this.remainder;
  }

  /**
   * Returns the number of bits in the bitset.
   */
  public size(): bigint {
    return this.numBits;
  }

  /**
   * Resets all bits in the bitset.
   *
   * WARNING: This method is not thread-safe.
   */
  public clear(): void {
    this.bits.setAll(0n);
  }

  /**
   * Resets the bit at the given index.
   * Thread-safe atomic operation.
   *
   * @param index Bit index to clear
   */
  public clearBit(index: bigint): void {
    console.assert(index < this.numBits, `Index ${index} out of bounds (size: ${this.numBits})`);

    const wordIndex = index / BigInt(HugeAtomicBitSet.NUM_BITS);
    const bitIndex = Number(index % BigInt(HugeAtomicBitSet.NUM_BITS));
    const bitmask = ~(1n << BigInt(bitIndex));

    let oldWord = this.bits.get(wordIndex);
    while (true) {
      const newWord = oldWord & bitmask;
      if (newWord === oldWord) {
        // Bit already cleared
        return;
      }

      const currentWord = this.bits.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }

      // CAS failed - retry
      oldWord = currentWord;
    }
  }

  /**
   * Atomic word-level bit setting with OR operation.
   */
  private setWord(wordIndex: bigint, bitMask: bigint): void {
    let oldWord = this.bits.get(wordIndex);
    while (true) {
      const newWord = oldWord | bitMask;
      if (newWord === oldWord) {
        // Already set
        return;
      }

      const currentWord = this.bits.compareAndExchange(wordIndex, oldWord, newWord);
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }

      oldWord = currentWord;
    }
  }

  /**
   * Counts the number of set bits in a BigInt.
   */
  private bitCount(value: bigint): number {
    let count = 0;
    let n = value;
    while (n !== 0n) {
      count++;
      n = n & (n - 1n); // Clear lowest set bit
    }
    return count;
  }

  /**
   * Returns the number of trailing zero bits.
   */
  private numberOfTrailingZeros(value: bigint): number {
    if (value === 0n) return 64;

    let count = 0;
    let n = value;
    while ((n & 1n) === 0n) {
      count++;
      n = n >> 1n;
    }
    return count;
  }

  /**
   * Returns the lowest set bit.
   */
  private lowestOneBit(value: bigint): bigint {
    return value & (-value);
  }
}
