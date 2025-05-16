import { ValueType } from '../ValueType';
import { PropertySchema } from '../schema/abstract/PropertySchema';
import { PropertyState } from '../PropertyState';
import { PropertyValues } from './PropertyValues';

/**
 * Represents a property in a graph element (node or relationship).
 * Provides access to property values and schema information.
 *
 * @typeParam VALUE - The type of property values, must extend PropertyValues
 */
export interface Property<VALUE extends PropertyValues> {
  /**
   * Returns the property values.
   *
   * @returns The property values
   */
  values(): VALUE;

  /**
   * Returns the schema for this property.
   *
   * @returns The property schema
   */
  propertySchema(): PropertySchema;

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
   * Returns the state of this property.
   * Convenience method that delegates to the property schema.
   *
   * @returns The property state
   */
  propertyState(): PropertyState;
}

/**
 * Provides default implementations for Property interface.
 */
export namespace Property {
  /**
   * Creates a base property implementation with default convenience methods.
   *
   * @param valuesProvider Function that returns property values
   * @param schemaProvider Function that returns property schema
   * @returns A partial Property implementation with default methods
   */
  export function withDefaults<VALUE extends PropertyValues>(
    valuesProvider: () => VALUE,
    schemaProvider: () => PropertySchema
  ): Property<VALUE> {  // Changed return type from Partial<Property<VALUE>> to Property<VALUE>
    return {
      values: valuesProvider,
      propertySchema: schemaProvider,
      key(): string {
        return this.propertySchema().key();
      },
      valueType(): ValueType {
        return this.propertySchema().valueType();
      },
      propertyState(): PropertyState {
        return this.propertySchema().state();
      }
    } as Property<VALUE>;  // Added explicit cast to satisfy TypeScript
  }
}
