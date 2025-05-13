import { NodePropertyValues } from "../../api/properties/nodes/NodePropertyValues";

/**
 * Represents a node property with a key and values.
 * Used in the write operations to persist property values back to the database.
 */
export interface NodeProperty {
  /**
   * The property key name.
   */
  readonly key: string;
  
  /**
   * The property values for nodes.
   */
  readonly values: NodePropertyValues;
}

/**
 * Factory functions for NodeProperty.
 */
export namespace NodeProperty {
  /**
   * Creates a new NodeProperty instance.
   * 
   * @param key The property key
   * @param values The node property values
   * @returns A new NodeProperty instance
   */
  export function of(key: string, values: NodePropertyValues): NodeProperty {
    return { key, values };
  }
}