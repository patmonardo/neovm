import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { NodePropertyValues } from "../NodePropertyValues";
import { DefaultDoubleNodePropertyValues } from "../primitive/DefaultDoubleNodePropertyValues";
import { EmptyDoubleNodePropertyValues } from "../primitive/EmptyDoubleNodePropertyValues";

/**
 * Node property values specifically for double (number) values.
 */
export interface DoubleNodePropertyValues extends NodePropertyValues {
  /**
   * Returns the double value for the specified node.
   *
   * @param nodeId The node ID
   * @returns The double value
   */
  doubleValue(nodeId: number): number;

  /**
   * Returns the object representation of the property value.
   * For double values, this is the Number object.
   *
   * @param nodeId The node ID
   * @returns The value as an object
   */
  getObject(nodeId: number): number;

  /**
   * Returns the value type, which is DOUBLE for this implementation.
   *
   * @returns The value type (always DOUBLE)
   */
  valueType(): ValueType;

  /**
   * Returns the dimension of this property.
   * For scalar doubles, this is always 1.
   *
   * @returns The dimension (always 1)
   */
  dimension(): number | undefined;

  /**
   * Returns the maximum double property value across all nodes.
   *
   * @returns The maximum value, or undefined if no values exist
   */
  getMaxDoublePropertyValue(): number | undefined;
}

/**
 * Factory methods for creating DoubleNodePropertyValues instances
 */
export namespace DoubleNodePropertyValues {
  /**
   * Creates a new instance with the specified default value
   */
  export function of(defaultValue: number = 0.0): DoubleNodePropertyValues {
    return new DefaultDoubleNodePropertyValues(
      new Map<number, number>(),
      DefaultValue.of(defaultValue)
    );
  }

  /**
   * Creates a new instance with values from the specified map
   */
  export function fromMap(
    data: Map<number, number>,
    defaultValue: number = 0.0
  ): DoubleNodePropertyValues {
    return new DefaultDoubleNodePropertyValues(
      new Map(data),
      DefaultValue.of(defaultValue)
    );
  }

  /**
   * Creates an empty instance that returns no values
   */
  export function empty(): DoubleNodePropertyValues {
    return EmptyDoubleNodePropertyValues.INSTANCE;
  }

  /**
   * Creates a new instance from a JavaScript array
   */
  export function fromArray(
    values: number[],
    defaultValue: number = 0.0
  ): DoubleNodePropertyValues {
    const map = new Map<number, number>();
    values.forEach((value, index) => {
      map.set(index, value);
    });
    return new DefaultDoubleNodePropertyValues(
      map,
      DefaultValue.of(defaultValue)
    );
  }
}
