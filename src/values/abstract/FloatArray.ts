import { FloatingPointArray } from './FloatingPointArray';
import { ValueType } from '../../api/ValueType';

/**
 * Interface for arrays of single-precision floating-point values.
 */
export abstract class FloatArray extends FloatingPointArray {
  /**
   * Returns a copy of this array as a float array.
   */
  abstract floatArrayValue(): Float32Array;

  /**
   * Returns the value type of this array (FLOAT_ARRAY).
   */
  abstract type(): ValueType;
}
