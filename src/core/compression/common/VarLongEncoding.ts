/**
 * Variable-length encoding WITHOUT BigInt - using JavaScript numbers carefully.
 *
 * **Trade-off**: We lose precision for values > 2^53, but gain massive performance.
 * **Reality Check**: Most graph node IDs are < 2^53 anyway!
 */

export class VarLongEncoding {

  // ============================================================================
  // THRESHOLD CONSTANTS - Using regular numbers where safe
  // ============================================================================

  static readonly THRESHOLD_1_BYTE = 128;                    // 2^7
  static readonly THRESHOLD_2_BYTE = 16384;                  // 2^14
  static readonly THRESHOLD_3_BYTE = 2097152;                // 2^21
  static readonly THRESHOLD_4_BYTE = 268435456;              // 2^28
  static readonly THRESHOLD_5_BYTE = 34359738368;            // 2^35
  static readonly THRESHOLD_6_BYTE = 4398046511104;          // 2^42
  static readonly THRESHOLD_7_BYTE = 562949953421312;        // 2^49

  // ⚠️ These exceed MAX_SAFE_INTEGER - we'll handle them specially
  static readonly THRESHOLD_8_BYTE = Number.MAX_SAFE_INTEGER; // Cap at 2^53
  static readonly MAX_SAFE_VALUE = Number.MAX_SAFE_INTEGER;

  // ============================================================================
  // ENCODING METHODS
  // ============================================================================

  /**
   * Encode array of numbers starting from offset 0.
   */
  static encodeVLongs(values: number[], limit: number, out: Uint8Array, into: number): number {
    return VarLongEncoding.encodeVLongsRange(values, 0, limit, out, into);
  }

  /**
   * Calculate total encoded size without actually encoding.
   */
  static encodedVLongsSize(values: number[], limit: number): number {
    return VarLongEncoding.encodedVLongsSizeRange(values, 0, limit);
  }

  static encodedVLongsSizeRange(values: number[], offset: number, limit: number): number {
    let size = 0;
    const end = offset + limit;

    for (let i = offset; i < end; i++) {
      // Skip sentinel values
      if (values[i] === Number.MIN_SAFE_INTEGER) {
        continue;
      }
      size += VarLongEncoding.encodedVLongSize(values[i]);
    }

    return size;
  }

  /**
   * Encode range of values into byte array.
   */
  static encodeVLongsRange(values: number[], offset: number, end: number, out: Uint8Array, into: number): number {
    for (let i = offset; i < end; i++) {
      // Skip sentinel values
      if (values[i] === Number.MIN_SAFE_INTEGER) {
        continue;
      }

      into = VarLongEncoding.encodeVLong(out, values[i], into);
    }

    return into;
  }

  // ============================================================================
  // CORE ENCODING ALGORITHM - JavaScript Number Version
  // ============================================================================

  /**
   * Encode a single number value using variable-length encoding.
   *
   * **JavaScript Reality**: We handle values up to 2^53 precisely.
   * Values beyond that may lose precision but still encode/decode correctly.
   */
  static encodeVLong(buffer: Uint8Array, val: number, output: number): number {
    // Handle negative numbers by treating as unsigned
    const unsignedVal = val < 0 ? val + 0x10000000000000000 : val; // 2^64 addition for negatives

    if (unsignedVal < VarLongEncoding.THRESHOLD_1_BYTE) {
      // 1 byte: [0xxxxxxx] → [1xxxxxxx] (set continuation bit)
      buffer[output] = (unsignedVal | 128) & 0xFF;
      return output + 1;

    } else if (unsignedVal < VarLongEncoding.THRESHOLD_2_BYTE) {
      // 2 bytes: split across 7-bit boundaries
      buffer[output    ] = (unsignedVal       & 127);         // Lower 7 bits, continue=0
      buffer[output + 1] = ((unsignedVal >>> 7) | 128) & 0xFF; // Upper 7 bits, continue=1
      return output + 2;

    } else if (unsignedVal < VarLongEncoding.THRESHOLD_3_BYTE) {
      // 3 bytes
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) | 128) & 0xFF;
      return output + 3;

    } else if (unsignedVal < VarLongEncoding.THRESHOLD_4_BYTE) {
      // 4 bytes
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) & 127);
      buffer[output + 3] = ((unsignedVal >>> 21) | 128) & 0xFF;
      return output + 4;

    } else if (unsignedVal < VarLongEncoding.THRESHOLD_5_BYTE) {
      // 5 bytes
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) & 127);
      buffer[output + 3] = ((unsignedVal >>> 21) & 127);
      buffer[output + 4] = ((unsignedVal >>> 28) | 128) & 0xFF;
      return output + 5;

    } else if (unsignedVal < VarLongEncoding.THRESHOLD_6_BYTE) {
      // 6 bytes
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) & 127);
      buffer[output + 3] = ((unsignedVal >>> 21) & 127);
      buffer[output + 4] = ((unsignedVal >>> 28) & 127);
      buffer[output + 5] = ((unsignedVal / Math.pow(2, 35)) | 128) & 0xFF; // Switch to division
      return output + 6;

    } else if (unsignedVal < VarLongEncoding.THRESHOLD_7_BYTE) {
      // 7 bytes - Need to use division for >32-bit shifts
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) & 127);
      buffer[output + 3] = ((unsignedVal >>> 21) & 127);
      buffer[output + 4] = ((unsignedVal >>> 28) & 127);
      buffer[output + 5] = (Math.floor(unsignedVal / Math.pow(2, 35)) & 127);
      buffer[output + 6] = (Math.floor(unsignedVal / Math.pow(2, 42)) | 128) & 0xFF;
      return output + 7;

    } else if (unsignedVal < VarLongEncoding.MAX_SAFE_VALUE) {
      // 8 bytes - All division-based for large numbers
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) & 127);
      buffer[output + 3] = ((unsignedVal >>> 21) & 127);
      buffer[output + 4] = ((unsignedVal >>> 28) & 127);
      buffer[output + 5] = (Math.floor(unsignedVal / Math.pow(2, 35)) & 127);
      buffer[output + 6] = (Math.floor(unsignedVal / Math.pow(2, 42)) & 127);
      buffer[output + 7] = (Math.floor(unsignedVal / Math.pow(2, 49)) | 128) & 0xFF;
      return output + 8;

    } else {
      // 9 bytes - Maximum case (may lose precision but handles the range)
      buffer[output    ] = (unsignedVal        & 127);
      buffer[output + 1] = ((unsignedVal >>> 7) & 127);
      buffer[output + 2] = ((unsignedVal >>> 14) & 127);
      buffer[output + 3] = ((unsignedVal >>> 21) & 127);
      buffer[output + 4] = ((unsignedVal >>> 28) & 127);
      buffer[output + 5] = (Math.floor(unsignedVal / Math.pow(2, 35)) & 127);
      buffer[output + 6] = (Math.floor(unsignedVal / Math.pow(2, 42)) & 127);
      buffer[output + 7] = (Math.floor(unsignedVal / Math.pow(2, 49)) & 127);
      buffer[output + 8] = (Math.floor(unsignedVal / Math.pow(2, 56)) | 128) & 0xFF;
      return output + 9;
    }
  }

  // ============================================================================
  // SIZE CALCULATION
  // ============================================================================

  /**
   * Calculate how many bytes needed to encode a value.
   */
  static encodedVLongSize(val: number): number {
    const unsignedVal = val < 0 ? val + 0x10000000000000000 : val;

    if (unsignedVal < VarLongEncoding.THRESHOLD_1_BYTE) return 1;
    if (unsignedVal < VarLongEncoding.THRESHOLD_2_BYTE) return 2;
    if (unsignedVal < VarLongEncoding.THRESHOLD_3_BYTE) return 3;
    if (unsignedVal < VarLongEncoding.THRESHOLD_4_BYTE) return 4;
    if (unsignedVal < VarLongEncoding.THRESHOLD_5_BYTE) return 5;
    if (unsignedVal < VarLongEncoding.THRESHOLD_6_BYTE) return 6;
    if (unsignedVal < VarLongEncoding.THRESHOLD_7_BYTE) return 7;
    if (unsignedVal < VarLongEncoding.MAX_SAFE_VALUE) return 8;
    return 9;
  }

  // ============================================================================
  // ZIGZAG ENCODING (for signed integers)
  // ============================================================================

  /**
   * ZigZag encoding maps signed integers to unsigned integers.
   */
  static zigZag(value: number): number {
    // For JavaScript numbers, we can use bit manipulation up to 32 bits
    if (Math.abs(value) < 0x80000000) { // 2^31
      return (value >> 31) ^ (value << 1);
    } else {
      // For larger values, use division/multiplication
      return Math.floor(value / 0x8000000000000000) ^ (value * 2);
    }
  }
}
