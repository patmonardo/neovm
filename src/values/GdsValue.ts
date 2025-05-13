import { ValueType } from '../api/ValueType';

/**
 * Base interface for all GDS value types.
 * Provides common operations for type information and conversion.
 */
export abstract class GdsValue {
  /**
   * Returns the value type.
   * 
   * @returns The type of this value
   */
  abstract type(): ValueType;
  
  /**
   * Returns this value as a generic object.
   * This allows accessing the raw underlying value.
   * 
   * @returns Value as an object
   */
  abstract asObject(): unknown;
  
  /**
   * Compares this value with another object for equality.
   * 
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  abstract equals(o: unknown): boolean;
  
  /**
   * Returns a hash code for this value.
   * 
   * @returns Hash code value
   */
  abstract hashCode(): number;
}