/**
 * Huge Sparse Float Array List - Mutable Float[] List with Sparse Allocation
 *
 * **The Pattern**: Long-indexable mutable list of float[] arrays
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Mutability**: Can be modified after creation (unlike HSA which builds once)
 * **Memory Efficiency**: Only allocates pages where float[] arrays actually exist
 *
 * **Perfect For**: Dynamic sparse collections of float arrays (feature vectors, weights, etc.)
 */

import { HugeSparseObjectArrayList } from "./HugeSparseObjectArrayList";
import { LongFloatArrayConsumer } from "./LongFloatArrayConsumer";

/**
 * A long-indexable version of a list of float arrays (float[][]) that can
 * contain more than 2 billion elements and is growable.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where float[] values exist
 * **Default Values**: Returns user-defined default float[] for unset indices
 * **Mutability**: Can be modified after creation (set operations)
 * **Thread Safety**: NOT thread-safe (unlike HSA builders)
 *
 * **Use Case**: Dynamic sparse collections of float arrays, feature vectors, weight matrices
 */
export interface HugeSparseFloatArrayList
  extends HugeSparseObjectArrayList<number[], LongFloatArrayConsumer> {
  // ============================================================================
  // FACTORY METHODS (Simple Factory Pattern)
  // ============================================================================

  /**
   * Create a sparse float array list with default value.
   *
   * **Simple Factory**: Direct creation without builder complexity
   * **Mutable**: Can be modified after creation
   *
   * @param defaultValue Default float[] returned for unset indices
   * @returns A new mutable sparse float array list
   */
  of(defaultValue: number[]): HugeSparseFloatArrayList;

  /**
   * Create a sparse float array list with default value and initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default float[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new mutable sparse float array list
   */
  of(defaultValue: number[], initialCapacity: number): HugeSparseFloatArrayList;
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseFloatArrayList instances
 */
export class HugeSparseFloatArrayListFactory {
  /**
   * Create list with default float[] value only
   */
  static of(defaultValue: number[]): HugeSparseFloatArrayList;

  /**
   * Create list with default float[] value and capacity hint
   */
  static of(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseFloatArrayList;

  static of(
    defaultValue: number[],
    initialCapacity: number = 0
  ): HugeSparseFloatArrayList {
    // Will delegate to generated implementation
    // return new HugeSparseFloatArrayListSon(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseFloatArrayListSon"
    );
  }
}
