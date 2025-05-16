import { Array } from './Array';

/**
 * Interface for arrays containing integral values.
 * Serves as a marker interface for integral array types like LongArray.
 */
export abstract class IntegralArray extends Array {
  /**
   * Returns the integral value at the specified index.
   *
   * @param idx Index to access
   * @returns Integral value at that index
   */
  abstract longValue(idx: number): number;

  /**
   * Returns a copy of this array as a long array.
   *
   * @returns Copy of the array as long values
   */
  abstract longArrayValue(): number[];
}
