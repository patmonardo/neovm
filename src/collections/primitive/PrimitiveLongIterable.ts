import { PrimitiveIterator } from "./PrimitiveIterator";

/**
 * An iterable over primitive long values (represented as numbers in JavaScript)
 */
export interface PrimitiveLongIterable {
  /**
   * Returns an iterator over the elements in this collection
   */
  iterator(): PrimitiveIterator.OfLong;
}

/**
 * Utility methods for working with PrimitiveLongIterable instances
 */
export namespace PrimitiveLongIterable {
  /**
   * A specialized iterator for primitive "long" values (represented as numbers in NeoVM).
   * Aims to be compatible with Java's PrimitiveIterator.OfLong and also function
   * as a standard JavaScript Iterator<number>.
   */

}
