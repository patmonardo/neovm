/**
 * Huge Sparse Long Array Array - Array of Long Arrays with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of long[] arrays that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where arrays actually exist
 *
 * **Perfect For**: Sparse collections of long arrays (e.g., node property arrays, relationship data)
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of an array of primitive long arrays (long[][])
 * that can contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where long[] values exist
 * **Default Values**: Returns user-defined default long[] for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Collections of node property arrays, multi-value relationship data, etc.
 */
export interface HugeSparseLongArrayArray {
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
   * Get the long[] value at the given index.
   *
   * **Default Behavior**: Returns the default long[] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The long[] at the index, or default long[] if unset
   */
  get(index: number): number[];

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default long[]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a long[] was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse long[][] collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default long[] for all indices
   *
   * @returns Iterator over pages (arrays of long[][] - pages of long arrays)
   */
  drainingIterator(): DrainingIterator<number[][]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default long[] value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default long[] returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number[]): HugeSparseLongArrayArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default long[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseLongArrayArray.Builder;
}

export namespace HugeSparseLongArrayArray {
  /**
   * Thread-safe builder for constructing HugeSparseLongArrayArray instances.
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
     * Set the long[] value at the given index.
     *
     * **Overwrites**: Replaces any existing long[] at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The long[] to store
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
     * **Memory Efficiency**: Only allocates pages that contain non-default long[] values
     *
     * @returns An immutable HugeSparseLongArrayArray
     */
    build(): HugeSparseLongArrayArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseLongArrayArray instances
 */
export class HugeSparseLongArrayArrayFactory {
  /**
   * Create builder with default long[] value only
   */
  static builder(defaultValue: number[]): HugeSparseLongArrayArray.Builder;

  /**
   * Create builder with default long[] value and capacity hint
   */
  static builder(
    defaultValue: number[],
    initialCapacity: number
  ): HugeSparseLongArrayArray.Builder;

  static builder(
    defaultValue: number[],
    initialCapacity: number = 0
  ): HugeSparseLongArrayArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseLongArrayArrayImpl.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseLongArrayArrayImpl.GrowingBuilder"
    );
  }
}
