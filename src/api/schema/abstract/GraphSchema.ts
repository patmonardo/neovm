import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { NodeSchema } from "./NodeSchema";
import { RelationshipSchema } from "./RelationshipSchema";
import { RelationshipPropertySchema } from "./RelationshipPropertySchema";
import { PropertySchema } from "./PropertySchema";
import { Direction } from "../Direction";

/**
 * Schema representation for a graph, including node and relationship schemas.
 */
export abstract class GraphSchema {
  /**
   * Returns the node schema for this graph.
   */
  abstract nodeSchema(): NodeSchema;

  /**
   * Returns the relationship schema for this graph.
   */
  abstract relationshipSchema(): RelationshipSchema;

  /**
   * Returns graph-level properties.
   */
  abstract graphProperties(): Map<string, PropertySchema>;

  /**
   * Creates a filtered version of this schema containing only the specified node labels.
   *
   * @param labelsToKeep Set of node labels to include
   * @returns A new schema containing only the specified node labels
   */
  abstract filterNodeLabels(labelsToKeep: Set<NodeLabel>): GraphSchema;

  /**
   * Creates a filtered version of this schema containing only the specified relationship types.
   *
   * @param relationshipTypesToKeep Set of relationship types to include
   * @returns A new schema containing only the specified relationship types
   */
  abstract filterRelationshipTypes(
    relationshipTypesToKeep: Set<RelationshipType>
  ): GraphSchema;

  /**
   * Combines this schema with another schema.
   *
   * @param other The schema to merge with this one
   * @returns A new schema containing elements from both schemas
   */
  abstract union(other: GraphSchema): GraphSchema;

  /**
   * Converts the schema to a map representation.
   */
  toMap(): Record<string, any> {
    return {
      nodes: this.nodeSchema().toMap(),
      relationships: this.relationshipSchema().toMap(),
      graphProperties: this.graphPropertySchemaMap(),
    };
  }

  /**
   * Converts the schema to a map representation (legacy format).
   */
  toMapOld(): Record<string, any> {
    return {
      nodes: this.nodeSchema().toMap(),
      relationships: this.relationshipSchema().toMapOld(),
      graphProperties: this.graphPropertySchemaMap(),
    };
  }

  /**
   * Checks if the graph has undirected relationships.
   */
  isUndirected(): boolean {
    return this.relationshipSchema().isUndirected();
  }

  /**
   * Returns the direction of relationships in this graph.
   */
  direction(): Direction {
    return this.relationshipSchema().isUndirected()
      ? Direction.UNDIRECTED
      : Direction.DIRECTED;
  }

  /**
   * Creates a map of graph property schemas.
   */
  private graphPropertySchemaMap(): Record<string, string> {
    const result: Record<string, string> = {};

    this.graphProperties().forEach((propertySchema, key) => {
      result[key] = GraphSchema.forPropertySchema(propertySchema);
    });

    return result;
  }
}

/**
 * Static utilities for working with graph schemas.
 */
export namespace GraphSchema {
  /**
   * Creates an empty graph schema.
   */
  export function empty(): GraphSchema {
    // Import here to avoid circular dependency
    const { MutableGraphSchema } = require('./MutableGraphSchema');
    return MutableGraphSchema.empty();
  }

  /**
   * Creates a new mutable graph schema.
   */
  export function mutable(): GraphSchema {
    // Import here to avoid circular dependency
    const { MutableGraphSchema } = require('./MutableGraphSchema');
    return MutableGraphSchema.empty();
  }

  /**
   * Formats a property schema as a string.
   */
  export function forPropertySchema(propertySchema: PropertySchema): string {
    if (propertySchema instanceof RelationshipPropertySchema) {
      return `${propertySchema
        .valueType()
        .toString()} (${propertySchema.defaultValue()}, ${propertySchema.state()}, Aggregation.${propertySchema.aggregation()})`;
    }

    return `${propertySchema
      .valueType()
      .toString()} (${propertySchema.defaultValue()}, ${propertySchema.state()})`;
  }
}
