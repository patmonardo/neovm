//@/api/properties/graph/GraphPropertyValues.ts
import { ValueType } from '@/api/ValueType';
import { PropertyValues } from '../PropertyValues';

/**
 * Property values specific to graph properties (as opposed to node or relationship properties).
 * Extends the base PropertyValues with methods for accessing values of different types.
 */
export interface GraphPropertyValues extends PropertyValues {
  /**
   * Returns an iterable of double values.
   *
   * @throws Error if the value type is not DOUBLE
   * @returns Iterable of double values
   */
  doubleValues(): Iterable<number>;

  /**
   * Returns an iterable of long values.
   *
   * @throws Error if the value type is not LONG
   * @returns Iterable of long integer values
   */
  longValues(): Iterable<number>;

  /**
   * Returns an iterable of double array values.
   *
   * @throws Error if the value type is not DOUBLE_ARRAY
   * @returns Iterable of double arrays
   */
  doubleArrayValues(): Iterable<number[]>;

  /**
   * Returns an iterable of float array values.
   *
   * @throws Error if the value type is not FLOAT_ARRAY
   * @returns Iterable of float arrays
   */
  floatArrayValues(): Iterable<number[]>;

  /**
   * Returns an iterable of long array values.
   *
   * @throws Error if the value type is not LONG_ARRAY
   * @returns Iterable of long integer arrays
   */
  longArrayValues(): Iterable<number[]>;

  /**
   * Returns an iterable of objects.
   *
   * @returns Iterable of objects of any type
   */
  objects(): Iterable<any>;

  /**
   * Returns the number of values in this property.
   *
   * @returns The value count
   */
  valueCount(): number;
}

/**
 * Namespace containing default implementations and utilities for GraphPropertyValues.
 */
export namespace GraphPropertyValues {
  /**
   * Creates an implementation with default methods that throw errors for unsupported types.
   *
   * @param valueTypeProvider Function that returns the value type
   * @param objectsProvider Function that provides the objects iterator
   * @param valueCountProvider Function that provides the value count
   * @returns A partial implementation with default methods
   */
  export function withDefaults(
    valueTypeProvider: () => ValueType,
    objectsProvider: () => Iterable<any>,
    valueCountProvider: () => number
  ): Partial<GraphPropertyValues> {
    return {
      valueType: valueTypeProvider,

      doubleValues(): Iterable<number> {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.DOUBLE);
      },

      longValues(): Iterable<number> {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.LONG);
      },

      doubleArrayValues(): Iterable<number[]> {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.DOUBLE_ARRAY);
      },

      floatArrayValues(): Iterable<number[]> {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.FLOAT_ARRAY);
      },

      longArrayValues(): Iterable<number[]> {
        throw PropertyValues.unsupportedTypeException(valueTypeProvider(), ValueType.LONG_ARRAY);
      },

      objects: objectsProvider,
      valueCount: valueCountProvider
    };
  }

  /**
   * Creates a GraphPropertyValues from an array of double values.
   *
   * @param values Double values
   * @returns A GraphPropertyValues implementation
   */
  export function fromDoubles(values: number[]): GraphPropertyValues {
    return {
      valueType(): ValueType {
        return ValueType.DOUBLE;
      },

      doubleValues(): Iterable<number> {
        return values;
      },

      longValues(): Iterable<number> {
        throw PropertyValues.unsupportedTypeException(ValueType.DOUBLE, ValueType.LONG);
      },

      doubleArrayValues(): Iterable<number[]> {
        throw PropertyValues.unsupportedTypeException(ValueType.DOUBLE, ValueType.DOUBLE_ARRAY);
      },

      floatArrayValues(): Iterable<number[]> {
        throw PropertyValues.unsupportedTypeException(ValueType.DOUBLE, ValueType.FLOAT_ARRAY);
      },

      longArrayValues(): Iterable<number[]> {
        throw PropertyValues.unsupportedTypeException(ValueType.DOUBLE, ValueType.LONG_ARRAY);
      },

      objects(): Iterable<any> {
        return values;
      },

      valueCount(): number {
        return values.length;
      }
    };
  }
}
