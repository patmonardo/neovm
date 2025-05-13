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
    return new ModifiableRelationshipCursorImpl(0n, 0n, 0);
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
}

/**
 * Immutable implementation of RelationshipCursor.
 */
class RelationshipCursorImpl implements RelationshipCursor {
  /**
   * Creates a new immutable RelationshipCursor implementation.
   *
   * @param _sourceId The source node ID
   * @param _targetId The target node ID
   * @param _property The property value
   */
  constructor(
    private readonly _sourceId: number,
    private readonly _targetId: number,
    private readonly _property: number
  ) {}

  sourceId(): number {
    return this._sourceId;
  }

  targetId(): number {
    return this._targetId;
  }

  property(): number {
    return this._property;
  }
}

/**
 * Mutable implementation of ModifiableRelationshipCursor.
 */
class ModifiableRelationshipCursorImpl implements RelationshipCursor.ModifiableRelationshipCursor {
  /**
   * Creates a new mutable RelationshipCursor implementation.
   *
   * @param _sourceId The initial source node ID
   * @param _targetId The initial target node ID
   * @param _property The initial property value
   */
  constructor(
    private _sourceId: number,
    private _targetId: number,
    private _property: number
  ) {}

  sourceId(): number {
    return this._sourceId;
  }

  targetId(): number {
    return this._targetId;
  }

  property(): number {
    return this._property;
  }

  setSourceId(sourceId: number): RelationshipCursor.ModifiableRelationshipCursor {
    this._sourceId = sourceId;
    return this;
  }

  setTargetId(targetId: number): RelationshipCursor.ModifiableRelationshipCursor {
    this._targetId = targetId;
    return this;
  }

  setProperty(property: number): RelationshipCursor.ModifiableRelationshipCursor {
    this._property = property;
    return this;
  }
}
