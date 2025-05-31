/**
 * Long Long Array Consumer - Functional Interface for Sparse Long Array List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, array) pairs
 * **Purpose**: Type-safe consumer for HugeSparseLongArrayList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over long[] arrays with their indices
 */

/**
 * Functional interface for consuming (index, array) pairs from sparse long array lists.
 *
 * **Use Case**: Callback for HugeSparseLongArrayList.forAll() sparse iteration
 * **Parameters**: index (long) + value (long[])
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseArrayList.forAll((index, longArray) => {
 *   console.log(`Index ${index} has array of length ${longArray.length}`);
 * });
 * ```
 */
export interface LongLongArrayConsumer {
  /**
   * Consume an (index, array) pair from a sparse long array list.
   *
   * @param index The index where the array is stored
   * @param value The long[] array at that index
   */
  consume(index: number, value: number[]): void;
}
