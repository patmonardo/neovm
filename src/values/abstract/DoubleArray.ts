//@/values/DoubleArray.ts
import { ValueType } from "@/api/ValueType";
import { FloatingPointArray } from "./FloatingPointArray";

/**
 * Interface for arrays of double-precision floating-point values.
 */
export abstract class DoubleArray extends FloatingPointArray {
  /**
   * Returns the value type of this array (DOUBLE_ARRAY).
   */
  abstract type(): ValueType;
}
