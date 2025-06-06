/**
 * CSV IMPORT PARSING UTILITY - TYPE-SAFE VALUE PARSING
 *
 * Utility for parsing CSV string values into strongly-typed property values.
 * Handles primitives, arrays, and default values without Jackson dependencies.
 */

import { ValueType } from "@/api";
import { DefaultValue } from "@/api";

export class CsvImportParsingUtil {
  private constructor() {} // Static utility class

  // MAIN PARSING ENTRY POINT
  static parseProperty(
    value: string,
    valueType: ValueType,
    defaultValue: DefaultValue
  ): any {
    // Get the parsing function using the visitor pattern
    const parsingFunction = ValueType.accept(valueType, PARSING_VISITOR);

    // Handle possible null return from accept
    if (!parsingFunction) {
      throw new Error(
        `No parser available for ValueType: ${ValueType.name(valueType)}`
      );
    }

    // Use the parsing function to parse the value
    return parsingFunction.parse(value, defaultValue);
  }

  static parseId(value: string): number | string {
    if (this.isBlank(value)) {
      throw new Error("ID cannot be blank");
    }

    const trimmed = value.trim();

    // Try numeric first
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }

    // Return string ID
    return trimmed;
  }

  // PARSING FUNCTIONS

  private static parseLongValue(
    value: string,
    defaultValue: DefaultValue
  ): number {
    if (this.isBlank(value)) {
      return defaultValue.longValue();
    }

    const parsed = parseInt(value.trim(), 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid long value: ${value}`);
    }
    return parsed;
  }

  private static parseDoubleValue(
    value: string,
    defaultValue: DefaultValue
  ): number {
    if (this.isBlank(value)) {
      return defaultValue.doubleValue();
    }

    const parsed = parseFloat(value.trim());
    if (isNaN(parsed)) {
      throw new Error(`Invalid double value: ${value}`);
    }
    return parsed;
  }

  private static parseFloatArray(
    value: string,
    defaultValue: DefaultValue
  ): Float32Array | null {
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

  private static parseDoubleArray(
    value: string,
    defaultValue: DefaultValue
  ): Float64Array | null {
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

  private static parseLongArray(
    value: string,
    defaultValue: DefaultValue
  ): number[] | null {
    if (this.isBlank(value)) {
      return defaultValue.longArrayValue();
    }

    try {
      // Parse JSON array format: [1, 2, 3]
      const stringArray = this.parseJsonArray(value);
      const parsedArray = new Array(stringArray.length);

      for (let i = 0; i < stringArray.length; i++) {
        parsedArray[i] = this.parseLongValue(stringArray[i], defaultValue);
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
        return parsed.map((item) => String(item));
      }
      throw new Error("Not an array");
    } catch (error) {
      // Fallback: try semicolon-separated format: "a;b;c"
      return value.split(";").map((item) => item.trim());
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
// Complete PARSING_VISITOR with all required methods
const PARSING_VISITOR: ValueType.Visitor<CsvParsingFunction> = {
  visitLong(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil["parseLongValue"](value, defaultValue),
    };
  },

  visitFloat(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil["parseDoubleValue"](value, defaultValue), // Reuse double parsing
    };
  },

  visitDouble(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil["parseDoubleValue"](value, defaultValue),
    };
  },

  visitBoolean(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return defaultValue.booleanValue();
        }
        const lower = value.toLowerCase().trim();
        if (lower === "true") return true;
        if (lower === "false") return false;
        throw new Error(
          `Invalid boolean value: ${value}. Expected 'true' or 'false'`
        );
      },
    };
  },

  visitString(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return defaultValue.stringValue();
        }
        return value;
      },
    };
  },

  visitBigInt(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return defaultValue.longValue(); // or appropriate bigint default
        }
        try {
          return BigInt(value);
        } catch (error) {
          throw new Error(`Invalid bigint value: ${value}`);
        }
      },
    };
  },

  visitLongArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil["parseLongArray"](value, defaultValue),
    };
  },

  visitFloatArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil["parseFloatArray"](value, defaultValue),
    };
  },

  visitDoubleArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) =>
        CsvImportParsingUtil["parseDoubleArray"](value, defaultValue),
    };
  },

  visitBooleanArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return []; // or defaultValue.booleanArrayValue() if available
        }
        try {
          const stringArray = CsvImportParsingUtil["parseJsonArray"](value);
          return stringArray.map((item) => {
            const lower = item.toLowerCase().trim();
            if (lower === "true") return true;
            if (lower === "false") return false;
            throw new Error(`Invalid boolean array element: ${item}`);
          });
        } catch (error) {
          return [];
        }
      },
    };
  },

  visitStringArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return []; // or defaultValue.stringArrayValue() if available
        }
        try {
          return CsvImportParsingUtil["parseJsonArray"](value);
        } catch (error) {
          return [];
        }
      },
    };
  },

  visitBigIntArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return [];
        }
        try {
          const stringArray = CsvImportParsingUtil["parseJsonArray"](value);
          return stringArray.map((item) => BigInt(item.trim()));
        } catch (error) {
          return [];
        }
      },
    };
  },

  // Optional methods - handle gracefully
  visitUntypedArray(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        if (CsvImportParsingUtil["isBlank"](value)) {
          return [];
        }
        try {
          return CsvImportParsingUtil["parseJsonArray"](value);
        } catch (error) {
          return [];
        }
      },
    };
  },

  visitUnknown(): CsvParsingFunction {
    return {
      parse: (value: string, defaultValue: DefaultValue) => {
        throw new Error(`Cannot parse unknown value type: ${value}`);
      },
    };
  },
};
