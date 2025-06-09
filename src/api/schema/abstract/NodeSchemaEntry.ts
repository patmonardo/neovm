import { NodeLabel } from "@/projection";
import { PropertySchema } from "./PropertySchema";
import { ElementSchemaEntry } from "./ElementSchemaEntry";

/**
 * Schema entry for a node label in a graph.
 * This represents the schema definition for a specific node label, including its properties.
 */
export abstract class NodeSchemaEntry extends ElementSchemaEntry<
  NodeSchemaEntry,
  NodeLabel,
  PropertySchema
> {
  /**
   * Returns the node label for this schema entry.
   */
  abstract identifier(): NodeLabel;

  /**
   * Returns the properties associated with this node label.
   */
  abstract properties(): Map<string, PropertySchema>;

  /**
   * Creates a union of this entry with another entry.
   */
  abstract union(other: NodeSchemaEntry): NodeSchemaEntry;

  /**
   * Checks if this node schema entry equals another object.
   */
  abstract equals(obj: unknown): boolean;

  /**
   * Computes a hash code for this entry.
   */
  abstract hashCode(): number;
}

