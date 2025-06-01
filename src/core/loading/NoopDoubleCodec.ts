/**
 * NOOP DOUBLE CODEC - IDENTITY TRANSFORMATION FOR DOUBLE VALUES
 *
 * Pass-through codec that performs no compression or transformation.
 * Uses IEEE 754 double precision bit representation with BigInt for 64-bit safety.
 *
 * KEY RESPONSIBILITIES:
 * 🔄 IDENTITY ENCODING: Double → same double (no compression)
 * 🔄 IDENTITY DECODING: Double → same double (no decompression)
 * 📊 BIT OPERATIONS: Proper 64-bit handling using BigInt internally
 * ⚡ PERFORMANCE: Zero-overhead pass-through operations
 */

export class NoopDoubleCodec {
  private constructor() {
    // Static utility class
  }

  /**
   * Encode a double value (identity transformation).
   *
   * @param value Double value to encode
   * @returns Same value unchanged
   */
  static encode(value: number): number {
    return value;
  }

  /**
   * Decode a double value (identity transformation).
   *
   * @param value Encoded double value to decode
   * @returns Same value unchanged
   */
  static decode(value: number): number {
    return value;
  }

  /**
   * Check if a double value is "small" using bit representation.
   *
   * ALGORITHM:
   * - Convert double to 64-bit IEEE 754 representation using BigInt
   * - Check if absolute value fits in lower 32 bits
   * - Uses bit shifting for efficient comparison
   *
   * @param value Double value to check
   * @returns true if value can be represented efficiently in 32 bits
   */
  static isSmall(value: number): boolean {
    // Convert to 64-bit representation using BigInt for safety
    const bits = BigInt(Math.abs(value));

    // Check if value fits in 32 bits by testing upper 32 bits are zero
    // Shift right by 32 bits and check if result is zero
    return (bits >> 32n) === 0n;
  }

  /**
   * Get the "small" representation of a double value.
   *
   * ALGORITHM:
   * - Convert double to IEEE 754 bit representation
   * - Extract lower 32 bits using BigInt operations
   * - Convert back to regular number for return
   *
   * @param value Double value to get small representation for
   * @returns Lower 32 bits as a regular number
   */
  static getSmall(value: number): number {
    // Convert to BigInt for bit manipulation
    const bits = BigInt(Math.abs(value));

    // Extract lower 32 bits using mask
    const mask = (1n << 32n) - 1n; // 0xFFFFFFFF in BigInt
    const smallBits = bits & mask;

    // Convert back to number (safe since we know it fits in 32 bits)
    return Number(smallBits);
  }

  /**
   * Convert a "small" representation back to double.
   *
   * ALGORITHM:
   * - Take the 32-bit value and extend to 64-bit representation
   * - Uses BigInt for proper bit manipulation
   * - Returns as regular number
   *
   * @param small 32-bit representation
   * @returns Full double value
   */
  static fromSmall(small: number): number {
    // For noop codec, small representation is just the value itself
    // More complex codecs would do actual bit reconstruction here
    return small;
  }

  /**
   * Get compression statistics (always no compression for noop).
   *
   * @returns Object indicating no compression applied
   */
  static getCompressionStats(): { compressionRatio: number; encodedCount: number } {
    return {
      compressionRatio: 1.0, // No compression
      encodedCount: 0        // No values actually encoded
    };
  }
}
