import { ValueType } from "@/api/ValueType";
import { PropertyStore } from "@/api/properties/PropertyStore";
import { GraphProperty } from "./GraphProperty";
import { GraphPropertyValues } from "./GraphPropertyValues";
import { GraphPropertyStoreBuilder } from "./GraphPropertyStoreBuilder";
import { DefaultGraphPropertyStore } from "./primitive/DefaultGraphPropertyStore";

/**
 * A specialized property store for graph properties.
 * Graph properties are global properties that apply to the entire graph.
 */
export interface GraphPropertyStore
  extends PropertyStore<GraphPropertyValues, GraphProperty> {
  /**
   * Checks if a property with the given key exists.
   *
   * @param propertyKey The property key to check
   * @returns true if the property exists
   */
  hasProperty(propertyKey: string): boolean;

  /**
   * Returns a set of all property keys in this store.
   *
   * @returns Set of property keys
   */
  propertyKeySet(): Set<string>;

  /**
   * Returns the property with the given key, or null if it doesn't exist.
   *
   * @param propertyKey The property key
   * @returns The property value or null
   */

  getProperty(propertyKey: string): GraphProperty;

  /**
   * Returns the property with the given key, or null if it doesn't exist.
   *
   * @param propertyKey The property key
   * @returns The property value or null
   */
  getPropertyOrNull(propertyKey: string): GraphProperty | null;

  /**
   * Returns an array of all properties in this store.
   *
   * @returns Array of properties
   */
  getAllProperties(): GraphProperty[];

  /**
   * Returns a value of a specific type for a property key.
   *
   * @param propertyKey The property key
   * @param expectedType The expected value type
   * @returns The property values
   * @throws If the property doesn't exist or is of the wrong type
   */
  getPropertyValues(
    propertyKey: string,
    expectedType: ValueType
  ): GraphPropertyValues;

  /**
   * Returns the size (number of properties) in this store.
   *
   * @returns The number of properties
   */
  size(): number;

  /**
   * Checks if this store is empty.
   *
   * @returns true if the store is empty
   */
  isEmpty(): boolean;

  /**
   * Creates a new builder to modify this store.
   *
   * @returns A builder initialized with this store's properties
   */
  toBuilder(): GraphPropertyStoreBuilder;
}

/**
 * Namespace providing factory methods and utilities for GraphPropertyStore.
 */
export namespace GraphPropertyStore {
  /**
   * Creates an empty graph property store.
   *
   * @returns An empty GraphPropertyStore
   */
  export function empty(): GraphPropertyStore {
    return new DefaultGraphPropertyStore(new Map());
  }

  /**
   * Creates a new builder for constructing a graph property store.
   *
   * @returns A new builder instance
   */
  export function builder(): GraphPropertyStoreBuilder {
    return new GraphPropertyStoreBuilder(new Map());
  }

  // Re-export the Builder type for convenience
  export type Builder = GraphPropertyStoreBuilder;
}
