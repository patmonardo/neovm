/**
 * Long Byte Array Array Consumer - Functional Interface for Sparse Byte Array Array List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, matrix) pairs
 * **Purpose**: Type-safe consumer for HugeSparseByteArrayArrayList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over byte[][] matrices with their indices
 */

/**
 * Functional interface for consuming (index, matrix) pairs from sparse byte array array lists.
 *
 * **Use Case**: Callback for HugeSparseByteArrayArrayList.forAll() sparse iteration
 * **Parameters**: index (long) + value (byte[][])
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseByteMatrixList.forAll((index, byteMatrix) => {
 *   console.log(`Index ${index} has ${byteMatrix.length}x${byteMatrix[0]?.length} byte matrix`);
 * });
 * ```
 */
export interface LongByteArrayArrayConsumer {
  /**
   * Consume an (index, matrix) pair from a sparse byte array array list.
   *
   * @param index The index where the matrix is stored
   * @param value The byte[][] matrix at that index
   */
  consume(index: number, value: number[][]): void;
}
