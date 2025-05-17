
export namespace PrimitiveIterator {

  export interface OfLong extends Iterator<number> {
    // Extend the standard JavaScript Iterator
    /**
     * Returns true if the iteration has more elements.
     * This is a common helper, though standard Iterator relies on `next().done`.
     *
     * @returns true if the iteration has more elements
     */
    hasNext(): boolean;

    /**
     * Returns the next long value (as number) in the iteration.
     *
     * @returns the next long value (as number)
     * @throws Error if no more elements exist (e.g., if hasNext() is false)
     */
    nextLong(): number;

    /**
     * Standard JavaScript iterator method.
     *
     * @returns An IteratorResult object containing the next value and a done flag.
     */
    next(): IteratorResult<number, undefined>; // TReturn is undefined as we don't have a final return value

    [Symbol.iterator](): Iterator<number>;
  }
}
