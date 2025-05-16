import { ValueType } from "@/api/ValueType";
import { GraphPropertyValues } from "../abstract/GraphPropertyValues";
import { DoubleArrayGraphPropertyValuesImpl } from "../primitive/DoubleArrayGraphPropertyValuesImpl";

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
