import { GdsValue } from './GdsValue';

/**
 * Base interface for array values.
 */
export abstract class Array extends GdsValue {

  /**
   * Returns the length of this array.
   */
  abstract length(): number;

  /**
   * Check equality with byte arrays.
   */
  abstract equalsBytes(other: Uint8Array): boolean;

  /**
   * Check equality with short arrays.
   */
  abstract equalsShorts(other: Int16Array): boolean;

  /**
   * Check equality with int arrays.
   */
  abstract equalsInts(other: Int32Array): boolean;

  /**
   * Check equality with long arrays.
   */
  abstract equalsLongs(other: number[]): boolean;

  /**
   * Check equality with float arrays.
   */
  abstract equalsFloats(other: Float32Array): boolean;

  /**
   * Check equality with double arrays.
   */
  abstract equalsDoubles(other: Float64Array): boolean;

  /**
   * Returns string representation of this array.
   */
  abstract toString(): string;
}
