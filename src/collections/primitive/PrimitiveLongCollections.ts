import { PrimitiveIterator } from "./PrimitiveIterator";

/**
 * Error thrown when attempting to access an element that doesn't exist
 */
export class NoSuchElementException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoSuchElementException";
    Object.setPrototypeOf(this, NoSuchElementException.prototype);
  }
}

/**
 * Basic and common primitive long collection utils and manipulations.
 * This namespace groups static utility methods and related iterator classes,
 * mirroring the structure of Java's PrimitiveLongCollections utility class.
 */
export namespace PrimitiveLongCollections {
  /**
   * Creates an iterator that produces values in the range [start, end], inclusive.
   *
   * @param start The starting value (inclusive)
   * @param end The ending value (inclusive)
   * @returns An iterator over the specified range, conforming to PrimitiveIterator.OfLong
   */
  export function range(start: number, end: number): PrimitiveIterator.OfLong {
    return new PrimitiveLongRangeIterator(start, end);
  }

  /**
   * Base iterator for simpler implementations of PrimitiveIterator.OfLong.
   * Directly mirrors Java's org.neo4j.gds.collections.primitive.PrimitiveLongCollections.PrimitiveLongBaseIterator
   */
  export abstract class PrimitiveLongBaseIterator implements PrimitiveIterator.OfLong {
    private hasNextDecided: boolean = false;
    private hasNextFlag: boolean = false; // Corresponds to Java's 'private boolean hasNext'
    protected nextValue: number = 0; // Corresponds to Java's 'protected long next'

    public hasNext(): boolean {
      if (!this.hasNextDecided) {
        this.hasNextFlag = this.fetchNext();
        this.hasNextDecided = true;
      }
      return this.hasNextFlag;
    }

    public nextLong(): number {
      if (!this.hasNext()) {
        // This calls the hasNext() above, which handles fetchNext()
        throw new NoSuchElementException(
          `No more elements in ${this.constructor.name}`
        );
      }
      this.hasNextDecided = false; // Reset for the next call to hasNext()
      return this.nextValue; // Return the value populated by fetchNext() (via its call to storeNextValue())
    }

    /**
     * Standard JavaScript iterator method, required by PrimitiveIterator.OfLong.
     */
    public next(): IteratorResult<number, undefined> {
      if (this.hasNext()) {
        // Call nextLong() to get the value and ensure internal state (like hasNextDecided) is updated
        return { value: this.nextLong(), done: false };
      } else {
        return { value: undefined, done: true };
      }
    }

    [Symbol.iterator](): Iterator<number> {
      return this;
    }

    /**
     * Fetches the next item in this iterator. Returns whether or not a next item was found.
     * If a next item was found, that value must have been set inside the implementation of this method
     * using {@link #storeNextValueAndReturnTrue(number)}.
     */
    protected abstract fetchNext(): boolean;

    /**
     * Called from inside an implementation of {@link #fetchNext()} if a next item was found.
     * This method stores the next item and sets the internal hasNextFlag.
     * Corresponds to Java's 'protected boolean next(long nextItem)'.
     *
     * @param item the next item found.
     * @returns true, for convenience in conditional expressions within fetchNext.
     */
    protected storeNextValueAndReturnTrue(item: number): boolean {
      this.nextValue = item;
      this.hasNextFlag = true; // This is crucial, mirroring the Java version's 'this.hasNext = true'
      return true;
    }
  }

  /**
   * An iterator that produces values in the range [start, end], inclusive.
   * Extends PrimitiveLongBaseIterator.
   * This class is defined within the PrimitiveLongCollections namespace,
   * similar to how it's a static nested class in Java.
   */
  class PrimitiveLongRangeIterator extends PrimitiveLongBaseIterator {
    private current: number;
    private readonly endInclusive: number; // Java's 'end' field

    constructor(start: number, end: number) {
      super();
      this.current = start;
      this.endInclusive = end; // In this GDS iterator, 'end' is inclusive
    }

    protected fetchNext(): boolean {
      const canProceed = this.current <= this.endInclusive;
      try {
        if (canProceed) {
          // Calls the base class's storeNextValueAndReturnTrue, which sets nextValue and hasNextFlag
          return this.storeNextValueAndReturnTrue(this.current);
        }
        return false;
      } finally {
        // The Java version increments 'current' in a finally block.
        // This ensures 'current' advances if it was in a state to be processed.
        if (canProceed) {
          this.current++;
        }
      }
    }
  }
} // End of namespace PrimitiveLongCollections

export namespace PrimitiveLongIterators {
  /**
   * An iterator that produces values from an array.
   */
    export class ArrayPrimitiveLongIterator implements PrimitiveIterator.OfLong {
    private readonly values: number[];
    private index: number = 0;

    constructor(values: number[]) {
      this.values = values;
    }

    public hasNext(): boolean {
      return this.index < this.values.length;
    }

    public nextLong(): number {
      if (!this.hasNext()) {
        throw new NoSuchElementException("No more elements in ArrayPrimitiveLongIterator");
      }
      return this.values[this.index++];
    }

    public next(): IteratorResult<number, undefined> {
      if (this.hasNext()) {
        return { value: this.nextLong(), done: false };
      } else {
        return { value: undefined, done: true };
      }
    }

    [Symbol.iterator](): Iterator<number> {
      return this;
    }
  }

  export class EmptyPrimitiveLongIterator implements PrimitiveIterator.OfLong {
    public hasNext(): boolean { return false; }
    public nextLong(): number { throw new NoSuchElementException("Empty iterator"); }
    public next(): IteratorResult<number, undefined> { return { value: undefined, done: true }; }
    [Symbol.iterator](): Iterator<number> { return this; }
  }

  export class SinglePrimitiveLongIterator implements PrimitiveIterator.OfLong {
    private value: number;
    private consumed: boolean = false;
    constructor(value: number) { this.value = value; }
    public hasNext(): boolean { return !this.consumed; }
    public nextLong(): number {
      if (this.consumed) throw new NoSuchElementException("Single iterator consumed");
      this.consumed = true;
      return this.value;
    }
    public next(): IteratorResult<number, undefined> {
      if (!this.consumed) {
        this.consumed = true;
        return { value: this.value, done: false };
      }
      return { value: undefined, done: true };
    }
    [Symbol.iterator](): Iterator<number> { return this; }
  }

  export function of(...values: number[]): PrimitiveIterator.OfLong {
    return new ArrayPrimitiveLongIterator(values);
  }
  export function empty(): PrimitiveIterator.OfLong {
    return new EmptyPrimitiveLongIterator();
  }
  export function single(value: number): PrimitiveIterator.OfLong {
    return new SinglePrimitiveLongIterator(value);
  }
   export function toArray(iterator: PrimitiveIterator.OfLong): number[] {
    const result: number[] = [];
    while (iterator.hasNext()) {
      result.push(iterator.nextLong());
    }
    return result;
  }
  export function count(iterator: PrimitiveIterator.OfLong): number {
    let count = 0;
    while (iterator.hasNext()) {
      iterator.nextLong();
      count++;
    }
    return count;
  }
}
