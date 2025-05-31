/**
 * Huge Sparse Long Array Array List - Mutable Long[][] List with Sparse Allocation
 *
 * **The Pattern**: Long-indexable mutable list of long[][] arrays (triple dimension!)
 * **Implementation**: Pages of 4096 elements each for sparse value distributions
 * **Mutability**: Can be modified after creation (unlike HSA which builds once)
 * **Memory Efficiency**: Only allocates pages where long[][] arrays actually exist
 *
 * **Perfect For**: Dynamic sparse collections of 2D long arrays (matrices, grids, etc.)
 */

import { DrainingIterator } from "../DrainingIterator";
import { LongLongArrayArrayConsumer } from "./LongLongArrayArrayConsumer";

/**
 * A long-indexable version of a list of long array arrays (long[][][]) that can
 * contain more than 2 billion elements and is growable.
 *
 * **Paging Strategy**: Uses pages of up to 4096 elements each
 * **Sparse Optimization**: Only allocates pages where long[][] values exist
 * **Default Values**: Returns user-defined default long[][] for unset indices
 * **Mutability**: Can be modified after creation (set operations)
 * **Thread Safety**: NOT thread-safe (unlike HSA builders)
 *
 * **Use Case**: Dynamic sparse collections of 2D arrays, matrices, multi-dimensional grids
 */
export interface HugeSparseLongArrayArrayList {
  // ============================================================================
  // FACTORY METHODS (Simple Factory Pattern)
  // ============================================================================

  /**
   * Create a sparse long array array list with default value.
   *
   * **Simple Factory**: Direct creation without builder complexity
   * **Mutable**: Can be modified after creation
   *
   * @param defaultValue Default long[][] returned for unset indices
   * @returns A new mutable sparse long array array list
   */
  of(defaultValue: number[][]): HugeSparseLongArrayArrayList;

  /**
   * Create a sparse long array array list with default value and initial capacity hint.
   *
   * **Performance Optimization**: Pre-allocates for known capacity
   * **Still Dynamic**: Can grow beyond initial capacity if needed
   *
   * @param defaultValue Default long[][] returned for unset indices
   * @param initialCapacity Hint for expected maximum index
   * @returns A new mutable sparse long array array list
   */
  of(
    defaultValue: number[][],
    initialCapacity: number
  ): HugeSparseLongArrayArrayList;

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
   * **Use Case**: Distinguish between "default long[][]" and "explicitly set to default"
   * **Performance**: Faster than checking if get(index) === defaultValue
   *
   * @param index The index to check
   * @returns true if a long[][] was explicitly set at this index
   */
  contains(index: number): boolean;

  /**
   * Get the long[][] value at the given index.
   *
   * **Default Behavior**: Returns the default long[][] if index was never set
   * **Range**: Supports indices up to capacity()
   *
   * @param index The index to retrieve
   * @returns The long[][] at the index, or default long[][] if unset
   */
  get(index: number): number[][];

  // ============================================================================
  // MUTATION OPERATIONS
  // ============================================================================

  /**
   * Set the long[][] value at the given index.
   *
   * **Overwrites**: Replaces any existing long[][] at this index
   * **Dynamic Growth**: Expands capacity if index exceeds current capacity
   * **⚠️ NOT Thread Safe**: Concurrent modifications not supported
   *
   * @param index The index to set
   * @param value The long[][] to store
   */
  set(index: number, value: number[][]): void;

  // ============================================================================
  // ITERATION & PROCESSING
  // ============================================================================

  /**
   * Apply the given consumer to all non-default values stored in the list.
   *
   * **Sparse Iteration**: Only visits indices that have been explicitly set
   * **Callback Pattern**: Functional-style processing of sparse data
   *
   * @param consumer Callback function receiving (index, long[][]) pairs
   */
  forAll(consumer: LongLongArrayArrayConsumer): void;

  /**
   * Returns an iterator that consumes the underlying pages.
   *
   * **Draining Behavior**: Once consumed, the list becomes empty
   * **Memory Recovery**: Allows GC to reclaim page memory as iteration proceeds
   * **Use Case**: One-time processing of large sparse lists
   *
   * **⚠️ WARNING**: After iteration, get() returns default value for all indices
   *
   * @returns Iterator over pages (arrays of long[][][] - pages of 2D arrays)
   */
  drainingIterator(): DrainingIterator<number[][][]>;

  /**
   * Returns a stream of the underlying data.
   *
   * **Page-Based Streaming**: Streams over full pages, may contain default values
   * **Sparse Optimization**: Skips null/unallocated pages entirely
   * **Use Case**: Functional processing of sparse list data
   *
   * @returns Stream of long[][] values from allocated pages
   */
  stream(): IterableIterator<number[][]>;
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Factory class for creating HugeSparseLongArrayArrayList instances
 */
export class HugeSparseLongArrayArrayListFactory {
  /**
   * Create list with default long[][] value only
   */
  static of(defaultValue: number[][]): HugeSparseLongArrayArrayList;

  /**
   * Create list with default long[][] value and capacity hint
   */
  static of(
    defaultValue: number[][],
    initialCapacity: number
  ): HugeSparseLongArrayArrayList;

  static of(
    defaultValue: number[][],
    initialCapacity: number = 0
  ): HugeSparseLongArrayArrayList {
    // Will delegate to generated implementation
    // return new HugeSparseLongArrayArrayListSon(defaultValue, initialCapacity);
    throw new Error(
      "Implementation pending - will delegate to generated HugeSparseLongArrayArrayListSon"
    );
  }
}
