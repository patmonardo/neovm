import { ValueType } from '@/api';
import { DefaultValue } from '@/api';
import { PropertyState } from '@/api';
import { PropertySchema } from '@/api/schema';
import { Property } from '../Property';
import { NodePropertyValues } from './NodePropertyValues';

/**
 * Represents a property of a node in the graph.
 * Specializes the Property interface for node-specific property values.
 */
export interface NodeProperty extends Property<NodePropertyValues> {}

/**
 * Namespace providing factory methods for NodeProperty instances.
 */
export namespace NodeProperty {
  /**
   * Creates a new NodeProperty with the given key, origin state, and values.
   *
   * @param key The property key
   * @param origin The property state indicating the origin of this property
   * @param values The property values
   * @returns A new NodeProperty instance
   */
  export function of(
    key: string,
    origin: PropertyState,
    values: NodePropertyValues
  ): NodeProperty;

  /**
   * Creates a new NodeProperty with the given key, origin state, values, and default value.
   *
   * @param key The property key
   * @param origin The property state indicating the origin of this property
   * @param values The property values
   * @param defaultValue The default value to use when a value is not present
   * @returns A new NodeProperty instance
   */
  export function of(
    key: string,
    origin: PropertyState,
    values: NodePropertyValues,
    defaultValue: DefaultValue
  ): NodeProperty;

  /**
   * Implementation of the of method.
   */
  export function of(
    key: string,
    origin: PropertyState,
    values: NodePropertyValues,
    defaultValue?: DefaultValue
  ): NodeProperty {
    const { DefNodeProperty } = require("./primitive/DefNodeProperty");
    return new DefNodeProperty(
      values,
      PropertySchema.of(
        key,
        values.valueType(),
        ValueType.fallbackValue(values.valueType()), // Fixed: Call static function
        origin
      )
    );
  }
}
