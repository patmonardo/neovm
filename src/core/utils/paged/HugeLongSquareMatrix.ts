/**
 * High-performance square matrix for symmetric graph algorithm processing.
 *
 * Specialized for algorithms requiring N×N matrices:
 * - Adjacency matrices for undirected graphs
 * - Distance matrices (all-pairs shortest paths)
 * - Similarity matrices (clustering, recommendation)
 * - Correlation matrices (temporal analysis)
 * - Transition matrices (random walks, PageRank)
 * - Laplacian matrices (spectral graph analysis)
 *
 * Performance characteristics:
 * - Inherits all HugeLongMatrix optimizations
 * - Row-major storage layout (cache-friendly)
 * - Backed by single HugeLongArray (billion-element capacity)
 * - O(1) access time with simple index calculation
 * - Enforces square dimensions at construction
 *
 * Data Science Applications:
 * - Graph Laplacian for spectral clustering
 * - Adjacency matrices for community detection
 * - Distance matrices for graph embedding
 * - Transition matrices for Markov chain analysis
 * - Kernel matrices for graph kernel methods
 * - Covariance matrices for multivariate graph analysis
 *
 * Memory efficiency:
 * - Same as HugeLongMatrix but semantically constrained to square
 * - Enables symmetric matrix optimizations in algorithms
 * - Clear intent for N×N operations
 *
 * @module HugeLongSquareMatrix
 */

import { HugeLongMatrix } from "./HugeLongMatrix";

export class HugeLongSquareMatrix extends HugeLongMatrix {
  private readonly _order: number;

  /**
   * Creates a new square matrix with specified order (dimension).
   *
   * @param order Number of rows and columns (N for N×N matrix)
   * @throws Error if order would overflow or is negative
   *
   * @example
   * ```typescript
   * // Adjacency matrix for undirected graph
   * const nodeCount = 1000000;
   * const adjacency = new HugeLongSquareMatrix(nodeCount);
   *
   * // Set symmetric edge weights
   * graph.edges().forEach(edge => {
   *   adjacency.set(edge.source, edge.target, edge.weight);
   *   adjacency.set(edge.target, edge.source, edge.weight); // Symmetric
   * });
   *
   * // Check connectivity
   * const isConnected = adjacency.get(nodeA, nodeB) > 0;
   * ```
   */
  constructor(order: number) {
    super(order, order);
    this._order = order;
  }

  /**
   * Memory estimation for square matrix capacity planning.
   *
   * @param order Matrix dimension (N for N×N matrix)
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(order: number): number {
    return HugeLongMatrix.memoryEstimation(order, order);
  }

  /**
   * Returns the order (dimension) of the square matrix.
   * For an N×N matrix, returns N.
   */
  public order(): number {
    return this._order;
  }

  /**
   * Sets symmetric values efficiently.
   * Sets both (i,j) and (j,i) in a single operation.
   *
   * @param i First index
   * @param j Second index
   * @param value Value to set at both positions
   *
   * Perfect for undirected graphs and symmetric relationships!
   */
  public setSymmetric(i: number, j: number, value: number): void {
    this.set(i, j, value);
    if (i !== j) {
      // Avoid double-setting diagonal elements
      this.set(j, i, value);
    }
  }

  /**
   * Adds symmetric values efficiently.
   * Adds to both (i,j) and (j,i) in a single operation.
   *
   * @param i First index
   * @param j Second index
   * @param value Value to add to both positions
   *
   * Essential for building symmetric matrices from edge lists!
   */
  public addToSymmetric(i: number, j: number, value: number): void {
    this.addTo(i, j, value);
    if (i !== j) {
      // Avoid double-adding diagonal elements
      this.addTo(j, i, value);
    }
  }

  /**
   * Fills the diagonal with a specific value.
   * Common operation for identity matrices, self-loops, etc.
   *
   * @param value Value to set on the diagonal
   *
   * Use cases:
   * - Initialize identity matrix (diagonal = 1)
   * - Set self-loop weights in graphs
   * - Initialize distance matrix (diagonal = 0)
   */
  public fillDiagonal(value: number): void {
    for (let i = 0; i < this._order; i++) {
      this.set(i, i, value);
    }
  }

  /**
   * Gets the diagonal values as an array.
   * Useful for eigenvalue approximation, trace computation, etc.
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
   *
   * @param values Array of diagonal values (must have length = order)
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
   * Important metric in spectral graph analysis.
   */
  public trace(): number {
    let sum = 0;
    for (let i = 0; i < this._order; i++) {
      sum += this.get(i, i);
    }
    return sum;
  }

  /**
   * Checks if the matrix is symmetric within a tolerance.
   * Useful for validating undirected graph adjacency matrices.
   *
   * @param tolerance Maximum allowed difference (default: 0 for exact)
   * @returns true if matrix is symmetric within tolerance
   */
  public isSymmetric(tolerance: number = 0): boolean {
    for (let i = 0; i < this._order; i++) {
      for (let j = i + 1; j < this._order; j++) {
        const diff = Math.abs(this.get(i, j) - this.get(j, i));
        if (diff > tolerance) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Creates an iterator for the upper triangular part (including diagonal).
   * Memory-efficient for symmetric matrix algorithms.
   * Yields [row, col, value] tuples where row <= col.
   */
  public *upperTriangularEntries(): Generator<[number, number, number]> {
    for (let i = 0; i < this._order; i++) {
      for (let j = i; j < this._order; j++) {
        yield [i, j, this.get(i, j)];
      }
    }
  }

  /**
   * Creates an iterator for the lower triangular part (including diagonal).
   * Yields [row, col, value] tuples where row >= col.
   */
  public *lowerTriangularEntries(): Generator<[number, number, number]> {
    for (let i = 0; i < this._order; i++) {
      for (let j = 0; j <= i; j++) {
        yield [i, j, this.get(i, j)];
      }
    }
  }

  /**
   * Creates an iterator for off-diagonal elements only.
   * Useful for analyzing edge connections without self-loops.
   */
  public *offDiagonalEntries(): Generator<[number, number, number]> {
    for (let i = 0; i < this._order; i++) {
      for (let j = 0; j < this._order; j++) {
        if (i !== j) {
          yield [i, j, this.get(i, j)];
        }
      }
    }
  }

  /**
   * Counts non-zero elements in the matrix.
   * Useful for sparsity analysis.
   */
  public countNonZero(): number {
    let count = 0;
    for (let i = 0; i < this._order; i++) {
      for (let j = 0; j < this._order; j++) {
        if (this.get(i, j) !== 0) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Computes sparsity ratio (fraction of zero elements).
   * Returns value between 0 (dense) and 1 (empty).
   */
  public sparsity(): number {
    const totalElements = this._order * this._order;
    if (totalElements === 0) {
      return 1.0; // 100% sparse by convention
    }
    const nonZeroElements = this.countNonZero();
    return (totalElements - nonZeroElements) / totalElements;
  }

  /**
   * Creates a transposed copy of the matrix.
   * For symmetric matrices, should return an identical matrix.
   */
  public transpose(): HugeLongSquareMatrix {
    const transposed = new HugeLongSquareMatrix(this._order);

    for (let i = 0; i < this._order; i++) {
      for (let j = 0; j < this._order; j++) {
        transposed.set(j, i, this.get(i, j));
      }
    }

    return transposed;
  }

  /**
   * Returns a human-readable string representation.
   * Only practical for small matrices due to output size.
   */
  public toString(): string {
    if (this._order > 10) {
      return `HugeLongSquareMatrix(${this._order} × ${this._order})`;
    }

    return super.toString();
  }
}
