import { ValueType } from "./ValueType";

/**
 * Utility methods for parsing and handling default values.
 */
export namespace DefaultValueUtil {
  /**
   * Parses a value as a double array.
   *
   * @param value The value to parse
   * @param type The expected value type
   * @returns The parsed double array
   * @throws Error if parsing fails
   */
  export function parseDoubleArrayValue(
    value: unknown,
    type: ValueType
  ): number[] {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v));
    } else if (typeof value === "string") {
      try {
        return JSON.parse(value).map(Number);
      } catch (e) {
        throw new Error(`Invalid double array format: ${value}`);
      }
    }
    throw new Error(`Cannot convert ${typeof value} to ${ValueType[type]}`);
  }

  export function parseLongArrayValue(
    value: unknown,
    _type: ValueType // Renamed to indicate it's currently unused, or consider removing if not needed
  ): number[] {
    let sourceArray: unknown[];

    // Step 1: Determine the source array (either the input itself or from parsed JSON)
    if (Array.isArray(value)) {
      sourceArray = value;
    } else if (typeof value === 'string') {
      try {
        const parsedJson = JSON.parse(value);
        if (!Array.isArray(parsedJson)) {
          throw new Error('Parsed JSON string did not result in an array.');
        }
        sourceArray = parsedJson;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(
          `Invalid long array JSON string format: "${value}". Details: ${errorMessage}`
        );
      }
    } else {
      throw new Error(
        `Input for a long array must be an array or a JSON string representation of an array. Received type: ${typeof value}`
      );
    }

    // Step 2: Map each element of the source array to a number
    const resultArray: number[] = [];
    for (let i = 0; i < sourceArray.length; i++) {
      const element = sourceArray[i];
      let numericValue: number;

      if (typeof element === 'number') {
        numericValue = element;
      } else if (typeof element === 'string') {
        // Attempt to parse the string as an integer.
        // Using Number() directly is also an option, but parseInt is more specific for integers.
        const parsed = parseInt(element, 10);
        if (Number.isNaN(parsed)) {
          throw new Error(
            `Element "${element}" at index ${i} is a string that could not be parsed as a valid integer.`
          );
        }
        numericValue = parsed;
      } else if (typeof element === 'bigint') {
        // If an element is already a BigInt, convert it to number.
        // This acknowledges the project's convention and potential precision loss.
        numericValue = Number(element);
      } else if (element === null || element === undefined) {
        throw new Error(
            `Element at index ${i} is null or undefined, which is not allowed in a long array.`
        );
      }
      else {
        throw new Error(
          `Element "${element}" at index ${i} has an unsupported type: ${typeof element}. Expected number, string, or bigint.`
        );
      }

      // Optional: Further validation if "long" strictly means integer.
      // Most JSON parsers will produce numbers, which could be floats.
      if (!Number.isInteger(numericValue)) {
        // Decide how to handle: floor it, round it, or throw an error.
        // For now, let's warn and use it, or you could throw.
        console.warn(
          `Element "${element}" at index ${i} parsed to a non-integer number ${numericValue}. Using it as is.`
        );
        // Or, to be stricter for "long":
        // throw new Error(`Element "${element}" at index ${i} parsed to a non-integer number ${numericValue}. Long arrays expect integers.`);
      }
      resultArray.push(numericValue);
    }

    return resultArray;
  }

  /**
   * Parses a value as a float array.
   *
   * @param value The value to parse
   * @param type The expected value type
   * @returns The parsed float array
   * @throws Error if parsing fails
   */
  export function parseFloatArrayValue(
    value: unknown,
    type: ValueType
  ): number[] {
    // For JavaScript, float and double are the same type
    // This implementation is the same as parseDoubleArrayValue
    return parseDoubleArrayValue(value, type);
  }

  /**
   * Checks if a value is a valid number.
   *
   * @param value The value to check
   * @returns True if the value is a valid number, false otherwise
   */
  export function isValidNumber(value: unknown): boolean {
    if (typeof value !== "number") {
      return false;
    }
    return !Number.isNaN(value) && Number.isFinite(value);
  }

  /**
   * Converts an array of objects to an array of primitives.
   *
   * @param array The array to convert
   * @returns The array of primitives
   */
  export function toPrimitiveArray(array: any[]): any[] {
    return array.map((item) => {
      if (typeof item === "object" && item !== null) {
        // Handle special cases like Date
        if (item instanceof Date) {
          return item.getTime();
        }

        // Try to convert to a primitive value
        const primitiveValue = Number(item);
        if (!Number.isNaN(primitiveValue)) {
          return primitiveValue;
        }

        // Return string representation as fallback
        return String(item);
      }
      return item;
    });
  }
}
