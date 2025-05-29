/**
 * Adjacency Packer Util - Bit Analysis and Calculation Toolkit
 *
 * **The Analysis Engine**: Provides utility functions for analyzing arrays
 * to determine optimal bit-packing strategies and memory requirements.
 *
 * **Key Functions**:
 * - Analyze arrays to determine minimum bits needed per value
 * - Calculate memory requirements for different packing strategies
 * - Provide alignment utilities for cache optimization
 *
 * **The Secret Sauce**: Works hand-in-hand with the generated bit-packing
 * routines (AdjacencyPacking) that are created by the Rust code generator.
 *
 * **Memory Layout Constants**: Provides platform-specific offsets needed
 * for direct memory manipulation during compression/decompression.
 */

import { BitUtil } from '../../mem/BitUtil';
import { UnsafeUtil } from '../../internal/unsafe/UnsafeUtil';
import { AdjacencyPacking } from './AdjacencyPacking';

export class AdjacencyPackerUtil {

  // ============================================================================
  // PLATFORM CONSTANTS
  // ============================================================================

  /**
   * Base offset for byte arrays in memory.
   * **Platform Specific**: Different JVM implementations may have different offsets
   * **Critical**: Required for direct memory access during compression
   */
  static readonly BYTE_ARRAY_BASE_OFFSET = UnsafeUtil.arrayBaseOffset(Uint8Array);

  // ============================================================================
  // BIT ANALYSIS FUNCTIONS
  // ============================================================================

  /**
   * Determine minimum bits needed to represent all values in a range.
   *
   * **The Core Analysis**: Examines a slice of values and determines the
   * minimum number of bits required to represent the largest value.
   *
   * **Algorithm**: OR all values together, then count the significant bits
   * needed. This is much faster than finding the maximum value.
   *
   * **Example**:
   * - Values: [5, 12, 7, 3] → OR = 15 (binary: 1111) → 4 bits needed
   * - Values: [100, 200, 150] → OR = 252 (binary: 11111100) → 8 bits needed
   *
   * **Performance**: O(n) single pass, extremely cache-friendly
   *
   * @param values Array of values to analyze
   * @param offset Starting index in the array
   * @param length Number of values to analyze
   * @returns Minimum bits needed (0-64)
   */
  static bitsNeeded(values: number[], offset: number, length: number): number {
    let bits = 0;

    // ✅ OR ALL VALUES: Much faster than max() operation
    for (let i = offset; i < offset + length; i++) {
      bits |= values[i];
    }

    // ✅ COUNT SIGNIFICANT BITS: How many bits needed for the OR result
    return 64 - this.numberOfLeadingZeros(bits);
  }

  /**
   * Count leading zeros in a 64-bit number.
   * **Note**: TypeScript doesn't have built-in clz, so we implement it
   */
  private static numberOfLeadingZeros(n: number): number {
    if (n === 0) return 64;

    let count = 0;
    if (n <= 0x00000000FFFFFFFF) { count += 32; n <<= 32; }
    if (n <= 0x0000FFFFFFFFFFFF) { count += 16; n <<= 16; }
    if (n <= 0x00FFFFFFFFFFFFFF) { count += 8; n <<= 8; }
    if (n <= 0x0FFFFFFFFFFFFFFF) { count += 4; n <<= 4; }
    if (n <= 0x3FFFFFFFFFFFFFFF) { count += 2; n <<= 2; }
    if (n <= 0x7FFFFFFFFFFFFFFF) { count += 1; }

    return count;
  }

  // ============================================================================
  // MEMORY CALCULATION FUNCTIONS
  // ============================================================================

  /**
   * Calculate bytes needed for a full block with given bit width.
   *
   * **Full Block Calculation**: Assumes exactly BLOCK_SIZE (64) values
   * will be packed using the specified number of bits per value.
   *
   * **Formula**: ceil((BLOCK_SIZE * bits) / 8)
   *
   * **Examples**:
   * - 4 bits per value: ceil((64 * 4) / 8) = ceil(32) = 32 bytes
   * - 5 bits per value: ceil((64 * 5) / 8) = ceil(40) = 40 bytes
   * - 7 bits per value: ceil((64 * 7) / 8) = ceil(56) = 56 bytes
   *
   * @param bits Number of bits per value (1-64)
   * @returns Bytes needed to store a full block
   */
  static bytesNeeded(bits: number): number {
    return BitUtil.ceilDiv(AdjacencyPacking.BLOCK_SIZE * bits, 8);
  }

  /**
   * Calculate bytes needed for a variable-length block.
   *
   * **Variable Block Calculation**: For tail blocks or custom block sizes
   * that may have fewer than BLOCK_SIZE values.
   *
   * **Formula**: ceil((length * bits) / 8)
   *
   * **Use Cases**:
   * - Tail blocks with < 64 values
   * - Custom block sizes for specific algorithms
   * - Memory estimation for arbitrary data sizes
   *
   * @param bits Number of bits per value (1-64)
   * @param length Number of values to pack
   * @returns Bytes needed to store the specified number of values
   */
  static bytesNeeded(bits: number, length: number): number {
    return BitUtil.ceilDiv(length * bits, 8);
  }

  // ============================================================================
  // ALIGNMENT UTILITIES
  // ============================================================================

  /**
   * Align length to block size boundary.
   *
   * **Block Alignment**: Rounds up to the nearest BLOCK_SIZE (64) boundary.
   * This is useful for padding calculations and memory layout planning.
   *
   * **Examples**:
   * - align(50) → 64 (rounds up to next block boundary)
   * - align(64) → 64 (already aligned)
   * - align(100) → 128 (rounds up to next block boundary)
   *
   * **Use Cases**:
   * - BlockAligned strategy padding calculations
   * - Memory allocation size estimation
   * - Cache line alignment planning
   *
   * @param length Length to align
   * @returns Length rounded up to next BLOCK_SIZE boundary
   */
  static align(length: number): number {
    return BitUtil.align(length, AdjacencyPacking.BLOCK_SIZE);
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Private constructor - this is a utility class with only static methods.
   */
  private constructor() {
    // Prevent instantiation
  }
}
