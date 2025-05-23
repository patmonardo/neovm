import { NodeLabel } from "@/projection";
import { ElementSchema } from "./ElementSchema";
import { NodeSchemaEntry } from "./NodeSchemaEntry";
import { PropertySchema } from "./PropertySchema";

/**
 * Schema definition for nodes in a graph.
 * Extends the general ElementSchema with node-specific functionality.
 */
export abstract class NodeSchema extends ElementSchema<
  NodeSchema,
  NodeLabel,
  NodeSchemaEntry,
  PropertySchema
> {
  /**
   * Returns all available node labels in this schema.
   *
   * @returns Set of all node labels
   */
  abstract availableLabels(): Set<NodeLabel>;

  /**
   * Checks if this schema contains only the special "ALL" nodes label.
   *
   * @returns True if this schema only contains the ALL nodes label
   */
  containsOnlyAllNodesLabel(): boolean {
    const labels = this.availableLabels();
    return labels.size === 1 && labels.has(NodeLabel.ALL_NODES);
  }

  /**
   * Creates a filtered version of this schema containing only the specified labels.
   * This is a more specific implementation of the filter method from ElementSchema.
   *
   * @param labelsToKeep Set of node labels to include
   * @returns A new filtered node schema
   */
  abstract filter(labelsToKeep: Set<NodeLabel>): NodeSchema;
}

/**
 * Namespace providing utility functions and factories for NodeSchema.
 */
export namespace NodeSchema {
  /**
   * Creates an empty node schema with no entries.
   *
   * @returns An empty node schema
   */
  export function empty(): NodeSchema {
    // Import here to avoid circular dependencies
    const { MutableNodeSchema } = require('./MutableNodeSchema');
    return MutableNodeSchema.empty();
  }

  /**
   * Formats a property schema as a string.
   *
   * @param schema The property schema
   * @returns Formatted string representation
   */
  export function formatPropertySchema(schema: PropertySchema): string {
    return `${schema.valueType().toString()} (${schema.defaultValue().toString()}, ${
      schema.state().toString()
    })`;
  }

  /**
   * Formats properties for display or serialization.
   *
   * @param properties The property schemas to format
   * @returns Formatted properties map
   */
  export function formatProperties(
    properties: Record<string, PropertySchema>
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, schema] of Object.entries(properties)) {
      result[key] = formatPropertySchema(schema);
    }

    return result;
  }
}
