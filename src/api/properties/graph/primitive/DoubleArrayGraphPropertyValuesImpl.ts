import { ValueType } from "@/api/ValueType";
import { ValueConversion } from "@/api/ValueConversion";
import { PropertyValues } from "@/api/properties/PropertyValues";
import { DoubleArrayGraphPropertyValues } from "../abstract/DoubleArrayGraphPropertyValues";

/**
 * Implementation of DoubleArrayGraphPropertyValues.
 */
export class DoubleArrayGraphPropertyValuesImpl
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
    return this.values.length;
  }
}
