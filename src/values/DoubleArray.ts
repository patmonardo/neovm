//@/values/DoubleArray.ts
import { ValueType } from "@/api/ValueType";
import { Array } from "./Array";

/**
 * Base interface for arrays of floating-point values.
 */
export abstract class FloatingPointArray extends Array {
  /**
   * Returns a copy of this array as a double array.
   */
  abstract doubleArrayValue(): Float64Array;

  /**
   * Returns the double value at the specified index.
   */
  abstract doubleValue(idx: number): number;
}

/**
 * Interface for arrays of double-precision floating-point values.
 */
export abstract class DoubleArray extends FloatingPointArray {
  /**
   * Returns the value type of this array (DOUBLE_ARRAY).
   */
  abstract type(): ValueType;
}
