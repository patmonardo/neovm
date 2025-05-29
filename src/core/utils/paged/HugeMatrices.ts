/**
 * Essential matrix utility functions for huge matrix implementations.
 *
 * Provides optimized mathematical functions for matrix index calculations,
 * coordinate transformations, and memory layout optimizations.
 *
 * Core Functions:
 * - Triangular matrix indexing (maps 2D coordinates to 1D array index)
 * - Index validation and bounds checking
 * - Memory layout calculations for various matrix types
 *
 * Mathematical Foundation:
 * - Triangular indexing: index = x * order + y - (x * (x + 1) / 2)
 * - This formula maps upper triangular coordinates (x,y) where x ≤ y
 *   to sequential array indices, enabling 50% memory savings
 *
 * Performance characteristics:
 * - All functions are O(1) with simple arithmetic
 * - Optimized for billion-scale matrix operations
 * - No object allocation or complex calculations
 *
 * @module HugeMatrices
 */

/**
 * Computes the 1D array index for triangular matrix storage.
 *
 * This is the CORE mathematical function that enables 50% memory savings
 * in symmetric matrices by storing only the upper triangular portion.
 *
 * Formula explanation:
 * - For coordinates (x,y) where x ≤ y in an N×N matrix
 * - Maps to 1D index in array storing upper triangle row-by-row
 * - Row x starts at position: x * N - x*(x+1)/2
 * - Column offset within row: y - x
 * - Combined: x * N + (y - x) - x*(x+1)/2 = x * N + y - x*(x+1)/2
 *
 * @param order Matrix dimension (N for N×N matrix)
 * @param x Row coordinate (must be ≤ y)
 * @param y Column coordinate (must be ≥ x)
 * @returns 1D array index for triangular storage
 *
 * @example
 * ```typescript
 * // For a 4×4 matrix, upper triangle storage order:
 * // (0,0)→0, (0,1)→1, (0,2)→2, (0,3)→3
 * // (1,1)→4, (1,2)→5, (1,3)→6
 * // (2,2)→7, (2,3)→8
 * // (3,3)→9
 *
 * const index = triangularIndex(4, 1, 2); // Returns 5
 * ```
 *
 * Data Science Applications:
 * - Distance matrices: store all pairwise distances efficiently
 * - Similarity matrices: save memory in clustering algorithms
 * - Correlation matrices: efficient feature relationship storage
 * - Covariance matrices: statistical analysis with memory optimization
 */
export function triangularIndex(order: number, x: number, y: number): number {
  validateMatrixOrder(order);

  if (x < 0 || x >= order || y < 0 || y >= order) {
    throw new Error(
      `Coordinates (${x}, ${y}) out of bounds for ${order}×${order} matrix`
    );
  }

  // Java-style assertion: x must be <= y (no swapping!)
  if (x > y) {
    throw new Error(
      `Invalid triangular coordinates: x (${x}) must be <= y (${y})`
    );
  }

  // Exact Java formula
  return x * order + y - Math.floor((x * (x + 1)) / 2);
}
/**
 * Validates triangular matrix coordinates and swaps if necessary.
 * Ensures x ≤ y for triangular indexing while preserving symmetry.
 *
 * @param order Matrix dimension
 * @param x First coordinate
 * @param y Second coordinate
 * @returns Tuple [validX, validY] where validX ≤ validY
 */
export function normalizeTriangularCoordinates(
  order: number,
  x: number,
  y: number
): [number, number] {
  if (x < 0 || x >= order || y < 0 || y >= order) {
    throw new Error(
      `Coordinates (${x}, ${y}) out of bounds for matrix order ${order}`
    );
  }

  // Swap if necessary to ensure x ≤ y (upper triangular storage)
  return x <= y ? [x, y] : [y, x];
}

/**
 * Computes the total number of elements in a triangular matrix.
 * Formula: N(N+1)/2 for an N×N symmetric matrix.
 *
 * @param order Matrix dimension
 * @returns Number of elements in triangular storage
 */
export function triangularSize(order: number): number {
  if (order < 0) {
    throw new Error(`Matrix order must be non-negative: ${order}`);
  }

  return Math.floor((order * (order + 1)) / 2);
}

/**
 * Computes memory savings of triangular vs full matrix storage.
 *
 * @param order Matrix dimension
 * @returns Object with size comparisons and savings
 */

export function triangularMemorySavings(order: number): {
  fullSize: number;
  triangularSize: number;
  elementsSaved: number;
  percentSaved: number;
} {
  const fullSize = order * order;
  const triSize = triangularSize(order);
  const elementsSaved = fullSize - triSize;
  const percentSaved = (elementsSaved / fullSize) * 100;

  return {
    fullSize,
    triangularSize: triSize,
    elementsSaved,
    percentSaved,
  };
}
/**
 * Converts triangular index back to 2D coordinates.
 * Inverse operation of triangularIndex - useful for debugging and iteration.
 *
 * @param order Matrix dimension
 * @param index 1D triangular array index
 * @returns Tuple [x, y] coordinates where x ≤ y
 */

export function triangularCoordinates(order: number, index: number): [number, number] {
  validateMatrixOrder(order);

  if (index < 0 || index >= triangularSize(order)) {
    throw new Error(`Index ${index} out of bounds`);
  }

  // Find which row this index belongs to
  // Row x contains indices from triangularIndex(order, x, x) onwards
  let x = 0;
  while (triangularIndex(order, x + 1, x + 1) <= index) {
    x++;
  }

  // Find y position within the row
  const rowStart = triangularIndex(order, x, x);
  const y = x + (index - rowStart);

  return [x, y];
}

/**
 * Validates that a matrix order won't cause integer overflow.
 * Important for huge matrices that approach JavaScript's safe integer limits.
 *
 * @param order Matrix dimension to validate
 * @throws Error if order would cause overflow
 */
export function validateMatrixOrder(order: number): void {
  if (order < 0) {
    throw new Error(`Matrix order must be non-negative: ${order}`);
  }

  if (!Number.isInteger(order)) {
    throw new Error(`Matrix order must be an integer: ${order}`);
  }

  // Check for triangular size overflow: N(N+1)/2
  if (order > 0 && order > (Number.MAX_SAFE_INTEGER * 2) / (order + 1)) {
    throw new Error(
      `Matrix order ${order} too large: triangular size would exceed MAX_SAFE_INTEGER`
    );
  }

  // Check for square size overflow: N²
  if (order > Math.sqrt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      `Matrix order ${order} too large: square size would exceed MAX_SAFE_INTEGER`
    );
  }
}

/**
 * Generates test data for validating triangular indexing.
 * Useful for unit tests and debugging matrix implementations.
 *
 * @param order Matrix dimension for test
 * @returns Array of test cases with coordinates and expected indices
 */
export function generateTriangularIndexTestCases(order: number): Array<{
  x: number;
  y: number;
  expectedIndex: number;
}> {
  const testCases: Array<{ x: number; y: number; expectedIndex: number }> = [];

  let index = 0;
  for (let x = 0; x < order; x++) {
    for (let y = x; y < order; y++) {
      testCases.push({ x, y, expectedIndex: index });
      index++;
    }
  }

  return testCases;
}

/**
 * Creates a visual representation of triangular matrix indexing.
 * Useful for understanding the memory layout and debugging.
 *
 * @param order Matrix dimension (should be small for readability)
 * @returns String showing the triangular indexing pattern
 */
export function visualizeTriangularIndexing(order: number): string {
  if (order > 10) {
    return `Triangular matrix too large to visualize (order: ${order})`;
  }

  const lines: string[] = [];
  lines.push(`Triangular indexing for ${order}×${order} matrix:`);
  lines.push("");

  for (let x = 0; x < order; x++) {
    const row: string[] = [];

    // Add spaces for lower triangle
    for (let y = 0; y < x; y++) {
      row.push("    ");
    }

    // Add indices for upper triangle
    for (let y = x; y < order; y++) {
      const index = triangularIndex(order, x, y);
      row.push(index.toString().padStart(3, " ") + " ");
    }

    lines.push(row.join(""));
  }

  lines.push("");
  lines.push(
    `Total elements: ${triangularSize(order)} (vs ${
      order * order
    } for full matrix)`
  );

  const savings = triangularMemorySavings(order);
  lines.push(
    `Memory savings: ${
      savings.elementsSaved
    } elements (${savings.percentSaved.toFixed(1)}%)`
  );

  return lines.join("\n");
}
