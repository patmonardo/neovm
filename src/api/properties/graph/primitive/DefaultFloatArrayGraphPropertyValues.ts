import { ValueType } from '@/api/ValueType';
import { PropertyValues } from '@/api/properties/PropertyValues';
import { FloatArrayGraphPropertyValues } from '../abstract/FloatArrayGraphPropertyValues';

/**
 * Implementation of FloatArrayGraphPropertyValues.
 */
export class DefaultFloatArrayGraphPropertyValues
  implements FloatArrayGraphPropertyValues
{
  private readonly values: number[][];

  /**
   * Creates a new FloatArrayGraphPropertyValues implementation.
   *
   * @param values The underlying array of number arrays
   */
  constructor(values: number[][]) {
    this.values = values;
  }

  floatArrayValues(): Iterable<number[]> {
    return this.values;
  }

  objects(): Iterable<number[]> {
    return this.values;
  }

  doubleArrayValues(): Iterable<number[]> {
    return {
      [Symbol.iterator]: () => {
        const iterator = this.values[Symbol.iterator]();
        return {
          next(): IteratorResult<number[]> {
            const result = iterator.next();
            if (result.done) return { done: true, value: undefined };

            const floatArray = result.value;
            if (floatArray === null) {
              return { done: false, value: null as unknown as number[] };
            }

            // Create a copy of the array to simulate converting from float to double
            const doubleArray = [...floatArray];
            return { done: false, value: doubleArray };
          },
        };
      },
    };
  }

  valueType(): ValueType {
    return ValueType.FLOAT_ARRAY;
  }

  doubleValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.FLOAT_ARRAY,
      ValueType.DOUBLE
    );
  }

  longValues(): Iterable<number> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.FLOAT_ARRAY,
      ValueType.LONG
    );
  }

  longArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.FLOAT_ARRAY,
      ValueType.LONG_ARRAY
    );
  }

  valueCount(): number {
    return this.values.length;
  }
}
