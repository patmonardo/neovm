/**
 * Huge Sparse Short Array - Primitive Short Values with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of primitive short values that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where values actually exist
 *
 * **Perfect For**: Sparse short values (e.g., compressed IDs, small counts, flags)
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of a primitive short array that can
 * contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where short values exist
 * **Default Values**: Returns user-defined default short for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Compressed node IDs, relationship types, small property values
 */
export interface HugeSparseShortArray {
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
   * Get the short value at the given index.
   *
   * **Default Behavior**: Returns the default short if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The short at the index, or default short if unset
   */
  get(index: number): number;

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default short" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a short was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse short collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default short for all indices
   *
   * @returns Iterator over pages (arrays of up to 4096 short values each)
   */
  drainingIterator(): DrainingIterator<number[]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default short value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default short returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number): HugeSparseShortArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default short returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number,
    initialCapacity: number
  ): HugeSparseShortArray.Builder;
}

export namespace HugeSparseShortArray {
  /**
   * Thread-safe builder for constructing HugeSparseShortArray instances.
   *
   * **Thread Safety**: Multiple threads can call set/addTo/setIfAbsent concurrently
   * **Dynamic Growth**: Automatically expands capacity as indices are accessed
   * **Build Once**: Call build() to get immutable array
   */
  export interface Builder {
    // ============================================================================
    // VALUE SETTING
    // ============================================================================

    /**
     * Set the short value at the given index.
     *
     * **Overwrites**: Replaces any existing short at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The short to store
     */
    set(index: number, value: number): void;

    /**
     * Set the short value at the given index if and only if no value exists there.
     *
     * **Atomic Operation**: Thread-safe check-and-set
     * **Use Case**: Avoid overwriting existing values in concurrent scenarios
     *
     * @param index The index to conditionally set
     * @param value The short to store if index is unset
     * @returns true if the value was set, false if index already had a value
     */
    setIfAbsent(index: number, value: number): boolean;

    /**
     * Add the given value to the existing short at the index.
     *
     * **Default Handling**: If no value exists, adds to the default value
     * **Thread Safe**: Atomic read-modify-write operation
     * **Use Case**: Accumulating counts, sums, etc. with short precision
     *
     * @param index The index to add to
     * @param value The short to add
     */
    addTo(index: number, value: number): void;

    // ============================================================================
    // FINALIZATION
    // ============================================================================

    /**
     * Build an immutable array from the current builder state.
     *
     * **Immutability**: Resulting array cannot be modified
     * **Builder Reuse**: Builder can continue to be used after build()
     * **Memory Efficiency**: Only allocates pages that contain non-default short values
     *
     * @returns An immutable HugeSparseShortArray
     */
    build(): HugeSparseShortArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseShortArray instances
 */
export class HugeSparseShortArrayFactory {
  /**
   * Create builder with default short value only
   */
  static builder(defaultValue: number): HugeSparseShortArray.Builder;

  /**
   * Create builder with default short value and capacity hint
   */
  static builder(
    defaultValue: number,
    initialCapacity: number
  ): HugeSparseShortArray.Builder;

  static builder(
    defaultValue: number,
    initialCapacity: number = 0
  ): HugeSparseShortArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseShortArraySon.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseShortArraySon.GrowingBuilder"
    );
  }
}
