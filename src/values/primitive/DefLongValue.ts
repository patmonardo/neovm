import { ValueType } from '@/api/ValueType';
import { IntegralValue } from '../abstract/IntegralValue';

/**
 * Implementation of IntegralValue that stores a long (number) value.
 */
export class DefLongValue implements IntegralValue {
  private readonly value: number;

  /**
   * Creates a new long value.
   *
   * @param value Long value to store
   */
  constructor(value: number) {
    this.value = value;
  }

  /**
   * Returns the long value.
   *
   * @returns The stored long value
   */
  public longValue(): number {
    return this.value;
  }

  /**
   * Returns the value type.
   *
   * @returns Value type (LONG)
   */
  public type(): ValueType {
    return ValueType.LONG;
  }

  /**
   * Returns the value as an object.
   *
   * @returns Long value as an object
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
    return o != null && this.value === (o as any).value;
  }

  /**
   * Returns a hash code for this value.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    // Use BigInt for proper 64-bit handling
    const bigValue = BigInt(this.value);
    // Need to use BigInt literals with the 'n' suffix
    const lower32 = bigValue & 0xFFFFFFFFn;
    const upper32 = bigValue >> 32n;
    const hashBigInt = lower32 ^ upper32;

    // Convert back to number (safe since hash is always 32-bit)
    return Number(hashBigInt);
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
