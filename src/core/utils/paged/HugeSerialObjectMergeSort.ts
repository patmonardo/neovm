/**
 * High-performance single-threaded merge sort for huge object arrays.
 *
 * Essential for sorting complex objects by computed double values:
 * - Generic object sorting with custom value extraction function
 * - Bottom-up merge sort for optimal performance
 * - Memory-efficient single temporary buffer allocation
 * - Type-safe generic implementation with proper typing
 * - Double-precision value comparison for numerical sorting
 *
 * Performance characteristics:
 * - Time complexity: O(n log n) for all cases
 * - Space complexity: O(n) for temporary buffer
 * - Function call overhead: one extraction call per comparison
 * - Cache-friendly: sequential memory access patterns
 * - Type-safe: full TypeScript generic support
 *
 * Algorithm details:
 * - Bottom-up merge sort with doubling merge sizes
 * - Uses ToDoubleFunction equivalent for value extraction
 * - IEEE 754 double comparison for numerical stability
 * - Iterative approach without recursion overhead
 * - Single temporary array allocation for all merges
 *
 * Use Cases:
 * - Sorting graph nodes by computed properties (centrality, degree)
 * - Organizing edges by weight or computed metrics
 * - Ranking entities by complex scoring functions
 * - Sorting analysis results by numerical criteria
 * - Preparing data for ranked access patterns
 *
 * @module HugeSerialObjectMergeSort
 */

import { HugeObjectArray } from '@/collections';

export class HugeSerialObjectMergeSort {
  private constructor() {
    // Static utility class
  }

  /**
   * Sorts a huge object array based on double values extracted from objects.
   * Creates a temporary array internally for merge operations.
   *
   * @param componentClass Class constructor for array elements
   * @param array Array of objects to sort
   * @param toSortValue Function that extracts double values for comparison
   *
   * Performance: O(n log n) time, O(n) space
   *
   * @example
   * ```typescript
   * // Sort graph nodes by PageRank score
   * interface GraphNode {
   *   id: number;
   *   pageRank: number;
   *   degree: number;
   *   label: string;
   * }
   *
   * const nodes = HugeObjectArray.newArray(GraphNode, 1000000);
   * // ... populate with graph nodes ...
   *
   * // Sort by PageRank (descending)
   * HugeSerialObjectMergeSort.sort(
   *   GraphNode,
   *   nodes,
   *   (node) => -node.pageRank // Negative for descending order
   * );
   *
   * // Result: nodes sorted by PageRank, highest first
   * console.log(`Top node: ${nodes.get(0).label}, PageRank: ${nodes.get(0).pageRank}`);
   * ```
   */
  public static sort<T>(
    componentClass: new (...args: any[]) => T,
    array: HugeObjectArray<T>,
    toSortValue: (obj: T) => number
  ): void {
    const temp = HugeObjectArray.newArray(componentClass, array.size());
    this.sortWithBuffer(array, Number(array.size()), toSortValue, temp);
  }

  /**
   * Sorts an object array with explicit size and reusable temporary buffer.
   * More efficient when sorting multiple arrays or when size < array.length.
   *
   * @param array Array of objects to sort
   * @param size Number of elements to sort (can be less than array size)
   * @param toSortValue Function that extracts double values for comparison
   * @param temp Temporary buffer for merge operations (must be at least size elements)
   *
   * @example
   * ```typescript
   * interface Edge {
   *   source: number;
   *   target: number;
   *   weight: number;
   *   type: string;
   * }
   *
   * const edges = HugeObjectArray.newArray(Edge, 5000000);
   * const tempBuffer = HugeObjectArray.newArray(Edge, 5000000);
   *
   * // Sort by edge weight (ascending)
   * HugeSerialObjectMergeSort.sortWithBuffer(
   *   edges,
   *   5000000,
   *   (edge) => edge.weight,
   *   tempBuffer
   * );
   *
   * // Result: edges sorted by weight, lightest first
   * console.log(`Lightest edge: ${edges.get(0).weight}`);
   * console.log(`Heaviest edge: ${edges.get(4999999).weight}`);
   * ```
   */
  public static sortWithBuffer<T>(
    array: HugeObjectArray<T>,
    size: number,
    toSortValue: (obj: T) => number,
    temp: HugeObjectArray<T>
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
        let rightEnd = i + 2 * tempSize - 1;

        // If there's no right range, we're done with this iteration
        if (rightStart >= size) {
          break;
        }

        // Clamp right end to array bounds
        if (rightEnd >= size) {
          rightEnd = size - 1;
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
   * Merges two sorted ranges of objects using extracted double values for comparison.
   *
   * @param array Source array containing both ranges
   * @param temp Temporary array for merge output
   * @param toSortValue Function to extract comparable double values from objects
   * @param leftStart Start of left range (inclusive)
   * @param leftEnd End of left range (inclusive)
   * @param rightStart Start of right range (inclusive)
   * @param rightEnd End of right range (inclusive)
   */
  private static merge<T>(
    array: HugeObjectArray<T>,
    temp: HugeObjectArray<T>,
    toSortValue: (obj: T) => number,
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
      const leftObj = array.get(left);
      const rightObj = array.get(right);
      const leftValue = toSortValue(leftObj);
      const rightValue = toSortValue(rightObj);

      // Use IEEE 754 double comparison for numerical stability
      if (this.doubleCompare(leftValue, rightValue) <= 0) {
        temp.set(idx++, leftObj);
        left++;
      } else {
        temp.set(idx++, rightObj);
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

  /**
   * IEEE 754 compliant double comparison.
   * Handles NaN, Infinity, and -0.0 correctly.
   *
   * @param a First double value
   * @param b Second double value
   * @returns -1 if a < b, 0 if a == b, 1 if a > b
   */
  private static doubleCompare(a: number, b: number): number {
    // Handle NaN cases
    if (isNaN(a) && isNaN(b)) return 0;
    if (isNaN(a)) return 1;
    if (isNaN(b)) return -1;

    // Handle infinity cases
    if (a === Infinity && b === Infinity) return 0;
    if (a === -Infinity && b === -Infinity) return 0;
    if (a === Infinity) return 1;
    if (b === Infinity) return -1;
    if (a === -Infinity) return -1;
    if (b === -Infinity) return 1;

    // Handle -0.0 vs 0.0
    if (a === 0 && b === 0) {
      if (Object.is(a, -0) && Object.is(b, 0)) return -1;
      if (Object.is(a, 0) && Object.is(b, -0)) return 1;
      return 0;
    }

    // Regular comparison
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
}
