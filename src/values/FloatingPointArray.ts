import { Array } from './Array';

/**
 * Base interface for arrays of floating-point values.
 */
export abstract class FloatingPointArray extends Array {
  /**
   * Returns the double value at the specified index.
   *
   * @param idx Index to access
   * @returns Double value at that index
   */
  abstract doubleValue(idx: number): number;

  /**
   * Returns a copy of this array as a double array.
   *
   * @returns Copy of the array as double values
   */
  abstract doubleArrayValue(): Float64Array;
}
