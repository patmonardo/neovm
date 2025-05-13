import { GraphPropertyValues } from "./GraphPropertyValues";
import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue";
import { ValueConversion } from "@/api/ValueConversion";

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
      return new LongGraphPropertyValuesImpl(param);
    } else {
      // It's a single number
      return new LongGraphPropertyValuesImpl([param]);
    }
  }
}

/**
 * Implementation of LongGraphPropertyValues.
 */
class LongGraphPropertyValuesImpl implements LongGraphPropertyValues {
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
              value: ValueConversion.exactBigIntToNumber(value),
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
    return (this.values.length);
  }
}

// Import here to avoid circular dependency
import { PropertyValues } from "../PropertyValues";
