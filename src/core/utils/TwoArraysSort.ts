/**
 * High-performance simultaneous sorting of two related arrays.
 *
 * Essential for graph algorithms where you need to maintain relationships between:
 * - Node IDs and their weights/properties
 * - Edge targets and their weights
 * - Neighbor lists with associated distances/scores
 *
 * Uses indirect sorting to minimize data movement - sorts indices first,
 * then reorders both arrays in a single pass for optimal cache performance.
 *
 * @module TwoArraysSort
 */

/**
 * Sorts two arrays simultaneously based on values of the first (number) array.
 * The second array's elements are reordered to maintain correspondence.
 *
 * Example:
 * Input:  longArray=[4, 1, 8], doubleArray=[0.5, 1.9, 0.9]
 * Output: longArray=[1, 4, 8], doubleArray=[1.9, 0.5, 0.9]
 *
 * Time complexity: O(n log n) for sorting + O(n) for reordering
 * Space complexity: O(n) for the ordering indices
 *
 * @param longArray Array of number values (e.g., neighbor IDs)
 * @param doubleArray Array of number values (e.g., edge weights)
 * @param length Number of elements to sort (allows partial sorting)
 */
export function sortDoubleArrayByLongValues(
  longArray: number[],
  doubleArray: number[],
  length: number
): void {
  console.assert(longArray.length >= length, 'longArray too short for specified length');
  console.assert(doubleArray.length >= length, 'doubleArray too short for specified length');

  // Create array of indices [0, 1, 2, ..., length-1]
  const indices = Array.from({length}, (_, i) => i);

  // Sort indices based on longArray values (indirect sort)
  indices.sort((indexA, indexB) => {
    const a = longArray[indexA];
    const b = longArray[indexB];
    return a - b; // Ascending order
  });

  // Reorder both arrays according to sorted indices
  reorderArrays(indices, longArray, doubleArray, length);
}

/**
 * Alternative sorting function that sorts by the double array values.
 * Useful when edge weights are the primary sort key.
 *
 * @param longArray Array of number values (e.g., neighbor IDs)
 * @param doubleArray Array of number values (e.g., edge weights)
 * @param length Number of elements to sort
 */
export function sortLongArrayByDoubleValues(
  longArray: number[],
  doubleArray: number[],
  length: number
): void {
  console.assert(longArray.length >= length, 'longArray too short for specified length');
  console.assert(doubleArray.length >= length, 'doubleArray too short for specified length');

  const indices = Array.from({length}, (_, i) => i);

  // Sort indices based on doubleArray values
  indices.sort((indexA, indexB) => {
    const a = doubleArray[indexA];
    const b = doubleArray[indexB];
    return a - b; // Ascending order
  });

  reorderArrays(indices, longArray, doubleArray, length);
}

/**
 * Sorts in descending order by long values.
 * Useful for algorithms that need largest-first processing.
 */
export function sortDoubleArrayByLongValuesDesc(
  longArray: number[],
  doubleArray: number[],
  length: number
): void {
  console.assert(longArray.length >= length, 'longArray too short for specified length');
  console.assert(doubleArray.length >= length, 'doubleArray too short for specified length');

  const indices = Array.from({length}, (_, i) => i);

  // Sort indices in descending order
  indices.sort((indexA, indexB) => {
    const a = longArray[indexA];
    const b = longArray[indexB];
    return b - a; // Descending order
  });

  reorderArrays(indices, longArray, doubleArray, length);
}

/**
 * Efficient in-place reordering of two arrays based on a permutation.
 * Uses cycle-following algorithm to minimize temporary storage.
 *
 * Algorithm explanation:
 * - For each position, follow the cycle of swaps needed
 * - Mark processed positions to avoid duplicate work
 * - Handles arbitrary permutations efficiently
 *
 * Time complexity: O(n)
 * Space complexity: O(1) additional (modifies order array)
 *
 * @param order Array of target indices (gets modified during process)
 * @param longArray First array to reorder
 * @param doubleArray Second array to reorder
 * @param length Number of elements to process
 */
function reorderArrays(
  order: number[],
  longArray: number[],
  doubleArray: number[],
  length: number
): void {
  // Cycle-following reordering algorithm
  for (let i = 0; i < length; i++) {
    // Skip if this element is already in correct position
    if (order[i] === i) continue;

    // Store the values that will be displaced
    const initLong = longArray[i];
    const initDouble = doubleArray[i];
    let currentIndex = i;

    // Follow the cycle of swaps
    while (order[currentIndex] !== i) {
      const nextIndex = order[currentIndex];

      // Move values from next position to current position
      longArray[currentIndex] = longArray[nextIndex];
      doubleArray[currentIndex] = doubleArray[nextIndex];

      // Mark current position as processed
      order[currentIndex] = currentIndex;
      currentIndex = nextIndex;
    }

    // Complete the cycle by placing initial values
    longArray[currentIndex] = initLong;
    doubleArray[currentIndex] = initDouble;
    order[currentIndex] = currentIndex;
  }
}

/**
 * Comparator function for ascending long values.
 * Exposed for use with custom sorting algorithms.
 */
export function ascendingLongComparator(array: number[]) {
  return (indexA: number, indexB: number): number => {
    const a = array[indexA];
    const b = array[indexB];
    return a - b;
  };
}

/**
 * Comparator function for descending long values.
 */
export function descendingLongComparator(array: number[]) {
  return (indexA: number, indexB: number): number => {
    const a = array[indexA];
    const b = array[indexB];
    return b - a;
  };
}

/**
 * Utility function to check if two arrays are sorted together correctly.
 * Useful for testing and validation.
 */
export function isCorrectlySorted(
  longArray: number[],
  doubleArray: number[],
  length: number,
  ascending: boolean = true
): boolean {
  for (let i = 1; i < length; i++) {
    const current = longArray[i];
    const previous = longArray[i - 1];

    if (ascending && current < previous) return false;
    if (!ascending && current > previous) return false;
  }
  return true;
}
