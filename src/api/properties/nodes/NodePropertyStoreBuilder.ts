import { NodeProperty } from "./NodeProperty";
import { NodePropertyStore } from "./NodePropertyStore";
import { NodePropertyValues } from "./NodePropertyValues";

/**
 * Builder for creating NodePropertyStore instances.
 */
export class NodePropertyStoreBuilder {
  private readonly _properties: Map<string, NodeProperty>;

  /**
   * Private constructor - use NodePropertyStoreBuilder.create() instead
   */
  private constructor() {
    this._properties = new Map<string, NodeProperty>();
  }

  /**
   * Creates a new builder instance
   */
  public static create(): NodePropertyStoreBuilder {
    return new NodePropertyStoreBuilder();
  }

  /**
   * Sets all properties, replacing any existing ones.
   */
  public properties(
    props: Map<string, NodeProperty>
  ): NodePropertyStoreBuilder {
    this._properties.clear();
    props.forEach((value, key) => {
      this._properties.set(key, value);
    });
    return this;
  }

  /**
   * Adds all properties from the given property store, replacing any existing ones.
   */
  public from(propertyStore: NodePropertyStore): NodePropertyStoreBuilder {
    this._properties.clear();
    propertyStore.properties().forEach((value, key) => {
      this._properties.set(key, value);
    });
    return this;
  }

  /**
   * Adds a property if the key is not already present.
   */
  public putIfAbsent(
    propertyKey: string,
    nodeProperty: NodeProperty
  ): NodePropertyStoreBuilder {
    if (!this._properties.has(propertyKey)) {
      this._properties.set(propertyKey, nodeProperty);
    }
    return this;
  }

  /**
   * Adds a property, replacing it if the key already exists.
   */
  public put(
    propertyKey: string,
    nodeProperty: NodeProperty
  ): NodePropertyStoreBuilder {
    this._properties.set(propertyKey, nodeProperty);
    return this;
  }

  /**
   * Removes a property by its key.
   */
  public removeProperty(propertyKey: string): NodePropertyStoreBuilder {
    this._properties.delete(propertyKey);
    return this;
  }

  /**
   * Builds and returns a new NodePropertyStore instance.
   */
  public build(): NodePropertyStore {
    return new DefaultNodePropertyStore(new Map(this._properties));
  }
}

/**
 * Private implementation class - not exported
 */
class DefaultNodePropertyStore implements NodePropertyStore {
  private readonly _properties: Map<string, NodeProperty>;

  constructor(properties: Map<string, NodeProperty>) {
    this._properties = properties;
  }

  hasProperty(propertyKey: string): boolean {
    return this._properties.has(propertyKey);
  }

  property(propertyKey: string): NodeProperty | undefined {
    return this._properties.get(propertyKey);
  }

  properties(): Map<string, NodeProperty> {
    return new Map(this._properties);
  }

  propertyValues(propertyKey: string): NodePropertyValues | undefined {
    const prop = this.property(propertyKey);
    return prop?.values();
  }

  // release(): void {
  //   this._properties.forEach(prop => prop.values().release());
  // }

  memoryEstimation(): any {
    // Simplified implementation
    return {
      estimate: () => this._properties.size * 16,
    };
  }

  isEmpty(): boolean {
    return this._properties.size === 0;
  }

  count(): number {
    return this._properties.size;
  }
}
