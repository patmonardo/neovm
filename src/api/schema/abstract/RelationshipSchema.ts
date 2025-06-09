import { RelationshipType } from "@/projection";
import { Direction } from "../Direction";
import { RelationshipSchemaEntry } from "../abstract/RelationshipSchemaEntry";
import { ElementSchema } from "./ElementSchema";
import { RelationshipPropertySchema } from "./RelationshipPropertySchema";

/**
 * Schema definition for relationships in a graph.
 * Extends the general ElementSchema with relationship-specific functionality.
 */
export abstract class RelationshipSchema extends ElementSchema<
  RelationshipSchema,
  RelationshipType,
  RelationshipSchemaEntry,
  RelationshipPropertySchema
> {
  /**
   * Returns all schema entries.
   */
  abstract entries(): Array<RelationshipSchemaEntry>;

  /**
   * Gets a schema entry by its identifier.
   */
  abstract get(
    identifier: RelationshipType
  ): RelationshipSchemaEntry | undefined;

  /**
   * Creates a filtered version of this schema.
   */
  abstract filter(
    relationshipTypesToKeep: Array<RelationshipType>
  ): RelationshipSchema;

  /**
   * Combines this schema with another schema.
   */
  abstract union(other: RelationshipSchema): RelationshipSchema;

  /**
   * Returns all available relationship types in this schema.
   */
  abstract availableTypes(): Array<RelationshipType>;

  /**
   * Checks if the relationships in this schema are undirected.
   */
  abstract isUndirected(): boolean;

  /**
   * Checks if relationships of a specific type are undirected.
   */
  abstract isUndirected(type: RelationshipType): boolean;

  /**
   * Returns a map of relationship types to their directions.
   * @deprecated To be removed
   */
  abstract directions(): Map<RelationshipType, Direction>;

  /**
   * Converts this schema to a map representation using the old format.
   */
  toMapOld(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const entry of this.entries()) {
      const typeName = entry.identifier().name();

      result[typeName] = {
        properties: RelationshipSchema.propertySchemaMap(entry),
        direction: entry.direction().toString(),
        aggregation: entry.aggregation().toString(),
      };
    }

    return result;
  }
}

/**
 * Namespace providing utility functions for RelationshipSchema.
 */
export namespace RelationshipSchema {

  /**
   * Creates an empty relationship schema with no entries.
  */
 export function empty(): RelationshipSchema {
    const {
      MutableRelationshipSchema,
    } = require("../primitive/MutableRelationshipSchema.js");
    return MutableRelationshipSchema.empty();
  }

  /**
   * Converts property schemas to a map representation
   */
  export function propertySchemaMap(
    entry: RelationshipSchemaEntry
  ): Map<string, any> {
    const propertySchemas = entry.properties();
    const properties = new Map<string, any>();

    propertySchemas.forEach((schema, key) => {
      properties.set(key, {
        valueType: schema.valueType().toString(),
        defaultValue: schema.defaultValue().toString(),
        state: schema.state().toString(),
        aggregation: schema.aggregation().toString(),
      });
    });

    return properties;
  }
}
