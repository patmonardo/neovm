import { MutableRelationshipSchema } from '@/api/schema';
import { RelationshipPropertySchema } from '@/api/schema';
import { RelationshipSchemaVisitor } from './RelationshipSchemaVisitor';

/**
 * Concrete visitor implementation for building relationship schemas.
 * Collects relationship type, direction, and property schema definitions and builds
 * a complete MutableRelationshipSchema that can be used for graph construction.
 *
 * This visitor accumulates schema information as it processes input,
 * organizing properties by relationship type and direction, and providing
 * the final structured schema for the entire relationship space.
 */
export class RelationshipSchemaBuilderVisitor extends RelationshipSchemaVisitor {
  private readonly schema: MutableRelationshipSchema;

  constructor() {
    super();
    this.schema = MutableRelationshipSchema.empty();
  }

  /**
   * Exports a completed property schema to the appropriate relationship type/direction combination.
   * Called by the base class when a complete property definition has been assembled.
   *
   * If no property key is set, this represents a type/direction-only entry
   * (relationship with type and direction but no properties).
   */
  protected export(): void {
    const entry = this.schema.getOrCreateRelationshipType(
      this.relationshipType(),
      this.direction()
    );

    if (this.key() !== null) {
      entry.addProperty(
        this.key(),
        RelationshipPropertySchema.of(
          this.key(),
          this.valueType(),
          this.defaultValue(),
          this.state(),
          this.aggregation()
        )
      );
    }
  }

  /**
   * Returns the completed mutable relationship schema.
   *
   * @returns The built relationship schema with all types, directions, and their properties
   */
  schema(): MutableRelationshipSchema {
    return this.schema;
  }

  /**
   * Returns a string representation of this visitor.
   */
  toString(): string {
    return `RelationshipSchemaBuilderVisitor{typeCount=${this.schema.typeCount()}}`;
  }

  /**
   * Checks if the schema is empty.
   */
  isEmpty(): boolean {
    return this.schema.isEmpty();
  }

  /**
   * Gets the number of relationship types in the schema.
   */
  typeCount(): number {
    return this.schema.typeCount();
  }

  /**
   * Gets the total number of properties across all relationship types and directions.
   */
  totalPropertyCount(): number {
    return this.schema.totalPropertyCount();
  }
}
