/**
 * Huge Sparse Double Array Array - Array of Double Arrays with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of double[] arrays that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where arrays actually exist
 *
 * **Perfect For**: Sparse collections of double arrays (e.g., high-precision feature vectors, scientific data)
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of an array of primitive double arrays (double[][])
 * that can contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where double[] values exist
 * **Default Values**: Returns user-defined default double[] for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Collections of high-precision feature vectors, scientific datasets, ML embeddings
 */
export interface HugeSparseDoubleArrayArray {
  // ============================================================================
  // CORE ACCESS
  // ============================================================================

  /**
   * Get the maximum number of values that can be stored.
   *
   * @returns The capacity of this array
   */
  capacity(): number;

  /**
   * Get the double[] value at the given index.
   *
   * **Default Behavior**: Returns the default double[] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The double[] at the index, or default double[] if unset
   */
  get(index: number): number[];

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default double[]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a double[] was explicitly set at this index
   */
  contains(index: number): boolean;

  // ============================================================================
  // ITERATION & DRAINING
  // ============================================================================

  /**
   * Returns an iterator that consumes the underlying pages.
   *
   * **Draining Behavior**: Once consumed, the array becomes empty
   * **Memory Recovery**: Allows GC to reclaim page memory as iteration proceeds
   * **Use Case**: One-time processing of large sparse double[][] collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default double[] for all indices
   *
   * @returns Iterator over pages (arrays of double[][] - pages of double arrays)
   */
  drainingIterator(): DrainingIterator<number[][]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default double[] value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default double[] returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number[]): HugeSparseDoubleArrayArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default double[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseDoubleArrayArray.Builder;
}

export namespace HugeSparseDoubleArrayArray {
  /**
   * Thread-safe builder for constructing HugeSparseDoubleArrayArray instances.
   *
   * **Thread Safety**: Multiple threads can call set concurrently
   * **Dynamic Growth**: Automatically expands capacity as indices are accessed
   * **Build Once**: Call build() to get immutable array
   */
  export interface Builder {
    // ============================================================================
    // VALUE SETTING
    // ============================================================================

    /**
     * Set the double[] value at the given index.
     *
     * **Overwrites**: Replaces any existing double[] at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The double[] to store
     */
    set(index: number, value: number[]): void;

    // ============================================================================
    // FINALIZATION
    // ============================================================================

    /**
     * Build an immutable array from the current builder state.
     *
     * **Immutability**: Resulting array cannot be modified
     * **Builder Reuse**: Builder can continue to be used after build()
     * **Memory Efficiency**: Only allocates pages that contain non-default double[] values
     *
     * @returns An immutable HugeSparseDoubleArrayArray
     */
    build(): HugeSparseDoubleArrayArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseDoubleArrayArray instances
 */
export class HugeSparseDoubleArrayArrayFactory {
  /**
   * Create builder with default double[] value only
   */
  static builder(defaultValue: number[]): HugeSparseDoubleArrayArray.Builder;

  /**
   * Create builder with default double[] value and capacity hint
   */
  static builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseDoubleArrayArray.Builder;

  static builder(
    defaultValue: number[],
    initialCapacity: number = 0
  ): HugeSparseDoubleArrayArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseDoubleArrayArraySon.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseDoubleArrayArraySon.GrowingBuilder"
    );
  }
}
