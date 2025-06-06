/**
 * Long Int Consumer - Functional Interface for Sparse Int List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, value) pairs
 * **Purpose**: Type-safe consumer for HugeSparseIntList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over int primitive values with their indices
 */

/**
 * Functional interface for consuming (index, value) pairs from sparse int lists.
 *
 * **Use Case**: Callback for HugeSparseIntList.forAll() sparse iteration
 * **Parameters**: index (long) + value (int)
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseIntList.forAll((index, value) => {
 *   console.log(`Index ${index} has int value ${value}`);
 * });
 * ```
 */
export interface LongIntConsumer {
  /**
   * Consume an (index, value) pair from a sparse int list.
   *
   * @param index The index where the value is stored
   * @param value The int value at that index
   */
  consume(index: number, value: number): void;
}
