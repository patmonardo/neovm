/**
 * Huge Sparse Short Array Array - Array of Short Arrays with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of short[] arrays that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where arrays actually exist
 *
 * **Perfect For**: Sparse collections of short arrays (e.g., compressed adjacency data)
 */

import { DrainingIterator } from '../DrainingIterator';

/**
 * A long-indexable version of an array of primitive short arrays (short[][])
 * that can contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where short[] values exist
 * **Default Values**: Returns user-defined default short[] for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Collections of compressed adjacency lists, relationship data, etc.
 */
export interface HugeSparseShortArrayArray {

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
   * Get the short[] value at the given index.
   *
   * **Default Behavior**: Returns the default short[] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The short[] at the index, or default short[] if unset
   */
  get(index: number): number[];

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default short[]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a short[] was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse short[][] collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default short[] for all indices
   *
   * @returns Iterator over pages (arrays of short[][] - pages of short arrays)
   */
  drainingIterator(): DrainingIterator<number[][]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default short[] value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default short[] returned for unset indices
   * @returns A new builder instance
   */
   builder(defaultValue: number[]): HugeSparseShortArrayArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default short[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
   builder(defaultValue: number[], initialCapacity: number): HugeSparseShortArrayArray.Builder;
}

export namespace HugeSparseShortArrayArray {

  /**
   * Thread-safe builder for constructing HugeSparseShortArrayArray instances.
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
     * Set the short[] value at the given index.
     *
     * **Overwrites**: Replaces any existing short[] at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The short[] to store
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
     * **Memory Efficiency**: Only allocates pages that contain non-default short[] values
     *
     * @returns An immutable HugeSparseShortArrayArray
     */
    build(): HugeSparseShortArrayArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseShortArrayArray instances
 */
export class HugeSparseShortArrayArrayFactory {

  /**
   * Create builder with default short[] value only
   */
  static builder(defaultValue: number[]): HugeSparseShortArrayArray.Builder;

  /**
   * Create builder with default short[] value and capacity hint
   */
  static builder(defaultValue: number[], initialCapacity: number): HugeSparseShortArrayArray.Builder;

  static builder(defaultValue: number[], initialCapacity: number = 0): HugeSparseShortArrayArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseShortArrayArrayImpl.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error('Implementation pending - will delegate to generated HugeSparseShortArrayArrayImpl.GrowingBuilder');
  }
}
