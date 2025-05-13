import { ValueType } from '@/api/ValueType';
import { IntegralValue } from '../IntegralValue';

/**
 * Implementation of IntegralValue that stores a long (number) value.
 */
export class LongValueImpl implements IntegralValue {
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
    if (this === o) return true;

    if (o instanceof IntegralValue) {
      return this.value === o.longValue();
    }

    return false;
  }

  /**
   * Returns a hash code for this value.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    // Convert number to number for hashing
    // This will lose precision for very large values but maintains
    // similar hash behavior as Java for common values
    return Number((this.value & 0xFFFFFFFF) ^ (this.value >> 32));
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
