import { ValueType } from "@/api/ValueType";
import { ValueConversion } from "@/api/ValueConversion";
import { PropertyValues } from "../PropertyValues";
import { GraphPropertyValues } from "./GraphPropertyValues";

/**
 * Graph property values specifically for arrays of double values.
 */
export interface DoubleArrayGraphPropertyValues extends GraphPropertyValues {
  /**
   * Returns an iterable of double arrays.
   *
   * @returns Iterable of number arrays
   */
  doubleArrayValues(): Iterable<number[]>;

  /**
   * Returns an iterable of objects representing double array values.
   *
   * @returns Iterable of number arrays
   */
  objects(): Iterable<number[]>;

  /**
   * Converts double arrays to float arrays.
   * In JavaScript both are represented as number[], but this conversion
   * ensures the precision is limited to float precision.
   *
   * @returns Iterable of number arrays with values converted to float precision
   */
  floatArrayValues(): Iterable<number[]>;

  /**
   * Returns the value type, which is DOUBLE_ARRAY for this implementation.
   *
   * @returns The value type (always DOUBLE_ARRAY)
   */
  valueType(): ValueType;
}

/**
 * Namespace providing factory methods and utilities for DoubleArrayGraphPropertyValues.
 */
export namespace DoubleArrayGraphPropertyValues {
  /**
   * Creates a DoubleArrayGraphPropertyValues from an array of number arrays.
   *
   * @param values Array of number arrays
   * @returns DoubleArrayGraphPropertyValues implementation
   */
  export function of(values: number[][]): DoubleArrayGraphPropertyValues;

  /**
   * Creates a DoubleArrayGraphPropertyValues from a single number array.
   *
   * @param value A single number array
   * @returns DoubleArrayGraphPropertyValues implementation
   */
  export function of(value: number[]): DoubleArrayGraphPropertyValues;

  /**
   * Implementation of the of method.
   */
  export function of(
    param: number[] | number[][]
  ): DoubleArrayGraphPropertyValues {
    // Check if we're dealing with a single array or array of arrays
    if (param.length === 0 || !Array.isArray(param[0])) {
      // It's a single array (or empty array), wrap it in another array
      return new DoubleArrayGraphPropertyValuesImpl([param as number[]]);
    } else {
      // It's already a 2D array
      return new DoubleArrayGraphPropertyValuesImpl(param as number[][]);
    }
  }
}

/**
 * Implementation of DoubleArrayGraphPropertyValues.
 */
class DoubleArrayGraphPropertyValuesImpl
  implements DoubleArrayGraphPropertyValues
{
  private readonly values: number[][];

  /**
   * Creates a new DoubleArrayGraphPropertyValues implementation.
   *
   * @param values The underlying array of number arrays
   */
  constructor(values: number[][]) {
    this.values = values;
  }

  doubleArrayValues(): Iterable<number[]> {
    return this.values;
  }

  objects(): Iterable<number[]> {
    return this.values;
  }

  floatArrayValues(): Iterable<number[]> {
    return {
      [Symbol.iterator]: () => {
        const iterator = this.values[Symbol.iterator]();
        return {
          next(): IteratorResult<number[]> {
            const result = iterator.next();
            if (result.done) return { done: true, value: undefined };

            const doubleArray = result.value;
            if (doubleArray === null) {
              return { done: false, value: null as unknown as number[] };
            }

            // Create a float array by converting each value to float precision
            const floatArray = doubleArray.map((value) =>
              ValueConversion.notOverflowingDoubleToFloat(value)
            );

            return { done: false, value: floatArray };
          },
        };
      },
    };
  }

  valueType(): ValueType {
    return ValueType.DOUBLE_ARRAY;
  }

  doubleValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE_ARRAY,
      ValueType.DOUBLE
    );
  }

  longValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE_ARRAY,
      ValueType.LONG
    );
  }

  longArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE_ARRAY,
      ValueType.LONG_ARRAY
    );
  }

  valueCount(): number {
    return (this.values.length);
  }
}
