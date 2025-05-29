/**
 * High-performance 2D matrix for massive graph algorithm processing.
 *
 * Essential for advanced graph algorithms requiring matrix operations:
 * - Adjacency matrices for dense graphs
 * - Distance matrices for all-pairs shortest paths (Floyd-Warshall)
 * - Transition matrices for random walks and PageRank
 * - Similarity matrices for clustering and recommendation
 * - Feature matrices for graph neural networks
 * - Confusion matrices for graph classification
 *
 * Performance characteristics:
 * - Row-major storage layout (cache-friendly for row iteration)
 * - Backed by single HugeLongArray (billion-element capacity)
 * - O(1) access time with simple index calculation
 * - Memory-efficient: no per-element object overhead
 * - Supports matrices up to sqrt(2^53) × sqrt(2^53) elements
 *
 * Data Science Applications:
 * - Graph neural networks: node feature matrices
 * - Community detection: modularity matrices
 * - Link prediction: similarity score matrices
 * - Graph embedding: transformation matrices
 * - Temporal analysis: time-series correlation matrices
 * - Recommendation systems: user-item interaction matrices
 *
 * Memory layout:
 * - Row-major order: matrix[row][col] = array[row * cols + col]
 * - Optimized for row-wise traversal (common in algorithms)
 * - Predictable memory access patterns for cache efficiency
 *
 * @module HugeLongMatrix
 */

import { HugeLongArray } from "@/collections";

export class HugeLongMatrix {
  private readonly array: HugeLongArray;
  private readonly rows: number;
  private readonly cols: number;
  private readonly totalSize: number;

  /**
   * Creates a new matrix with specified dimensions.
   *
   * @param rows Number of rows in the matrix
   * @param cols Number of columns in the matrix
   * @throws Error if dimensions would overflow or are negative
   *
   * @example
   * ```typescript
   * // Adjacency matrix for graph
   * const nodeCount = 1000000;
   * const adjacency = new HugeLongMatrix(nodeCount, nodeCount);
   *
   * // Set edge weights
   * graph.edges().forEach(edge => {
   *   adjacency.set(edge.source, edge.target, edge.weight);
   * });
   *
   * // Check if edge exists
   * const weight = adjacency.get(sourceNode, targetNode);
   * const hasEdge = weight > 0;
   * ```
   */
  constructor(rows: number, cols: number) {
    if (rows < 0 || cols < 0) {
      throw new Error(
        `Matrix dimensions must be non-negative: ${rows} × ${cols}`
      );
    }

    // Check for overflow in multiplication
    if (rows > 0 && cols > Number.MAX_SAFE_INTEGER / rows) {
      throw new Error(`Matrix too large: ${rows} × ${cols} would overflow`);
    }

    this.rows = rows;
    this.cols = cols;
    this.totalSize = rows * cols;
    this.array = HugeLongArray.newArray(this.totalSize);
  }

  /**
   * Memory estimation for capacity planning.
   * Essential for resource allocation in large-scale processing.
   */
  public static memoryEstimation(rows: number, cols: number): number {
    if (rows < 0 || cols < 0) {
      throw new Error(
        `Matrix dimensions must be non-negative: ${rows} × ${cols}`
      );
    }

    if (rows > 0 && cols > Number.MAX_SAFE_INTEGER / rows) {
      throw new Error(`Matrix too large: ${rows} × ${cols} would overflow`);
    }

    const totalElements = rows * cols;
    return HugeLongArray.memoryEstimation(totalElements) + 64; // ~64 bytes matrix overhead
  }

  /**
   * Returns current memory usage in bytes.
   */
  public sizeOf(): number {
    return this.array.sizeOf();
  }

  /**
   * Sets a value at the specified matrix position.
   *
   * @param row Row index (0-based)
   * @param col Column index (0-based)
   * @param value Value to store
   * @throws Error if indices are out of bounds
   *
   * Data Science Use Cases:
   * - Set adjacency matrix entries: (source, target) → weight
   * - Set feature matrix values: (node, feature) → value
   * - Set distance matrix entries: (node1, node2) → distance
   * - Set similarity scores: (item1, item2) → similarity
   */
  public set(row: number, col: number, value: number): void {
    this.validateIndices(row, col);
    this.array.set(this.indexOf(row, col), value);
  }

  /**
   * Gets the value at the specified matrix position.
   *
   * @param row Row index (0-based)
   * @param col Column index (0-based)
   * @returns The stored value
   * @throws Error if indices are out of bounds
   *
   * Performance: O(1) with simple arithmetic for index calculation
   */
  public get(row: number, col: number): number {
    this.validateIndices(row, col);
    return this.array.get(this.indexOf(row, col));
  }

  /**
   * Adds a value to the existing value at the specified position.
   * Perfect for accumulation patterns in graph algorithms.
   *
   * @param row Row index
   * @param col Column index
   * @param value Value to add
   *
   * Data Science Use Cases:
   * - Accumulate edge weights in multigraphs
   * - Sum feature contributions from multiple sources
   * - Build co-occurrence matrices
   * - Aggregate temporal interactions
   *
   * @example
   * ```typescript
   * // Build co-occurrence matrix
   * transactions.forEach(transaction => {
   *   transaction.items.forEach((item1, i) => {
   *     transaction.items.slice(i + 1).forEach(item2 => {
   *       coOccurrence.addTo(item1, item2, 1);
   *       coOccurrence.addTo(item2, item1, 1); // Symmetric
   *     });
   *   });
   * });
   * ```
   */
  public addTo(row: number, col: number, value: number): void {
    this.validateIndices(row, col);
    this.array.addTo(this.indexOf(row, col), value);
  }

  /**
   * Returns the number of rows in the matrix.
   */
  public rowCount(): number {
    return this.rows;
  }

  /**
   * Returns the number of columns in the matrix.
   */
  public colCount(): number {
    return this.cols;
  }

  /**
   * Returns the total number of elements in the matrix.
   */
  public size(): number {
    return this.totalSize;
  }

  /**
   * Fills the entire matrix with the specified value.
   * Fast O(n) operation using underlying array fill.
   *
   * @param value Value to fill matrix with
   *
   * Common use cases:
   * - Initialize distance matrix with infinity (or large value)
   * - Clear adjacency matrix (fill with 0)
   * - Initialize feature matrix with default values
   */
  public fill(value: number): void {
    this.array.fill(value);
  }

  /**
   * Fills a specific row with the specified value.
   * Efficient for row-wise initialization patterns.
   *
   * @param row Row index to fill
   * @param value Value to fill row with
   */
  public fillRow(row: number, value: number): void {
    if (row < 0 || row >= this.rows) {
      throw new Error(
        `Row index out of bounds: ${row} (matrix has ${this.rows} rows)`
      );
    }

    const startIndex = this.indexOf(row, 0);
    const endIndex = startIndex + this.cols;

    for (let i = startIndex; i < endIndex; i++) {
      this.array.set(i, value);
    }
  }

  /**
   * Fills a specific column with the specified value.
   * Less efficient than fillRow due to non-contiguous memory access.
   *
   * @param col Column index to fill
   * @param value Value to fill column with
   */
  public fillCol(col: number, value: number): void {
    if (col < 0 || col >= this.cols) {
      throw new Error(
        `Column index out of bounds: ${col} (matrix has ${this.cols} columns)`
      );
    }

    for (let row = 0; row < this.rows; row++) {
      this.array.set(this.indexOf(row, col), value);
    }
  }

  /**
   * Creates an iterator for all matrix elements in row-major order.
   * Yields [row, col, value] tuples.
   */
  public *entries(): Generator<[number, number, number]> {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        yield [row, col, this.get(row, col)];
      }
    }
  }

  /**
   * Creates an iterator for a specific row.
   * Memory-efficient iteration without intermediate array creation.
   */
  public *rowValues(row: number): Generator<number> {
    if (row < 0 || row >= this.rows) {
      throw new Error(
        `Row index out of bounds: ${row} (matrix has ${this.rows} rows)`
      );
    }

    for (let col = 0; col < this.cols; col++) {
      yield this.array.get(this.indexOf(row, col));
    }
  }

  /**
   * Creates an iterator for a specific column.
   * Less cache-friendly than row iteration.
   */
  public *colValues(col: number): Generator<number> {
    if (col < 0 || col >= this.cols) {
      throw new Error(
        `Column index out of bounds: ${col} (matrix has ${this.cols} columns)`
      );
    }

    for (let row = 0; row < this.rows; row++) {
      yield this.array.get(this.indexOf(row, col));
    }
  }

  /**
   * Converts a specific row to an array.
   * Creates new array - useful for algorithms requiring array operations.
   */
  public getRow(row: number): number[] {
    if (row < 0 || row >= this.rows) {
      throw new Error(
        `Row index out of bounds: ${row} (matrix has ${this.rows} rows)`
      );
    }

    const result = new Array<number>(this.cols);
    for (let col = 0; col < this.cols; col++) {
      result[col] = this.array.get(this.indexOf(row, col));
    }
    return result;
  }

  /**
   * Converts a specific column to an array.
   */
  public getCol(col: number): number[] {
    if (col < 0 || col >= this.cols) {
      throw new Error(
        `Column index out of bounds: ${col} (matrix has ${this.cols} columns)`
      );
    }

    const result = new Array<number>(this.rows);
    for (let row = 0; row < this.rows; row++) {
      result[row] = this.array.get(this.indexOf(row, col));
    }
    return result;
  }

  /**
   * Sets an entire row from an array.
   * Efficient for batch row operations.
   */
  public setRow(row: number, values: number[]): void {
    if (row < 0 || row >= this.rows) {
      throw new Error(
        `Row index out of bounds: ${row} (matrix has ${this.rows} rows)`
      );
    }
    if (values.length !== this.cols) {
      throw new Error(
        `Row length mismatch: expected ${this.cols}, got ${values.length}`
      );
    }

    for (let col = 0; col < this.cols; col++) {
      this.array.set(this.indexOf(row, col), values[col]);
    }
  }

  /**
   * Sets an entire column from an array.
   */
  public setCol(col: number, values: number[]): void {
    if (col < 0 || col >= this.cols) {
      throw new Error(
        `Column index out of bounds: ${col} (matrix has ${this.cols} columns)`
      );
    }
    if (values.length !== this.rows) {
      throw new Error(
        `Column length mismatch: expected ${this.rows}, got ${values.length}`
      );
    }

    for (let row = 0; row < this.rows; row++) {
      this.array.set(this.indexOf(row, col), values[row]);
    }
  }

  /**
   * Releases all resources and invalidates the matrix.
   * Call this when completely done with the matrix.
   */
  public release(): void {
    this.array.release();
  }

  /**
   * Returns a human-readable string representation.
   * Only practical for small matrices due to output size.
   */
  public toString(): string {
    if (this.rows > 10 || this.cols > 10) {
      return `HugeLongMatrix(${this.rows} × ${this.cols})`;
    }

    const lines: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      const rowValues = this.getRow(row);
      lines.push(`[${rowValues.join(", ")}]`);
    }
    return `[\n  ${lines.join(",\n  ")}\n]`;
  }

  /**
   * Converts 2D indices to 1D array index using row-major order.
   * Formula: index = row * cols + col
   */
  private indexOf(row: number, col: number): number {
    return row * this.cols + col;
  }

  /**
   * Validates that row and column indices are within bounds.
   */
  private validateIndices(row: number, col: number): void {
    if (row < 0 || row >= this.rows) {
      throw new Error(
        `Row index out of bounds: ${row} (matrix has ${this.rows} rows)`
      );
    }
    if (col < 0 || col >= this.cols) {
      throw new Error(
        `Column index out of bounds: ${col} (matrix has ${this.cols} columns)`
      );
    }
  }
}
