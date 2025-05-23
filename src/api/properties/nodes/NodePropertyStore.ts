import { PropertyStore } from "../PropertyStore";
import { NodePropertyValues } from "./NodePropertyValues";
import { NodeProperty } from "./NodeProperty";
import { NodePropertyStoreBuilder } from "./NodePropertyStoreBuilder";

/**
 * Represents a store for node properties.
 * Each property is identified by a string key and holds NodePropertyValues.
 */
export interface NodePropertyStore
  extends PropertyStore<NodePropertyValues, NodeProperty> {}

/**
 * Static factory methods for NodePropertyStore
 */
export namespace NodePropertyStore {
  /**
   * Creates an empty NodePropertyStore
   */
  export function empty(): NodePropertyStore {
    return NodePropertyStoreBuilder.create().build();
  }

  /**
   * Returns a new NodePropertyStore builder
   */
  export function builder(): NodePropertyStoreBuilder {
    return NodePropertyStoreBuilder.create();
  }
}
