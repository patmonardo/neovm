import { RelationshipType } from "@/projection";
import { Direction } from "@/api/schema";
import { RelationshipPropertySchema } from "@/api/schema";
import { Aggregation } from "@/core";
import { ElementSchemaVisitor } from "./ElementSchemaVisitor";
import { InputSchemaVisitor } from "./InputSchemaVisitor";

/**
 * Visitor interface for processing relationship schema input.
 * Extends the base schema visitor with relationship-specific functionality
 * for handling relationship types, aggregation methods, and directions.
 *
 * Also implements RelationshipPropertySchema to provide schema information
 * after processing is complete.
 */
export interface InputRelationshipSchemaVisitor
  extends InputSchemaVisitor,
    RelationshipPropertySchema {
  /**
   * Visits a relationship type in the schema.
   *
   * @param relationshipType The relationship type being processed
   * @returns true to continue processing, false to stop
   */
  relationshipType(relationshipType: RelationshipType): boolean;

  /**
   * Visits an aggregation method for the relationship property.
   *
   * @param aggregation The aggregation method (SUM, MIN, MAX, etc.)
   * @returns true to continue processing, false to stop
   */
  aggregation(aggregation: Aggregation): boolean;

  /**
   * Visits a direction for the relationship.
   *
   * @param direction The relationship direction (OUTGOING, INCOMING, UNDIRECTED)
   * @returns true to continue processing, false to stop
   */
  direction(direction: Direction): boolean;
}

/**
 * Abstract adapter class that provides default implementations for InputRelationshipSchemaVisitor.
 * Extends ElementSchemaVisitor to inherit property schema building capabilities
 * while adding relationship-specific type, aggregation, and direction handling.
 */
export abstract class InputRelationshipSchemaVisitorAdapter
  extends ElementSchemaVisitor
  implements InputRelationshipSchemaVisitor
{
  /**
   * Default implementation that accepts all relationship types.
   * Subclasses can override to provide custom type handling logic.
   *
   * @param relationshipType The relationship type being processed
   * @returns true to continue processing
   */
  relationshipType(relationshipType: RelationshipType): boolean {
    return true;
  }

  /**
   * Default implementation that accepts all aggregation methods.
   * Subclasses can override to provide custom aggregation handling logic.
   *
   * @param aggregation The aggregation method being processed
   * @returns true to continue processing
   */
  aggregation(aggregation: Aggregation): boolean {
    return true;
  }

  /**
   * Default implementation that accepts all directions.
   * Subclasses can override to provide custom direction handling logic.
   *
   * @param direction The direction being processed
   * @returns true to continue processing
   */
  direction(direction: Direction): boolean {
    return true;
  }

  // RelationshipPropertySchema interface methods would be inherited from ElementSchemaVisitor
  // since ElementSchemaVisitor implements PropertySchema, and RelationshipPropertySchema
  // likely extends PropertySchema with additional relationship-specific methods
}

/**
 * Namespace for organizing InputRelationshipSchemaVisitor-related functionality.
 */
export namespace InputRelationshipSchemaVisitor {
  /**
   * Adapter class alias for convenience.
   */
  export const Adapter = InputRelationshipSchemaVisitorAdapter;
}
