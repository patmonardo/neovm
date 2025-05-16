import { ElementIdentifier } from '@/projection/ElementIdentifier';
import { RelationshipType } from '@/projection/RelationshipType';
import { PropertySchema } from './PropertySchema';
import { RelationshipPropertySchema } from './RelationshipPropertySchema';
import { ElementSchemaEntry } from './ElementSchemaEntry';
import { Direction } from './Direction';

/**
 * Schema entry for a relationship type in a graph.
 * This represents the schema definition for a specific relationship type,
 * including its properties and direction.
 */
export abstract class RelationshipSchemaEntry extends ElementSchemaEntry<
  RelationshipSchemaEntry,
  RelationshipType,
  RelationshipPropertySchema
> {
  /**
   * Returns the relationship type for this schema entry.
   */
  abstract identifier(): RelationshipType;

  /**
   * Returns the properties associated with this relationship type.
   */
  abstract properties(): Record<string, RelationshipPropertySchema>;

  /**
   * Returns the direction of relationships with this type.
   *
   * @returns The relationship direction
   */
  abstract direction(): Direction;

  /**
   * Checks whether relationships with this type are undirected.
   *
   * @returns True if relationships are undirected
   */
  abstract isUndirected(): boolean;

  /**
   * Creates a union of this entry with another entry.
   */
  abstract union(other: RelationshipSchemaEntry): RelationshipSchemaEntry;

  /**
   * Returns the aggregation strategy for this relationship type.
   */
  aggregation(): any {
    // Default implementation returns a default aggregation
    // This would be implementation-dependent
    return { type: "NONE" }; // Placeholder
  }
}

/**
 * Namespace providing utility functions and factories for RelationshipSchemaEntry.
 */
export namespace RelationshipSchemaEntry {
  /**
   * Creates an empty relationship schema entry with the given type and direction.
   *
   * @param relationshipType The relationship type
   * @param direction The relationship direction
   * @returns A new empty RelationshipSchemaEntry
   */
  export function of(
    relationshipType: RelationshipType,
    direction: Direction
  ): RelationshipSchemaEntry {
    // Import here to avoid circular dependencies
    const {
      MutableRelationshipSchemaEntry,
    } = require("./MutableRelationshipSchemaEntry");
    return new MutableRelationshipSchemaEntry(relationshipType, direction);
  }

  /**
   * Converts a relationship schema entry to a map representation.
   * Use the same generic signature as the parent class, but specialize the implementation
   */
  export function toMap<
    SELF extends ElementSchemaEntry<SELF, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>,
    ELEMENT_IDENTIFIER extends ElementIdentifier,
    PROPERTY_SCHEMA extends PropertySchema
  >(
    entry: ElementSchemaEntry<SELF, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>
  ): Record<string, any> {
    // Get the base map from parent
    const baseMap = ElementSchemaEntry.toMap(entry);

    // Add relationship-specific fields if this is a RelationshipSchemaEntry
    if (entry instanceof RelationshipSchemaEntry) {
      return {
        ...baseMap,
        direction: entry.direction().toString(),
      };
    }

    // Otherwise just return the base map
    return baseMap;
  }
}
