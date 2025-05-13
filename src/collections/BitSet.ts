/**
 * BitSet implementation similar to carrotsearch.hppc.BitSet.
 * Fast and memory-efficient set of bits.
 */
export class BitSet {
  /** Number of bits per word */
  private static readonly BITS_PER_WORD = 32;

  /** Word mask */
  private static readonly WORD_MASK = 0xffffffff;

  /** The bits in this set */
  private bits: Uint32Array;

  /** The current word count */
  private wordCount: number;

  /**
   * Create a new BitSet with the given initial capacity.
   *
   * @param initialCapacity Initial capacity in bits
   */
  constructor(initialCapacity: number = 16) {
    const initialWordCount = Math.max(1, Math.ceil(initialCapacity / BitSet.BITS_PER_WORD));
    this.bits = new Uint32Array(initialWordCount);
    this.wordCount = 0;
  }

  /**
   * Sets the bit at the specified index.
   *
   * @param index The index of the bit
   * @returns This BitSet
   */
  set(index: number): BitSet {
    const wordIndex = index >>> 5; // Divide by 32
    this.ensureCapacity(wordIndex);

    this.bits[wordIndex] |= 1 << (index & 31); // index % 32

    if (wordIndex >= this.wordCount) {
      this.wordCount = wordIndex + 1;
    }

    return this;
  }

  /**
   * Clears the bit at the specified index.
   *
   * @param index The index of the bit
   * @returns This BitSet
   */
  clear(index: number): BitSet {
    const wordIndex = index >>> 5;
    if (wordIndex < this.wordCount) {
      this.bits[wordIndex] &= ~(1 << (index & 31));
    }
    return this;
  }

  /**
   * Clears all bits in this set.
   *
   * @returns This BitSet
   */
  clearAll(): BitSet {
    this.bits.fill(0);
    this.wordCount = 0;
    return this;
  }

  /**
   * Returns the value of the bit at the specified index.
   *
   * @param index The index of the bit
   * @returns True if the bit is set, false otherwise
   */
  get(index: number): boolean {
    const wordIndex = index >>> 5;
    return wordIndex < this.wordCount &&
      (this.bits[wordIndex] & (1 << (index & 31))) !== 0;
  }

  /**
   * Returns the number of bits set to true.
   */
  cardinality(): number {
    let sum = 0;
    for (let i = 0; i < this.wordCount; i++) {
      sum += BitSet.bitCount(this.bits[i]);
    }
    return sum;
  }

  /**
   * Returns the index of the first bit that is set to true
   * that occurs on or after the specified index.
   *
   * @param fromIndex The index to start checking from
   * @returns The index of the next set bit, or -1 if no such bit exists
   */
  nextSetBit(fromIndex: number): number {
    let wordIndex = fromIndex >>> 5;
    if (wordIndex >= this.wordCount) return -1;

    // Check if there are any bits set in the current word at or after fromIndex
    let word = this.bits[wordIndex] & (BitSet.WORD_MASK << (fromIndex & 31));

    while (true) {
      if (word !== 0) {
        return (wordIndex * BitSet.BITS_PER_WORD) + BitSet.numberOfTrailingZeros(word);
      }
      if (++wordIndex >= this.wordCount) return -1;
      word = this.bits[wordIndex];
    }
  }

  /**
   * Performs an OR operation with the specified BitSet.
   *
   * @param other The other BitSet
   * @returns This BitSet
   */
  or(other: BitSet): BitSet {
    const minWords = Math.min(this.wordCount, other.wordCount);
    for (let i = 0; i < minWords; i++) {
      this.bits[i] |= other.bits[i];
    }

    if (other.wordCount > this.wordCount) {
      this.ensureCapacity(other.wordCount - 1);
      for (let i = minWords; i < other.wordCount; i++) {
        this.bits[i] = other.bits[i];
      }
      this.wordCount = other.wordCount;
    }

    return this;
  }

  /**
   * Creates a new BitSet that is a clone of this BitSet.
   */
  clone(): BitSet {
    const result = new BitSet(this.wordCount * BitSet.BITS_PER_WORD);
    result.wordCount = this.wordCount;
    for (let i = 0; i < this.wordCount; i++) {
      result.bits[i] = this.bits[i];
    }
    return result;
  }

  /**
   * Counts the number of bits set in a 32-bit integer.
   */
  private static bitCount(i: number): number {
    i = i - ((i >>> 1) & 0x55555555);
    i = (i & 0x33333333) + ((i >>> 2) & 0x33333333);
    i = (i + (i >>> 4)) & 0x0f0f0f0f;
    i = i + (i >>> 8);
    i = i + (i >>> 16);
    return i & 0x3f;
  }

  /**
   * Returns the number of trailing zeros in a 32-bit integer.
   */
  private static numberOfTrailingZeros(i: number): number {
    if (i === 0) return 32;
    let n = 31;
    let y = i << 16; if (y !== 0) { n -= 16; i = y; }
    y = i << 8; if (y !== 0) { n -= 8; i = y; }
    y = i << 4; if (y !== 0) { n -= 4; i = y; }
    y = i << 2; if (y !== 0) { n -= 2; i = y; }
    return n - ((i << 1) >>> 31);
  }

  /**
   * Ensures capacity for the given word index.
   */
  private ensureCapacity(wordIndex: number): void {
    if (wordIndex >= this.bits.length) {
      let newCapacity = Math.max(
        this.bits.length * 2,
        wordIndex + 1
      );
      const newBits = new Uint32Array(newCapacity);
      newBits.set(this.bits);
      this.bits = newBits;
    }
  }
}
