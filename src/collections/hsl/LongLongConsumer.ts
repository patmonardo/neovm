/**
 * Long Long Consumer - Functional Interface for Sparse Long List Iteration
 *
 * **The Pattern**: Simple callback interface for processing (index, value) pairs
 * **Purpose**: Type-safe consumer for HugeSparseLongList.forAll() operations
 * **Functional**: Single method interface for lambda/arrow function usage
 *
 * **Perfect For**: Sparse iteration over long primitive values with their indices
 */

/**
 * Functional interface for consuming (index, value) pairs from sparse long lists.
 *
 * **Use Case**: Callback for HugeSparseLongList.forAll() sparse iteration
 * **Parameters**: index (long) + value (long)
 * **Functional**: Can be implemented with arrow functions
 *
 * **Example Usage**:
 * ```typescript
 * sparseList.forAll((index, value) => {
 *   console.log(`Index ${index} has value ${value}`);
 * });
 * ```
 */

export interface LongLongConsumer {
  /**
   * Consume an (index, value) pair from a sparse long list.
   *
   * @param index The index where the value is stored
   * @param value The long value at that index
   */
  consume(index: number, value: number): void;
}
