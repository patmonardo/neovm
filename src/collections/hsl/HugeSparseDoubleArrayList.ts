/**
 * Huge Sparse Double Array List - Mutable Double[] List with Sparse Allocation
 *
 * **The Pattern**: Long-indexable mutable list of double[] arrays
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Mutability**: Can be modified after creation (unlike HSA which builds once)
 * **Memory Efficiency**: Only allocates pages where double[] arrays actually exist
 *
 * **Perfect For**: Dynamic sparse collections of double arrays (high-precision feature vectors, scientific data)
 */

import { HugeSparseObjectArrayList } from "./HugeSparseObjectArrayList";
import { LongDoubleArrayConsumer } from "./LongDoubleArrayConsumer";

/**
 * A long-indexable version of a list of double arrays that can
 * contain more than 2 billion elements and is growable.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where double[] values exist
 * **Default Values**: Returns user-defined default double[] for unset indices
 * **Mutability**: Can be modified after creation (set operations)
 * **Thread Safety**: NOT thread-safe (unlike HSA builders)
 *
 * **Use Case**: Dynamic sparse collections of double arrays, high-precision feature vectors, scientific datasets
 */
export interface HugeSparseDoubleArrayList
  extends HugeSparseObjectArrayList<number[], LongDoubleArrayConsumer> {
  // ============================================================================
  // FACTORY METHODS (Simple Factory Pattern)
  // ============================================================================

  /**
   * Create a sparse double array list with default value.
   *
   * **Simple Factory**: Direct creation without builder complexity
   * **Mutable**: Can be modified after creation
   *
   * @param defaultValue Default double[] returned for unset indices
   * @returns A new mutable sparse double array list
   */
  of(defaultValue: number[]): HugeSparseDoubleArrayList;

  /**
   * Create a sparse double array list with default value and initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default double[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new mutable sparse double array list
   */
  of(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseDoubleArrayList;
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseDoubleArrayList instances
 */
export class HugeSparseDoubleArrayListFactory {
  /**
   * Create list with default double[] value only
   */
  static of(defaultValue: number[]): HugeSparseDoubleArrayList;

  /**
   * Create list with default double[] value and capacity hint
   */
  static of(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseDoubleArrayList;

  static of(
    defaultValue: number[],
    initialCapacity: number = 0
  ): HugeSparseDoubleArrayList {
    // Will delegate to generated implementation
    // return new HugeSparseDoubleArrayListSon(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseDoubleArrayListSon"
    );
  }
}
