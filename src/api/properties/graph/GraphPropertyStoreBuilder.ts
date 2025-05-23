import { GraphPropertyValues } from './GraphPropertyValues';
import { GraphProperty } from './GraphProperty';
import { GraphPropertyStore } from './GraphPropertyStore';
import { DefGraphPropertyStore } from './primitive/DefGraphPropertyStore';

/**
 * Builder for GraphPropertyStoreImpl that follows the fluent interface pattern.
 */
export class GraphPropertyStoreBuilder {
  private _properties: Map<string, GraphProperty>;

  /**
   * Creates a new builder with optional initial properties.
   */
  constructor(properties: Map<string, GraphProperty> = new Map()) {
    this._properties = new Map(properties);
  }

  /**
   * Adds a property if the key doesn't already exist.
   */
  putIfAbsent(key: string, property: GraphProperty): GraphPropertyStoreBuilder {
    if (!this._properties.has(key)) {
      this._properties.set(key, property);
    }
    return this;
  }

  /**
   * Adds or replaces a property.
   */
  put(key: string, property: GraphProperty): GraphPropertyStoreBuilder {
    this._properties.set(key, property);
    return this;
  }

  /**
   * Adds a property with a value.
   */
  putValue(
    key: string,
    values: GraphPropertyValues
  ): GraphPropertyStoreBuilder {
    return this.put(key, GraphProperty.of(key, values));
  }

  /**
   * Removes a property.
   */
  removeProperty(key: string): GraphPropertyStoreBuilder {
    this._properties.delete(key);
    return this;
  }

  /**
   * Sets all properties from a map.
   */
  setProperties(
    properties: Map<string, GraphProperty>
  ): GraphPropertyStoreBuilder {
    this._properties = new Map(properties);
    return this;
  }

  /**
   * Builds the final GraphPropertyStore.
   */
  build(): GraphPropertyStore {
    return new DefGraphPropertyStore(this._properties);
  }
}
