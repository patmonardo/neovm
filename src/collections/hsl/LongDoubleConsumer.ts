/**
 * Long Double Consumer - Functional Interface for Sparse Double List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, value) pairs
 * **Purpose**: Type-safe consumer for HugeSparseDoubleList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over double primitive values with their indices
 */

/**
 * Functional interface for consuming (index, value) pairs from sparse double lists.
 *
 * **Use Case**: Callback for HugeSparseDoubleList.forAll() sparse iteration
 * **Parameters**: index (long) + value (double)
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseDoubleList.forAll((index, value) => {
 *   console.log(`Index ${index} has double value ${value}`);
 * });
 * ```
 */
@FunctionalInterface
export interface LongDoubleConsumer {
  /**
   * Consume an (index, value) pair from a sparse double list.
   *
   * @param index The index where the value is stored
   * @param value The double value at that index
   */
  consume(index: number, value: number): void;
}
