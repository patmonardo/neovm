import { RelationshipType } from "@/projection";
import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyState } from "@/api";
import { Aggregation } from "@/core";
import { Direction } from "../Direction";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";
import { RelationshipSchemaEntry } from "../abstract/RelationshipSchemaEntry";

/**
 * Mutable implementation of RelationshipSchemaEntry.
 * Represents a schema entry for a relationship type with properties that can be modified.
 */
export class MutableRelationshipSchemaEntry extends RelationshipSchemaEntry {
  /**
   * The relationship type for this schema entry.
   */
  private readonly _identifier: RelationshipType;

  /**
   * The direction of this relationship type.
   */
  private readonly _direction: Direction;

  /**
   * Map of property keys to their schemas.
   */
  private readonly _properties: Map<string, RelationshipPropertySchema>;

  /**
   * Creates a new MutableRelationshipSchemaEntry from an existing RelationshipSchemaEntry.
   *
   * @param fromEntry The source relationship schema entry
   * @returns A new mutable copy of the entry
   */
  public static from(
    fromEntry: RelationshipSchemaEntry
  ): MutableRelationshipSchemaEntry {
    return new MutableRelationshipSchemaEntry(
      fromEntry.identifier(),
      fromEntry.direction(),
      new Map(fromEntry.properties())
    );
  }

  /**
   * Creates a new MutableRelationshipSchemaEntry with the specified relationship type and direction.
   *
   * @param relationshipType The relationship type
   * @param direction The relationship direction
   */
  constructor(relationshipType: RelationshipType, direction: Direction);

  /**
   * Creates a new MutableRelationshipSchemaEntry with the specified relationship type, direction,
   * and properties.
   *
   * @param relationshipType The relationship type
   * @param direction The relationship direction
   * @param properties Map of property keys to property schemas
   */
  constructor(
    relationshipType: RelationshipType,
    direction: Direction,
    properties?: Map<string, RelationshipPropertySchema>
  );

  constructor(
    relationshipType: RelationshipType,
    direction: Direction,
    properties: Map<string, RelationshipPropertySchema> = new Map()
  ) {
    super();
    this._identifier = relationshipType;
    this._direction = direction;
    this._properties = properties;
  }

  /**
   * Returns the relationship type for this schema entry.
   *
   * @returns The relationship type
   */
  identifier(): RelationshipType {
    return this._identifier;
  }

  /**
   * Returns the direction of relationships with this type.
   *
   * @returns The relationship direction
   */
  direction(): Direction {
    return this._direction;
  }

  /**
   * Checks whether relationships with this type are undirected.
   *
   * @returns True if relationships are undirected
   */
  isUndirected(): boolean {
    return this._direction === Direction.UNDIRECTED;
  }

  /**
   * Returns the property schemas for this relationship type.
   * Returns a copy to preserve encapsulation.
   *
   * @returns Map of property keys to their schemas
   */
  properties(): Map<string, RelationshipPropertySchema> {
    return new Map(this._properties);
  }

  /**
   * Combines this schema entry with another.
   * Both entries must have the same relationship type.
   *
   * @param other The schema entry to merge with this one
   * @returns A new schema entry containing properties from both entries
   * @throws Error if the entries have different relationship types
   */
  union(other: RelationshipSchemaEntry): RelationshipSchemaEntry {
    if (!this._identifier.equals(other.identifier())) {
      throw new Error(
        `Cannot union relationship schema entries with different relationship types ${
          this._identifier
        } and ${other.identifier()}`
      );
    }

    if (other.isUndirected() !== this.isUndirected()) {
      throw new Error(
        `Conflicting directionality for relationship types ${this.identifier().name()}`
      );
    }

    const unionedProperties = this.unionProperties(other.properties());

    return new MutableRelationshipSchemaEntry(
      this._identifier,
      this._direction,
      unionedProperties
    );
  }

  /**
   * Converts this entry to a map representation.
   *
   * @returns Map representation of the entry
   */
  toMap(): Record<string, any> {
    const propertiesMap: Record<string, any> = {};

    this._properties.forEach((schema, key) => {
      propertiesMap[key] = {
        valueType: schema.valueType().toString(),
        defaultValue: schema.defaultValue().toString(),
        state: schema.state().toString(),
        aggregation: schema.aggregation().toString(),
      };
    });

    return {
      direction: this._direction.toString(),
      properties: propertiesMap,
    };
  }

  /**
   * Checks if this entry equals another object.
   *
   * @param obj The object to compare with
   * @returns True if the objects are equal
   */
  equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof MutableRelationshipSchemaEntry)) return false;

    if (!this._identifier.equals(obj._identifier)) return false;
    if (this._direction !== obj._direction) return false;

    // Compare properties
    if (this._properties.size !== obj._properties.size) return false;

    for (const [key, schema] of this._properties.entries()) {
      if (!obj._properties.has(key)) return false;

      const otherSchema = obj._properties.get(key)!;
      // BUG FIX #4: Implement proper schema comparison without assuming equals method
      if (!schemaEquals(schema, otherSchema)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Computes a hash code for this entry.
   *
   * @returns The hash code
   */
  hashCode(): number {
    let result = this._identifier.hashCode();
    result = 31 * result + this._direction.valueOf();

    // Add hash for each property
    for (const [key, schema] of this._properties.entries()) {
      result = 31 * result + key.length;
      // BUG FIX #5: Use consistent approach to get a number for hashCode
      result = 31 * result + schemaHashCode(schema);
    }

    return result;
  }

  /**
   * Adds a property with the specified name and value type.
   * Creates a property schema with default settings.
   *
   * @param propertyKey The property key
   * @param valueType The value type
   * @returns This entry for method chaining
   */
  addProperty(
    propertyKey: string,
    valueType: ValueType
  ): MutableRelationshipSchemaEntry;

  /**
   * Adds a property with the specified name, value type, and property state.
   * Creates a property schema with the specified settings.
   *
   * @param propertyKey The property key
   * @param valueType The value type
   * @param propertyState The property state
   * @returns This entry for method chaining
   */
  addProperty(
    propertyKey: string,
    valueType: ValueType,
    propertyState: PropertyState
  ): MutableRelationshipSchemaEntry;

  /**
   * Adds a property with the specified name and schema.
   *
   * @param propertyKey The property key
   * @param propertySchema The property schema
   * @returns This entry for method chaining
   */
  addProperty(
    propertyKey: string,
    propertySchema: RelationshipPropertySchema
  ): MutableRelationshipSchemaEntry;

  addProperty(
    propertyKey: string,
    propertySchemaOrValueType: ValueType | RelationshipPropertySchema,
    propertyState?: PropertyState
  ): MutableRelationshipSchemaEntry {
    // ✅ CORRECT TYPE DETECTION:
    if (propertySchemaOrValueType instanceof RelationshipPropertySchema) {
      // It's a RelationshipPropertySchema - use it directly
      this._properties.set(propertyKey, propertySchemaOrValueType);
    } else {
      // It's a ValueType - create schema with optional state
      const valueType = propertySchemaOrValueType as ValueType;

      if (propertyState !== undefined) {
        // ✅ USE THE PROPERTY STATE:
        this._properties.set(
          propertyKey,
          RelationshipPropertySchema.of(
            propertyKey,
            valueType,
            DefaultValue.of(null, true),
            propertyState,
            Aggregation.NONE
          )
        );
      } else {
        // Default case
        this._properties.set(
          propertyKey,
          RelationshipPropertySchema.of(propertyKey, valueType)
        );
      }
    }

    return this;
  }
  /**
   * Removes a property from this entry.
   *
   * @param propertyKey The property key to remove
   */
  removeProperty(propertyKey: string): void {
    this._properties.delete(propertyKey);
  }
}

/**
 * Helper function to compare two property schemas.
 */
function schemaEquals(
  schema1: RelationshipPropertySchema,
  schema2: RelationshipPropertySchema
): boolean {
  return (
    schema1.valueType() === schema2.valueType() &&
    schema1.state() === schema2.state() &&
    schema1.defaultValue().equals(schema2.defaultValue()) &&
    // Use the namespace function instead of a non-existent instance method
    Aggregation.equals(schema1.aggregation(), schema2.aggregation())
  );
}

/**
 * Helper function to generate a hash code for a property schema.
 */
function schemaHashCode(schema: RelationshipPropertySchema): number {
  let result = schema.valueType();
  result = 31 * result + schema.state();
  result = 31 * result + schema.defaultValue().longValue();
  // Use the namespace function instead of a non-existent instance method
  result = 31 * result + Aggregation.hashCode(schema.aggregation());
  return result;
}
