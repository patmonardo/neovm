import { ValueType } from '@/api/ValueType';
import { FloatingPointValue } from '../FloatingPointValue';

/**
 * Implementation of FloatingPointValue that stores a double-precision floating point value.
 */
export class FloatingPointValueImpl implements FloatingPointValue {
  private readonly value: number;

  /**
   * Creates a new floating point value.
   *
   * @param value Double value to store
   */
  constructor(value: number) {
    this.value = value;
  }

  /**
   * Returns the double value.
   *
   * @returns The stored double value
   */
  public doubleValue(): number {
    return this.value;
  }

  /**
   * Returns the value type.
   *
   * @returns Value type (DOUBLE)
   */
  public type(): ValueType {
    return ValueType.DOUBLE;
  }

  /**
   * Returns the value as an object.
   *
   * @returns Double value as an object
   */
  public asObject(): number {
    return this.value;
  }

  /**
   * Compares this value with another object for equality.
   *
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  public equals(o: unknown): boolean {
    if (this === o) return true;

    if (o instanceof FloatingPointValue) {
      // Use Object.is or epsilon comparison for better IEEE 754 handling
      return Object.is(this.value, o.doubleValue());
    }

    return false;
  }

  /**
   * Returns a hash code for this value.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    // JavaScript doesn't have a direct equivalent to Java's Double.hashCode(),
    // but we can approximate it with this approach
    const bits = new Float64Array(1);
    bits[0] = this.value;
    const intView = new Int32Array(bits.buffer);
    return intView[0] ^ intView[1];
  }

  /**
   * Returns a string representation of this value.
   *
   * @returns String representation
   */
  public toString(): string {
    return this.value.toString();
  }
}
