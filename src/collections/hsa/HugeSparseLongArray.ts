/**
 * Huge Sparse Long Array - Massive Sparse Array with Paging
 *
 * **The Design**: Long-indexable primitive array that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where values actually exist
 *
 * **Perfect For**: Sparse node/relationship mappings in massive graphs
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of a primitive long array that can
 * contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where values exist
 * **Default Values**: Returns user-defined default for unset indices
 * **Immutability**: Built once, then read-only access
 */
export interface HugeSparseLongArray {
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
   * Get the value at the given index.
   *
   * **Default Behavior**: Returns the default value if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The value at the index, or default value if unset
   */
  get(index: number): number;

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default value" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a value was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse arrays
   *
   * **⚠️ WARNING**: After iteration, get() returns default value for all indices
   *
   * @returns Iterator over pages (arrays of up to 4096 elements each)
   */
  drainingIterator(): DrainingIterator<number[]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Value returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number): HugeSparseLongArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Value returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number,
    initialCapacity: number
  ): HugeSparseLongArray.Builder;
}

export namespace HugeSparseLongArray {
  /**
   * Thread-safe builder for constructing HugeSparseLongArray instances.
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
     * Set the value at the given index.
     *
     * **Overwrites**: Replaces any existing value at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The value to store
     */
    set(index: number, value: number): void;

    /**
     * Set the value at the given index if and only if no value exists there.
     *
     * **Atomic Operation**: Thread-safe check-and-set
     * **Use Case**: Avoid overwriting existing values in concurrent scenarios
     *
     * @param index The index to conditionally set
     * @param value The value to store if index is unset
     * @returns true if the value was set, false if index already had a value
     */
    setIfAbsent(index: number, value: number): boolean;

    /**
     * Add the given value to the existing value at the index.
     *
     * **Default Handling**: If no value exists, adds to the default value
     * **Thread Safe**: Atomic read-modify-write operation
     * **Use Case**: Accumulating counts, sums, etc.
     *
     * @param index The index to add to
     * @param value The value to add
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
     * **Memory Efficiency**: Only allocates pages that contain non-default values
     *
     * @returns An immutable HugeSparseLongArray
     */
    build(): HugeSparseLongArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseLongArray instances
 */
export class HugeSparseLongArrayFactory {
  /**
   * Create builder with default value only
   */
  static builder(defaultValue: number): HugeSparseLongArray.Builder;

  /**
   * Create builder with default value and capacity hint
   */
  static builder(
    defaultValue: number,
    initialCapacity: number
  ): HugeSparseLongArray.Builder;

  static builder(
    defaultValue: number,
    initialCapacity: number = 0
  ): HugeSparseLongArray.Builder {
    // Import the actual implementation when we have it
    // return new HugeSparseLongArrayImpl.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to HugeSparseLongArrayImpl.GrowingBuilder"
    );
  }
}
