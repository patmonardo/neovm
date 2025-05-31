/**
 * Huge Sparse Long List - Mutable Long List with Sparse Allocation
 *
 * **The Pattern**: Long-indexable mutable list of primitive long values
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Mutability**: Can be modified after creation (unlike HSA which builds once)
 * **Memory Efficiency**: Only allocates pages where values actually exist
 *
 * **Perfect For**: Dynamic sparse long collections that grow and change over time
 */

import { DrainingIterator } from '../DrainingIterator';
import { LongLongConsumer } from './LongLongConsumer';

/**
 * A long-indexable version of a primitive long list that can
 * contain more than 2 billion elements and is growable.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where long values exist
 * **Default Values**: Returns user-defined default long for unset indices
 * **Mutability**: Can be modified after creation (set/setIfAbsent/addTo)
 * **Thread Safety**: NOT thread-safe (unlike HSA builders)
 *
 * **Use Case**: Dynamic sparse long collections, growable lists, mutable data
 */
export interface HugeSparseLongList {

  // ============================================================================
  // FACTORY METHODS (Simple Factory Pattern)
  // ============================================================================

  /**
   * Create a sparse long list with default value.
   *
   * **Simple Factory**: Direct creation without builder complexity
   * **Mutable**: Can be modified after creation
   *
   * @param defaultValue Default long returned for unset indices
   * @returns A new mutable sparse long list
   */
   of(defaultValue: number): HugeSparseLongList;

  /**
   * Create a sparse long list with default value and initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default long returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new mutable sparse long list
   */
   of(defaultValue: number, initialCapacity: number): HugeSparseLongList;

  // ============================================================================
  // CORE ACCESS
  // ============================================================================

  /**
   * Get the current maximum number of values that can be stored.
   *
   * **Dynamic Capacity**: Can grow as values are added
   *
   * @returns The current capacity of this list
   */
  capacity(): number;

  /**
   * Check if a value has been explicitly set at the given index.
   *
   * **Use Case**: Distinguish between "default value" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a long was explicitly set at this index
   */
  contains(index: number): boolean;

  /**
   * Get the long value at the given index.
   *
   * **Default Behavior**: Returns the default long if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The long at the index, or default long if unset
   */
  get(index: number): number;

  // ============================================================================
  // MUTATION OPERATIONS
  // ============================================================================

  /**
   * Set the long value at the given index.
   *
   * **Overwrites**: Replaces any existing long at this index
   * **Dynamic Growth**: Expands capacity if index exceeds current capacity
   * **⚠️ NOT Thread Safe**: Concurrent modifications not supported
   *
   * @param index The index to set
   * @param value The long to store
   */
  set(index: number, value: number): void;

  /**
   * Set the long value at the given index if and only if no value exists there.
   *
   * **Conditional Set**: Only sets if index is currently unset
   * **Use Case**: Avoid overwriting existing values
   * **⚠️ NOT Thread Safe**: Race conditions possible in concurrent use
   *
   * @param index The index to conditionally set
   * @param value The long to store if index is unset
   * @returns true if the value was set, false if index already had a value
   */
  setIfAbsent(index: number, value: number): boolean;

  /**
   * Add the given value to the existing long at the index.
   *
   * **Default Handling**: If no value exists, adds to the default value
   * **Use Case**: Accumulating counts, sums, etc. with long precision
   * **⚠️ NOT Thread Safe**: Race conditions possible in concurrent use
   *
   * @param index The index to add to
   * @param value The long to add
   */
  addTo(index: number, value: number): void;

  // ============================================================================
  // ITERATION & PROCESSING
  // ============================================================================

  /**
   * Apply the given consumer to all non-default values stored in the list.
   *
   * **Sparse Iteration**: Only visits indices that have been explicitly set
   * **Callback Pattern**: Functional-style processing of sparse data
   *
   * @param consumer Callback function receiving (index, value) pairs
   */
  forAll(consumer: LongLongConsumer): void;

  /**
   * Returns an iterator that consumes the underlying pages.
   *
   * **Draining Behavior**: Once consumed, the list becomes empty
   * **Memory Recovery**: Allows GC to reclaim page memory as iteration proceeds
   * **Use Case**: One-time processing of large sparse lists
   *
   * **⚠️ WARNING**: After iteration, get() returns default value for all indices
   *
   * @returns Iterator over pages (arrays of up to 4096 long values each)
   */
  drainingIterator(): DrainingIterator<number[]>;

  /**
   * Returns a stream of the underlying data.
   *
   * **Page-Based Streaming**: Streams over full pages, may contain default values
   * **Sparse Optimization**: Skips null/unallocated pages entirely
   * **Use Case**: Functional processing of sparse list data
   *
   * @returns Stream of long values from allocated pages
   */
  stream(): IterableIterator<number>;
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseLongList instances
 */
export class HugeSparseLongListFactory {

  /**
   * Create list with default value only
   */
  static of(defaultValue: number): HugeSparseLongList;

  /**
   * Create list with default value and capacity hint
   */
  static of(defaultValue: number, initialCapacity: number): HugeSparseLongList;

  static of(defaultValue: number, initialCapacity: number = 0): HugeSparseLongList {
    // Will delegate to generated implementation
    // return new HugeSparseLongListSon(defaultValue, initialCapacity);
    throw new Error('Implementation pending - will delegate to generated HugeSparseLongListSon');
  }
}
