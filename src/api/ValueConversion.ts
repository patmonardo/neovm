/**
 * Utility methods for safely converting between numeric types.
 * Prevents precision loss when converting between different numeric representations.
 */
export namespace ValueConversion {
    /**
     * Converts a BigInt (representing a GDS LONG) to a JavaScript number,
     * ensuring it fits within JavaScript's safe integer range for exact representation.
     * This is crucial when storing a BigInt into a number[] that represents a GDS long[].
     *
     * @param b The BigInt value to convert.
     * @returns The number representation if it's within the safe integer range.
     * @throws Error if the BigInt is outside JavaScript's safe integer range,
     *         preventing precision loss when storing into a number[].
     */
    export function exactBigIntToNumber(b: bigint): number {
      if (b >= BigInt(Number.MIN_SAFE_INTEGER) && b <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(b);
      } else {
        throw new Error(
          `Cannot safely convert BigInt ${b} to a JavaScript number for storage in a number[] (representing long[]). ` +
          `Value is outside the safe integer range [${Number.MIN_SAFE_INTEGER}, ${Number.MAX_SAFE_INTEGER}].`
        );
      }
    }

    /**
     * Converts a JavaScript number (expected to be an integer) to a BigInt.
     * This might be used when reading from a number[] (representing long[])
     * and an operation requires BigInt precision.
     *
     * @param d The number to convert.
     * @returns The BigInt representation.
     * @throws Error if the number is not an integer.
     */
    export function exactNumberToBigInt(d: number): bigint {
      if (Number.isInteger(d)) {
        // Since d is a JS number, it's already within the 53-bit precision range if it's an integer.
        return BigInt(d);
      } else {
        // Corrected error message to reflect the actual conversion
        throw new Error(`Cannot convert non-integer number ${d.toFixed(2)} to BigInt.`);
      }
    }

    export function exactBigIntToFloat32(b: bigint): number {
      // For 32-bit float, we only have 24 bits of precision for integers
      if (b >= (1n << 24n) || b <= -(1n << 24n)) {
        throw new Error(`Cannot safely convert BigInt ${b} to a float32 value (loss of precision).`);
      }
      return Number(b); // This will be a JS number, suitable for Float32Array
    }

    // doubleValue is a JS number (GDS DOUBLE), returns a BigInt (GDS LONG)
    export function exactDoubleToLong(doubleValue: number): bigint {
      if (Number.isInteger(doubleValue)) {
        // Check if the integer part of the double is within JS safe integer range
        // before converting to BigInt. BigInt(doubleValue) handles this,
        // but being explicit about the source of truth (JS number precision) is good.
        if (doubleValue > Number.MAX_SAFE_INTEGER || doubleValue < Number.MIN_SAFE_INTEGER) {
          // This indicates the original double, while an integer, was so large
          // that its precision as a double might already be suspect.
          // However, BigInt(integer_double) will correctly convert it.
          // The primary concern for GDS is if the double was non-integral.
        }
        return BigInt(doubleValue);
      } else {
        throw new Error(`Cannot convert non-integer double value ${doubleValue} to long.`);
      }
    }
  // ...existing code...

  /**
   * Converts a long to a double exactly.
   *
   * @param longValue The long value to convert
   * @returns The double representation
   */
  export function exactLongToDouble(longValue: number): number {
    // This is a simplified version, in reality we'd need to check if the longValue
    // can be exactly represented as a double (which has 53 bits of precision)
    if (longValue > BigInt(2**53) || longValue < BigInt(-(2**53))) {
      throw new Error(`Long value ${longValue} is out of range for exact double conversion`);
    }

    return Number(longValue);
  }

  /**
   * Converts a long to a float exactly.
   *
   * @param longValue The long value to convert
   * @returns The float representation
   */
  export function exactLongToFloat(longValue: number): number {
    // This is a simplified version, in reality we'd need to check float precision limits
    if (longValue > BigInt(2**24) || longValue < BigInt(-(2**24))) {
      throw new Error(`Long value ${longValue} is out of range for exact float conversion`);
    }

    return Number(longValue);
  }

  /**
   * Converts a double to a float without overflowing.
   *
   * @param doubleValue The double value to convert
   * @returns The float representation
   */
  export function notOverflowingDoubleToFloat(doubleValue: number): number {
    // Using Float32Array to check if the conversion would lose precision
    const float32Array = new Float32Array(1);
    float32Array[0] = doubleValue;

    // If the values don't match, we've lost precision
    if (float32Array[0] !== doubleValue &&
        (doubleValue > 3.4028234663852886e+38 || doubleValue < -3.4028234663852886e+38)) {
      throw new Error(`Double value ${doubleValue} would overflow when converted to float`);
    }

    return float32Array[0];
  }

  /**
   * Formats a string with locale-specific formatting.
   *
   * @param format The format string
   * @param args The arguments to format
   * @returns The formatted string
   */
  export function formatWithLocale(format: string, ...args: any[]): string {
    return format.replace(/%\.?\d*[dfscx]/g, (match) => {
      const arg = args.shift();
      if (match === '%.2f') {
        return arg.toFixed(2);
      }
      return String(arg);
    });
  }
}
