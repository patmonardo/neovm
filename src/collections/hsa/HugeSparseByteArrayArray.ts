/**
 * Huge Sparse Byte Array Array - Array of Byte Arrays with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of byte[] arrays that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where arrays actually exist
 *
 * **Perfect For**: Sparse collections of byte arrays (e.g., compressed data blocks, small buffers)
 */

import { DrainingIterator } from '../DrainingIterator';

/**
 * A long-indexable version of an array of primitive byte arrays (byte[][])
 * that can contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where byte[] values exist
 * **Default Values**: Returns user-defined default byte[] for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Collections of compressed data, small buffers, binary data chunks
 */
export interface HugeSparseByteArrayArray {

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
   * Get the byte[] value at the given index.
   *
   * **Default Behavior**: Returns the default byte[] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The byte[] at the index, or default byte[] if unset
   */
  get(index: number): number[];

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default byte[]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a byte[] was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse byte[][] collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default byte[] for all indices
   *
   * @returns Iterator over pages (arrays of byte[][] - pages of byte arrays)
   */
  drainingIterator(): DrainingIterator<number[][]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default byte[] value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default byte[] returned for unset indices
   * @returns A new builder instance
   */
   builder(defaultValue: number[]): HugeSparseByteArrayArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default byte[] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
}

export namespace HugeSparseByteArrayArray {

  /**
   * Thread-safe builder for constructing HugeSparseByteArrayArray instances.
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
     * Set the byte[] value at the given index.
     *
     * **Overwrites**: Replaces any existing byte[] at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The byte[] to store
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
     * **Memory Efficiency**: Only allocates pages that contain non-default byte[] values
     *
     * @returns An immutable HugeSparseByteArrayArray
     */
    build(): HugeSparseByteArrayArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseByteArrayArray instances
 */
export class HugeSparseByteArrayArrayFactory {

  /**
   * Create builder with default byte[] value only
   */
  static builder(defaultValue: number[]): HugeSparseByteArrayArray.Builder;

  /**
   * Create builder with default byte[] value and capacity hint
   */
  static builder(defaultValue: number[], initialCapacity: number): HugeSparseByteArrayArray.Builder;

  static builder(defaultValue: number[], initialCapacity: number = 0): HugeSparseByteArrayArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseByteArrayArraySon.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error('Implementation pending - will delegate to generated HugeSparseByteArrayArraySon.GrowingBuilder');
  }
}
