import { ValueType } from "@/api/ValueType";
import { GraphPropertyValues } from "../GraphPropertyValues";
import { DefFloatArrayGraphPropertyValues } from "../primitive/DefFloatArrayGraphPropertyValues";

/**
 * Graph property values specifically for arrays of float values.
 */
export interface FloatArrayGraphPropertyValues extends GraphPropertyValues {
  /**
   * Returns an iterable of float arrays.
   *
   * @returns Iterable of number arrays representing float arrays
   */
  floatArrayValues(): Iterable<number[]>;

  /**
   * Returns an iterable of objects representing float array values.
   *
   * @returns Iterable of number arrays
   */
  objects(): Iterable<number[]>;

  /**
   * Converts float arrays to double arrays.
   * In TypeScript, both are represented as number arrays so this is a copy operation.
   *
   * @returns Iterable of number arrays with values converted to doubles
   */
  doubleArrayValues(): Iterable<number[]>;

  /**
   * Returns the value type, which is FLOAT_ARRAY for this implementation.
   *
   * @returns The value type (always FLOAT_ARRAY)
   */
  valueType(): ValueType;
}

/**
 * Namespace providing factory methods and utilities for FloatArrayGraphPropertyValues.
 */
export namespace FloatArrayGraphPropertyValues {
  /**
   * Creates a FloatArrayGraphPropertyValues from an array of number arrays.
   *
   * @param values Array of number arrays
   * @returns FloatArrayGraphPropertyValues implementation
   */
  export function of(values: number[][]): FloatArrayGraphPropertyValues;

  /**
   * Creates a FloatArrayGraphPropertyValues from a single number array.
   *
   * @param value A single number array
   * @returns FloatArrayGraphPropertyValues implementation
   */
  export function of(value: number[]): FloatArrayGraphPropertyValues;

  /**
   * Implementation of the of method.
   */
  export function of(
    param: number[] | number[][]
  ): FloatArrayGraphPropertyValues {
    if (param.length === 0 || !Array.isArray(param[0])) {
      // It's a single array (or empty array)
      return new DefFloatArrayGraphPropertyValues([param as number[]]);
    } else {
      // It's already a 2D array
      return new DefFloatArrayGraphPropertyValues(param as number[][]);
    }
  }
}
