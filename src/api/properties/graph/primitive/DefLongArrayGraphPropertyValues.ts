import { ValueType } from "@/api";
import { PropertyValues } from "@/api/properties";
import { LongArrayGraphPropertyValues } from "../abstract/LongArrayGraphPropertyValues";

/**
 * Implementation of LongArrayGraphPropertyValues.
 */
export class DefLongArrayGraphPropertyValues
  implements LongArrayGraphPropertyValues
{
  private readonly values: number[][];

  /**
   * Creates a new LongArrayGraphPropertyValues implementation.
   *
   * @param values The underlying array of number arrays
   */
  constructor(values: number[][]) {
    this.values = values;
  }

  longArrayValues(): Iterable<number[]> {
    return this.values;
  }

  objects(): Iterable<number[]> {
    return this.values;
  }

  valueType(): ValueType.LONG_ARRAY {
    return ValueType.LONG_ARRAY;
  }

  doubleValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG_ARRAY,
      ValueType.DOUBLE
    );
  }

  longValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG_ARRAY,
      ValueType.LONG
    );
  }

  doubleArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG_ARRAY,
      ValueType.DOUBLE_ARRAY
    );
  }

  floatArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG_ARRAY,
      ValueType.FLOAT_ARRAY
    );
  }

  valueCount(): number {
    return this.values.length;
  }
}
