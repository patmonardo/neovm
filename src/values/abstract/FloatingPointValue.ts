import { GdsValue } from './GdsValue';

/**
 * Interface for values representing floating-point numbers.
 */
export abstract class FloatingPointValue extends GdsValue {
  /**
   * Returns the value as a double-precision floating point number.
   *
   * @returns The floating-point value
   */
  abstract doubleValue(): number;
}
