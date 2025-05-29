/**
 * Block Aligned Tail Packer - Cache-Optimized Compression
 *
 * **The Alignment Strategy**: Forces ALL blocks to be exactly BLOCK_SIZE (64)
 * by zero-padding the tail block. This creates perfectly aligned memory
 * structures for optimal cache performance.
 *
 * **Key Innovation**: Instead of variable-sized tail blocks, pad the final
 * block with zeros to maintain perfect 64-value alignment:
 * - Block 1: [val1...val64] (full block)
 * - Block 2: [val65...val100, 0, 0, ..., 0] (padded to 64)
 *
 * **Trade-offs**:
 * + Perfect cache alignment = faster decompression
 * + Simpler decompression logic (no special tail handling)
 * + Vectorization opportunities (SIMD can process full blocks)
 * - Slightly more memory usage (zero padding overhead)
 * - Compresses zeros that don't exist (but zeros compress well!)
 */

import { AdjacencyListBuilder } from '../../api/compress/AdjacencyListBuilder';
import { ModifiableSlice } from '../../api/compress/ModifiableSlice';
import { Aggregation } from '../../core/Aggregation';
import { AdjacencyCompression } from '../common/AdjacencyCompression';
import { MemoryTracker } from '../common/MemoryTracker';
import { BitUtil } from '../../mem/BitUtil';
import { UnsafeUtil } from '../../internal/unsafe/UnsafeUtil';
import { Address } from './Address';
import { AdjacencyPacking } from './AdjacencyPacking';
import { AdjacencyPackerUtil } from './AdjacencyPackerUtil';

/**
 * Mutable integer wrapper for degree tracking
 */
class MutableInt {
  constructor(public value: number = 0) {}

  setValue(value: number): void {
    this.value = value;
  }
}

export class BlockAlignedTailPacker {

  /**
   * Compress adjacency list with sorting and aggregation.
   *
   * **Block Alignment Pipeline**:
   * 1. Sort values for delta encoding optimization
   * 2. Apply delta encoding (reduces bit requirements)
   * 3. Handle aggregation (remove duplicates/combine values)
   * 4. Pad to block boundaries and bit-pack ALL blocks uniformly
   *
   * **Zero Padding Strategy**: Final block padded with zeros to reach
   * BLOCK_SIZE (64), enabling uniform processing and cache alignment.
   *
   * @param allocator Off-heap memory allocator
   * @param slice Memory slice to write compressed data
   * @param values Raw adjacency values to compress
   * @param length Number of valid values in array
   * @param aggregation How to handle duplicate edges
   * @param degree Output parameter for final degree after compression
   * @param memoryTracker Statistics tracking
   * @returns Offset where compressed data was stored
   */
  static compress(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    aggregation: Aggregation,
    degree: MutableInt,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    // ✅ SORT FOR OPTIMAL DELTA ENCODING
    values.sort((a, b) => a - b);
    return BlockAlignedTailPacker.deltaCompress(allocator, slice, values, length, aggregation, degree, memoryTracker);
  }

  // ============================================================================
  // DELTA COMPRESSION PIPELINE
  // ============================================================================

  /**
   * Apply delta encoding and prepare for block-aligned packing.
   */
  private static deltaCompress(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    aggregation: Aggregation,
    degree: MutableInt,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    if (length > 0) {
      // ✅ DELTA ENCODING + AGGREGATION
      length = AdjacencyCompression.deltaEncodeSortedValues(values, 0, length, aggregation);
    }

    // ✅ UPDATE FINAL DEGREE
    degree.setValue(length);

    return BlockAlignedTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  // ============================================================================
  // BLOCK-ALIGNED COMPRESSION ANALYSIS
  // ============================================================================

  /**
   * Analyze compression requirements with block alignment.
   *
   * **Block Alignment Innovation**: ALL blocks are treated as full BLOCK_SIZE,
   * including the tail which gets zero-padded. This creates uniform processing:
   *
   * **Traditional Approach**:
   * - Block 1: 64 values → header[0] = bits needed
   * - Block 2: 64 values → header[1] = bits needed
   * - Tail: 23 values → special tail handling
   *
   * **Block Aligned Approach**:
   * - Block 1: 64 values → header[0] = bits needed
   * - Block 2: 64 values → header[1] = bits needed
   * - Block 3: 23 values + 41 zeros → header[2] = bits needed (for zeros too!)
   *
   * **Result**: Perfect uniformity, no special cases!
   */
  private static preparePacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    // ✅ BLOCK STRUCTURE: Always ceil division (padded blocks)
    const blocks = BitUtil.ceilDiv(length, AdjacencyPacking.BLOCK_SIZE);
    const header = new Uint8Array(blocks);

    let bytes = 0;
    let offset = 0;
    let blockIdx = 0;

    // ✅ ANALYZE ALL BLOCKS EXCEPT LAST (definitely full)
    for (; blockIdx < blocks - 1; blockIdx++, offset += AdjacencyPacking.BLOCK_SIZE) {
      const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, AdjacencyPacking.BLOCK_SIZE);
      memoryTracker.recordHeaderBits(bits);
      bytes += AdjacencyPackerUtil.bytesNeeded(bits);
      header[blockIdx] = bits;
    }

    // ✅ ANALYZE "TAIL" BLOCK (may be padded with zeros)
    // **Key Innovation**: Analyze based on actual values, but pack as full block
    const tailLength = length - offset;
    const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, tailLength);
    memoryTracker.recordHeaderBits(bits);
    // **Important**: bytesNeeded for FULL block, not just tail length!
    bytes += AdjacencyPackerUtil.bytesNeeded(bits); // Full block size
    header[blockIdx] = bits;

    return BlockAlignedTailPacker.runPacking(
      allocator,
      slice,
      values,
      header,
      bytes,
      memoryTracker
    );
  }

  // ============================================================================
  // BLOCK-ALIGNED COMPRESSION EXECUTION
  // ============================================================================

  /**
   * Execute block-aligned compression.
   *
   * **Uniform Block Processing**: Every block is processed identically
   * using the same packing logic. No special tail handling needed!
   *
   * **Memory Layout**:
   * ```
   * [Header: 1 byte per block] [8-byte alignment] [Block 1] [Block 2] [Block N]
   * ```
   *
   * **Cache Optimization**: Each block starts at a predictable offset,
   * enabling perfect cache line alignment and prefetching.
   */
  private static async runPacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    header: Uint8Array,
    requiredBytes: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    console.assert(
      values.length % AdjacencyPacking.BLOCK_SIZE === 0,
      `values length must be a multiple of ${AdjacencyPacking.BLOCK_SIZE}, but was ${values.length}`
    );

    // ✅ MEMORY LAYOUT CALCULATION
    const headerSize = header.length * 1; // 1 byte per block
    // Align header to 8-byte boundary for efficient long writes
    const alignedHeaderSize = BitUtil.align(headerSize, 8);
    const fullSize = alignedHeaderSize + requiredBytes;
    // Align total size to 8 bytes for safe memory access
    const alignedFullSize = BitUtil.align(fullSize, 8);
    const allocationSize = alignedFullSize;

    memoryTracker.recordHeaderAllocation(alignedHeaderSize);

    // ✅ ALLOCATE OFF-HEAP MEMORY
    const adjacencyOffset = await allocator.allocate(allocationSize, slice);

    const address = slice.slice();
    let ptr = address.address() + slice.offset();
    const initialPtr = ptr;

    // ✅ WRITE HEADER
    UnsafeUtil.copyMemory(header, 0, ptr, headerSize);
    ptr += alignedHeaderSize;

    // ✅ UNIFORM BLOCK PACKING LOOP
    // **The Beauty**: No special cases! Every block uses the same packing logic.
    let valueIndex = 0;
    for (const bits of header) {
      memoryTracker.recordBlockStatistics(values, valueIndex, AdjacencyPacking.BLOCK_SIZE);

      // ✅ PACK FULL BLOCK: AdjacencyPacking.pack automatically handles
      // zero-padding if we go beyond the actual values array
      ptr = AdjacencyPacking.pack(bits, values, valueIndex, ptr);
      valueIndex += AdjacencyPacking.BLOCK_SIZE;
    }

    // ✅ BOUNDS CHECK
    if (ptr > initialPtr + allocationSize) {
      throw new Error(
        `Written more bytes than allocated. ptr=${ptr}, initialPtr=${initialPtr}, allocationSize=${allocationSize}`
      );
    }

    return adjacencyOffset;
  }

  private constructor() {
    // Static utility class
  }
}
