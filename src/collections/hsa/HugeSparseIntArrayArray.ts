/**
 * Huge Sparse Int Array Array - Array of Int Arrays with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of int[] arrays that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where arrays actually exist
 *
 * **Perfect For**: Sparse collections of int arrays (e.g., multi-property data, algorithm results)
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of an array of primitive int arrays (int[][])
 * that can contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where int[] values exist
 * **Default Values**: Returns user-defined default int[] for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Collections of multi-property arrays, algorithm result sets, etc.
 */
export interface HugeSparseIntArrayArray {
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
   * Get the int[] value at the given index.
   *
   * **Default Behavior**: Returns the default int[] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The int[] at the index, or default int[] if unset
   */
  get(index: number): number[];

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default int[]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if an int[] was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse int[][] collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default int[] for all indices
   *
   * @returns Iterator over pages (arrays of int[][] - pages of int arrays)
   */
  drainingIterator(): DrainingIterator<number[][]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default int[] value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default int[] returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number[]): HugeSparseIntArrayArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default int[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseIntArrayArray.Builder;
}

export namespace HugeSparseIntArrayArray {
  /**
   * Thread-safe builder for constructing HugeSparseIntArrayArray instances.
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
     * Set the int[] value at the given index.
     *
     * **Overwrites**: Replaces any existing int[] at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The int[] to store
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
     * **Memory Efficiency**: Only allocates pages that contain non-default int[] values
     *
     * @returns An immutable HugeSparseIntArrayArray
     */
    build(): HugeSparseIntArrayArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseIntArrayArray instances
 */
export class HugeSparseIntArrayArrayFactory {
  /**
   * Create builder with default int[] value only
   */
  static builder(defaultValue: number[]): HugeSparseIntArrayArray.Builder;

  /**
   * Create builder with default int[] value and capacity hint
   */
  static builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseIntArrayArray.Builder;

  static builder(
    defaultValue: number[],
    initialCapacity: number = 0
  ): HugeSparseIntArrayArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseIntArrayArraySon.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseIntArrayArraySon.GrowingBuilder"
    );
  }
}
