import { PropertyValues } from '../PropertyValues';
import { ValueType } from '@/api/ValueType';

/**
 * Interface for accessing property values for nodes in a graph.
 * Provides methods for retrieving values of different types for specific nodes.
 */
export interface NodePropertyValues extends PropertyValues {
  /**
   * Returns the double value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not DOUBLE
   * @returns The double value
   */
  doubleValue(nodeId: number): number;

  /**
   * Returns the long value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not LONG
   * @returns The long value
   */
  longValue(nodeId: number): number;

  /**
   * Returns the double array value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not DOUBLE_ARRAY
   * @returns The double array value, or null if the node has no array
   */
  doubleArrayValue(nodeId: number): number[] | null;

  /**
   * Returns the float array value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not FLOAT_ARRAY
   * @returns The float array value, or null if the node has no array
   */
  floatArrayValue(nodeId: number): number[] | null;

  /**
   * Returns the long array value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not LONG_ARRAY
   * @returns The long array value, or null if the node has no array
   */
  longArrayValue(nodeId: number): number[] | null;

  /**
   * Returns the object value for the given node.
   *
   * @param nodeId The node ID
   * @returns The object value, or null if the node has no value
   */
  getObject(nodeId: number): any | null;

  /**
   * Returns the number of nodes that have property values.
   *
   * @returns The node count
   */
  nodeCount(): number;

  /**
   * The dimension of the properties.
   * For scalar values, this is 1.
   * For arrays, this is the length of the array stored for the 0th node id.
   * If that array is null, this method returns undefined.
   *
   * @returns The dimension of the properties stored, or undefined if the dimension cannot easily be retrieved.
   */
  dimension(): number | undefined;

  /**
   * Gets the maximum long value contained in the mapping.
   *
   * @returns The maximum long value, or undefined if the mapping is empty or the feature is not supported.
   * @throws Error if the type is not coercible into a long.
   */
  getMaxLongPropertyValue(): number | undefined;

  /**
   * Gets the maximum double value contained in the mapping.
   *
   * @returns The maximum double value, or undefined if the mapping is empty or the feature is not supported.
   * @throws Error if the type is not coercible into a double.
   */
  getMaxDoublePropertyValue(): number | undefined;

  /**
   * Returns whether the node has a value.
   * This is necessary as for primitive types, we do not have a `null` value.
   *
   * @param nodeId The node ID
   * @returns True if the node has a value, false otherwise
   */
  hasValue(nodeId: number): boolean;
}

/**
 * Namespace containing utilities and default implementations for NodePropertyValues.
 */
export namespace NodePropertyValues {
  /**
   * Creates a default implementation base with methods that throw appropriate errors
   * for unsupported types.
   *
   * @param valueTypeProvider Function that returns the value type
   * @returns A partial implementation with default error-throwing methods
   */
  export function withDefaultsForType(
    valueTypeProvider: () => ValueType
  ): Partial<NodePropertyValues> {
    return {
      doubleValue(_nodeId: number): number {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.DOUBLE);
      },

      longValue(_nodeId: number): number {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.LONG);
      },

      doubleArrayValue(_nodeId: number): number[] | null {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.DOUBLE_ARRAY);
      },

      floatArrayValue(_nodeId: number): number[] | null {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.FLOAT_ARRAY);
      },

      longArrayValue(_nodeId: number): number[] | null {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.LONG_ARRAY);
      },

      dimension(): number | undefined {
        return undefined;
      },

      getMaxLongPropertyValue(): number | undefined {
        const type = valueTypeProvider();
        if (type === ValueType.LONG) {
          throw new Error(`NodePropertyValues implementation does not override 'getMaxLongPropertyValue'`);
        } else {
          throw PropertyValues.unsupportedTypeException(type, ValueType.LONG);
        }
      },

      getMaxDoublePropertyValue(): number | undefined {
        const type = valueTypeProvider();
        if (type === ValueType.DOUBLE) {
          throw new Error(`NodePropertyValues implementation does not override 'getMaxDoublePropertyValue'`);
        } else {
          throw PropertyValues.unsupportedTypeException(type, ValueType.DOUBLE);
        }
      },

      hasValue(_nodeId: number): boolean {
        return true;
      }
    };
  }
}
