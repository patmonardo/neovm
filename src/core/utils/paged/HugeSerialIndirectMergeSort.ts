/**
 * High-performance single-threaded indirect merge sort for huge long arrays.
 *
 * Essential for sorting indices by their associated values:
 * - Indirect sorting: sorts array indices based on external value function
 * - Memory-efficient: doesn't move actual data, only reorders indices
 * - Bottom-up merge sort: iterative approach without recursion overhead
 * - Custom comparison: uses external function to determine sort order
 * - Single-threaded: optimized for sequential execution
 *
 * Performance characteristics:
 * - Time complexity: O(n log n) for all cases
 * - Space complexity: O(n) for temporary buffer
 * - No recursion overhead: iterative bottom-up approach
 * - Cache-friendly: sequential memory access patterns
 * - Function call overhead: one function call per comparison
 *
 * Algorithm details:
 * - Bottom-up merge sort with doubling merge sizes
 * - Starts with single elements, doubles size each iteration
 * - Merges adjacent sorted ranges into larger sorted ranges
 * - Uses external function to get sortable values from indices
 * - Continues until entire array is sorted
 *
 * Use Cases:
 * - Sorting node indices by property values (degree, PageRank, etc.)
 * - Creating sorted index arrays for ranked access
 * - Organizing data by computed metrics without data movement
 * - Building lookup tables with custom sort orders
 * - Preparing indices for binary search on computed values
 *
 * @module HugeSerialIndirectMergeSort
 */

import { HugeLongArray } from '@/collections';

export class HugeSerialIndirectMergeSort {
  private constructor() {
    // Static utility class
  }

  /**
   * Sorts an array of indices based on values from an external function.
   * Creates a temporary array internally for merge operations.
   *
   * @param array Array of indices to sort
   * @param toSortValue Function that maps indices to sortable values
   *
   * Performance: O(n log n) time, O(n) space
   *
   * @example
   * ```typescript
   * // Sort node indices by their PageRank scores
   * const nodeIndices = HugeLongArray.newArray(1000000);
   * for (let i = 0; i < 1000000; i++) {
   *   nodeIndices.set(i, i); // Initialize with sequential indices
   * }
   *
   * const pageRankScores = new Map<number, number>();
   * // ... populate pageRankScores with computed values ...
   *
   * // Sort indices by PageRank values (descending)
   * HugeSerialIndirectMergeSort.sort(nodeIndices, (nodeId) => {
   *   return -(pageRankScores.get(nodeId) || 0); // Negative for descending
   * });
   *
   * // Now nodeIndices[0] contains the index of the highest PageRank node
   * const topNode = nodeIndices.get(0);
   * console.log(`Top node: ${topNode}, PageRank: ${pageRankScores.get(topNode)}`);
   * ```
   */
  public static sort(array: HugeLongArray, toSortValue: (index: number) => number): void {
    const temp = HugeLongArray.newArray(array.size());
    this.sortWithBuffer(array, Number(array.size()), toSortValue, temp);
  }

  /**
   * Sorts an array with explicit size and reusable temporary buffer.
   * More efficient when sorting multiple arrays or when size < array.length.
   *
   * @param array Array of indices to sort
   * @param size Number of elements to sort (can be less than array size)
   * @param toSortValue Function that maps indices to sortable values
   * @param temp Temporary buffer for merge operations (must be at least size elements)
   *
   * @example
   * ```typescript
   * // Sort node indices by degree (number of connections)
   * const nodeIndices = HugeLongArray.newArray(5000000);
   * const tempBuffer = HugeLongArray.newArray(5000000);
   * const nodeDegrees = computeNodeDegrees(); // Map<number, number>
   *
   * // Initialize indices
   * for (let i = 0; i < 5000000; i++) {
   *   nodeIndices.set(i, i);
   * }
   *
   * // Sort by node degree (ascending)
   * HugeSerialIndirectMergeSort.sortWithBuffer(
   *   nodeIndices,
   *   5000000,
   *   (nodeId) => nodeDegrees.get(nodeId) || 0,
   *   tempBuffer
   * );
   *
   * // Result: nodeIndices sorted by degree
   * // nodeIndices[0] = lowest degree node
   * // nodeIndices[4999999] = highest degree node
   * ```
   */
  public static sortWithBuffer(
    array: HugeLongArray,
    size: number,
    toSortValue: (index: number) => number,
    temp: HugeLongArray
  ): void {
    let tempSize = 1;

    // Bottom-up merge sort: start with single elements, double size each iteration
    while (tempSize < size) {
      let i = 0;

      // Process all ranges of current tempSize
      while (i < size) {
        const leftStart = i;
        const leftEnd = i + tempSize - 1;
        const rightStart = i + tempSize;
        const rightEnd = Math.min(i + 2 * tempSize - 1, size - 1);

        // If there's no right range, we're done with this iteration
        if (rightStart >= size) {
          break;
        }

        // Merge left and right ranges
        this.merge(array, temp, toSortValue, leftStart, leftEnd, rightStart, rightEnd);

        // Copy merged result back to array
        const mergedLength = rightEnd - leftStart + 1;
        for (let j = 0; j < mergedLength; j++) {
          array.set(i + j, temp.get(j));
        }

        i = i + 2 * tempSize;
      }

      tempSize *= 2;
    }
  }

  /**
   * Merges two sorted ranges using external value function for comparison.
   *
   * @param array Source array containing both ranges
   * @param temp Temporary array for merge output
   * @param toSortValue Function to get comparable values from indices
   * @param leftStart Start of left range (inclusive)
   * @param leftEnd End of left range (inclusive)
   * @param rightStart Start of right range (inclusive)
   * @param rightEnd End of right range (inclusive)
   */
  private static merge(
    array: HugeLongArray,
    temp: HugeLongArray,
    toSortValue: (index: number) => number,
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number
  ): void {
    let idx = 0;
    let left = leftStart;
    let right = rightStart;

    // Merge while both ranges have elements
    while (left <= leftEnd && right <= rightEnd) {
      const leftIndex = array.get(left);
      const rightIndex = array.get(right);
      const leftValue = toSortValue(leftIndex);
      const rightValue = toSortValue(rightIndex);

      if (leftValue <= rightValue) {
        temp.set(idx++, leftIndex);
        left++;
      } else {
        temp.set(idx++, rightIndex);
        right++;
      }
    }

    // Copy remaining elements from left range
    while (left <= leftEnd) {
      temp.set(idx++, array.get(left++));
    }

    // Copy remaining elements from right range
    while (right <= rightEnd) {
      temp.set(idx++, array.get(right++));
    }
  }
}
