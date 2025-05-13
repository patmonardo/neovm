/**
 * TODO: Define interface contract, especially regarding source/target node ids returned
 * and how that maps to relationship direction
 *
 * Consumer interface for relationships without property.
 */
export interface RelationshipConsumer {
  /**
   * Called for every edge that matches a given relation-constraint
   *
   * @param sourceNodeId mapped source node id
   * @param targetNodeId mapped target node id
   * @returns `true` if the iteration shall continue, otherwise `false`
   */
  accept(sourceNodeId: number, targetNodeId: number): boolean;
}

/**
 * Provides utility functions for RelationshipConsumer operations.
 */
export namespace RelationshipConsumer {
  /**
   * Creates a new RelationshipConsumer that executes this consumer and then the given consumer.
   *
   * @param first The first consumer to execute
   * @param after The consumer to execute after the first one
   * @returns A combined consumer that executes both in sequence
   */
  export function andThen(
    first: RelationshipConsumer,
    after: RelationshipConsumer
  ): RelationshipConsumer {
    return {
      accept(sourceNodeId: number, targetNodeId: number): boolean {
        first.accept(sourceNodeId, targetNodeId);
        return after.accept(sourceNodeId, targetNodeId);
      }
    };
  }

  /**
   * Creates a consumer that always returns true (continues iteration).
   *
   * @param callback Function to call for each relationship
   * @returns A RelationshipConsumer that always continues iteration
   */
  export function forEachRelationship(
    callback: (sourceNodeId: number, targetNodeId: number) => void
  ): RelationshipConsumer {
    return {
      accept(sourceNodeId: number, targetNodeId: number): boolean {
        callback(sourceNodeId, targetNodeId);
        return true;
      }
    };
  }
}
