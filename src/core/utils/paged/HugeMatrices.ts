/**
 * Utility methods for working with huge matrices.
 */
export class HugeMatrices {
  /**
   * Calculates the index in a triangular matrix for the given coordinates.
   * This method assumes x ≤ y (upper triangular storage).
   * 
   * @param order The dimension size of the matrix
   * @param x Row index
   * @param y Column index
   * @returns Index in the flattened array
   */
  public static triangularIndex(order: number, x: number, y: number): number {
    console.assert(x <= y, "Triangular index requires x ≤ y");
    console.assert(x < order, "Row index must be less than order");
    console.assert(y < order, "Column index must be less than order");
    
    // The formula for triangular index with x ≤ y is:
    // x * order + y - (x * (x + 1) / 2)
    return x * order + y - (x * (x + 1) / 2);
  }

  /**
   * Private constructor to prevent instantiation.
   * This class only contains static methods.
   */
  private constructor() {
    throw new Error("No instances of HugeMatrices allowed");
  }
}