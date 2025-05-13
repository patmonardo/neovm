import { NodeSchemaEntry } from './NodeSchemaEntry';
import { NodeLabel } from '@/NodeLabel';
import { PropertySchema } from './PropertySchema';
import { ValueType } from '../ValueType';
import { PropertyState } from '../PropertyState';

/**
 * Mutable implementation of NodeSchemaEntry.
 * Represents a schema entry for a node label with properties that can be modified.
 */
export class MutableNodeSchemaEntry extends NodeSchemaEntry {
  /**
   * The node label for this schema entry.
   */
  private readonly _identifier: NodeLabel;

  /**
   * Map of property keys to their schemas.
   */
  private readonly _properties: Map<string, PropertySchema>;

  /**
   * Creates a new MutableNodeSchemaEntry with the specified node label and no properties.
   *
   * @param identifier The node label
   */
  constructor(identifier: NodeLabel);

  /**
   * Creates a new MutableNodeSchemaEntry with the specified node label and properties.
   *
   * @param identifier The node label
   * @param properties Map of property keys to property schemas
   */
  constructor(identifier: NodeLabel, properties?: Map<string, PropertySchema>);

  constructor(identifier: NodeLabel, properties: Map<string, PropertySchema> = new Map()) {
    super();
    this._identifier = identifier;
    this._properties = properties;
  }

  /**
   * Creates a new MutableNodeSchemaEntry from an existing NodeSchemaEntry.
   *
   * @param fromEntry The source node schema entry
   * @returns A new mutable copy of the entry
   */
  public static from(fromEntry: NodeSchemaEntry): MutableNodeSchemaEntry {
    const propertiesMap = new Map<string, PropertySchema>();
    Object.entries(fromEntry.properties()).forEach(([key, schema]) => {
      propertiesMap.set(key, schema);
    });

    return new MutableNodeSchemaEntry(fromEntry.identifier(), propertiesMap);
  }

  /**
   * Returns the node label for this schema entry.
   *
   * @returns The node label
   */
  identifier(): NodeLabel {
    return this._identifier;
  }

  /**
   * Returns the property schemas for this node label.
   * Returns a copy to preserve encapsulation.
   *
   * @returns Map of property keys to their schemas
   */
  properties(): Record<string, PropertySchema> {
    const props: Record<string, PropertySchema> = {};
    this._properties.forEach((schema, key) => {
      props[key] = schema;
    });
    return props;
  }

  /**
   * Adds a property with the specified name and value type.
   * Creates a property schema with default settings.
   *
   * @param propertyName The property name
   * @param valueType The value type
   * @returns This entry for method chaining
   */
  addProperty(propertyName: string, valueType: ValueType): MutableNodeSchemaEntry;

  /**
   * Adds a property with the specified name and schema.
   *
   * @param propertyName The property name
   * @param propertySchema The property schema
   * @returns This entry for method chaining
   */
  addProperty(propertyName: string, propertySchema: PropertySchema): MutableNodeSchemaEntry;

  /**
   * Implementation of the addProperty method.
   */
  addProperty(propertyName: string, propertySchemaOrValueType: PropertySchema | ValueType): MutableNodeSchemaEntry {
    if (typeof propertySchemaOrValueType === 'number') {
      // It's a ValueType (enum)
      const valueType = propertySchemaOrValueType;
      this._properties.set(
        propertyName,
        PropertySchema.of(
          propertyName,
          valueType,
          ValueType.fallbackValue(valueType),
          PropertyState.PERSISTENT
        )
      );
    } else {
      // It's a PropertySchema
      this._properties.set(propertyName, propertySchemaOrValueType);
    }
    return this;
  }

  /**
   * Removes a property from this entry.
   *
   * @param propertyName The property name to remove
   */
  removeProperty(propertyName: string): void {
    this._properties.delete(propertyName);
  }

  /**
   * Combines this schema entry with another.
   * Both entries must have the same node label.
   *
   * @param other The schema entry to merge with this one
   * @returns A new schema entry containing properties from both entries
   * @throws Error if the entries have different node labels
   */
  union(other: NodeSchemaEntry): NodeSchemaEntry {
    if (!other.identifier().equals(this.identifier())) {
      throw new Error(
        `Cannot union node schema entries with different node labels ${this.identifier()} and ${other.identifier()}`
      );
    }

    const unionProperties = this.unionProperties(other.properties());
    return new MutableNodeSchemaEntry(
      this.identifier(),
      new Map(Object.entries(unionProperties))
    );
  }

  /**
   * Converts this schema entry to a map representation.
   *
   * @returns Map representation of this schema entry
   */
  toMap(): Record<string, any> {
    const result: Record<string, any> = {
      properties: {}
    };

    this._properties.forEach((schema, key) => {
      result.properties[key] = {
        valueType: schema.valueType().toString(),
        defaultValue: schema.defaultValue().toString(),
        state: schema.state().toString()
      };
    });

    return result;
  }

  /**
   * Checks if this entry equals another object.
   *
   * @param obj The object to compare with
   * @returns True if the objects are equal
   */
  equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof MutableNodeSchemaEntry)) return false;

    if (!this._identifier.equals(obj._identifier)) return false;

    // Compare properties
    if (this._properties.size !== obj._properties.size) return false;

    for (const [key, schema] of this._properties.entries()) {
      if (!obj._properties.has(key)) return false;

      const otherSchema = obj._properties.get(key)!;
      if (schema.valueType() !== otherSchema.valueType() ||
          !schema.defaultValue().equals(otherSchema.defaultValue()) ||
          schema.state() !== otherSchema.state()) {
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

    // Simple hash for the properties
    for (const [key, schema] of this._properties.entries()) {
      result = 31 * result + key.length;
      result = 31 * result + schema.valueType();
    }

    return result;
  }
}
