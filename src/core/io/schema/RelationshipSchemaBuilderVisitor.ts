/**
 * RELATIONSHIP SCHEMA BUILDER VISITOR - BUILDS MUTABLE RELATIONSHIP SCHEMA
 *
 * Concrete visitor that builds MutableRelationshipSchema from streaming data.
 * Uses stored state from parent class to construct schema entries.
 */

import { MutableRelationshipSchema } from '@/api/schema';
import { RelationshipPropertySchema } from '@/api/schema';
import { RelationshipSchemaVisitor } from './RelationshipSchemaVisitor';

export class RelationshipSchemaBuilderVisitor extends RelationshipSchemaVisitor {
  private readonly _schema: MutableRelationshipSchema;

  constructor() {
    super();
    this._schema = MutableRelationshipSchema.empty();
  }

  protected export(): void {
    const relationshipType = this.relationshipType();
    const direction = this.direction();

    // Guard against null values
    if (relationshipType === null || direction === null) {
      return; // Skip this entry if missing required fields
    }

    const entry = this._schema.getOrCreateRelationshipType(relationshipType, direction);

    if (this.key() !== null) {
      const aggregation = this.aggregation();
      if (aggregation === null) {
        return; // Skip if aggregation is missing
      }

      entry.addProperty(
        this.key()!,
        RelationshipPropertySchema.of(
          this.key()!,
          this.valueType(),
          this.defaultValue(),
          this.state(),
          aggregation
        )
      );
    }
  }

  schema(): MutableRelationshipSchema {
    return this._schema;
  }
}
