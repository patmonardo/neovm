/**
 * Huge Sparse Int Array - Primitive Int Values with Sparse Allocation
 *
 * **The Pattern**: Long-indexable array of primitive int values that can exceed 2 billion elements
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Immutability**: Built once using thread-safe growing builder
 * **Memory Efficiency**: Only allocates pages where values actually exist
 *
 * **Perfect For**: Sparse int values (e.g., node degrees, property counts, algorithm results)
 */

import { DrainingIterator } from "../DrainingIterator";

/**
 * A long-indexable version of a primitive int array that can
 * contain more than 2 billion elements.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where int values exist
 * **Default Values**: Returns user-defined default int for unset indices
 * **Immutability**: Built once, then read-only access
 *
 * **Use Case**: Node degrees, property counts, algorithm results, sparse integer data
 */
export interface HugeSparseIntArray {
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
   * Get the int value at the given index.
   *
   * **Default Behavior**: Returns the default int if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The int at the index, or default int if unset
   */
  get(index: number): number;

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default int" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if an int was explicitly set at this index
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
   * **Use Case**: One-time processing of large sparse int collections
   *
   * **⚠️ WARNING**: After iteration, get() returns default int for all indices
   *
   * @returns Iterator over pages (arrays of up to 4096 int values each)
   */
  drainingIterator(): DrainingIterator<number[]>;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Create a thread-safe builder with default int value.
   *
   * **Dynamic Growth**: Builder expands capacity as needed
   * **Thread Safety**: Multiple threads can build concurrently
   *
   * @param defaultValue Default int returned for unset indices
   * @returns A new builder instance
   */
  builder(defaultValue: number): HugeSparseIntArray.Builder;

  /**
   * Create a thread-safe builder with initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default int returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new builder instance
   */
  builder(
    defaultValue: number,
    initialCapacity: number
  ): HugeSparseIntArray.Builder;
}

export namespace HugeSparseIntArray {
  /**
   * Thread-safe builder for constructing HugeSparseIntArray instances.
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
     * Set the int value at the given index.
     *
     * **Overwrites**: Replaces any existing int at this index
     * **Thread Safe**: Can be called concurrently from multiple threads
     * **Dynamic Growth**: Expands capacity if index exceeds current capacity
     *
     * @param index The index to set
     * @param value The int to store
     */
    set(index: number, value: number): void;

    /**
     * Set the int value at the given index if and only if no value exists there.
     *
     * **Atomic Operation**: Thread-safe check-and-set
     * **Use Case**: Avoid overwriting existing values in concurrent scenarios
     *
     * @param index The index to conditionally set
     * @param value The int to store if index is unset
     * @returns true if the value was set, false if index already had a value
     */
    setIfAbsent(index: number, value: number): boolean;

    /**
     * Add the given value to the existing int at the index.
     *
     * **Default Handling**: If no value exists, adds to the default value
     * **Thread Safe**: Atomic read-modify-write operation
     * **Use Case**: Accumulating counts, sums, degrees with int precision
     *
     * @param index The index to add to
     * @param value The int to add
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
     * **Memory Efficiency**: Only allocates pages that contain non-default int values
     *
     * @returns An immutable HugeSparseIntArray
     */
    build(): HugeSparseIntArray;
  }
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseIntArray instances
 */
export class HugeSparseIntArrayFactory {
  /**
   * Create builder with default int value only
   */
  static builder(defaultValue: number): HugeSparseIntArray.Builder;

  /**
   * Create builder with default int value and capacity hint
   */
  static builder(
    defaultValue: number,
    initialCapacity: number
  ): HugeSparseIntArray.Builder;

  static builder(
    defaultValue: number,
    initialCapacity: number = 0
  ): HugeSparseIntArray.Builder {
    // Will delegate to generated implementation
    // return new HugeSparseIntArraySon.GrowingBuilder(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseIntArraySon.GrowingBuilder"
    );
  }
}
