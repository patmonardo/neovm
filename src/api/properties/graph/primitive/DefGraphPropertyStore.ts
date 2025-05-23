import { ValueType } from '@/api';
import { PropertyValues } from '@/api/properties';
import { GraphProperty } from '../GraphProperty';
import { GraphPropertyValues } from '../GraphPropertyValues';
import { GraphPropertyStore } from '../GraphPropertyStore';
import { GraphPropertyStoreBuilder } from '../GraphPropertyStoreBuilder';

/**
 * Implementation of the GraphPropertyStore interface with builder capabilities.
 */
export class DefGraphPropertyStore implements GraphPropertyStore {
  private readonly propertiesMap: Map<string, GraphProperty>;

  /**
   * Creates a new GraphPropertyStoreImpl.
   *
   * @param properties The properties map
   */
  constructor(properties: Map<string, GraphProperty> = new Map()) {
    this.propertiesMap = new Map(properties); // Create a defensive copy
  }

  /**
   * Returns the properties map.
   *
   * @returns Map of property keys to graph properties
   */
  properties(): Map<string, GraphProperty> {
    return new Map(this.propertiesMap); // Return a defensive copy
  }

  /**
   * Checks if a property with the given key exists.
   *
   * @param propertyKey The property key to check
   * @returns true if the property exists
   */
  hasProperty(propertyKey: string): boolean {
    return this.propertiesMap.has(propertyKey);
  }

  /**
   * Returns a set of all property keys in this store.
   *
   * @returns Set of property keys
   */
  propertyKeySet(): Set<string> {
    return new Set(this.propertiesMap.keys());
  }

  /**
   * Returns the property with the given key.
   *
   * @param propertyKey The property key
   * @returns The property value
   * @throws If the property doesn't exist
   */
  getProperty(propertyKey: string): GraphProperty {
    const property = this.propertiesMap.get(propertyKey);
    if (!property) {
      throw new Error(`Property with key '${propertyKey}' not found`);
    }
    return property;
  }

  /**
   * Returns the property with the given key, or null if it doesn't exist.
   *
   * @param propertyKey The property key
   * @returns The property value or null
   */
  getPropertyOrNull(propertyKey: string): GraphProperty | null {
    return this.propertiesMap.get(propertyKey) || null;
  }

  /**
   * Returns an array of all properties in this store.
   *
   * @returns Array of properties
   */
  getAllProperties(): GraphProperty[] {
    return Array.from(this.propertiesMap.values());
  }

  /**
   * Returns an iterator over all properties in this store.
   *
   * @returns Iterator of properties
   */
  [Symbol.iterator](): Iterator<GraphProperty> {
    return this.propertiesMap.values();
  }

  /**
   * Returns a value of a specific type for a property key.
   *
   * @param propertyKey The property key
   * @param expectedType The expected value type
   * @returns The property values
   * @throws If the property doesn't exist or is of the wrong type
   */
  getPropertyValues(propertyKey: string, expectedType: ValueType): GraphPropertyValues {
    const property = this.getProperty(propertyKey);
    const values = property.values();

    if (values.valueType() !== expectedType) {
      throw PropertyValues.unsupportedTypeException(values.valueType(), expectedType);
    }

    return values;
  }

  /**
   * Returns the size (number of properties) in this store.
   *
   * @returns The number of properties
   */
  size(): number {
    return this.propertiesMap.size;
  }

  /**
   * Checks if this store is empty.
   *
   * @returns true if the store is empty
   */
  isEmpty(): boolean {
    return this.propertiesMap.size === 0;
  }

  /**
   * Creates a new builder to modify this store.
   *
   * @returns A builder initialized with this store's properties
   */
  toBuilder(): GraphPropertyStoreBuilder {
    return new GraphPropertyStoreBuilder(new Map(this.propertiesMap));
  }

  /**
   * Creates a new builder for constructing a graph property store.
   *
   * @returns A new builder instance
   */
  static builder(): GraphPropertyStoreBuilder {
    return new GraphPropertyStoreBuilder();
  }
}

