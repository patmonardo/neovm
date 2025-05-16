import { ValueType } from '../../api/ValueType';
import { GdsValue } from './GdsValue';

/**
 * Represents a null or absent value in the GDS values system.
 */
export class GdsNoValue implements GdsValue {
  /**
   * Singleton instance representing no value.
   */
  public static readonly NO_VALUE: GdsNoValue = new GdsNoValue();

  /**
   * Returns the value type.
   *
   * @returns Value type (UNKNOWN)
   */
  public type(): ValueType {
    return ValueType.UNKNOWN;
  }

  /**
   * Returns the object representation of this value.
   *
   * @returns null
   */
  public asObject(): null {
    return null;
  }

  /**
   * Compares this value with another object for equality.
   *
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  public equals(o: unknown): boolean {
    return o instanceof GdsNoValue;
  }

  /**
   * Returns a hash code for this value.
   *
   * @returns Hash code (0 for no value)
   */
  public hashCode(): number {
    return 0;
  }

  /**
   * Returns a string representation of this value.
   *
   * @returns String representation
   */
  public toString(): string {
    return "NO_VALUE";
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {
    // This will cause subsequent constructor calls to throw
    if (GdsNoValue.NO_VALUE) {
      throw new Error(
        "GdsNoValue is a singleton and cannot be instantiated directly"
      );
    }
  }
}
