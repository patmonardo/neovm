import { RelationshipProperty } from "./RelationshipProperty";
import { RelationshipPropertyStore } from "./RelationshipPropertyStore";
import { DefRelationshipPropertyStore } from "./primitive/DefRelationshipPropertyStore";

/**
 * RelationshipPropertyBuilder {class for constructing a RelationshipPropertyStore.
 */
export class RelationshipPropertyBuilder {
  // Rename the field to avoid name clash with the method
  private readonly propertyMap: Map<string, RelationshipProperty>;

  constructor() {
    this.propertyMap = new Map();
  }

  public putRelationshipProperty(
    propertyKey: string,
    relationshipProperty: RelationshipProperty
  ): RelationshipPropertyBuilder {
    this.propertyMap.set(propertyKey, relationshipProperty);
    return this;
  }

  public putIfAbsent(
    propertyKey: string,
    relationshipProperty: RelationshipProperty
  ): RelationshipPropertyBuilder {
    if (!this.propertyMap.has(propertyKey)) {
      this.propertyMap.set(propertyKey, relationshipProperty);
    }
    return this;
  }

  // Keep the method name for API consistency
  public relationshipProperties(
    properties: Map<string, RelationshipProperty>
  ): RelationshipPropertyBuilder {
    this.propertyMap.clear();
    properties.forEach((property, key) => {
      this.propertyMap.set(key, property);
    });
    return this;
  }

  public build(): RelationshipPropertyStore {
    return new DefRelationshipPropertyStore(new Map(this.propertyMap));
  }
}
