import { ValueType } from '@/api/ValueType';
import { PropertyValues } from '@/api/properties/PropertyValues';
import { DoubleGraphPropertyValues } from '../abstract/DoubleGraphPropertyValues';

/**
 * Implementation of DoubleGraphPropertyValues.
 */
export class DefaultDoubleGraphPropertyValues implements DoubleGraphPropertyValues {
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
    return this.values.length;
  }
}
