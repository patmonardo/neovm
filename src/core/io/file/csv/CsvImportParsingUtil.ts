/**
 * CSV IMPORT PARSING UTILITY - TYPE-SAFE VALUE PARSING
 *
 * Utility for parsing CSV string values into strongly-typed property values.
 * Handles primitives, arrays, and default values without Jackson dependencies.
 */

import { ValueType } from '@/api';
import { DefaultValue } from '@/api';

export class CsvImportParsingUtil {
  private constructor() {} // Static utility class

  // MAIN PARSING ENTRY POINT
  static parseProperty(
    value: string,
    valueType: ValueType,
    defaultValue: DefaultValue
  ): any {
    return valueType.accept(PARSING_VISITOR).parse(value, defaultValue);
  }

  static parseId(value: string): number {
    return parseInt(value, 10);
  }

  // PARSING FUNCTIONS
  private static parseLongValue(value: string, defaultValue: DefaultValue): number {
    if (this.isBlank(value)) {
      return defaultValue.longValue();
    }
    return this.parseId(value);
  }

  private static parseDoubleValue(value: string, defaultValue: DefaultValue): number {
    if (this.isBlank(value)) {
      return defaultValue.doubleValue();
    }
    return parseFloat(value);
  }

  private static parseFloatArray(value: string, defaultValue: DefaultValue): Float32Array | null {
    if (this.isBlank(value)) {
      return defaultValue.floatArrayValue();
    }

    try {
      // Parse JSON array format: [1.0, 2.0, 3.0]
      const stringArray = this.parseJsonArray(value);
      const parsedArray = new Float32Array(stringArray.length);

      for (let i = 0; i < stringArray.length; i++) {
        parsedArray[i] = parseFloat(stringArray[i]);
      }

      return parsedArray;
    } catch (error) {
      return defaultValue.floatArrayValue();
    }
  }

  private static parseDoubleArray(value: string, defaultValue: DefaultValue): Float64Array | null {
    if (this.isBlank(value)) {
      return defaultValue.doubleArrayValue();
    }

    try {
      // Parse JSON array format: [1.0, 2.0, 3.0]
      const stringArray = this.parseJsonArray(value);
      const parsedArray = new Float64Array(stringArray.length);

      for (let i = 0; i < stringArray.length; i++) {
        parsedArray[i] = this.parseDoubleValue(stringArray[i], defaultValue);
      }

      return parsedArray;
    } catch (error) {
      return defaultValue.doubleArrayValue();
    }
  }

  private static parseLongArray(value: string, defaultValue: DefaultValue): number[] | null {
    if (this.isBlank(value)) {
      return defaultValue.longArrayValue();
    }

    try {
      // Parse JSON array format: [1, 2, 3]
      const stringArray = this.parseJsonArray(value);
      const parsedArray = new Array(stringArray.length);

      for (let i = 0; i < stringArray.length; i++) {
        parsedArray[i] = BigInt(this.parseLongValue(stringArray[i], defaultValue));
      }

      return parsedArray;
    } catch (error) {
      return defaultValue.longArrayValue();
    }
  }

  // HELPER METHODS
  private static parseJsonArray(value: string): string[] {
    try {
      // Handle JSON array format: ["a", "b", "c"] or [1, 2, 3]
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item));
      }
      throw new Error('Not an array');
    } catch (error) {
      // Fallback: try semicolon-separated format: "a;b;c"
      return value.split(';').map(item => item.trim());
    }
  }

  private static isBlank(value: string): boolean {
    return !value || value.trim().length === 0;
  }
}

// PARSING FUNCTION INTERFACE
interface CsvParsingFunction {
  parse(value: string, defaultValue: DefaultValue): any;
}

// VISITOR IMPLEMENTATION
const PARSING_VISITOR: ValueType.Visitor<CsvParsingFunction> = {
  visitLong(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil['parseLongValue'](value, defaultValue)
    };
  },

  visitDouble(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil['parseDoubleValue'](value, defaultValue)
    };
  },

  visitString(): CsvParsingFunction {
    throw new Error('String value parsing is not supported');
  },

  visitLongArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil['parseLongArray'](value, defaultValue)
    };
  },

  visitDoubleArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil['parseDoubleArray'](value, defaultValue)
    };
  },

  visitFloatArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil['parseFloatArray'](value, defaultValue)
    };
  }
};
