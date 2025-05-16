import {
  RelationshipCursorImpl,
  ModifiableRelationshipCursorImpl,
} from "../primitive/RelationshipCursorImpl";

/**
 * Represents a relationship between two nodes with an associated property value.
 * Provides access to the source node ID, target node ID, and property value.
 */
export interface RelationshipCursor {
  /**
   * Returns the ID of the source node.
   *
   * @returns The source node ID
   */
  sourceId(): number;

  /**
   * Returns the ID of the target node.
   *
   * @returns The target node ID
   */
  targetId(): number;

  /**
   * Returns the property value associated with this relationship.
   *
   * @returns The property value
   */
  property(): number;
}

/**
 * Interface for a modifiable version of RelationshipCursor.
 */
export interface ModifiableRelationshipCursor extends RelationshipCursor {
  /**
   * Sets the source node ID.
   *
   * @param sourceId The source node ID
   * @returns This cursor for chaining
   */
  setSourceId(sourceId: number): ModifiableRelationshipCursor;

  /**
   * Sets the target node ID.
   *
   * @param targetId The target node ID
   * @returns This cursor for chaining
   */
  setTargetId(targetId: number): ModifiableRelationshipCursor;

  /**
   * Sets the property value.
   *
   * @param property The property value
   * @returns This cursor for chaining
   */
  setProperty(property: number): ModifiableRelationshipCursor;
}

/**
 * Namespace providing factory methods for RelationshipCursor.
 */
export namespace RelationshipCursor {
  /**
   * Creates a new immutable RelationshipCursor.
   *
   * @param sourceId The source node ID
   * @param targetId The target node ID
   * @param property The property value
   * @returns A new RelationshipCursor
   */
  export function of(
    sourceId: number,
    targetId: number,
    property: number
  ): RelationshipCursor {
    return new RelationshipCursorImpl(sourceId, targetId, property);
  }

  /**
   * Creates a modifiable (mutable) RelationshipCursor.
   *
   * @returns A new modifiable RelationshipCursor
   */
  export function modifiable(): ModifiableRelationshipCursor {
    return new ModifiableRelationshipCursorImpl(0, 0, 0);
  }
}
