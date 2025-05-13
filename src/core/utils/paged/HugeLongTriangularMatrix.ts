import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { HugeMatrices } from './HugeMatrices';

/**
 * A triangular matrix of long values with huge capacity.
 * Only stores the upper triangle of the matrix (including diagonal), saving roughly half the memory.
 */
export class HugeLongTriangularMatrix {
  private readonly array: HugeLongArray;
  private readonly order: number;

  /**
   * Creates a new triangular matrix with the specified order.
   *
   * @param order The dimension size
   */
  constructor(order: number) {
    // Size formula for triangular matrix: n(n+1)/2
    const size = (order * (order + 1)) / 2;

    // Check for overflow
    if (!isFinite(size) || size < 0) {
      throw new Error(`Matrix size overflow: ${order}x${order+1}/2`);
    }

    this.order = order;
    this.array = HugeLongArray.newArray(size);
  }

  /**
   * Sets the value at the specified coordinates.
   * Coordinates will be normalized to ensure x ≤ y (upper triangle).
   *
   * @param x Row index
   * @param y Column index
   * @param v Value to set
   */
  public set(x: number, y: number, v: number): void {
    // Ensure we're accessing the upper triangle (x ≤ y)
    if (x > y) {
      [x, y] = [y, x];
    }

    this.array.set(this.indexOf(x, y), v);
  }

  /**
   * Gets the value at the specified coordinates.
   * Coordinates will be normalized to ensure x ≤ y (upper triangle).
   *
   * @param x Row index
   * @param y Column index
   * @returns Value at the coordinates
   */
  public get(x: number, y: number): number {
    // Ensure we're accessing the upper triangle (x ≤ y)
    if (x > y) {
      [x, y] = [y, x];
    }

    return this.array.get(this.indexOf(x, y));
  }

  /**
   * Returns the order (size) of this triangular matrix.
   *
   * @returns The order
   */
  public getOrder(): number {
    return this.order;
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
   * Releases memory held by this matrix.
   */
  public release(): void {
    this.array.release();
  }

  /**
   * Converts 2D coordinates to a 1D index in the triangular array.
   * Assumes x ≤ y (upper triangle).
   *
   * @param x Row index
   * @param y Column index
   * @returns The index in the underlying array
   */
  private indexOf(x: number, y: number): number {
    return HugeMatrices.triangularIndex(this.order, x, y);
  }
}
