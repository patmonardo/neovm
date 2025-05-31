/**
 * Huge Sparse Byte Array Array List - Mutable Byte[][] List with Sparse Allocation
 *
 * **The Pattern**: Long-indexable mutable list of byte[][] arrays (triple dimension!)
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Mutability**: Can be modified after creation (unlike HSA which builds once)
 * **Memory Efficiency**: Only allocates pages where byte[][] arrays actually exist
 *
 * **Perfect For**: Dynamic sparse collections of 2D byte arrays (binary matrices, image data, etc.)
 */

import { HugeSparseObjectArrayList } from './HugeSparseObjectArrayList';
import { LongByteArrayArrayConsumer } from './LongByteArrayArrayConsumer';

/**
 * A long-indexable version of a list of byte array arrays (byte[][][]) that can
 * contain more than 2 billion elements and is growable.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where byte[][] values exist
 * **Default Values**: Returns user-defined default byte[][] for unset indices
 * **Mutability**: Can be modified after creation (set operations)
 * **Thread Safety**: NOT thread-safe (unlike HSA builders)
 *
 * **Use Case**: Dynamic sparse collections of 2D byte arrays, binary matrices, image grids
 */
export interface HugeSparseByteArrayArrayList extends HugeSparseObjectArrayList<number[][], LongByteArrayArrayConsumer> {

  // ============================================================================
  // FACTORY METHODS (Simple Factory Pattern)
  // ============================================================================

  /**
   * Create a sparse byte array array list with default value.
   *
   * **Simple Factory**: Direct creation without builder complexity
   * **Mutable**: Can be modified after creation
   *
   * @param defaultValue Default byte[][] returned for unset indices
   * @returns A new mutable sparse byte array array list
   */
   of(defaultValue: number[][]): HugeSparseByteArrayArrayList;

  /**
   * Create a sparse byte array array list with default value and initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default byte[][] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new mutable sparse byte array array list
   */
   of(defaultValue: number[][], initialCapacity: number): HugeSparseByteArrayArrayList;
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseByteArrayArrayList instances
 */
export class HugeSparseByteArrayArrayListFactory {

  /**
   * Create list with default byte[][] value only
   */
  static of(defaultValue: number[][]): HugeSparseByteArrayArrayList;

  /**
   * Create list with default byte[][] value and capacity hint
   */
  static of(defaultValue: number[][], initialCapacity: number): HugeSparseByteArrayArrayList;

  static of(defaultValue: number[][], initialCapacity: number = 0): HugeSparseByteArrayArrayList {
    // Will delegate to generated implementation
    // return new HugeSparseByteArrayArrayListSon(defaultValue, initialCapacity);
    throw new Error('Implementation pending - will delegate to generated HugeSparseByteArrayArrayListSon');
  }
}
