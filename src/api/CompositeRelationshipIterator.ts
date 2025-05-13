/**
 * Iterator for relationships with multiple properties.
 */
export interface CompositeRelationshipIterator {
  /**
   * Returns the degree of the given node id.
   *
   * @param nodeId The node ID to get degree for
   * @returns The number of relationships for the node
   */
  degree(nodeId: number): number;

  /**
   * Applies the given consumer on all relationships of the given node id.
   *
   * @param nodeId The source node ID
   * @param consumer The relationship consumer to apply
   */
  forEachRelationship(nodeId: number, consumer: CompositeRelationshipIterator.RelationshipConsumer): void;

  /**
   * Calls the given consumer for every inverse relationship of a given node.
   * Inverse relationships basically mirror the relationships in the iterator.
   * For example, if `forEachRelationship(42)` returns `1337` then the
   * result of `forEachInverseRelationship(1337)` contains `42`. For undirected
   * relationships, accessing the inverse is never supported.
   *
   * Note, that the inverse index might not always be present. Check
   * `GraphStore.inverseIndexedRelationshipTypes()` before calling this method
   * to verify that the relevant relationship type is inverse indexed.
   *
   * @param nodeId The node for which to iterate the inverse relationships
   * @param consumer The relationship consumer function
   */
  forEachInverseRelationship(nodeId: number, consumer: CompositeRelationshipIterator.RelationshipConsumer): void;

  /**
   * Returns the property keys that are managed by this iterator.
   * The order is equivalent to the order of the value array in
   * `RelationshipConsumer.consume(source, target, properties)`.
   *
   * @returns Array of property keys
   */
  propertyKeys(): string[];

  /**
   * Creates a thread-safe copy of the iterator.
   *
   * @returns A concurrent copy of this iterator
   */
  concurrentCopy(): CompositeRelationshipIterator;
}

/**
 * Namespace containing types related to CompositeRelationshipIterator
 */
export namespace CompositeRelationshipIterator {
  /**
   * Consumer interface for processing relationships with properties
   */
  export interface RelationshipConsumer {
    /**
     * This method is called for every relationship of the specified iterator.
     * The order of the `properties` is equivalent to the order of the property
     * key array returned by `CompositeRelationshipIterator.propertyKeys()`.
     * The provided array for `properties` might be reused across different invocations
     * and should not be stored without making a copy.
     *
     * @param source The source node ID
     * @param target The target node ID
     * @param properties The property values for this relationship
     * @returns True to continue iteration, false to stop
     */
    consume(source: number, target: number, properties: number[]): boolean;
  }
}
