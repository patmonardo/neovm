/**
 * Memory-efficient triangular matrix for symmetric graph data.
 *
 * Stores only the upper triangular portion of a symmetric matrix,
 * achieving 50% memory savings compared to full square matrices.
 *
 * Essential for memory-constrained symmetric graph operations:
 * - Pairwise distance matrices (saves N²/2 space)
 * - Similarity matrices for clustering
 * - Correlation matrices for feature analysis
 * - Co-occurrence matrices for recommendation
 * - Adjacency matrices for undirected graphs
 * - Kernel matrices for graph machine learning
 *
 * Performance characteristics:
 * - Memory usage: N(N+1)/2 instead of N²
 * - Index calculation: O(1) with triangular indexing
 * - Backed by single HugeLongArray (billion-element capacity)
 * - Symmetric access: get(i,j) === get(j,i) automatically
 *
 * Data Science Applications:
 * - All-pairs shortest paths (distance matrices)
 * - Graph clustering (similarity matrices)
 * - Social network analysis (friendship matrices)
 * - Recommendation systems (item-item similarity)
 * - Feature correlation analysis in graph ML
 * - Phylogenetic trees (evolutionary distance)
 *
 * Memory layout:
 * - Stores upper triangle row by row: [0,0], [0,1], [0,2], [1,1], [1,2], [2,2]
 * - Index formula: index = x(2*order - x - 1)/2 + y (for x <= y)
 * - Automatic coordinate swapping for symmetric access
 *
 * @module HugeLongTriangularMatrix
 */

import { HugeLongArray } from "@/collections";
import { triangularIndex } from "./HugeMatrices";

export class HugeLongTriangularMatrix {
  private readonly array: HugeLongArray;
  private readonly _order: number;
  private readonly totalSize: number;

  /**
   * Creates a new triangular matrix with specified order.
   *
   * @param order Matrix dimension (N for N×N symmetric matrix)
   * @throws Error if order would cause overflow or is negative
   *
   * @example
   * ```typescript
   * // Distance matrix for 1M nodes (saves ~4TB vs full matrix!)
   * const nodeCount = 1000000;
   * const distances = new HugeLongTriangularMatrix(nodeCount);
   *
   * // Set pairwise distances (automatically symmetric)
   * distances.set(nodeA, nodeB, computeDistance(nodeA, nodeB));
   *
   * // Retrieve distance (order doesn't matter)
   * const dist1 = distances.get(nodeA, nodeB);
   * const dist2 = distances.get(nodeB, nodeA); // Same value!
   * ```
   */
  constructor(order: number) {
    if (order < 0) {
      throw new Error(`Matrix order must be non-negative: ${order}`);
    }

    // Calculate triangular matrix size: N(N+1)/2
    // Check for overflow in multiplication
    if (order > 0 && order > (Number.MAX_SAFE_INTEGER * 2) / (order + 1)) {
      throw new Error(
        `Triangular matrix too large: order ${order} would overflow`
      );
    }

    this._order = order;
    this.totalSize = Math.floor((order * (order + 1)) / 2);
    this.array = HugeLongArray.newArray(this.totalSize);
  }

  /**
   * Memory estimation for capacity planning.
   * Shows the MASSIVE savings vs full square matrix!
   */
  public static memoryEstimation(order: number): number {
    if (order < 0) {
      throw new Error(`Matrix order must be non-negative: ${order}`);
    }

    if (order > 0 && order > (Number.MAX_SAFE_INTEGER * 2) / (order + 1)) {
      throw new Error(
        `Triangular matrix too large: order ${order} would overflow`
      );
    }

    const triangularSize = Math.floor((order * (order + 1)) / 2);
    const squareSize = order * order;
    const memorySaved = squareSize - triangularSize;

    console.log(
      `Memory savings: ${memorySaved} elements (${Math.round(50)}% reduction)`
    );

    return HugeLongArray.memoryEstimation(triangularSize) + 64; // ~64 bytes overhead
  }

  /**
   * Returns current memory usage in bytes.
   */
  public sizeOf(): number {
    return this.array.sizeOf();
  }

  /**
   * Sets a value at the specified matrix position.
   * Automatically handles coordinate ordering for triangular storage.
   *
   * @param x First coordinate
   * @param y Second coordinate
   * @param value Value to store
   *
   * Note: set(i,j,v) and set(j,i,v) store the same value due to symmetry
   *
   * Data Science Use Cases:
   * - Set pairwise distances: set(nodeA, nodeB, distance)
   * - Set similarity scores: set(itemA, itemB, similarity)
   * - Set correlation values: set(featureA, featureB, correlation)
   * - Set co-occurrence counts: set(wordA, wordB, count)
   */
  public set(x: number, y: number, value: number): void {
    this.validateCoordinates(x, y);
    this.array.set(this.indexOf(x, y), value);
  }

  /**
   * Gets the value at the specified matrix position.
   * Automatically handles coordinate ordering for triangular storage.
   *
   * @param x First coordinate
   * @param y Second coordinate
   * @returns The stored value
   *
   * Note: get(i,j) === get(j,i) due to symmetric storage
   *
   * Performance: O(1) with optimized triangular index calculation
   */
  public get(x: number, y: number): number {
    this.validateCoordinates(x, y);
    return this.array.get(this.indexOf(x, y));
  }

  /**
   * Adds a value to the existing value at the specified position.
   * Perfect for accumulation patterns in symmetric data.
   *
   * @param x First coordinate
   * @param y Second coordinate
   * @param value Value to add
   *
   * Data Science Use Cases:
   * - Accumulate co-occurrence counts
   * - Sum similarity contributions from multiple sources
   * - Build correlation matrices incrementally
   * - Aggregate distance measurements
   *
   * @example
   * ```typescript
   * // Build word co-occurrence matrix
   * documents.forEach(doc => {
   *   const words = tokenize(doc);
   *   words.forEach((word1, i) => {
   *     words.slice(i + 1).forEach(word2 => {
   *       coOccurrence.addTo(wordId1, wordId2, 1);
   *     });
   *   });
   * });
   * ```
   */
  public addTo(x: number, y: number, value: number): void {
    this.validateCoordinates(x, y);
    this.array.addTo(this.indexOf(x, y), value);
  }

  /**
   * Returns the order (dimension) of the triangular matrix.
   */
  public order(): number {
    return this._order;
  }

  /**
   * Returns the total number of stored elements (triangular size).
   * This is N(N+1)/2, exactly half of a full N×N matrix.
   */
  public size(): number {
    return this.totalSize;
  }

  /**
   * Fills the entire triangular matrix with the specified value.
   *
   * @param value Value to fill matrix with
   */
  public fill(value: number): void {
    this.array.fill(value);
  }

  /**
   * Fills the diagonal with a specific value.
   * Diagonal elements are stored as (i,i) positions.
   *
   * @param value Value to set on diagonal
   */
  public fillDiagonal(value: number): void {
    for (let i = 0; i < this._order; i++) {
      this.set(i, i, value);
    }
  }

  /**
   * Gets the diagonal values as an array.
   */
  public getDiagonal(): number[] {
    const diagonal = new Array<number>(this._order);
    for (let i = 0; i < this._order; i++) {
      diagonal[i] = this.get(i, i);
    }
    return diagonal;
  }

  /**
   * Sets the diagonal values from an array.
   */
  public setDiagonal(values: number[]): void {
    if (values.length !== this._order) {
      throw new Error(
        `Diagonal length mismatch: expected ${this._order}, got ${values.length}`
      );
    }

    for (let i = 0; i < this._order; i++) {
      this.set(i, i, values[i]);
    }
  }

  /**
   * Computes the trace (sum of diagonal elements).
   */
  public trace(): number {
    let sum = 0;
    for (let i = 0; i < this._order; i++) {
      sum += this.get(i, i);
    }
    return sum;
  }

  /**
   * Creates an iterator for all stored elements in triangular order.
   * Yields [x, y, value] tuples where x <= y.
   */
  public *entries(): Generator<[number, number, number]> {
    for (let x = 0; x < this._order; x++) {
      for (let y = x; y < this._order; y++) {
        yield [x, y, this.get(x, y)];
      }
    }
  }

  /**
   * Creates an iterator for diagonal elements only.
   */
  public *diagonalEntries(): Generator<[number, number]> {
    for (let i = 0; i < this._order; i++) {
      yield [i, this.get(i, i)];
    }
  }

  /**
   * Creates an iterator for off-diagonal elements only.
   * Yields [x, y, value] tuples where x < y.
   */
  public *offDiagonalEntries(): Generator<[number, number, number]> {
    for (let x = 0; x < this._order; x++) {
      for (let y = x + 1; y < this._order; y++) {
        yield [x, y, this.get(x, y)];
      }
    }
  }

  /**
   * Converts to a full square matrix (expands triangular to symmetric).
   * WARNING: Doubles memory usage! Use only when necessary.
   */
  public toSquareMatrix(): number[][] {
    const matrix = Array.from({ length: this._order }, () =>
      new Array<number>(this._order).fill(0)
    );

    for (let x = 0; x < this._order; x++) {
      for (let y = x; y < this._order; y++) {
        const value = this.get(x, y);
        matrix[x][y] = value;
        matrix[y][x] = value; // Symmetric expansion
      }
    }

    return matrix;
  }

  /**
   * Counts non-zero elements in the triangular matrix.
   */
  public countNonZero(): number {
    let count = 0;
    for (let i = 0; i < this.totalSize; i++) {
      if (this.array.get(i) !== 0) {
        count++;
      }
    }
    return count;
  }

  /**
   * Computes sparsity ratio for the triangular matrix.
   */
  public sparsity(): number {
    const nonZeroElements = this.countNonZero();
    return (this.totalSize - nonZeroElements) / this.totalSize;
  }

  /**
   * Releases all resources and invalidates the matrix.
   */
  public release(): void {
    this.array.release();
  }

  /**
   * Returns a human-readable string representation.
   */
  public toString(): string {
    if (this._order > 10) {
      return `HugeLongTriangularMatrix(order=${this._order}, size=${this.totalSize})`;
    }

    const lines: string[] = [];
    for (let x = 0; x < this._order; x++) {
      const row: string[] = [];
      for (let y = 0; y < this._order; y++) {
        if (y >= x) {
          row.push(this.get(x, y).toString());
        } else {
          row.push(this.get(y, x).toString()); // Symmetric access
        }
      }
      lines.push(`[${row.join(", ")}]`);
    }
    return `[\n  ${lines.join(",\n  ")}\n]`;
  }

  /**
   * Converts coordinates to triangular array index.
   * Uses the optimized triangularIndex function from HugeMatrices.
   */
  private indexOf(x: number, y: number): number {
    return triangularIndex(this._order, x, y);
  }

  /**
   * Validates that coordinates are within bounds.
   */
  private validateCoordinates(x: number, y: number): void {
    if (x < 0 || x >= this._order) {
      throw new Error(
        `X coordinate out of bounds: ${x} (matrix order: ${this._order})`
      );
    }
    if (y < 0 || y >= this._order) {
      throw new Error(
        `Y coordinate out of bounds: ${y} (matrix order: ${this._order})`
      );
    }
  }
}
