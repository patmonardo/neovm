/**
 * Read-only interface for HugeLongArray providing immutable access.
 *
 * Essential for data protection and API design:
 * - Prevents accidental modifications to shared data
 * - Enables safe sharing of arrays between components
 * - Provides clear immutable semantics in function signatures
 * - Supports defensive programming patterns
 *
 * Use Cases:
 * - Graph adjacency lists (read-only neighbor access)
 * - Precomputed distance arrays (immutable shortest paths)
 * - Node property arrays (read-only feature access)
 * - Sorted index arrays (immutable ordering)
 * - Cached computation results (protected from modification)
 *
 * Performance characteristics:
 * - Zero-cost abstraction (direct delegation to underlying array)
 * - Same O(1) access time as mutable arrays
 * - No memory overhead (wrapper pattern)
 * - Type-safe immutability guarantees
 *
 * Data Science Applications:
 * - Feature vectors for machine learning (immutable training data)
 * - Graph structures (read-only topology)
 * - Precomputed rankings (PageRank, centrality scores)
 * - Distance matrices (immutable shortest path results)
 * - Time series data (historical values protection)
 *
 * @module ReadOnlyHugeLongArray
 */

import { HugeLongArray } from '@/collections';

/**
 * Read-only interface for accessing huge long arrays.
 * Provides immutable view of underlying data without copy overhead.
 */
export interface ReadOnlyHugeLongArray {
  /**
   * Gets the value at the specified index.
   *
   * @param index Array index (0-based)
   * @returns The value at the given index
   * @throws Error if index is out of bounds
   *
   * Performance: O(1) access time, same as mutable arrays
   */
  get(index: number): number;

  /**
   * Returns the number of elements in the array.
   *
   * @returns Array size
   */
  size(): number;

  /**
   * Converts the huge array to a standard JavaScript array.
   * WARNING: Only use for small arrays or testing!
   *
   * @returns Standard array containing all elements
   * @throws Error if array is too large for JavaScript array limits
   */
  toArray(): number[];
}

/**
 * Factory functions for creating read-only huge long arrays.
 */
export namespace ReadOnlyHugeLongArray {

  /**
   * Creates a read-only array from literal values.
   * Convenient for testing and small datasets.
   *
   * @param values Literal values to store
   * @returns Read-only huge array containing the values
   *
   * @example
   * ```typescript
   * // Create read-only array for testing
   * const nodeIds = ReadOnlyHugeLongArray.of(1, 5, 9, 12, 15);
   *
   * // Safe to pass around - cannot be modified
   * processNodeIds(nodeIds);
   *
   * function processNodeIds(ids: ReadOnlyHugeLongArray) {
   *   for (let i = 0; i < ids.size(); i++) {
   *     console.log(`Node ID: ${ids.get(i)}`);
   *     // ids.set(i, newValue); // Compile error - no set method!
   *   }
   * }
   * ```
   */
  export function of(...values: number[]): ReadOnlyHugeLongArray {
    return roArray(HugeLongArray.of(...values));
  }

  /**
   * Creates a read-only wrapper around an existing HugeLongArray.
   * Zero-cost abstraction - no data copying involved.
   *
   * @param hla The huge array to wrap as read-only
   * @returns Read-only view of the array
   *
   * @example
   * ```typescript
   * // Create mutable array and populate it
   * const mutableArray = HugeLongArray.newArray(1000000);
   * populateWithComputedValues(mutableArray);
   *
   * // Create read-only view for safe sharing
   * const readOnlyView = ReadOnlyHugeLongArray.of(mutableArray);
   *
   * // Share safely with other components
   * analyzeData(readOnlyView);
   * visualizeData(readOnlyView);
   *
   * // Original array can still be modified internally
   * updateComputedValues(mutableArray);
   * ```
   */
  export function roArray(hla: HugeLongArray): ReadOnlyHugeLongArray {
    return new ReadOnlyHugeLongArrayImpl(hla);
  }
}

/**
 * Implementation of read-only huge long array.
 * Uses delegation pattern for zero-cost abstraction.
 */
class ReadOnlyHugeLongArrayImpl implements ReadOnlyHugeLongArray {
  constructor(private readonly hla: HugeLongArray) {}

  public get(index: number): number {
    return this.hla.get(index);
  }

  public size(): number {
    return this.hla.size();
  }

  public toArray(): number[] {
    return this.hla.toArray();
  }
}
