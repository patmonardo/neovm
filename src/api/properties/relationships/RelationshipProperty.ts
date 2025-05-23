import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyState } from "@/api";
import { Aggregation } from "@/core";
import { Properties } from "./Properties";
import { RelationshipPropertySchema } from "@/api/schema";
import { DefRelationshipProperty } from "./primitive/DefRelationshipProperty";

/**
 * Represents a property associated with relationships in a graph.
 * Provides access to property values and schema information.
 */
export interface RelationshipProperty {
  /**
   * Returns the property values.
   *
   * @returns The relationship property values
   */
  values(): Properties;

  /**
   * Returns the schema for this relationship property.
   *
   * @returns The relationship property schema
   */
  propertySchema(): RelationshipPropertySchema;

  /**
   * Returns the property key.
   * Convenience method that delegates to the property schema.
   *
   * @returns The property key
   */
  key(): string;

  /**
   * Returns the value type of this property.
   * Convenience method that delegates to the property schema.
   *
   * @returns The value type
   */
  valueType(): ValueType;

  /**
   * Returns the default value for this property.
   * Convenience method that delegates to the property schema.
   *
   * @returns The default value
   */
  defaultValue(): DefaultValue;

  /**
   * Returns the state of this property.
   * Convenience method that delegates to the property schema.
   *
   * @returns The property state
   */
  propertyState(): PropertyState;

  /**
   * Returns the aggregation strategy for this property.
   * Convenience method that delegates to the property schema.
   *
   * @returns The aggregation strategy
   */
  aggregation(): Aggregation;
}

/**
 * Namespace providing factory methods for RelationshipProperty.
 */
export namespace RelationshipProperty {
  /**
   * Creates a new RelationshipProperty with the given parameters.
   *
   * @param key The property key
   * @param type The value type
   * @param state The property state
   * @param values The property values
   * @param defaultValue The default value
   * @param aggregation The aggregation strategy
   * @returns A new RelationshipProperty
   */
  export function of(
    key: string,
    type: ValueType,
    state: PropertyState,
    values: Properties,
    defaultValue: DefaultValue,
    aggregation: Aggregation
  ): RelationshipProperty {
    return new DefRelationshipProperty (
      values,
      RelationshipPropertySchema.of(key, type, defaultValue, state, aggregation)
    );
  }
}
