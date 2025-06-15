import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyValues } from "@/api/properties";

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
  doubleArrayValue(nodeId: number): Float64Array;

  /**
   * Returns the float array value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not FLOAT_ARRAY
   * @returns The float array value, or null if the node has no array
   */
  floatArrayValue(nodeId: number): Float32Array;

  /**
   * Returns the long array value for the given node.
   *
   * @param nodeId The node ID
   * @throws Error if the value type is not LONG_ARRAY
   * @returns The long array value, or null if the node has no array
   */
  longArrayValue(nodeId: number): number[];

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

export class UnsupportedOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedOperationError";
    // Optional: to make instanceof work correctly if targeting ES5 or lower
    // Object.setPrototypeOf(this, UnsupportedOperationError.prototype);
  }
}

/**
 * Namespace containing utilities and factory methods for NodePropertyValues.
 */
export namespace NodePropertyValues {
  /**
   * Provides a base set of NodePropertyValues methods that throw
   * UnsupportedOperationError if they are not applicable to the given primary ValueType.
   * Concrete implementations can use this to inherit default throwing behavior.
   *
   * @param primaryValueType A function that returns the primary ValueType of the concrete implementation.
   * @returns A partial NodePropertyValues object with default throwing implementations.
   */
  export function withDefaultsForType(
    primaryValueTypeProvider: () => ValueType
  ): Omit<
    NodePropertyValues,
    "nodeCount" | "release" | "hasValue" | "valueType"
  > {
    const createError = (operation: string, expectedType?: ValueType) => {
      const actualType = primaryValueTypeProvider();
      let message = `${operation} is not supported for ValueType ${actualType}.`;
      if (expectedType) {
        message = `ValueType ${actualType} is not coercible into ${expectedType} for ${operation}.`;
      }
      return new UnsupportedOperationError(message);
    };

    return {
      doubleValue: (_nodeId: number): number => {
        if (primaryValueTypeProvider() === ValueType.DOUBLE) {
          // This should be implemented by the concrete class
          throw createError("doubleValue (concrete implementation missing)");
        }
        throw createError("doubleValue", ValueType.DOUBLE);
      },
      longValue: (_nodeId: number): number => {
        if (primaryValueTypeProvider() === ValueType.LONG) {
          throw createError("longValue (concrete implementation missing)");
        }
        throw createError("longValue", ValueType.LONG);
      },
      doubleArrayValue: (_nodeId: number): Float64Array => {
        if (primaryValueTypeProvider() === ValueType.DOUBLE_ARRAY) {
          throw createError(
            "doubleArrayValue (concrete implementation missing)"
          );
        }
        throw createError("doubleArrayValue", ValueType.DOUBLE_ARRAY);
      },
      floatArrayValue: (_nodeId: number): Float32Array => {
        if (primaryValueTypeProvider() === ValueType.FLOAT_ARRAY) {
          throw createError(
            "floatArrayValue (concrete implementation missing)"
          );
        }
        throw createError("floatArrayValue", ValueType.FLOAT_ARRAY);
      },
      longArrayValue: (_nodeId: number): number[] => {
        if (primaryValueTypeProvider() === ValueType.LONG_ARRAY) {
          throw createError("longArrayValue (concrete implementation missing)");
        }
        throw createError("longArrayValue", ValueType.LONG_ARRAY);
      },
      getObject: (_nodeId: number): any | undefined => {
        // getObject is more generic, often implemented by returning the primary typed value.
        // Concrete class should override this.
        throw createError("getObject (concrete implementation missing)");
      },
      dimension: (): number | undefined => {
        // Scalar types usually return 1. Array types return their length.
        // Concrete class should override this.
        const type = primaryValueTypeProvider();
        if (
          [
            ValueType.DOUBLE,
            ValueType.FLOAT,
            ValueType.LONG,
            ValueType.BOOLEAN,
            ValueType.STRING /* etc. for scalars */,
          ].includes(type)
        ) {
          return 1;
        }
        throw createError(
          "dimension (concrete implementation missing for array type or not applicable)"
        );
      },
      getMaxLongPropertyValue: (): number | undefined => {
        if (
          primaryValueTypeProvider() === ValueType.LONG ||
          primaryValueTypeProvider() === ValueType.LONG_ARRAY
        ) {
          throw createError(
            "getMaxLongPropertyValue (concrete implementation missing)"
          );
        }
        throw createError("getMaxLongPropertyValue");
      },
      getMaxDoublePropertyValue: (): number | undefined => {
        if (
          primaryValueTypeProvider() === ValueType.DOUBLE ||
          primaryValueTypeProvider() === ValueType.DOUBLE_ARRAY
        ) {
          throw createError(
            "getMaxDoublePropertyValue (concrete implementation missing)"
          );
        }
        throw createError("getMaxDoublePropertyValue");
      },
      // `valueType`, `nodeCount`, `release`, `hasValue` MUST be implemented by the concrete class.
    };
  }
  /**
   * Creates a concrete NodePropertyValues instance based on the given type and data.
   * This factory assumes that corresponding primitive implementation classes exist
   * (e.g., DoubleNodePropertyValuesImpl, LongNodePropertyValuesImpl).
   *
   * @param type The ValueType of the properties.
   * @param data A Map where keys are node IDs and values are the property data.
   *             The type of values in the map should correspond to the ValueType
   *             (e.g., number for DOUBLE/LONG, ArrayLike<number> for DOUBLE_ARRAY).
   * @param defaultValue Optional custom default value for the properties.
   * @returns A NodePropertyValues instance.
   * @throws Error if an unsupported ValueType is provided or a concrete implementation is not linked.
   */
  export function create(
    type: ValueType,
    data: Map<number, any>, // Using 'any' for flexibility; concrete impls will handle specifics
    defaultValue?: DefaultValue
  ): NodePropertyValues {
    switch (type) {
      case ValueType.DOUBLE:
        // Example: return new DoubleNodePropertyValuesImpl(data as Map<number, number>, defaultValue);
        throw new Error(
          `NodePropertyValues.create: Concrete implementation for ${type} not yet linked. Ensure DoubleNodePropertyValuesImpl is imported and used.`
        );
      case ValueType.LONG:
        // Example: return new LongNodePropertyValuesImpl(data as Map<number, number>, defaultValue);
        throw new Error(
          `NodePropertyValues.create: Concrete implementation for ${type} not yet linked. Ensure LongNodePropertyValuesImpl is imported and used.`
        );
      case ValueType.FLOAT:
        // Example: return new FloatNodePropertyValuesImpl(data as Map<number, number>, defaultValue);
        throw new Error(
          `NodePropertyValues.create: Concrete implementation for ${type} not yet linked. Ensure FloatNodePropertyValuesImpl is imported and used.`
        );
      case ValueType.DOUBLE_ARRAY:
        // Example: return new DoubleArrayNodePropertyValuesImpl(data as Map<number, ArrayLike<number>>, defaultValue);
        throw new Error(
          `NodePropertyValues.create: Concrete implementation for ${type} not yet linked. Ensure DoubleArrayNodePropertyValuesImpl is imported and used.`
        );
      case ValueType.LONG_ARRAY:
        // Example: return new LongArrayNodePropertyValuesImpl(data as Map<number, ArrayLike<number>>, defaultValue);
        throw new Error(
          `NodePropertyValues.create: Concrete implementation for ${type} not yet linked. Ensure LongArrayNodePropertyValuesImpl is imported and used.`
        );
      case ValueType.FLOAT_ARRAY:
        // Example: return new FloatArrayNodePropertyValuesImpl(data as Map<number, ArrayLike<number>>, defaultValue);
        throw new Error(
          `NodePropertyValues.create: Concrete implementation for ${type} not yet linked. Ensure FloatArrayNodePropertyValuesImpl is imported and used.`
        );
      // Add cases for other ValueTypes (STRING, BOOLEAN, DATE, LIST_OF_STRING, etc.)
      // Each case would instantiate its corresponding primitive Impl class.
      // For example:
      // case ValueType.STRING:
      //   return new StringNodePropertyValuesImpl(data as Map<number, string>, defaultValue);
      default:
        throw new Error(
          `Unsupported ValueType for NodePropertyValues.create: ${type}`
        );
    }
  }
}
