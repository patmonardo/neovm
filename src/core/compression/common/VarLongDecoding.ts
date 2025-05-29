/**
 * Variable-length decoding for 64-bit integers.
 *
 * **Performance Critical**: Uses JavaScript numbers instead of BigInt
 * for maximum speed. Handles 64-bit values through careful bit manipulation.
 *
 * **Algorithm**: Reads 7 bits per byte until continuation bit is set.
 * Reconstructs the original value by left-shifting and accumulating.
 */

/**
 * Mutable wrapper for return values (like Java's MutableLong)
 */
export class MutableLong {
  constructor(public value: number = 0) {}

  setValue(value: number): void {
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }
}

export class VarLongDecoding {

  // ============================================================================
  // DELTA ENCODING DECODING
  // ============================================================================

  /**
   * Decode delta-encoded VarLongs from byte array.
   *
   * **Delta Encoding**: Values are stored as differences from previous value.
   * This is incredibly effective for sorted adjacency lists!
   *
   * **Example**: [100, 102, 105] → stored as [100, +2, +3]
   *
   * @param startValue Initial value (base for first delta)
   * @param adjacencyPage Byte array containing encoded data
   * @param offset Starting position in byte array
   * @param limit Number of values to decode
   * @param out Output array for decoded values
   * @returns New offset after decoding
   */
  static decodeDeltaVLongs(
    startValue: number,
    adjacencyPage: Uint8Array,
    offset: number,
    limit: number,
    out: number[]
  ): number {
    let input: number;
    let value = 0;
    let into = 0;
    let shift = 0;

    while (into < limit) {
      input = adjacencyPage[offset++];

      // ✅ Accumulate 7 bits at a time
      value += (input & 0x7F) << shift;  // 0x7F = 127 = 0b01111111

      if ((input & 0x80) === 0x80) {  // 0x80 = 128 = 0b10000000 (continuation bit)
        // ✅ Final byte - reconstruct delta and add to running total
        startValue += value;
        out[into++] = startValue;
        value = 0;
        shift = 0;
      } else {
        // ✅ More bytes to come - advance shift position
        shift += 7;
      }
    }

    return offset;
  }

  // ============================================================================
  // REGULAR VAR-LONG DECODING
  // ============================================================================

  /**
   * Decode regular (non-delta) VarLongs from byte array.
   *
   * **Use Case**: When values aren't sequential (can't use delta compression).
   *
   * @param length Number of values to decode
   * @param adjacencyPage Byte array containing encoded data
   * @param offset Starting position in byte array
   * @param out Output array for decoded values
   * @param outOffset Starting position in output array
   * @returns New offset after decoding
   */
  static decodeVLongs(
    length: number,
    adjacencyPage: Uint8Array,
    offset: number,
    out: number[],
    outOffset: number
  ): number {
    let input: number;
    let value = 0;
    let shift = 0;

    while (length > 0) {
      input = adjacencyPage[offset++];

      // ✅ Accumulate 7 bits at a time
      value += (input & 0x7F) << shift;

      if ((input & 0x80) === 0x80) {  // Final byte
        out[outOffset++] = value;
        value = 0;
        shift = 0;
        length--;
      } else {
        shift += 7;
      }
    }

    return offset;
  }

  /**
   * Decode a single VarLong value.
   *
   * **Use Case**: When you need to decode just one value at a time.
   * Returns both the decoded value and the new offset.
   *
   * @param adjacencyPage Byte array containing encoded data
   * @param offset Starting position in byte array
   * @param out Mutable container for decoded value
   * @returns New offset after decoding
   */
  static decodeVLong(
    adjacencyPage: Uint8Array,
    offset: number,
    out: MutableLong
  ): number {
    let value = 0;
    let input: number;
    let shift = 0;

    while (true) {
      input = adjacencyPage[offset++];

      // ✅ Accumulate 7 bits at current shift position
      value += (input & 0x7F) << shift;

      if ((input & 0x80) === 0x80) {  // Final byte - we're done
        break;
      } else {
        shift += 7;
      }
    }

    out.setValue(value);
    return offset;
  }

  // ============================================================================
  // HIGH-PERFORMANCE BATCH DECODING
  // ============================================================================

  /**
   * High-performance batch delta decoding.
   *
   * **Optimization**: Processes multiple values in a tight loop
   * for maximum throughput when decoding large adjacency lists.
   */
  static batchDecodeDeltaVLongs(
    startValue: number,
    adjacencyPage: Uint8Array,
    offset: number,
    limit: number,
    out: number[]
  ): number {
    let input: number;
    let value = 0;
    let into = 0;
    let shift = 0;
    let currentValue = startValue;

    // ✅ Unrolled loop for better performance on modern JS engines
    while (into < limit) {
      // Read first byte
      input = adjacencyPage[offset++];
      value = input & 0x7F;

      if ((input & 0x80) === 0x80) {
        // Single-byte value (most common case)
        currentValue += value;
        out[into++] = currentValue;
        continue;
      }

      // Multi-byte value - continue reading
      shift = 7;
      while (true) {
        input = adjacencyPage[offset++];
        value += (input & 0x7F) << shift;

        if ((input & 0x80) === 0x80) {
          currentValue += value;
          out[into++] = currentValue;
          value = 0;
          shift = 0;
          break;
        } else {
          shift += 7;
        }
      }
    }

    return offset;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Peek at the next VarLong value without advancing the offset.
   *
   * **Use Case**: When you need to look ahead in the stream
   * without consuming the value.
   */
  static peekVLong(adjacencyPage: Uint8Array, offset: number): number {
    let value = 0;
    let input: number;
    let shift = 0;
    let currentOffset = offset;

    while (true) {
      input = adjacencyPage[currentOffset++];
      value += (input & 0x7F) << shift;

      if ((input & 0x80) === 0x80) {
        return value;
      } else {
        shift += 7;
      }
    }
  }

  /**
   * Calculate how many bytes a VarLong value will consume.
   *
   * **Use Case**: For skipping over values without decoding them.
   */
  static vLongByteLength(adjacencyPage: Uint8Array, offset: number): number {
    let length = 0;

    while (true) {
      const input = adjacencyPage[offset + length];
      length++;

      if ((input & 0x80) === 0x80) {  // Final byte
        return length;
      }
    }
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Decoding a compressed adjacency list
 *
 * ```typescript
 * // Compressed adjacency list for node 1000: [1001, 1005, 1010, 2000000]
 * // Delta encoded as: [1001, +4, +5, +999990]
 * // VarLong encoded as bytes: [233, 7, 132, 135, ...]
 *
 * const compressed = new Uint8Array([233, 7, 132, 135, 246, 132, 61]);
 * const adjacencies: number[] = [];
 *
 * const finalOffset = VarLongDecoding.decodeDeltaVLongs(
 *   0,           // Start value
 *   compressed,  // Encoded data
 *   0,           // Start offset
 *   4,           // Decode 4 values
 *   adjacencies  // Output array
 * );
 *
 * console.log(adjacencies); // [1001, 1005, 1010, 2000000]
 * ```
 */
