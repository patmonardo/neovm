/**
 * High-performance intersection and similarity operations for graph algorithms.
 *
 * This module provides optimized implementations for:
 * - Set intersections (multiple algorithms for different use cases)
 * - Vector similarity metrics (cosine, Pearson correlation)
 * - Distance calculations (sum of squared deltas)
 *
 * Performance notes:
 * - intersection3/4: Optimized for sorted arrays (O(n+m) complexity)
 * - intersection/intersection2: Use hash sets for unsorted data
 * - Vector operations: Optimized for numerical stability and performance
 *
 * @module Intersections
 */

/**
 * Computes intersection size using hash sets.
 * Best for: Unsorted data, moderate sizes, when you need exact intersection count.
 * Time complexity: O(n + m) where n, m are array sizes
 * Space complexity: O(min(n, m)) for the smaller hash set
 */
export function intersection(targets1: Set<number>, targets2: Set<number>): number {
  // Create intersection by retaining only common elements
  const intersectionSet = new Set(targets1);

  // Retain only elements that exist in targets2
  for (const element of intersectionSet) {
    if (!targets2.has(element)) {
      intersectionSet.delete(element);
    }
  }

  return intersectionSet.size;
}

/**
 * Computes intersection size by converting arrays to hash sets.
 * Best for: Unsorted arrays, when you don't already have sets.
 * Time complexity: O(n + m)
 * Space complexity: O(n + m) for both hash sets
 */
export function intersection2(targets1: number[], targets2: number[]): number {
  const set1 = new Set(targets1);
  const set2 = new Set(targets2);

  return intersection(set1, set2);
}

/**
 * Optimized intersection for sorted arrays - merge-like algorithm.
 * Best for: Large sorted arrays, when you want maximum performance.
 *
 * REQUIRES: Both arrays must be sorted in ascending order!
 * Time complexity: O(n + m) - single pass through both arrays
 * Space complexity: O(1) - no additional data structures
 *
 * Use case: Graph adjacency lists (neighbors are often sorted by ID)
 */
export function intersection3(targets1: number[], targets2: number[]): number {
  const len2 = targets2.length;
  if (len2 === 0) return 0;

  let off2 = 0;
  let intersectionCount = 0;

  for (const value1 of targets1) {
    // Skip elements in targets2 that are smaller than current value1
    if (value1 > targets2[off2]) {
      while (++off2 !== len2 && value1 > targets2[off2]) {
        // Advance off2 until we find value >= value1
      }
      if (off2 === len2) return intersectionCount; // Exhausted targets2
    }

    // Check for exact match
    if (value1 === targets2[off2]) {
      intersectionCount++;
      off2++;
      if (off2 === len2) return intersectionCount; // Exhausted targets2
    }
  }

  return intersectionCount;
}

/**
 * Intersection with explicit length parameters - for working with array slices.
 * Best for: When you need to process only part of arrays without copying.
 *
 * REQUIRES: Both arrays must be sorted, len1 <= targets1.length, len2 <= targets2.length
 * Time complexity: O(len1 + len2)
 * Space complexity: O(1)
 */
export function intersectionArraysWithLength(
  targets1: number[],
  targets2: number[],
  len1: number,
  len2: number
): number {
  console.assert(len1 <= targets1.length, 'len1 must not exceed targets1 length');
  console.assert(len2 <= targets2.length, 'len2 must not exceed targets2 length');

  if (len2 === 0) return 0;

  let off2 = 0;
  let intersectionCount = 0;
  let idx1 = 0;

  while (idx1 < len1) {
    const value1 = targets1[idx1];

    // Advance off2 to find position for value1
    if (value1 > targets2[off2]) {
      while (++off2 !== len2 && value1 > targets2[off2]) {
        // Skip smaller elements in targets2
      }
      if (off2 === len2) return intersectionCount;
    }

    // Check for match
    if (value1 === targets2[off2]) {
      intersectionCount++;
      off2++;
      if (off2 === len2) return intersectionCount;
    }

    idx1++;
  }

  return intersectionCount;
}

/**
 * Alternative sorted intersection algorithm with different loop structure.
 * Best for: Experimentation with different CPU cache behaviors.
 *
 * REQUIRES: Both arrays must be sorted in ascending order!
 * Time complexity: O(n + m)
 * Space complexity: O(1)
 */
export function intersection4(targets1: number[], targets2: number[]): number {
  if (targets2.length === 0) return 0;

  let off2 = 0;
  let intersectionCount = 0;

  for (let off1 = 0; off1 < targets1.length; off1++) {
    if (off2 === targets2.length) return intersectionCount;

    const value1 = targets1[off1];

    // Find position in targets2 for value1
    if (value1 > targets2[off2]) {
      for (; off2 < targets2.length; off2++) {
        if (value1 <= targets2[off2]) break;
      }
      if (off2 === targets2.length) return intersectionCount;
    }

    // Check for exact match
    if (value1 === targets2[off2]) {
      intersectionCount++;
      off2++;
    }
  }

  return intersectionCount;
}

/**
 * Computes sum of squared differences between two vectors.
 * Best for: Euclidean distance calculations, k-means clustering, outlier detection.
 *
 * Time complexity: O(len)
 * Space complexity: O(1)
 *
 * Mathematical formula: Σ(vector1[i] - vector2[i])²
 */
export function sumSquareDelta(vector1: number[], vector2: number[], len: number): number {
  let result = 0;
  for (let i = 0; i < len; i++) {
    const delta = vector1[i] - vector2[i];
    result += delta * delta;
  }
  return result;
}

/**
 * Float32 version of sumSquareDelta for memory-efficient operations.
 * Best for: Large datasets where memory usage matters more than precision.
 */
export function sumSquareDeltaFloat(vector1: Float32Array, vector2: Float32Array, len: number): number {
  let result = 0;
  for (let i = 0; i < len; i++) {
    const delta = vector1[i] - vector2[i];
    result += delta * delta;
  }
  return result;
}

/**
 * Computes sum of squared deltas between one vector and multiple vectors.
 * Best for: Finding nearest neighbors, batch similarity calculations.
 *
 * Returns: Array where result[j] = sumSquareDelta(vector1, vector2[j], len)
 * Time complexity: O(len * vectors) where vectors = vector2.length
 * Space complexity: O(vectors) for result array
 */
export function sumSquareDeltas(vector1: number[], vector2: number[][], len: number): number[] {
  const vectors = vector2.length;
  const result = new Array<number>(vectors).fill(0);

  for (let i = 0; i < len; i++) {
    const v1 = vector1[i];
    for (let j = 0; j < vectors; j++) {
      const delta = v1 - vector2[j][i];
      result[j] += delta * delta;
    }
  }

  return result;
}

/**
 * Computes Pearson correlation coefficient between two vectors.
 * Best for: Measuring linear relationships, recommendation systems, feature correlation.
 *
 * Returns: Value between -1 and 1, where:
 * - 1 = perfect positive correlation
 * - 0 = no linear correlation
 * - -1 = perfect negative correlation
 *
 * Time complexity: O(len) - two passes through data
 * Space complexity: O(1)
 */
export function pearson(vector1: number[], vector2: number[], len: number): number {
  // First pass: compute means
  let vector1Sum = 0.0;
  let vector2Sum = 0.0;

  for (let i = 0; i < len; i++) {
    vector1Sum += vector1[i];
    vector2Sum += vector2[i];
  }

  const vector1Mean = vector1Sum / len;
  const vector2Mean = vector2Sum / len;

  // Second pass: compute correlation components
  let dotProductMinusMean = 0.0;
  let xLength = 0.0;
  let yLength = 0.0;

  for (let i = 0; i < len; i++) {
    const vector1Delta = vector1[i] - vector1Mean;
    const vector2Delta = vector2[i] - vector2Mean;

    dotProductMinusMean += vector1Delta * vector2Delta;
    xLength += vector1Delta * vector1Delta;
    yLength += vector2Delta * vector2Delta;
  }

  const result = dotProductMinusMean / Math.sqrt(xLength * yLength);
  return isNaN(result) ? 0 : result;
}

/**
 * Computes cosine similarity between two vectors.
 * Best for: Document similarity, recommendation systems, high-dimensional data.
 *
 * Returns: Value between -1 and 1, where:
 * - 1 = vectors point in same direction
 * - 0 = vectors are orthogonal
 * - -1 = vectors point in opposite directions
 *
 * Time complexity: O(len) - single pass
 * Space complexity: O(1)
 *
 * Mathematical formula: (v1 · v2) / (||v1|| × ||v2||)
 */
export function cosine(vector1: number[], vector2: number[], len: number): number {
  let dotProduct = 0.0;
  let xLength = 0.0;
  let yLength = 0.0;

  for (let i = 0; i < len; i++) {
    const weight1 = vector1[i];
    const weight2 = vector2[i];

    dotProduct += weight1 * weight2;
    xLength += weight1 * weight1;
    yLength += weight2 * weight2;
  }

  return dotProduct / Math.sqrt(xLength * yLength);
}

/**
 * Float32 version of cosine similarity for memory-efficient operations.
 * Best for: Large datasets, GPU acceleration, memory-constrained environments.
 */
export function cosineFloat(vector1: Float32Array, vector2: Float32Array, len: number): number {
  let dotProduct = 0.0;
  let xLength = 0.0;
  let yLength = 0.0;

  for (let i = 0; i < len; i++) {
    const weight1 = vector1[i];
    const weight2 = vector2[i];

    dotProduct += weight1 * weight2;
    xLength += weight1 * weight1;
    yLength += weight2 * weight2;
  }

  return dotProduct / Math.sqrt(xLength * yLength);
}
