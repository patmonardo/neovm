import { HugeAtomicLongArray } from "../../../collections/haa/HugeAtomicLongArray";
import { Concurrency } from "../../../concurrency/Concurrency";
import { BitUtil } from "../../../mem/BitUtil";
import { Estimate } from "../../../mem/Estimate";
import { ParallelLongPageCreator } from "./ParallelLongPageCreator";

/**
 * A thread-safe bit set that can handle huge numbers of bits efficiently.
 * Uses atomic operations to ensure thread safety.
 */
export class HugeAtomicBitSet {
  /**
   * Number of bits in a long (64)
   */
  private static readonly NUM_BITS = 64;

  /**
   * The underlying storage for the bit values.
   */
  private readonly bits: HugeAtomicLongArray;

  /**
   * Total number of bits in the set.
   */
  private readonly numBits: number;

  /**
   * Number of bits used in the last word (remainder of numBits / NUM_BITS).
   */
  private readonly remainder: number;

  /**
   * Calculates the memory used by a bit set of the given size.
   *
   * @param size Number of bits to store
   * @returns Memory estimation in bytes
   */
  public static memoryEstimation(size: number): number {
    const wordsSize = BitUtil.ceilDiv(size, this.NUM_BITS);
    return HugeAtomicLongArray.memoryEstimation(wordsSize) + Estimate.sizeOfInstance(HugeAtomicBitSet);
  }

  /**
   * Creates a new bit set with the given size.
   *
   * @param size Number of bits to store
   * @returns A new HugeAtomicBitSet
   */
  public static create(size: number): HugeAtomicBitSet {
    const wordsSize = BitUtil.ceilDiv(size, this.NUM_BITS);
    const remainder = size % this.NUM_BITS;
    const creator = ParallelLongPageCreator.passThrough(new Concurrency(1));
    return new HugeAtomicBitSet(HugeAtomicLongArray.of(wordsSize, creator), size, remainder);
  }

  /**
   * Creates a new bit set with the given underlying array.
   *
   * @param bits The underlying storage array
   * @param numBits Total number of bits
   * @param remainder Bits used in the last word
   */
  private constructor(bits: HugeAtomicLongArray, numBits: number, remainder: number) {
    this.bits = bits;
    this.numBits = numBits;
    this.remainder = remainder;
  }

  /**
   * Returns the state of the bit at the given index.
   *
   * @param index Bit index
   * @returns True if the bit is set, false otherwise
   */
  public get(index: number): boolean {
    console.assert(index < this.numBits, 'Index out of bounds');

    const wordIndex = Math.floor(index / HugeAtomicBitSet.NUM_BITS);
    const bitIndex = index % HugeAtomicBitSet.NUM_BITS;
    const bitmask = 1n << BigInt(bitIndex);
    return (BigInt(this.bits.get(wordIndex)) & bitmask) !== 0n;
  }

  /**
   * Sets the bit at the given index to true.
   *
   * @param index Bit index
   */
  public set(index: number): void;

  /**
   * Sets all bits from startIndex (inclusive) to endIndex (exclusive).
   *
   * @param startIndex Start bit index (inclusive)
   * @param endIndex End bit index (exclusive)
   */
  public set(startIndex: number, endIndex?: number): void {
    // Single bit set
    if (endIndex === undefined) {
      console.assert(startIndex < this.numBits, 'Index out of bounds');

      const wordIndex = Math.floor(startIndex / HugeAtomicBitSet.NUM_BITS);
      const bitIndex = startIndex % HugeAtomicBitSet.NUM_BITS;
      const bitmask = 1n << BigInt(bitIndex);

      let oldWord = BigInt(this.bits.get(wordIndex));
      while (true) {
        const newWord = oldWord | bitmask;
        if (newWord === oldWord) {
          // Nothing to set
          return;
        }
        const currentWord = BigInt(this.bits.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
        if (currentWord === oldWord) {
          // CAS successful
          return;
        }
        // CAS unsuccessful, try again
        oldWord = currentWord;
      }
    } else {
      // Range set
      console.assert(startIndex <= endIndex!, 'Start index must be <= end index');
      console.assert(endIndex! <= this.numBits, 'End index out of bounds');

      const startWordIndex = Math.floor(startIndex / HugeAtomicBitSet.NUM_BITS);
      // since endIndex is exclusive, we need the word before that index
      const endWordIndex = Math.floor((endIndex! - 1) / HugeAtomicBitSet.NUM_BITS);

      const startBitMask = -1n << BigInt(startIndex % HugeAtomicBitSet.NUM_BITS);
      const endBitMask = -1n >>> BigInt(-endIndex! % HugeAtomicBitSet.NUM_BITS);

      if (startWordIndex === endWordIndex) {
        // set within single word
        this.setWord(this.bits, startWordIndex, Number(startBitMask & endBitMask));
      } else {
        // set within range
        this.setWord(this.bits, startWordIndex, Number(startBitMask));
        for (let wordIndex = startWordIndex + 1; wordIndex < endWordIndex; wordIndex++) {
          this.bits.set(wordIndex, Number(-1n));  // All bits set
        }
        this.setWord(this.bits, endWordIndex, Number(endBitMask));
      }
    }
  }

  /**
   * Sets a bit and returns the previous value.
   *
   * @param index Bit index
   * @returns True if the bit was already set
   */
  public getAndSet(index: number): boolean {
    console.assert(index < this.numBits, 'Index out of bounds');

    const wordIndex = Math.floor(index / HugeAtomicBitSet.NUM_BITS);
    const bitIndex = index % HugeAtomicBitSet.NUM_BITS;
    const bitmask = 1n << BigInt(bitIndex);

    let oldWord = BigInt(this.bits.get(wordIndex));
    while (true) {
      const newWord = oldWord | bitmask;
      if (newWord === oldWord) {
        // already set
        return true;
      }
      const currentWord = BigInt(this.bits.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return false;
      }
      // CAS unsuccessful, try again
      oldWord = currentWord;
    }
  }

  /**
   * Toggles the bit at the given index.
   *
   * @param index Bit index
   */
  public flip(index: number): void {
    console.assert(index < this.numBits, 'Index out of bounds');

    const wordIndex = Math.floor(index / HugeAtomicBitSet.NUM_BITS);
    const bitIndex = index % HugeAtomicBitSet.NUM_BITS;
    const bitmask = 1n << BigInt(bitIndex);

    let oldWord = BigInt(this.bits.get(wordIndex));
    while (true) {
      const newWord = oldWord ^ bitmask;
      const currentWord = BigInt(this.bits.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }
      // CAS unsuccessful, try again
      oldWord = currentWord;
    }
  }

  /**
   * Iterates the bit set in increasing order and calls the given consumer for each set bit.
   * This method is not thread-safe.
   *
   * @param consumer Function called for each set bit index
   */
  public forEachSetBit(consumer: (index: number) => void): void {
    const cursor = this.bits.initCursor(this.bits.newCursor());

    while (cursor.next()) {
      const block = cursor.array || [];
      const offset = cursor.offset;
      const limit = cursor.limit;
      const base = cursor.base;

      for (let i = offset; i < limit; i++) {
        let word = BigInt(block[i]);
        while (word !== 0n) {
          const next = this.numberOfTrailingZeros(word);
          consumer(HugeAtomicBitSet.NUM_BITS * (base + i) + next);
          word = word ^ (1n << BigInt(next));
        }
      }
    }
  }

  /**
   * Returns the number of set bits in the bit set.
   * Note: this method is not thread-safe.
   *
   * @returns Number of bits set to true
   */
  public cardinality(): number {
    let setBitCount = 0;

    for (let wordIndex = 0; wordIndex < this.bits.size(); wordIndex++) {
      setBitCount += this.popCount(BigInt(this.bits.get(wordIndex)));
    }

    return setBitCount;
  }

  /**
   * Returns true if no bit is set.
   * Note: this method is not thread-safe.
   *
   * @returns True if all bits are false
   */
  public isEmpty(): boolean {
    for (let wordIndex = 0; wordIndex < this.bits.size(); wordIndex++) {
      if (this.popCount(BigInt(this.bits.get(wordIndex))) > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns true if all bits are set.
   * Note: this method is not thread-safe.
   *
   * @returns True if all bits are true
   */
  public allSet(): boolean {
    for (let wordIndex = 0; wordIndex < this.bits.size() - 1; wordIndex++) {
      if (this.popCount(BigInt(this.bits.get(wordIndex))) < HugeAtomicBitSet.NUM_BITS) {
        return false;
      }
    }
    return this.popCount(BigInt(this.bits.get(this.bits.size() - 1))) >= this.remainder;
  }

  /**
   * Returns the number of bits in the bit set.
   *
   * @returns Total size of the bit set
   */
  public size(): number {
    return this.numBits;
  }

  /**
   * Resets all bits in the bit set.
   * Note: this method is not thread-safe.
   */
  public clear(): void {
    this.bits.setAll(0);
  }

  /**
   * Resets the bit at the given index.
   *
   * @param index Bit index
   */
  public clear(index: number): void {
    console.assert(index < this.numBits, 'Index out of bounds');

    const wordIndex = Math.floor(index / HugeAtomicBitSet.NUM_BITS);
    const bitIndex = index % HugeAtomicBitSet.NUM_BITS;
    const bitmask = ~(1n << BigInt(bitIndex));

    let oldWord = BigInt(this.bits.get(wordIndex));
    while (true) {
      const newWord = oldWord & bitmask;
      if (newWord === oldWord) {
        // already cleared
        return;
      }
      const currentWord = BigInt(this.bits.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }
      // CAS unsuccessful, try again
      oldWord = currentWord;
    }
  }

  /**
   * Helper method to set bits in a word.
   *
   * @param bits The array to modify
   * @param wordIndex Index of the word to modify
   * @param bitMask Mask of bits to set
   */
  private setWord(bits: HugeAtomicLongArray, wordIndex: number, bitMask: number): void {
    let oldWord = BigInt(bits.get(wordIndex));
    while (true) {
      const newWord = oldWord | BigInt(bitMask);
      if (newWord === oldWord) {
        // already set
        return;
      }
      const currentWord = BigInt(bits.compareAndExchange(wordIndex, Number(oldWord), Number(newWord)));
      if (currentWord === oldWord) {
        // CAS successful
        return;
      }
      oldWord = currentWord;
    }
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
