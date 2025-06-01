/**
 *
 * Result of importing relationships, organized by relationship type.
 */

import { RelationshipType } from '@/projection';
import { ImmutableTopology } from '@/api';
import { RelationshipPropertyStore } from '@/api/properties/relationships';
import { MutableRelationshipSchema, MutableRelationshipSchemaEntry } from '@/api/schema';
import { SingleTypeRelationshipImporter } from './SingleTypeRelationshipImporter';

export interface RelationshipImportResult {
  readonly importResults: Map<RelationshipType, SingleTypeRelationships>;
  readonly relationshipSchema: MutableRelationshipSchema;
}

export interface SingleTypeRelationships {
  readonly topology: ImmutableTopology;
  readonly inverseTopology?: ImmutableTopology;
  readonly properties?: RelationshipPropertyStore;
  readonly inverseProperties?: RelationshipPropertyStore;
  readonly relationshipSchemaEntry: MutableRelationshipSchemaEntry;
}

class SimpleRelationshipImportResult implements RelationshipImportResult {
  private _relationshipSchema?: MutableRelationshipSchema;

  constructor(
    public readonly importResults: Map<RelationshipType, SingleTypeRelationships>
  ) {}

  get relationshipSchema(): MutableRelationshipSchema {
    if (!this._relationshipSchema) {
      this._relationshipSchema = MutableRelationshipSchema.empty();
      this.importResults.forEach((relationships) => {
        this._relationshipSchema!.set(relationships.relationshipSchemaEntry);
      });
    }
    return this._relationshipSchema;
  }
}

export const RelationshipImportResult = {
  of(relationshipsByType: Map<RelationshipType, SingleTypeRelationships>): RelationshipImportResult {
    return new SimpleRelationshipImportResult(relationshipsByType);
  },

  // Main factory method from Java
  fromImportContexts(
    importContexts: SingleTypeRelationshipImporter.SingleTypeRelationshipImportContext[]
  ): RelationshipImportResult {
    // TODO: Implementation when we have the import context types
    throw new Error('Not implemented yet');
  }
};
