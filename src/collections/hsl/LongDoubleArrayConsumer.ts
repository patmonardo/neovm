/**
 * Long Double Array Consumer - Functional Interface for Sparse Double Array List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, array) pairs
 * **Purpose**: Type-safe consumer for HugeSparseDoubleArrayList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over double[] arrays with their indices
 */

/**
 * Functional interface for consuming (index, array) pairs from sparse double array lists.
 *
 * **Use Case**: Callback for HugeSparseDoubleArrayList.forAll() sparse iteration
 * **Parameters**: index (long) + value (double[])
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseDoubleArrayList.forAll((index, doubleArray) => {
 *   console.log(`Index ${index} has double array of length ${doubleArray.length}`);
 * });
 * ```
 */
export interface LongDoubleArrayConsumer {
  /**
   * Consume an (index, array) pair from a sparse double array list.
   *
   * @param index The index where the array is stored
   * @param value The double[] array at that index
   */
  consume(index: number, value: number[]): void;
}
