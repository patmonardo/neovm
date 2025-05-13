import { PropertyStore } from '../PropertyStore';
import { GraphPropertyValues } from './GraphPropertyValues';
import { GraphProperty } from './GraphProperty';

/**
 * A specialized property store for graph properties.
 * Graph properties are global properties that apply to the entire graph.
 */
export interface GraphPropertyStore extends PropertyStore<GraphPropertyValues, GraphProperty> {}

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
    return new GraphPropertyStoreImpl(new Map());
  }

  /**
   * Creates a new builder for constructing a graph property store.
   * 
   * @returns A new builder instance
   */
  export function builder(): Builder {
    return new Builder(new Map());
  }

  /**
   * Builder class for constructing a GraphPropertyStore.
   */
  export class Builder {
    private _properties: Map<string, GraphProperty>;

    /**
     * Creates a new builder with the given properties.
     * 
     * @param properties Initial properties map (empty by default)
     */
    constructor(properties: Map<string, GraphProperty>) {
      this._properties = properties;
    }

    /**
     * Adds a property to the store if the key doesn't already exist.
     * 
     * @param propertyKey The property key
     * @param graphProperty The graph property
     * @returns This builder for method chaining
     */
    public putIfAbsent(propertyKey: string, graphProperty: GraphProperty): Builder {
      if (!this._properties.has(propertyKey)) {
        this._properties.set(propertyKey, graphProperty);
      }
      return this;
    }

    /**
     * Adds or replaces a property in the store.
     * 
     * @param propertyKey The property key
     * @param graphProperty The graph property
     * @returns This builder for method chaining
     */
    public put(propertyKey: string, graphProperty: GraphProperty): Builder {
      this._properties.set(propertyKey, graphProperty);
      return this;
    }

    /**
     * Removes a property from the store.
     * 
     * @param propertyKey The property key to remove
     * @returns This builder for method chaining
     */
    public removeProperty(propertyKey: string): Builder {
      this._properties.delete(propertyKey);
      return this;
    }

    /**
     * Sets the properties map directly.
     * 
     * @param properties The properties map
     * @returns This builder for method chaining
     */
    public properties(properties: Map<string, GraphProperty>): Builder {
      this._properties = new Map(properties);
      return this;
    }

    /**
     * Builds the graph property store with the configured properties.
     * 
     * @returns A new GraphPropertyStore instance
     */
    public build(): GraphPropertyStore {
      return new GraphPropertyStoreImpl(new Map(this._properties));
    }
  }
}

/**
 * Implementation of the GraphPropertyStore interface.
 */
class GraphPropertyStoreImpl implements GraphPropertyStore {
  private readonly propertiesMap: Map<string, GraphProperty>;

  /**
   * Creates a new GraphPropertyStoreImpl.
   * 
   * @param properties The properties map
   */
  constructor(properties: Map<string, GraphProperty>) {
    this.propertiesMap = properties;
  }

  /**
   * Returns the properties map.
   * 
   * @returns Map of property keys to graph properties
   */
  properties(): Map<string, GraphProperty> {
    return this.propertiesMap;
  }
}