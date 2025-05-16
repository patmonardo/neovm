/**
 * Consumer interface for relationships with property values.
 */
export interface RelationshipWithPropertyConsumer {
  /**
   * Called for every relationship that matches a given relation-constraint.
   *
   * @param sourceNodeId Mapped source node ID
   * @param targetNodeId Mapped target node ID
   * @param property Relationship property value
   * @returns `true` if the iteration should continue, otherwise `false`
   */
  accept(sourceNodeId: number, targetNodeId: number, property: number): boolean;
}

/**
 * Namespace providing utility functions for RelationshipWithPropertyConsumer.
 */
export namespace RelationshipWithPropertyConsumer {
  /**
   * Creates a new consumer that executes the first consumer and then the second one.
   *
   * @param first The first consumer to execute
   * @param after The second consumer to execute
   * @returns A combined consumer that executes both in sequence
   */
  export function andThen(
    first: RelationshipWithPropertyConsumer,
    after: RelationshipWithPropertyConsumer
  ): RelationshipWithPropertyConsumer {
    return {
      accept(
        sourceNodeId: number,
        targetNodeId: number,
        property: number
      ): boolean {
        first.accept(sourceNodeId, targetNodeId, property);
        return after.accept(sourceNodeId, targetNodeId, property);
      },
    };
  }

  /**
   * Creates a consumer that always returns true (continues iteration).
   *
   * @param callback Function to call for each relationship
   * @returns A RelationshipWithPropertyConsumer that always continues iteration
   */
  export function forEachRelationship(
    callback: (
      sourceNodeId: number,
      targetNodeId: number,
      property: number
    ) => void
  ): RelationshipWithPropertyConsumer {
    return {
      accept(
        sourceNodeId: number,
        targetNodeId: number,
        property: number
      ): boolean {
        callback(sourceNodeId, targetNodeId, property);
        return true;
      },
    };
  }
}
