import { NodePropertyValues } from "./NodePropertyValues";
import { ValueType } from "@/api/ValueType";

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
