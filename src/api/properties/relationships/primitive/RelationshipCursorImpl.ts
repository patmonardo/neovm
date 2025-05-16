import { RelationshipCursor } from "../abstract/RelationshipCursor";
import { ModifiableRelationshipCursor } from "../abstract/RelationshipCursor";

/**
 * Immutable implementation of RelationshipCursor.
 */
export class RelationshipCursorImpl implements RelationshipCursor {
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
export class ModifiableRelationshipCursorImpl
  implements ModifiableRelationshipCursor
{
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

  setSourceId(
    sourceId: number
  ): ModifiableRelationshipCursor {
    this._sourceId = sourceId;
    return this;
  }

  setTargetId(
    targetId: number
  ): ModifiableRelationshipCursor {
    this._targetId = targetId;
    return this;
  }

  setProperty(
    property: number
  ): ModifiableRelationshipCursor {
    this._property = property;
    return this;
  }
}
