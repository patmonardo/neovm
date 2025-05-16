import { ValueType } from "@/api/ValueType";
import { GraphPropertyValues } from "./GraphPropertyValues";
import { LongArrayGraphPropertyValuesImpl } from "../primitive/LongArrayGraphPropertyValuesImpl";

/**
 * Graph property values specifically for arrays of long integers.
 */
export interface LongArrayGraphPropertyValues extends GraphPropertyValues {
  /**
   * Returns an iterable of long integer arrays.
   *
   * @returns Iterable of number arrays
   */
  longArrayValues(): Iterable<number[]>;

  /**
   * Returns an iterable of objects representing long array values.
   *
   * @returns Iterable of number arrays
   */
  objects(): Iterable<number[]>;

  /**
   * Returns the value type, which is LONG_ARRAY for this implementation.
   *
   * @returns The value type (always LONG_ARRAY)
   */
  valueType(): ValueType;
}

/**
 * Namespace providing factory methods and utilities for LongArrayGraphPropertyValues.
 */
export namespace LongArrayGraphPropertyValues {
  /**
   * Creates a LongArrayGraphPropertyValues from an array of number arrays.
   *
   * @param values Array of number arrays
   * @returns LongArrayGraphPropertyValues implementation
   */
  export function of(values: number[][]): LongArrayGraphPropertyValues;

  /**
   * Creates a LongArrayGraphPropertyValues from a single number array.
   *
   * @param value A single number array
   * @returns LongArrayGraphPropertyValues implementation
   */
  export function of(value: number[]): LongArrayGraphPropertyValues;

  /**
   * Implementation of the of method.
   */
  export function of(
    param: number[] | number[][]
  ): LongArrayGraphPropertyValues {
    if (param.length === 0 || !Array.isArray(param[0])) {
      // It's a single array (or empty array)
      return new LongArrayGraphPropertyValuesImpl([param as number[]]);
    } else {
      // It's already a 2D array
      return new LongArrayGraphPropertyValuesImpl(param as number[][]);
    }
  }
}
