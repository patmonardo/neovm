/**
 * Huge Sparse Float Array Array - Array of Float Arrays with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of float[] arrays that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where arrays actually exist
 *
 * **Perfect For**: Sparse collections of float arrays (e.g., multi-dimensional weights, feature vectors)
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of an array of primitive float arrays (float[][])
 * that can contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where float[] values exist
 * **Default Values**: Returns user-defined default float[] for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Collections of feature vectors, multi-dimensional weights, sparse float data
 */
export interface HugeSparseFloatArrayArray {
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
   * Get the float[] value at the given index.
   *
   * **Default Behavior**: Returns the default float[] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The float[] at the index, or default float[] if unset
   */
  get(index: number): number[];

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default float[]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a float[] was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse float[][] collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default float[] for all indices
   *
   * @returns Iterator over pages (arrays of float[][] - pages of float arrays)
   */
  drainingIterator(): DrainingIterator<number[][]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default float[] value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default float[] returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number[]): HugeSparseFloatArrayArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default float[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseFloatArrayArray.Builder;
}

export namespace HugeSparseFloatArrayArray {
  /**
   * Thread-safe builder for constructing HugeSparseFloatArrayArray instances.
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
     * Set the float[] value at the given index.
     *
     * **Overwrites**: Replaces any existing float[] at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The float[] to store
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
     * **Memory Efficiency**: Only allocates pages that contain non-default float[] values
     *
     * @returns An immutable HugeSparseFloatArrayArray
     */
    build(): HugeSparseFloatArrayArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseFloatArrayArray instances
 */
export class HugeSparseFloatArrayArrayFactory {
  /**
   * Create builder with default float[] value only
   */
  static builder(defaultValue: number[]): HugeSparseFloatArrayArray.Builder;

  /**
   * Create builder with default float[] value and capacity hint
   */
  static builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseFloatArrayArray.Builder;

  static builder(
    defaultValue: number[],
    initialCapacity: number = 0
  ): HugeSparseFloatArrayArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseFloatArrayArraySon.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseFloatArrayArraySon.GrowingBuilder"
    );
  }
}
