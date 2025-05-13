import { ValueType } from '@/api/ValueType';
import { ArrayEquals } from '../ArrayEquals';
import { GdsValue } from '../GdsValue';
import { LongArray } from '../LongArray';

/**
 * Implementation of LongArray that stores an array of long (number) values.
 */
export class LongArrayImpl implements LongArray {
  private readonly value: number[];

  /**
   * Creates a new long array implementation.
   *
   * @param value Array of long values
   */
  constructor(value: number[]) {
    this.value = value;
  }

  /**
   * Returns a copy of this array.
   *
   * @returns Copy of the array
   */
  public longArrayValue(): number[] {
    return [...this.value];
  }

  /**
   * Returns the long value at the specified index.
   *
   * @param idx Index to access
   * @returns Long value at that index
   */
  public longValue(idx: number): number {
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
   * @returns Value type (LONG_ARRAY)
   */
  public type(): ValueType {
    return ValueType.LONG_ARRAY;
  }

  /**
   * Returns the underlying array.
   *
   * @returns Array of bigints
   */
  public asObject(): number[] {
    return this.value;
  }

  /**
   * Compares this array with another object for equality.
   *
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  public equals(o: unknown): boolean {
    if (this === o) return true;

    if (o instanceof LongArray) {
      return this.equalsLongs(o.longArrayValue());
    } else if (o instanceof GdsValue) {
      return ArrayEquals.longAndObject(this.value, o.asObject());
    }

    return false;
  }

  /**
   * Compares this array with a byte array for equality.
   *
   * @param o Byte array to compare with
   * @returns true if arrays are equal
   */
  public equalsBytes(o: Uint8Array): boolean {
    return ArrayEquals.byteAndLong(o, this.value);
  }

  /**
   * Compares this array with a short array for equality.
   *
   * @param o Short array to compare with
   * @returns true if arrays are equal
   */
  public equalsShorts(o: Int16Array): boolean {
    return ArrayEquals.shortAndLong(o, this.value);
  }

  /**
   * Compares this array with an int array for equality.
   *
   * @param o Int array to compare with
   * @returns true if arrays are equal
   */
  public equalsInts(o: Int32Array): boolean {
    return ArrayEquals.intAndLong(o, this.value);
  }

  /**
   * Compares this array with a long array for equality.
   *
   * @param other Long array to compare with
   * @returns true if arrays are equal
   */
  public equalsLongs(other: number[]): boolean {
    if (this.value.length !== other.length) return false;

    for (let i = 0; i < this.value.length; i++) {
      if (this.value[i] !== other[i]) return false;
    }

    return true;
  }

  /**
   * Compares this array with a float array for equality.
   *
   * @param o Float array to compare with
   * @returns true if arrays are equal
   */
  public equalsFloats(o: Float32Array): boolean {
    return ArrayEquals.longAndFloat(this.value, o);
  }

  /**
   * Compares this array with a double array for equality.
   *
   * @param o Double array to compare with
   * @returns true if arrays are equal
   */
  public equalsDoubles(o: Float64Array): boolean {
    return ArrayEquals.longAndDouble(this.value, o);
  }

  /**
   * Returns a hash code for this array.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    let result = 1;
    for (let i = 0; i < this.value.length; i++) {
      // Convert number to number for hashing
      // This will lose precision for very large values but maintains
      // similar hash behavior as Java for common values
      const hash = Number(this.value[i] & 0xFFFFFFFF) ^ Number(this.value[i] >> 32);
      result = 31 * result + hash;
    }
    return result;
  }

  /**
   * Returns a string representation of this array.
   *
   * @returns String representation
   */
  public toString(): string {
    return `LongArray[${this.value.join(', ')}]`;
  }
}
