/**
 * Getter for property values at relationships.
 * Provides access to relationship property values by source and target node IDs.
 */
export interface RelationshipProperties {
  /**
   * Gets the value of a property on the relationship between source and target node.
   *
   * @param sourceNodeId Source node ID
   * @param targetNodeId Target node ID
   * @param fallbackValue Value to use if relationship has no property value
   * @returns The property value or fallback value if not found
   */
  relationshipProperty(sourceNodeId: number, targetNodeId: number, fallbackValue: number): number;

  /**
   * Gets the value of a property on the relationship between source and target node.
   * Uses a default fallback value if the relationship has no property value.
   *
   * @param sourceNodeId Source node ID
   * @param targetNodeId Target node ID
   * @returns The property value
   */
  relationshipProperty(sourceNodeId: number, targetNodeId: number): number;
}

/**
 * Namespace providing utility functions and factories for RelationshipProperties.
 */
export namespace RelationshipProperties {
  /**
   * Returns a RelationshipProperties implementation that always returns the same value.
   *
   * @param value The value to return for all relationships
   * @returns A constant value implementation
   */
  export function constant(value: number): RelationshipProperties {
    return {
      relationshipProperty(sourceNodeId: number, targetNodeId: number, fallbackValue?: number): number {
        return value;
      }
    };
  }

  /**
   * Returns a RelationshipProperties implementation that always returns the fallback value.
   *
   * @returns An empty implementation
   */
  export function empty(): RelationshipProperties {
    return {
      relationshipProperty(sourceNodeId: number, targetNodeId: number, fallbackValue: number = 0): number {
        return fallbackValue;
      }
    };
  }
}
