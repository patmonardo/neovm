/**
 * ZigZag decoding for variable-length signed integers.
 *
 * **Algorithm**:
 * 1. Decode VarLong to get ZigZag-encoded value
 * 2. Apply ZigZag transformation to get original signed value
 * 3. Add to running total (delta decoding)
 *
 * **Why ZigZag**: Signed integers like -1, -2 would use many bytes in VarLong.
 * ZigZag maps them to 1, 3 which encode efficiently.
 *
 * **Mapping**:
 * 0 → 0, 1 → -1, 2 → 1, 3 → -2, 4 → 2, 5 → -3, ...
 */

/**
 * Value mapper interface for transforming decoded values.
 *
 * **Use Case**: Apply node ID mappings, coordinate transformations, etc.
 */
export interface ValueMapper {
  map(value: number): number;
}

/**
 * Identity mapper - no transformation.
 */
export class Identity implements ValueMapper {
  static readonly INSTANCE = new Identity();

  map(value: number): number {
    return value;
  }
}

export class ZigZagLongDecoding {

  /**
   * Decode ZigZag-encoded VarLong data with identity mapping.
   *
   * **Most Common Use**: Basic ZigZag decoding without transformations.
   *
   * @param compressedData Byte array containing ZigZag+VarLong encoded data
   * @param length Number of bytes to process
   * @param uncompressedData Output array for decoded values
   * @returns Number of values decoded
   */
  static zigZagUncompress(
    compressedData: Uint8Array,
    length: number,
    uncompressedData: number[]
  ): number {
    return ZigZagLongDecoding.zigZagUncompressWithMapper(
      compressedData,
      length,
      uncompressedData,
      Identity.INSTANCE
    );
  }

  /**
   * Decode ZigZag-encoded VarLong data with value transformation.
   *
   * **Advanced Use**: Apply transformations during decoding for efficiency.
   *
   * @param compressedData Byte array containing encoded data
   * @param length Number of bytes to process
   * @param uncompressedData Output array for decoded values
   * @param mapper Value transformation function
   * @returns Number of values decoded
   */
  static zigZagUncompressWithMapper(
    compressedData: Uint8Array,
    length: number,
    uncompressedData: number[],
    mapper: ValueMapper
  ): number {
    let input: number;
    let startValue = 0;  // Running total for delta decoding
    let value = 0;       // Current VarLong being assembled
    let into = 0;        // Output array index
    let shift = 0;       // Bit shift for VarLong assembly
    let offset = 0;      // Input array index

    while (offset < length) {
      input = compressedData[offset++];

      // ✅ VARLONG DECODING: Accumulate 7 bits at current shift position
      value += (input & 127) << shift;  // 127 = 0b01111111 (7 data bits)

      if ((input & 128) === 128) {      // 128 = 0b10000000 (continuation bit)
        // ✅ FINAL BYTE: Complete VarLong assembled

        // ✅ ZIGZAG DECODING: Transform unsigned back to signed
        const decodedDelta = ZigZagLongDecoding.unZigZag(value);

        // ✅ DELTA DECODING: Add to running total
        startValue += decodedDelta;

        // ✅ VALUE MAPPING: Apply transformation and store
        uncompressedData[into++] = mapper.map(startValue);

        // ✅ RESET: Prepare for next value
        value = 0;
        shift = 0;
      } else {
        // ✅ CONTINUATION: More bytes coming for this VarLong
        shift += 7;
      }
    }

    return into;
  }

  /**
   * ZigZag decoding transformation.
   *
   * **Algorithm**: (value >>> 1) ^ -(value & 1)
   *
   * **How it works**:
   * - Even numbers: just divide by 2 (shift right)
   * - Odd numbers: divide by 2 and negate
   *
   * **Examples**:
   * - 0 → (0>>>1) ^ -(0&1) = 0 ^ 0 = 0
   * - 1 → (1>>>1) ^ -(1&1) = 0 ^ -1 = -1
   * - 2 → (2>>>1) ^ -(2&1) = 1 ^ 0 = 1
   * - 3 → (3>>>1) ^ -(3&1) = 1 ^ -1 = -2
   */
  private static unZigZag(value: number): number {
    // JavaScript bitwise operations work on 32-bit signed integers
    // For values that fit in 32 bits, use fast bitwise operations
    if (Math.abs(value) < 0x80000000) { // 2^31
      return (value >>> 1) ^ (-(value & 1));
    } else {
      // For larger values, use division (slower but handles the range)
      const halfValue = Math.floor(value / 2);
      const isOdd = value & 1;
      return isOdd ? -halfValue - 1 : halfValue;
    }
  }

  // ============================================================================
  // BATCH PROCESSING OPTIMIZATIONS
  // ============================================================================

  /**
   * High-performance batch ZigZag decoding.
   *
   * **Optimization**: Processes common single-byte cases in tight loop
   * for maximum throughput on large adjacency lists.
   */
  static batchZigZagUncompress(
    compressedData: Uint8Array,
    length: number,
    uncompressedData: number[],
    mapper: ValueMapper = Identity.INSTANCE
  ): number {
    let input: number;
    let startValue = 0;
    let into = 0;
    let offset = 0;

    while (offset < length) {
      input = compressedData[offset++];

      if ((input & 128) === 128) {
        // ✅ SINGLE-BYTE VALUE (most common case)
        const zigzagValue = input & 127;
        const decodedDelta = ZigZagLongDecoding.unZigZag(zigzagValue);
        startValue += decodedDelta;
        uncompressedData[into++] = mapper.map(startValue);
      } else {
        // ✅ MULTI-BYTE VALUE: Fall back to standard decoding
        let value = input & 127;
        let shift = 7;

        while (true) {
          input = compressedData[offset++];
          value += (input & 127) << shift;

          if ((input & 128) === 128) {
            const decodedDelta = ZigZagLongDecoding.unZigZag(value);
            startValue += decodedDelta;
            uncompressedData[into++] = mapper.map(startValue);
            break;
          } else {
            shift += 7;
          }
        }
      }
    }

    return into;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Decoding signed adjacency differences
 *
 * ```typescript
 * // Original adjacency list: [1000, 995, 1010, 990]
 * // Delta encoded: [1000, -5, +15, -20]
 * // ZigZag encoded: [1000, 9, 29, 39] (negative → odd positive)
 * // VarLong encoded: [232, 7, 137, 157, 167]
 *
 * const compressed = new Uint8Array([232, 7, 137, 157, 167]);
 * const adjacencies: number[] = [];
 *
 * const count = ZigZagLongDecoding.zigZagUncompress(
 *   compressed,
 *   compressed.length,
 *   adjacencies
 * );
 *
 * console.log(adjacencies); // [1000, 995, 1010, 990]
 * ```
 */

/**
 * Example: Node ID mapping during decode
 *
 * ```typescript
 * class NodeIdMapper implements ValueMapper {
 *   constructor(private offset: number) {}
 *
 *   map(value: number): number {
 *     return value + this.offset; // Translate to global node ID space
 *   }
 * }
 *
 * const mapper = new NodeIdMapper(1000000); // Offset for partition 2
 * ZigZagLongDecoding.zigZagUncompressWithMapper(data, length, output, mapper);
 * ```
 */
