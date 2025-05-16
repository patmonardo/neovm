import { ValueType } from '@/api/ValueType';
import { IntegralArray } from './IntegralArray';

/**
 * Interface for arrays of long integer values.
 */
export abstract class LongArray extends IntegralArray {
  /**
   * Returns a copy of this array as a long array.
   *
   * @returns Copy of the array as long values
   */
  abstract longArrayValue(): number[];

  /**
   * Returns the long value at the specified index.
   *
   * @param idx Index to access
   * @returns Long value at that index
   */
  abstract longValue(idx: number): number;

  /**
   * Returns the value type of this array.
   *
   * @returns Value type (LONG_ARRAY)
   */
  abstract type(): ValueType;
}
