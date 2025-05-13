import { ValueType } from '../ValueType';

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

  /**
   * Formats a string with the given arguments.
   * Simple implementation of format string functionality.
   * 
   * @param format The format string
   * @param args The arguments to insert
   * @returns The formatted string
   */
  function formatWithLocale(format: string, ...args: any[]): string {
    return format.replace(/%s/g, () => String(args.shift() || ''));
  }
}