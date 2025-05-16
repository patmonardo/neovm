import { ValueType } from "@/api/ValueType";
import { DoubleArray } from "../abstract/DoubleArray";
import { ArrayEquals } from "./ArrayEquals";

/**
 * Implementation of DoubleArray that stores an array of double values.
 */
export class DoubleArrayImpl implements DoubleArray {
  private readonly value: Float64Array;

  /**
   * Creates a new double array implementation.
   *
   * @param value Array of double values
   */
  constructor(value: Float64Array) {
    this.value = value;
  }

  /**
   * Returns a copy of this array.
   *
   * @returns Copy of the double array
   */
  public doubleArrayValue(): Float64Array {
    return new Float64Array(this.value);
  }

  /**
   * Returns the double value at the specified index.
   *
   * @param idx Index to access
   * @returns Double value at that index
   */
  public doubleValue(idx: number): number {
    return this.value[idx];
  }

  /**
   * Returns the length of this array.
   *
   * @returns Array length
   */
  public length(): number {
    return this.value.length;
  }

  /**
   * Returns the value type of this array.
   *
   * @returns Value type (DOUBLE_ARRAY)
   */
  public type(): ValueType {
    return ValueType.DOUBLE_ARRAY;
  }

  /**
   * Returns the underlying double array.
   *
   * @returns Double array
   */
  public asObject(): Float64Array {
    return this.value;
  }

  /**
   * Compares this array with another object for equality.
   *
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  public equals(o: unknown): boolean {
    return (
      o != null && ArrayEquals.doubleAndObject(this.value, (o as any).value)
    );
  }

  /**
   * Compares this array with a byte array for equality.
   *
   * @param o Byte array to compare with
   * @returns true if arrays are equal
   */
  public equalsBytes(o: Uint8Array): boolean {
    return ArrayEquals.byteAndDouble(o, this.value);
  }

  /**
   * Compares this array with a short array for equality.
   *
   * @param o Short array to compare with
   * @returns true if arrays are equal
   */
  public equalsShorts(o: Int16Array): boolean {
    return ArrayEquals.shortAndDouble(o, this.value);
  }

  /**
   * Compares this array with an int array for equality.
   *
   * @param o Int array to compare with
   * @returns true if arrays are equal
   */
  public equalsInts(o: Int32Array): boolean {
    return ArrayEquals.intAndDouble(o, this.value);
  }

  /**
   * Compares this array with a long array for equality.
   *
   * @param other Long array to compare with
   * @returns true if arrays are equal
   */
  public equalsLongs(other: number[]): boolean {
    return ArrayEquals.longAndDouble(other, this.value);
  }

  /**
   * Compares this array with a float array for equality.
   *
   * @param o Float array to compare with
   * @returns true if arrays are equal
   */
  public equalsFloats(o: Float32Array): boolean {
    return ArrayEquals.floatAndDouble(o, this.value);
  }

  /**
   * Compares this array with a double array for equality.
   *
   * @param o Double array to compare with
   * @returns true if arrays are equal
   */
  public equalsDoubles(o: Float64Array): boolean {
    if (this.value.length !== o.length) return false;

    for (let i = 0; i < this.value.length; i++) {
      if (this.value[i] !== o[i]) return false;
    }

    return true;
  }

  /**
   * Returns a hash code for this array.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    let result = 1;
    for (let i = 0; i < this.value.length; i++) {
      // Convert double to bits and use same algorithm as Java's Arrays.hashCode
      const bits = new Float64Array(1);
      bits[0] = this.value[i];
      const intView = new Int32Array(bits.buffer);
      result = 31 * result + (intView[0] ^ intView[1]);
    }
    return result;
  }

  /**
   * Returns a string representation of this array.
   *
   * @returns String representation
   */
  public toString(): string {
    return `DoubleArray[${Array.from(this.value).join(", ")}]`;
  }
}
