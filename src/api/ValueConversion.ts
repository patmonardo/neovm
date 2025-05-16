/**
 * Utility methods for safely converting between numeric types.
 * This is a direct translation of GDS's org.neo4j.gds.api.ValueConversion.
 * Java 'long' is represented as TypeScript 'number' in this version.
 */
export namespace ValueConversion {

    // Assuming formatWithLocale is available in this scope or imported.
    // If not, it needs to be defined or imported.
    // Example placeholder if not already defined:
    /*
    function formatWithLocale(format: string, ...args: any[]): string {
        // Basic implementation for placeholder
        let i = 0;
        return format.replace(/%[.\d]*[dfsx]/g, () => String(args[i++]));
    }
    */
   // Using the existing formatWithLocale from your file:
   /**
    * Formats a string with locale-specific formatting.
    * (This function was present in your existing ValueConversion.ts)
    * @param format The format string
    * @param args The arguments to format
    * @returns The formatted string
    */
   export function formatWithLocale(format: string, ...args: any[]): string {
    return format.replace(/%\.?\d*[dfscx]/g, (match) => {
      const arg = args.shift();
      if (arg === undefined) return match; // Avoid error if not enough args

      if (typeof arg === 'number') {
        if (match === '%.2f') {
          return arg.toFixed(2);
        }
        if (match === '%d') {
          return String(Math.trunc(arg));
        }
      }
      return String(arg);
    });
  }


    /**
     * Converts a double to a long exactly.
     * In this TS version, 'long' is represented as 'number'.
     *
     * @param d The double value to convert.
     * @returns The long (number) representation.
     * @throws Error (UnsupportedOperationException in Java) if conversion is not safe.
     */
    export function exactDoubleToLong(d: number): number {
        if (Number.isInteger(d)) { // d % 1 == 0 in Java
            // Further checks for safe integer range might be desired if strictness
            // beyond Number.isInteger is needed, but Java's (long)d doesn't do that.
            return d;
        } else {
            throw new Error( // Simulating UnsupportedOperationException
                formatWithLocale(
                    "Cannot safely convert %.2f into an long value",
                    d
                )
            );
        }
    }

    /**
     * Converts a long to a double exactly.
     * In this TS version, 'long' is represented as 'number'.
     * JavaScript numbers are inherently doubles.
     *
     * @param l The long (number) value to convert.
     * @returns The double representation.
     * @throws Error (UnsupportedOperationException in Java) if conversion is not safe.
     */
    export function exactLongToDouble(l: number): number {
        // A JavaScript number (representing a GDS long) can be exactly represented as a double
        // if it's within the 53-bit integer precision range of a double.
        // Number.MAX_SAFE_INTEGER is (2^53 - 1).
        // The Java check `l <= 1L << 53` is for positive values.
        // For negative values, it would be `l >= -(1L << 53)`.
        // So, the range is approximately [-(2^53), 2^53].
        // Number.MIN_SAFE_INTEGER is -(2^53 - 1).
        const limit = Math.pow(2, 53);
        if (l >= -limit && l <= limit) {
            return l; // Already a double in TS
        } else {
            throw new Error( // Simulating UnsupportedOperationException
                formatWithLocale(
                    "Cannot safely convert %d into an double value",
                    l
                )
            );
        }
    }

    /**
     * Converts a long to a float exactly.
     * In this TS version, 'long' is represented as 'number'.
     *
     * @param l The long (number) value to convert.
     * @returns The float (number) representation.
     * @throws Error (UnsupportedOperationException in Java) if conversion is not safe.
     */
    export function exactLongToFloat(l: number): number {
        // A float (32-bit) has about 24 bits of precision for integers.
        // The Java check is `l >= 1L << 24 || l <= -(1L << 24)`.
        // This means if l is outside the range (-(2^24), 2^24), it throws.
        // So, if l is within [-(2^24 - 1), 2^24 - 1], it's considered safe.
        const limit = Math.pow(2, 24); // 16777216
        if (l >= limit || l <= -limit) { // If l is equal to or outside the limit boundaries
            throw new Error( // Simulating UnsupportedOperationException
                formatWithLocale(
                    "Cannot safely convert %d into a float value",
                    l
                )
            );
        }
        // In TS, number is a double. Returning 'l' is fine.
        // If a true float32 representation was needed, one would use Float32Array.
        return l;
    }

    /**
     * Converts a double to a float without overflowing.
     *
     * @param d The double value to convert.
     * @returns The float (number) representation.
     * @throws Error (UnsupportedOperationException in Java) if conversion would overflow.
     */
    export function notOverflowingDoubleToFloat(d: number): number {
        // Float.MAX_VALUE in Java is approximately 3.4028235e+38.
        const FLOAT_MAX_VALUE = 3.4028234663852886e+38; // From MDN for Float32Array
        if (d > FLOAT_MAX_VALUE || d < -FLOAT_MAX_VALUE) {
            throw new Error( // Simulating UnsupportedOperationException
                formatWithLocale(
                    "Cannot safely convert %.2f into a float value",
                    d
                )
            );
        }
        // In TS, number is a double. Returning 'd' is fine.
        // The check is primarily for overflow. Precision loss within range is not checked by this Java method.
        return d;
    }

    /**
     * Converts a BigInt (representing a GDS LONG) to a JavaScript number,
     * ensuring it fits within JavaScript's safe integer range for exact representation.
     * (This function was present in your existing ValueConversion.ts)
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
     * (This function was present in your existing ValueConversion.ts)
     */
    export function exactNumberToBigInt(d: number): bigint {
      if (Number.isInteger(d)) {
        return BigInt(d);
      } else {
        throw new Error(`Cannot convert non-integer number ${d.toFixed(2)} to BigInt.`);
      }
    }

    /**
     * Converts a BigInt to a Float32 compatible number, checking precision.
     * (This function was present in your existing ValueConversion.ts)
     */
    export function exactBigIntToFloat32(b: bigint): number {
      const limit = 1n << 24n;
      if (b >= limit || b <= -limit) {
        throw new Error(`Cannot safely convert BigInt ${b} to a float32 value (loss of precision for integers > +/- ${limit - 1n}).`);
      }
      return Number(b);
    }
}
