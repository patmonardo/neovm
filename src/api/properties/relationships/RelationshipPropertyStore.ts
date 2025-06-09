import { RelationshipProperty } from "./RelationshipProperty";
import { RelationshipPropertyBuilder } from "./RelationshipPropertyBuilder";
import { DefaultRelationshipPropertyStore } from "./primitive/DefaultRelationshipPropertyStore";

/**
 * Store for relationship properties indexed by their property key.
 */
export interface RelationshipPropertyStore {
  /**
   * Returns a map of relationship property keys to relationship properties.
   *
   * @returns Map of relationship properties
   */
  relationshipProperties(): Map<string, RelationshipProperty>;

  /**
   * Checks if the store contains no properties.
   *
   * @returns true if the store is empty, false otherwise
   */
  isEmpty(): boolean;

  /**
   * Gets a relationship property by its key.
   *
   * @param propertyKey The property key
   * @returns The relationship property, or undefined if not found
   */
  get(propertyKey: string): RelationshipProperty | undefined;

  /**
   * Creates a filtered store containing only the specified property.
   *
   * @param propertyKey The property key to include
   * @returns A new store with only the specified property
   */
  filter(propertyKey: string): RelationshipPropertyStore;

  /**
   * Returns the set of property keys in this store.
   *
   * @returns Set of property keys
   */
  keySet(): Set<string>;

  /**
   * Returns a collection of all relationship properties in this store.
   *
   * @returns Collection of relationship properties
   */
  values(): RelationshipProperty[];

  /**
   * Checks if the store contains a property with the given key.
   *
   * @param propertyKey The property key to check
   * @returns true if the store contains the key, false otherwise
   */
  containsKey(propertyKey: string): boolean;
}

/**
 * Namespace providing factory methods and builder for RelationshipPropertyStore.
 */
export namespace RelationshipPropertyStore {
  /**
   * Creates an empty relationship property store.
   *
   * @returns An empty store
   */
  export function empty(): RelationshipPropertyStore {
    return new DefaultRelationshipPropertyStore(new Map());
  }

  /**
   * Returns a new builder for creating a relationship property store.
   *
   * @returns A new builder
   */
  export function builder(): RelationshipPropertyBuilder {
    return new RelationshipPropertyBuilder();
  }
}
