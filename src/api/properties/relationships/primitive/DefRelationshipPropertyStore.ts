import { RelationshipProperty } from "../RelationshipProperty";
import { RelationshipPropertyStore } from "../RelationshipPropertyStore";

/**
 * Implementation of RelationshipPropertyStore.
 */
export class DefRelationshipPropertyStore
  implements RelationshipPropertyStore
{
  /**
   * Creates a new RelationshipPropertyStore implementation.
   *
   * @param properties Map of property keys to relationship properties
   */
  constructor(private readonly properties: Map<string, RelationshipProperty>) {}

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
    return new DefRelationshipPropertyStore(filteredMap);
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
