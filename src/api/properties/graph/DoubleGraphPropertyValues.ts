import { ValueType } from "@/api/ValueType";
import { PropertyValues } from "../PropertyValues";
import { GraphPropertyValues } from "./GraphPropertyValues";

/**
 * Graph property values specifically for Double (floating point) values.
 */
export interface DoubleGraphPropertyValues extends GraphPropertyValues {
  /**
   * Returns an iterable of double values.
   *
   * @returns Iterable of number values
   */
  doubleValues(): Iterable<number>;

  /**
   * Returns an iterable of boxed objects representing double values.
   *
   * @returns Iterable of number objects
   */
  objects(): Iterable<number>;

  /**
   * Returns the value type, which is DOUBLE for this implementation.
   *
   * @returns The value type (always DOUBLE)
   */
  valueType(): ValueType;
}

/**
 * Namespace providing factory methods and utilities for DoubleGraphPropertyValues.
 */
export namespace DoubleGraphPropertyValues {
  /**
   * Creates a DoubleGraphPropertyValues from an array of numbers.
   *
   * @param values Array of number values
   * @returns DoubleGraphPropertyValues implementation
   */
  export function of(values: number[]): DoubleGraphPropertyValues;

  /**
   * Creates a DoubleGraphPropertyValues from a single number value.
   *
   * @param value A single number value
   * @returns DoubleGraphPropertyValues implementation
   */
  export function of(value: number): DoubleGraphPropertyValues;

  /**
   * Implementation of the of method.
   */
  export function of(param: number | number[]): DoubleGraphPropertyValues {
    if (Array.isArray(param)) {
      // It's an array of numbers
      return new DoubleGraphPropertyValuesImpl(param);
    } else {
      // It's a single number
      return new DoubleGraphPropertyValuesImpl([param]);
    }
  }
}

/**
 * Implementation of DoubleGraphPropertyValues.
 */
class DoubleGraphPropertyValuesImpl implements DoubleGraphPropertyValues {
  private readonly values: number[];

  /**
   * Creates a new DoubleGraphPropertyValues implementation.
   *
   * @param values The underlying values
   */
  constructor(values: number[]) {
    this.values = values;
  }

  doubleValues(): Iterable<number> {
    return this.values;
  }

  objects(): Iterable<number> {
    return this.values;
  }

  valueType(): ValueType {
    return ValueType.DOUBLE;
  }

  longValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE,
      ValueType.LONG
    );
  }

  doubleArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE,
      ValueType.DOUBLE_ARRAY
    );
  }

  floatArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE,
      ValueType.FLOAT_ARRAY
    );
  }

  longArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.DOUBLE,
      ValueType.LONG_ARRAY
    );
  }

  valueCount(): number {
    return (this.values.length);
  }
}
