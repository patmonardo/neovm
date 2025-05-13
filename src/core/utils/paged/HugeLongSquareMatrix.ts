import { HugeLongMatrix } from './HugeLongMatrix';

/**
 * A square matrix of long values with huge capacity.
 * Both dimensions (rows and columns) have the same size.
 */
export class HugeLongSquareMatrix extends HugeLongMatrix {
  /**
   * Creates a new square matrix with the specified order (dimension size).
   * 
   * @param order The size of each dimension
   */
  constructor(order: number) {
    super(order, order);
  }

  /**
   * Returns the order (size) of this square matrix.
   * 
   * @returns The order
   */
  public getOrder(): number {
    return this.getRows();
  }
}