/**
 * Long Byte Array Consumer - Functional Interface for Sparse Byte Array List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, matrix) pairs
 * **Purpose**: Type-safe consumer for HugeSparseByteArrayArrayList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over byte[][] matrices with their indices
 */

export interface LongByteArrayConsumer {
  /**
   * Consume an (index, matrix) pair from a sparse byte array array list.
   *
   * @param index The index where the matrix is stored
   * @param value The byte[][] matrix at that index
   */
  consume(index: number, value: number[][]): void;
}
