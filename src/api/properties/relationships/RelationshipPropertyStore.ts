import { RelationshipProperty } from "./RelationshipProperty";

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
    return new RelationshipPropertyStoreImpl(new Map());
  }

  /**
   * Returns a new builder for creating a relationship property store.
   *
   * @returns A new builder
   */
  export function builder(): Builder {
    return new Builder();
  }

  /**
   * Builder class for constructing a RelationshipPropertyStore.
   */

  export class Builder {
    // Rename the field to avoid name clash with the method
    private readonly propertyMap: Map<string, RelationshipProperty>;

    constructor() {
      this.propertyMap = new Map();
    }

    public putRelationshipProperty(
      propertyKey: string,
      relationshipProperty: RelationshipProperty
    ): Builder {
      this.propertyMap.set(propertyKey, relationshipProperty);
      return this;
    }

    public putIfAbsent(
      propertyKey: string,
      relationshipProperty: RelationshipProperty
    ): Builder {
      if (!this.propertyMap.has(propertyKey)) {
        this.propertyMap.set(propertyKey, relationshipProperty);
      }
      return this;
    }

    // Keep the method name for API consistency
    public relationshipProperties(
      properties: Map<string, RelationshipProperty>
    ): Builder {
      this.propertyMap.clear();
      properties.forEach((property, key) => {
        this.propertyMap.set(key, property);
      });
      return this;
    }

    public build(): RelationshipPropertyStore {
      return new RelationshipPropertyStoreImpl(new Map(this.propertyMap));
    }
  }

  /**
   * Implementation of RelationshipPropertyStore.
   */
  class RelationshipPropertyStoreImpl implements RelationshipPropertyStore {
    /**
     * Creates a new RelationshipPropertyStore implementation.
     *
     * @param properties Map of property keys to relationship properties
     */
    constructor(
      private readonly properties: Map<string, RelationshipProperty>
    ) {}

    relationshipProperties(): Map<string, RelationshipProperty> {
      return this.properties;
    }

    isEmpty(): boolean {
      return this.properties.size === 0;
    }

    get(propertyKey: string): RelationshipProperty | undefined {
      return this.properties.get(propertyKey);
    }

    filter(propertyKey: string): RelationshipPropertyStore {
      const property = this.properties.get(propertyKey);
      if (!property) {
        return RelationshipPropertyStore.empty();
      }

      const filteredMap = new Map<string, RelationshipProperty>();
      filteredMap.set(propertyKey, property);
      return new RelationshipPropertyStoreImpl(filteredMap);
    }

    keySet(): Set<string> {
      return new Set(this.properties.keys());
    }

    values(): RelationshipProperty[] {
      return Array.from(this.properties.values());
    }

    containsKey(propertyKey: string): boolean {
      return this.properties.has(propertyKey);
    }
  }
}
