import { DefaultValue } from '@/api';
import { ValueType } from '@/api/nodeproperties';

/**
 * Helper class for serializing and deserializing DefaultValue objects to/from CSV format.
 * Uses JSON serialization with a specific template format: "DefaultValue(<json>)".
 */
export class DefaultValueIOHelper {
  private static readonly DEFAULT_VALUE_TEMPLATE = 'DefaultValue(%s)';

  private constructor() {
    // Utility class - no instantiation
  }

  /**
   * Serialize a DefaultValue to string format.
   * Format: "DefaultValue(<json-serialized-object>)"
   */
  static serialize(defaultValue: DefaultValue): string {
    try {
      const serializedValue = JSON.stringify(defaultValue.getObject());
      return DefaultValueIOHelper.formatWithLocale(
        DefaultValueIOHelper.DEFAULT_VALUE_TEMPLATE,
        serializedValue
      );
    } catch (error) {
      throw new Error(`Failed to serialize DefaultValue: ${error}`);
    }
  }

  /**
   * Deserialize a DefaultValue from string format.
   * @param serializedValue The serialized string (e.g., "DefaultValue([1,2,3])")
   * @param valueType The expected value type
   * @param isUserDefined Whether this is a user-defined default value
   */
  static deserialize(
    serializedValue: string | null,
    valueType: ValueType,
    isUserDefined: boolean
  ): DefaultValue {
    try {
      if (serializedValue === null || serializedValue === undefined) {
        return ValueType.fallbackValue(valueType);
      }

      // Remove DefaultValue wrapper and handle null/NaN/empty parentheses
      let value = serializedValue.replace(/DefaultValue\(|null|NaN|\)/g, '');

      if (value.trim() === '') {
        return ValueType.fallbackValue(valueType);
      }

      let parseValue: any;

      switch (valueType) {
        case ValueType.DOUBLE:
          parseValue = JSON.parse(value) as number;
          if (typeof parseValue !== 'number') {
            throw new Error(`Expected number, got ${typeof parseValue}`);
          }
          break;

        case ValueType.LONG:
          parseValue = JSON.parse(value) as number;
          if (typeof parseValue !== 'number') {
            throw new Error(`Expected number, got ${typeof parseValue}`);
          }
          // Ensure it's an integer
          parseValue = Math.floor(parseValue);
          break;

        case ValueType.LONG_ARRAY:
          const longArray = JSON.parse(value) as number[];
          if (!Array.isArray(longArray)) {
            throw new Error(`Expected array, got ${typeof longArray}`);
          }
          parseValue = longArray.map(x => Math.floor(x));
          break;

        case ValueType.FLOAT_ARRAY:
          const floatArray = JSON.parse(value) as number[];
          if (!Array.isArray(floatArray)) {
            throw new Error(`Expected array, got ${typeof floatArray}`);
          }
          parseValue = new Float32Array(floatArray);
          break;

        case ValueType.DOUBLE_ARRAY:
          const doubleArray = JSON.parse(value) as number[];
          if (!Array.isArray(doubleArray)) {
            throw new Error(`Expected array, got ${typeof doubleArray}`);
          }
          parseValue = new Float64Array(doubleArray);
          break;

        default:
          throw new Error(`Cannot deserialize type '${valueType}' to DefaultValue`);
      }

      return DefaultValue.of(parseValue, valueType, isUserDefined);
    } catch (error) {
      throw new Error(`Failed to deserialize DefaultValue: ${error}`);
    }
  }

  /**
   * Format string with locale (equivalent to Java formatWithLocale).
   */
  private static formatWithLocale(template: string, ...args: string[]): string {
    let result = template;
    for (const arg of args) {
      result = result.replace('%s', arg);
    }
    return result;
  }
}
