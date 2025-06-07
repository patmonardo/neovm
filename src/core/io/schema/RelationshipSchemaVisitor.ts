/**
 * RELATIONSHIP SCHEMA VISITOR - STORES STATE AND PROVIDES GETTERS
 *
 * Abstract visitor that stores relationship schema state.
 * Uses method overloading to handle both visitor calls and getter access.
 */

import { RelationshipType } from "@/projection";
import { Direction } from "@/api/schema";
import { Aggregation } from "@/core";
import { InputRelationshipSchemaVisitor } from "./InputRelationshipSchemaVisitor";

export abstract class RelationshipSchemaVisitor extends InputRelationshipSchemaVisitor.Adapter {
  private _relationshipType: RelationshipType | null = null;
  private _aggregation: Aggregation | null = null;
  private _direction: Direction | null = null;

  // OVERLOADED RELATIONSHIP TYPE METHOD
  relationshipType(): RelationshipType | null;
  relationshipType(relationshipType: RelationshipType): boolean;
  relationshipType(
    relationshipType?: RelationshipType
  ): RelationshipType | null | boolean {
    if (relationshipType === undefined) {
      // Getter call - return stored value
      return this._relationshipType;
    } else {
      // Visitor call - store value and return boolean
      this._relationshipType = relationshipType;
      return true;
    }
  }

  // OVERLOADED DIRECTION METHOD
  direction(): Direction | null;
  direction(direction: Direction): boolean;
  direction(direction?: Direction): Direction | null | boolean {
    if (direction === undefined) {
      // Getter call - return stored value
      return this._direction;
    } else {
      // Visitor call - store value and return boolean
      this._direction = direction;
      return true;
    }
  }

  // OVERLOADED AGGREGATION METHOD
  aggregation(): Aggregation | null;
  aggregation(aggregation: Aggregation): boolean;
  aggregation(aggregation?: Aggregation): Aggregation | null | boolean {
    if (aggregation === undefined) {
      // Getter call - return stored value
      return this._aggregation;
    } else {
      // Visitor call - store value and return boolean
      this._aggregation = aggregation;
      return true;
    }
  }

  protected reset(): void {
    super.reset();
    this._relationshipType = null;
    this._aggregation = null;
    this._direction = null;
  }
}
