import { ValueType } from "@/api";
import { GraphPropertyValues } from "../GraphPropertyValues";
import { DefaultLongGraphPropertyValues } from "../primitive/DefaultLongGraphPropertyValues";

/**
 * Graph property values specifically for Long (number) values.
 */
export interface LongGraphPropertyValues extends GraphPropertyValues {
  /**
   * Returns an iterable of long integer values.
   *
   * @returns Iterable of long (number) values
   */
  longValues(): Iterable<number>;

  /**
   * Returns an iterable of boxed objects representing long values.
   *
   * @returns Iterable of number objects
   */
  objects(): Iterable<number>;

  /**
   * Returns the value type, which is LONG for this implementation.
   *
   * @returns The value type (always LONG)
   */
  valueType(): ValueType;

  /**
   * Converts and returns long values as doubles.
   *
   * @returns Iterable of number values converted from bigints
   */
  doubleValues(): Iterable<number>;
}

/**
 * Namespace providing factory methods and utilities for LongGraphPropertyValues.
 */
export namespace LongGraphPropertyValues {
  /**
   * Creates a LongGraphPropertyValues from an array of bigints.
   *
   * @param values Array of number values
   * @returns LongGraphPropertyValues implementation
   */
  export function of(values: number[]): LongGraphPropertyValues;

  /**
   * Creates a LongGraphPropertyValues from a single number value.
   *
   * @param value A single number value
   * @returns LongGraphPropertyValues implementation
   */
  export function of(value: number): LongGraphPropertyValues;

  /**
   * Implementation of the of method.
   */
  export function of(param: number | number[]): LongGraphPropertyValues {
    if (Array.isArray(param)) {
      // It's an array of bigints
      return new DefaultLongGraphPropertyValues(param);
    } else {
      // It's a single number
      return new DefaultLongGraphPropertyValues([param]);
    }
  }
}
