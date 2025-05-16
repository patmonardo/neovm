/**
 * Predicate for checking the existence of relationships between nodes.
 */
export interface RelationshipPredicate {
  /**
   * Checks whether a relationship exists between the source and target nodes.
   *
   * @param sourceNodeId ID of the source node
   * @param targetNodeId ID of the target node
   * @returns true if a relationship exists, false otherwise
   */
  exists(sourceNodeId: number, targetNodeId: number): boolean;
}

/**
 * Namespace containing utility functions for RelationshipPredicate.
 */
export namespace RelationshipPredicate {
  /**
   * Creates a RelationshipPredicate that always returns true.
   *
   * @returns A predicate that accepts all relationships
   */
  export function all(): RelationshipPredicate {
    return {
      exists(_sourceNodeId: number, _targetNodeId: number): boolean {
        return true;
      },
    };
  }

  /**
   * Creates a RelationshipPredicate that always returns false.
   *
   * @returns A predicate that rejects all relationships
   */
  export function none(): RelationshipPredicate {
    return {
      exists(_sourceNodeId: number, _targetNodeId: number): boolean {
        return false;
      },
    };
  }

  /**
   * Creates a RelationshipPredicate that negates the result of the given predicate.
   *
   * @param predicate The predicate to negate
   * @returns A predicate with the opposite behavior
   */
  export function not(predicate: RelationshipPredicate): RelationshipPredicate {
    return {
      exists(sourceNodeId: number, targetNodeId: number): boolean {
        return !predicate.exists(sourceNodeId, targetNodeId);
      },
    };
  }
}
