import { BitSet } from '../../collections/BitSet';

/**
 * An iterable over the set bits in a {@link BitSet}.
 */
export class SetBitsIterable implements Iterable<number> {
  private readonly set: BitSet;
  private readonly offset: number;

  /**
   * Creates a new iterable over the set bits in a bit set.
   *
   * @param set The bit set to iterate over
   * @param offset Starting offset for iteration
   */
  constructor(set: BitSet, offset: number = 0) {
    this.set = set;
    this.offset = offset;
  }

  /**
   * Returns an iterator over the set bits.
   *
   * @returns Iterator for the set bits
   */
  public [Symbol.iterator](): Iterator<number> {
    return new SetBitsIterator(this.set, this.offset);
  }

  /**
   * Returns an async iterable that can be used in for-await-of loops.
   *
   * @returns Async iterable for the set bits
   */
  public stream(): AsyncIterable<number> {
    const iterator = this[Symbol.iterator]();

    return {
      [Symbol.asyncIterator](): AsyncIterator<number> {
        return {
          next(): Promise<IteratorResult<number>> {
            const result = iterator.next();
            return Promise.resolve(result);
          }
        };
      }
    };
  }

  /**
   * Creates an array containing all the set bits.
   *
   * @returns Array of set bit indices
   */
  public toArray(): number[] {
    return Array.from(this);
  }

  /**
   * Returns the number of set bits.
   *
   * @returns Count of set bits
   */
  public size(): number {
    return this.set.cardinality();
  }
}

/**
 * Iterator implementation for set bits.
 */
class SetBitsIterator implements Iterator<number> {
  private readonly set: BitSet;
  private value: number;

  /**
   * Creates a new iterator for set bits.
   *
   * @param set The bit set to iterate over
   * @param index Starting position
   */
  constructor(set: BitSet, index: number) {
    this.set = set;
    this.value = set.nextSetBit(index);
  }

  /**
   * Checks if there are more bits to iterate over.
   *
   * @returns true if there are more bits
   */
  public hasNext(): boolean {
    return this.value > -1;
  }

  /**
   * Gets the next value in the iteration.
   *
   * @returns Iterator result with the next value
   */
  public next(): IteratorResult<number> {
    if (!this.hasNext()) {
      return { done: true, value: undefined as any };
    }

    const returnValue = this.value;
    this.value = this.set.nextSetBit(this.value + 1);

    return { done: false, value: returnValue };
  }
}
