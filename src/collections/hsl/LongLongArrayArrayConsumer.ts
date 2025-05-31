/**
 * Long Long Array Array Consumer - Functional Interface for Sparse Long Array Array List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, matrix) pairs
 * **Purpose**: Type-safe consumer for HugeSparseLongArrayArrayList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over long[][] matrices with their indices
 */

/**
 * Functional interface for consuming (index, matrix) pairs from sparse long array array lists.
 *
 * **Use Case**: Callback for HugeSparseLongArrayArrayList.forAll() sparse iteration
 * **Parameters**: index (long) + value (long[][])
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseMatrixList.forAll((index, longMatrix) => {
 *   console.log(`Index ${index} has ${longMatrix.length}x${longMatrix[0]?.length} matrix`);
 * });
 * ```
 */
export interface LongLongArrayArrayConsumer {
  /**
   * Consume an (index, matrix) pair from a sparse long array array list.
   *
   * @param index The index where the matrix is stored
   * @param value The long[][] matrix at that index
   */
  consume(index: number, value: number[][]): void;
}
