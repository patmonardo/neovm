import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyValues } from "@/api/properties";
import { LongGraphPropertyValues } from "../abstract/LongGraphPropertyValues";

/**
 * Implementation of LongGraphPropertyValues.
 */
export class DefaultLongGraphPropertyValues implements LongGraphPropertyValues {
  private readonly values: number[];

  /**
   * Creates a new LongGraphPropertyValues implementation.
   *
   * @param values The underlying values
   */
  constructor(values: number[]) {
    this.values = values;
  }

  longValues(): Iterable<number> {
    return this.values;
  }

  objects(): Iterable<number> {
    return this.values;
  }

  valueType(): ValueType {
    return ValueType.LONG;
  }

  doubleValues(): Iterable<number> {
    return {
      [Symbol.iterator]: () => {
        const iterator = this.values[Symbol.iterator]();
        return {
          next(): IteratorResult<number> {
            const result = iterator.next();
            if (result.done) return { done: true, value: undefined };

            const value = result.value;
            if (value === DefaultValue.LONG_DEFAULT_FALLBACK) {
              return {
                done: false,
                value: DefaultValue.DOUBLE_DEFAULT_FALLBACK,
              };
            }

            return {
              done: false,
              value: value,
            };
          },
        };
      },
    };
  }

  doubleArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG,
      ValueType.DOUBLE_ARRAY
    );
  }

  floatArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG,
      ValueType.FLOAT_ARRAY
    );
  }

  longArrayValues(): Iterable<number[]> {
    throw PropertyValues.unsupportedTypeException(
      ValueType.LONG,
      ValueType.LONG_ARRAY
    );
  }

  valueCount(): number {
    return this.values.length;
  }
}
