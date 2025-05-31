/**
 * Huge Sparse Object Array List - Generic Base Interface for Array-of-Arrays Types
 *
 * **The Pattern**: Common super interface for all non-primitive huge sparse array lists
 * **Purpose**: Convenience interface with warning about performance implications
 * **Generic Parameters**: OBJ (object type), CONSUMER (callback type)
 * **Performance Warning**: Dynamic dispatch - use concrete types for best performance
 *
 * **Perfect For**: Common operations across all array-of-arrays sparse list types
 */

import { DrainingIterator } from '../DrainingIterator';

/**
 * A common super interface for non-primitive huge sparse array lists.
 *
 * **⚠️ PERFORMANCE WARNING**: Using this interface as a reference type will result
 * in dynamic dispatch of its methods that cannot be inlined by the JavaScript engine.
 * It is therefore recommended to reference the individual implementations directly
 * for best performance.
 *
 * **Use Case**: Convenience interface for common operations across array-of-arrays types
 * **Generic Design**: OBJ = array type (byte[], int[], etc.), CONSUMER = callback type
 */
export interface HugeSparseObjectArrayList<OBJ, CONSUMER> {

  // ============================================================================
  // CORE ACCESS
  // ============================================================================

  /**
   * Get the current maximum number of values that can be stored in the list.
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
   * @returns true if a value was explicitly set at this index (not default)
   */
  contains(index: number): boolean;

  /**
   * Get the object array at the given index.
   *
   * **Default Behavior**: Returns the default object if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The object at the index, or default object if unset
   */
  get(index: number): OBJ;

  // ============================================================================
  // MUTATION OPERATIONS
  // ============================================================================

  /**
   * Set the value at the given index.
   *
   * **Overwrites**: Replaces any existing object at this index
   * **Dynamic Growth**: Expands capacity if index exceeds current capacity
   * **⚠️ NOT Thread Safe**: Concurrent modifications not supported
   *
   * @param index The index to set
   * @param value The object to store
   */
  set(index: number, value: OBJ): void;

  // ============================================================================
  // ITERATION & PROCESSING
  // ============================================================================

  /**
   * Apply the given consumer to all non-default values stored in the list.
   *
   * **Sparse Iteration**: Only visits indices that have been explicitly set
   * **Callback Pattern**: Functional-style processing of sparse data
   * **Type Safety**: Consumer type matches the object type
   *
   * @param consumer Callback function receiving (index, object) pairs
   */
  forAll(consumer: CONSUMER): void;

  /**
   * Returns an iterator that consumes the underlying pages of this list.
   *
   * **Draining Behavior**: Once consumed, the list becomes empty
   * **Memory Recovery**: Allows GC to reclaim page memory as iteration proceeds
   * **Use Case**: One-time processing of large sparse lists
   *
   * **⚠️ WARNING**: After iteration, get() returns default value for all indices
   *
   * @returns Iterator over pages (arrays of objects)
   */
  drainingIterator(): DrainingIterator<OBJ[]>;

  /**
   * Returns a stream of the underlying data.
   *
   * **Page-Based Streaming**: Streams over full pages, may contain default values
   * **Sparse Optimization**: Skips null/unallocated pages entirely
   * **Use Case**: Functional processing of sparse list data
   *
   * @returns Stream of objects from allocated pages
   */
  stream(): IterableIterator<OBJ>;
}
