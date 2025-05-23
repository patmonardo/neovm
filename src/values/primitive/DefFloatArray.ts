import { ValueType } from '@/api/ValueType';
import { ArrayEquals } from '../ArrayEquals';
import { FloatArray } from '../abstract/FloatArray';

/**
 * Implementation of FloatArray that stores an array of float values.
 */
export class DefFloatArray implements FloatArray {
  private readonly value: Float32Array;

  /**
   * Creates a new float array implementation.
   *
   * @param value Array of float values
   */
  constructor(value: Float32Array) {
    this.value = value;
  }

  /**
   * Returns the value type of this array.
   *
   * @returns Value type (FLOAT_ARRAY)
   */
  public type(): ValueType {
    return ValueType.FLOAT_ARRAY;
  }

  /**
   * Returns the underlying array as double values.
   *
   * @returns Double array representation
   */
  public asObject(): Float64Array {
    return this.doubleArrayValue();
  }

  /**
   * Converts this float array to a double array.
   *
   * @returns Double array
   */
  public doubleArrayValue(): Float64Array {
    const copy = new Float64Array(this.value.length);
    for (let i = 0; i < this.value.length; i++) {
      copy[i] = this.value[i];
    }
    return copy;
  }

  /**
   * Returns the value at the specified index as a double.
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
   * Returns a copy of this array.
   *
   * @returns Copy of the float array
   */
  public floatArrayValue(): Float32Array {
    return new Float32Array(this.value);
  }

  /**
   * Compares this array with another object for equality.
   *
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  public equals(o: unknown): boolean {
    return (
      o != null && ArrayEquals.floatAndObject(this.value, (o as any).value)
    );
  }

  /**
   * Compares this array with a byte array for equality.
   *
   * @param o Byte array to compare with
   * @returns true if arrays are equal
   */
  public equalsBytes(o: Uint8Array): boolean {
    return ArrayEquals.byteAndFloat(o, this.value);
  }

  /**
   * Compares this array with a short array for equality.
   *
   * @param o Short array to compare with
   * @returns true if arrays are equal
   */
  public equalsShorts(o: Int16Array): boolean {
    return ArrayEquals.shortAndFloat(o, this.value);
  }

  /**
   * Compares this array with an int array for equality.
   *
   * @param o Int array to compare with
   * @returns true if arrays are equal
   */
  public equalsInts(o: Int32Array): boolean {
    return ArrayEquals.intAndFloat(o, this.value);
  }

  /**
   * Compares this array with a long array for equality.
   *
   * @param other Long array to compare with
   * @returns true if arrays are equal
   */
  public equalsLongs(other: number[]): boolean {
    return ArrayEquals.longAndFloat(other, this.value);
  }

  /**
   * Compares this array with a float array for equality.
   *
   * @param o Float array to compare with
   * @returns true if arrays are equal
   */
  public equalsFloats(o: Float32Array): boolean {
    if (this.value.length !== o.length) return false;

    for (let i = 0; i < this.value.length; i++) {
      if (this.value[i] !== o[i]) return false;
    }

    return true;
  }

  /**
   * Compares this array with a double array for equality.
   *
   * @param o Double array to compare with
   * @returns true if arrays are equal
   */
  public equalsDoubles(o: Float64Array): boolean {
    return ArrayEquals.floatAndDouble(this.value, o);
  }

  /**
   * Returns a hash code for this array.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    let result = 1;
    for (let i = 0; i < this.value.length; i++) {
      const bits = new Float32Array(1);
      bits[0] = this.value[i];
      const intView = new Int32Array(bits.buffer);
      result = 31 * result + intView[0];
    }
    return result;
  }

  /**
   * Returns a string representation of this array.
   *
   * @returns String representation
   */
  public toString(): string {
    return `FloatArray[${Array.from(this.value).join(", ")}]`;
  }
}
