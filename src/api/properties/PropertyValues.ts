import { ValueType } from '../ValueType';
import { formatWithLocale } from '@/utils';

/**
 * Base interface for all property value containers.
 * Provides access to the value type and common utilities.
 */
export interface PropertyValues {
  /**
   * Returns the value type of the property values.
   *
   * @returns The value type
   */
  valueType(): ValueType;
}

/**
 * Namespace for PropertyValues utilities.
 */
export namespace PropertyValues {
  /**
   * Creates an error for unsupported type operations.
   *
   * @param valueType The actual value type
   * @param expectedType The requested/expected value type
   * @returns An error with a formatted message
   */
  export function unsupportedTypeException(valueType: ValueType, expectedType: ValueType): Error {
    return new Error(
      formatWithLocale(
        "Tried to retrieve a value of type %s from properties of type %s",
        expectedType,
        valueType
      )
    );
  }

}
