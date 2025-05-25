import { RelationshipType } from "@/projection";
import { Direction } from "@/api/schema";
import { Aggregation } from "@/core";
import { InputRelationshipSchemaVisitor } from "./InputRelationshipSchemaVisitor";

/**
 * Abstract base class for relationship schema visitors that need to track the current
 * relationship type, direction, and aggregation method.
 *
 * Extends the InputRelationshipSchemaVisitor adapter and adds state management for
 * relationship-specific schema components that are being processed.
 *
 * This class serves as a convenient base for concrete relationship schema visitors
 * that need to know the current relationship context when processing properties.
 */
export abstract class RelationshipSchemaVisitor extends InputRelationshipSchemaVisitor.Adapter {
  private _relationshipType: RelationshipType | null = null;
  private _aggregation: Aggregation | null = null;
  private _direction: Direction | null = null;

  /**
   * Gets the currently active relationship type.
   * Sets the current relationship type being processed.
   * Resets the relationship type when passed null.
   */
  relationshipType(): RelationshipType | null;
  relationshipType(relationshipType: RelationshipType | null): boolean;
  relationshipType(relationshipType?: RelationshipType | null): RelationshipType | null | boolean {
    if (relationshipType === undefined) {
      // Getter behavior
      return this._relationshipType;
    } else {
      // Setter/reset behavior
      this._relationshipType = relationshipType;
      return true;
    }
  }

  /**
   * Gets the currently active direction.
   * Sets the current direction being processed.
   * Resets the direction when passed null.
   */
  direction(): Direction | null;
  direction(direction: Direction | null): boolean;
  direction(direction?: Direction | null): Direction | null | boolean {
    if (direction === undefined) {
      // Getter behavior
      return this._direction;
    } else {
      // Setter/reset behavior
      this._direction = direction;
      return true;
    }
  }

  /**
   * Gets the currently active aggregation method.
   * Sets the current aggregation method being processed.
   * Resets the aggregation when passed null.
   * Implements the aggregation() method from RelationshipPropertySchema interface.
   */
  aggregation(): Aggregation | null;
  aggregation(aggregation: Aggregation | null): boolean;
  aggregation(aggregation?: Aggregation | null): Aggregation | null | boolean {
    if (aggregation === undefined) {
      // Getter behavior
      return this._aggregation;
    } else {
      // Setter/reset behavior
      this._aggregation = aggregation;
      return true;
    }
  }

  /**
   * Resets all state including relationship type, aggregation, and direction.
   * Called after processing each complete property to prepare for the next one.
   */
  protected reset(): void {
    super.reset();
    this.relationshipType(null);
    this.aggregation(null);
    this.direction(null);
  }
}
