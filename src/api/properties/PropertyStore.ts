import { PropertyValues } from "./PropertyValues";
import { Property } from "./Property";

/**
 * A store that contains properties indexed by their property key.
 *
 * @typeParam VALUE - The type of property values, must extend PropertyValues
 * @typeParam PROPERTY - The type of property, must extend Property<VALUE>
 */
export interface PropertyStore<
  VALUE extends PropertyValues,
  PROPERTY extends Property<VALUE>
> {
  /**
   * Returns a map of property keys to properties.
   *
   * @returns Map of property keys to properties
   */
  properties(): Map<string, PROPERTY>;
}

/**
 * Provides default implementations and utilities for PropertyStore interface.
 */
export namespace PropertyStore {
  /**
   * Returns a map of property keys to property values.
   *
   * @param store The property store
   * @returns Map of property keys to property values
   */
  export function propertyValues<
    VALUE extends PropertyValues,
    PROPERTY extends Property<VALUE>
  >(store: PropertyStore<VALUE, PROPERTY>): Map<string, VALUE> {
    const result = new Map<string, VALUE>();
    store.properties().forEach((property, key) => {
      result.set(key, property.values());
    });
    return result;
  }

  /**
   * Gets a property by key.
   *
   * @param store The property store
   * @param propertyKey The property key
   * @returns The property, or undefined if not found
   */
  export function get<
    VALUE extends PropertyValues,
    PROPERTY extends Property<VALUE>
  >(
    store: PropertyStore<VALUE, PROPERTY>,
    propertyKey: string
  ): PROPERTY | undefined {
    return store.properties().get(propertyKey);
  }

  /**
   * Checks if the property store is empty.
   *
   * @param store The property store
   * @returns True if the store contains no properties
   */
  export function isEmpty<
    VALUE extends PropertyValues,
    PROPERTY extends Property<VALUE>
  >(store: PropertyStore<VALUE, PROPERTY>): boolean {
    return store.properties().size === 0;
  }

  /**
   * Returns the set of property keys in this store.
   * Derived value - will return an immutable set.
   *
   * @param store The property store
   * @returns Set of property keys
   */
  export function keySet<
    VALUE extends PropertyValues,
    PROPERTY extends Property<VALUE>
  >(store: PropertyStore<VALUE, PROPERTY>): ReadonlySet<string> {
    return new Set(store.properties().keys());
  }

  /**
   * Checks if the property store contains a property with the given key.
   *
   * @param store The property store
   * @param propertyKey The property key to check
   * @returns True if the property exists
   */
  export function containsKey<
    VALUE extends PropertyValues,
    PROPERTY extends Property<VALUE>
  >(store: PropertyStore<VALUE, PROPERTY>, propertyKey: string): boolean {
    return store.properties().has(propertyKey);
  }
}
