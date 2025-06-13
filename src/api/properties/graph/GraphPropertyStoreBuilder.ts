import { GraphPropertyValues } from "./GraphPropertyValues";
import { GraphProperty } from "./GraphProperty";
import { GraphPropertyStore } from "./GraphPropertyStore";
import { DefaultGraphPropertyStore } from "./primitive/DefaultGraphPropertyStore";

/**
 * Builder for DefaultGraphPropertyStore that follows the fluent interface pattern.
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
   * Returns the properties map.
   */
  properties(): Map<string, GraphProperty> {
    return this._properties;
  }

  /**
   * Adds all properties from the given property store, replacing any existing ones.
   */
  public from(propertyStore: GraphPropertyStore): GraphPropertyStoreBuilder {
    this._properties.clear();
    propertyStore.properties().forEach((value, key) => {
      this._properties.set(key, value);
    });
    return this;
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
    return new DefaultGraphPropertyStore(this._properties);
  }
}
