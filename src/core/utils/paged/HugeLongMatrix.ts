import { HugeLongArray } from '../../../collections/ha/HugeLongArray';

/**
 * A two-dimensional matrix of long values with huge capacity.
 * Provides row and column-based access to a flat underlying array.
 */
export class HugeLongMatrix {
  private readonly array: HugeLongArray;
  private readonly rows: number;
  private readonly cols: number;

  /**
   * Creates a new matrix with the specified dimensions.
   *
   * @param rows Number of rows
   * @param cols Number of columns
   */
  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;

    // Check for overflow - in JavaScript we need to be careful with large numbers
    const size = this.safeMultiply(rows, cols);
    this.array = HugeLongArray.newArray(size);
  }

  /**
   * Sets the value at the specified coordinates.
   *
   * @param x Row index
   * @param y Column index
   * @param v Value to set
   */
  public set(x: number, y: number, v: number): void {
    console.assert(x < this.rows, "Row index out of bounds");
    console.assert(y < this.cols, "Column index out of bounds");
    this.array.set(this.indexOf(x, y), v);
  }

  /**
   * Gets the value at the specified coordinates.
   *
   * @param x Row index
   * @param y Column index
   * @returns Value at the coordinates
   */
  public get(x: number, y: number): number {
    console.assert(x < this.rows, "Row index out of bounds");
    console.assert(y < this.cols, "Column index out of bounds");
    return this.array.get(this.indexOf(x, y));
  }

  /**
   * Returns the number of rows in the matrix.
   *
   * @returns Number of rows
   */
  public getRows(): number {
    return this.rows;
  }

  /**
   * Returns the number of columns in the matrix.
   *
   * @returns Number of columns
   */
  public getColumns(): number {
    return this.cols;
  }

  /**
   * Releases memory held by this matrix.
   */
  public release(): void {
    this.array.release();
  }

  /**
   * Fills the entire matrix with the given value.
   *
   * @param value Value to fill with
   */
  public fill(value: number): void {
    this.array.fill(value);
  }

  /**
   * Safely multiplies two numbers, checking for overflow.
   *
   * @param a First factor
   * @param b Second factor
   * @returns The product
   * @throws Error if overflow occurs
   */
  private safeMultiply(a: number, b: number): number {
    const result = a * b;

    // Check for overflow
    if (Math.abs(result) === Infinity || (a !== 0 && result / a !== b)) {
      throw new Error(`Multiplication overflow: ${a} * ${b}`);
    }

    return result;
  }

  /**
   * Converts 2D coordinates to a 1D index.
   *
   * @param x Row index
   * @param y Column index
   * @returns The index in the underlying array
   */
  private indexOf(x: number, y: number): number {
    // Note: The original Java code had x * rows + y which looks like a bug
    // The correct formula should be x * cols + y
    return x * this.cols + y;
  }
}
