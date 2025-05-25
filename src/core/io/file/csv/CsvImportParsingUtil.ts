import { ValueType, DefaultValue } from '@/api';

/**
 * CSV parsing function interface.
 */
interface CsvParsingFunction {
  parse(value: string, defaultValue: DefaultValue): any;
}

/**
 * Utility class for parsing CSV values with proper type conversion.
 * Replaces Jackson-based parsing with native TypeScript parsing.
 */
export class CsvImportParsingUtil {

  /**
   * Visitor that maps ValueType to appropriate parsing function.
   */
  private static readonly PARSING_VISITOR: ValueType.Visitor<CsvParsingFunction> = {
    visitLong(): CsvParsingFunction {
      return CsvImportParsingUtil.parseLongValue;
    },

    visitDouble(): CsvParsingFunction {
      return CsvImportParsingUtil.parseDoubleValue;
    },

    visitString(): CsvParsingFunction {
      throw new Error('String value parsing is not supported');
    },

    visitLongArray(): CsvParsingFunction {
      return CsvImportParsingUtil.parseLongArray;
    },

    visitDoubleArray(): CsvParsingFunction {
      return CsvImportParsingUtil.parseDoubleArray;
    },

    visitFloatArray(): CsvParsingFunction {
      return CsvImportParsingUtil.parseFloatArray;
    }
  };

  private constructor() {
    // Utility class - no instantiation
  }

  /**
   * Parse a property value from CSV string based on its type.
   */
  static parseProperty(
    value: string,
    valueType: ValueType,
    defaultValue: DefaultValue
  ): any {
    const parser = ValueType.accept(valueType, CsvImportParsingUtil.PARSING_VISITOR);
    return parser.parse(value, defaultValue);
  }

  /**
   * Parse ID value (always long).
   */
  static parseId(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid ID value: ${value}`);
    }
    return parsed;
  }

  /**
   * Parse long value with default fallback.
   */
  private static parseLongValue = (value: string, defaultValue: DefaultValue): number => {
    if (!value || value.trim() === '') {
      return defaultValue.longValue();
    }
    return CsvImportParsingUtil.parseId(value);
  };

  /**
   * Parse double value with default fallback.
   */
  private static parseDoubleValue = (value: string, defaultValue: DefaultValue): number => {
    if (!value || value.trim() === '') {
      return defaultValue.doubleValue();
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new Error(`Invalid double value: ${value}`);
    }
    return parsed;
  };

  /**
   * Parse float array from CSV string.
   * Expected format: "1.5,2.7,3.9" or "[1.5,2.7,3.9]"
   */
  private static parseFloatArray = (value: string, defaultValue: DefaultValue): Float32Array => {
    if (!value || value.trim() === '') {
      return defaultValue.floatArrayValue();
    }

    try {
      // Handle both "1,2,3" and "[1,2,3]" formats
      const cleanValue = value.trim().replace(/^\[|\]$/g, '');
      const stringArray = cleanValue.split(',').map(s => s.trim()).filter(s => s !== '');

      if (stringArray.length === 0) {
        return defaultValue.floatArrayValue();
      }

      const parsedArray = new Float32Array(stringArray.length);
      for (let i = 0; i < stringArray.length; i++) {
        const parsed = parseFloat(stringArray[i]);
        if (isNaN(parsed)) {
          throw new Error(`Invalid float value in array: ${stringArray[i]}`);
        }
        parsedArray[i] = parsed;
      }

      return parsedArray;
    } catch (error) {
      throw new Error(`Failed to parse float array: ${value}. ${error}`);
    }
  };

  /**
   * Parse double array from CSV string.
   */
  private static parseDoubleArray = (value: string, defaultValue: DefaultValue): Float64Array => {
    if (!value || value.trim() === '') {
      return defaultValue.doubleArrayValue();
    }

    try {
      const cleanValue = value.trim().replace(/^\[|\]$/g, '');
      const stringArray = cleanValue.split(',').map(s => s.trim()).filter(s => s !== '');

      if (stringArray.length === 0) {
        return defaultValue.doubleArrayValue();
      }

      const parsedArray = new Float64Array(stringArray.length);
      for (let i = 0; i < stringArray.length; i++) {
        // Recursive parsing for individual elements
        const parsed = CsvImportParsingUtil.parseProperty(stringArray[i], ValueType.DOUBLE, defaultValue);
        parsedArray[i] = parsed as number;
      }

      return parsedArray;
    } catch (error) {
      throw new Error(`Failed to parse double array: ${value}. ${error}`);
    }
  };

  /**
   * Parse long array from CSV string.
   */
  private static parseLongArray = (value: string, defaultValue: DefaultValue): number[] => {
    if (!value || value.trim() === '') {
      return defaultValue.longArrayValue();
    }

    try {
      const cleanValue = value.trim().replace(/^\[|\]$/g, '');
      const stringArray = cleanValue.split(',').map(s => s.trim()).filter(s => s !== '');

      if (stringArray.length === 0) {
        return defaultValue.longArrayValue();
      }

      const parsedArray: number[] = [];
      for (let i = 0; i < stringArray.length; i++) {
        // Recursive parsing for individual elements
        const parsed = CsvImportParsingUtil.parseProperty(stringArray[i], ValueType.LONG, defaultValue);
        parsedArray[i] = parsed as number;
      }

      return parsedArray;
    } catch (error) {
      throw new Error(`Failed to parse long array: ${value}. ${error}`);
    }
  };
}
