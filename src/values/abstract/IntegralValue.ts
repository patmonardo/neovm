import { GdsValue } from './GdsValue';

/**
 * Interface for values representing integral numbers.
 */
export abstract class IntegralValue extends GdsValue {
  /**
   * Returns the value as a long integer.
   *
   * @returns The integral value
   */
  abstract longValue(): number;
}
