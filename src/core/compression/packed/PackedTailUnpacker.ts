/**
 * Packed Tail Packer - Bit-Packing Compression Engine
 *
 * **The Compression Powerhouse**: Transforms raw adjacency lists into
 * ultra-compressed bit-packed blocks. This is where 80-90% compression
 * ratios are achieved through sophisticated bit manipulation.
 *
 * **Strategy**:
 * 1. Sort and delta-encode values (reduce magnitude)
 * 2. Analyze bit requirements per block (adaptive packing)
 * 3. Pack values into minimal bit widths (ultimate compression)
 * 4. Store in off-heap memory (avoid GC pressure)
 *
 * **Block-Based Approach**: Process BLOCK_SIZE values at a time for
 * optimal CPU cache usage and vectorization opportunities.
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

export class PackedTailPacker {

  /**
   * Compress adjacency list with sorting and aggregation.
   *
   * **The Full Pipeline**:
   * 1. Sort values for delta encoding optimization
   * 2. Apply delta encoding (reduces bit requirements)
   * 3. Handle aggregation (remove duplicates/combine values)
   * 4. Bit-pack into compressed blocks
   *
   * **For**: Raw adjacency data from graph loading
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
    // Sorting ensures delta values are small, reducing bit requirements
    values.sort((a, b) => a - b);

    if (length > 0) {
      // ✅ DELTA ENCODING + AGGREGATION
      // Convert [1000, 1002, 1005] → [1000, 2, 3] (much smaller values!)
      length = AdjacencyCompression.deltaEncodeSortedValues(values, 0, length, aggregation);
    }

    // ✅ UPDATE FINAL DEGREE
    degree.setValue(length);

    return PackedTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  /**
   * Compress property values without sorting/aggregation.
   *
   * **For**: Property values that must maintain their order
   * (timestamps, weights that correspond to specific edges)
   *
   * @param allocator Off-heap memory allocator
   * @param slice Memory slice to write compressed data
   * @param values Property values to compress
   * @param length Number of valid values
   * @param memoryTracker Statistics tracking
   * @returns Offset where compressed data was stored
   */
  static compressWithProperties(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    return PackedTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  // ============================================================================
  // COMPRESSION PIPELINE
  // ============================================================================

  /**
   * Analyze compression requirements and prepare packing.
   *
   * **Block Analysis Phase**: Examines each block of BLOCK_SIZE values
   * to determine optimal bit width. Different blocks can use different
   * bit widths for maximum compression!
   *
   * **Header Creation**: Creates header array where each byte represents
   * the bit width needed for one block.
   */
  private static preparePacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    // ✅ BLOCK STRUCTURE ANALYSIS
    const hasTail = length === 0 || length % AdjacencyPacking.BLOCK_SIZE !== 0;
    const blocks = BitUtil.ceilDiv(length, AdjacencyPacking.BLOCK_SIZE);
    const header = new Uint8Array(blocks);

    let bytes = 0;
    let offset = 0;
    let blockIdx = 0;
    const lastFullBlock = hasTail ? blocks - 1 : blocks;

    // ✅ ANALYZE FULL BLOCKS (64 values each)
    for (; blockIdx < lastFullBlock; blockIdx++, offset += AdjacencyPacking.BLOCK_SIZE) {
      const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, AdjacencyPacking.BLOCK_SIZE);
      memoryTracker.recordHeaderBits(bits);
      bytes += AdjacencyPackerUtil.bytesNeeded(bits);
      header[blockIdx] = bits;
    }

    // ✅ ANALYZE TAIL BLOCK (< 64 values)
    const tailLength = length - offset;
    if (hasTail) {
      const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, tailLength);
      memoryTracker.recordHeaderBits(bits);
      bytes += AdjacencyPackerUtil.bytesNeeded(bits, tailLength);
      header[blockIdx] = bits;
    }

    return PackedTailPacker.runPacking(
      allocator,
      slice,
      values,
      header,
      bytes,
      tailLength,
      memoryTracker
    );
  }

  /**
   * Execute the actual bit-packing compression.
   *
   * **Memory Layout**:
   * ```
   * [Header: 1 byte per block] [Padding for alignment] [Packed Data Blocks]
   * ```
   *
   * **The Packing Process**: For each block, pack all 64 values using
   * the optimal bit width determined in the analysis phase.
   */
  private static async runPacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    header: Uint8Array,
    bytes: number,
    tailLength: number,
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
    const fullSize = alignedHeaderSize + bytes;
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

    // ✅ MAIN PACKING LOOP (Full blocks)
    const hasTail = tailLength > 0;
    let valueIndex = 0;
    const headerLength = hasTail ? header.length - 1 : header.length;

    for (let i = 0; i < headerLength; i++) {
      const bits = header[i];
      memoryTracker.recordBlockStatistics(values, valueIndex, AdjacencyPacking.BLOCK_SIZE);
      ptr = AdjacencyPacking.pack(bits, values, valueIndex, ptr);
      valueIndex += AdjacencyPacking.BLOCK_SIZE;
    }

    // ✅ TAIL PACKING (Partial block)
    if (hasTail) {
      const bits = header[header.length - 1];
      memoryTracker.recordBlockStatistics(values, valueIndex, tailLength);
      ptr = AdjacencyPacking.loopPack(bits, values, valueIndex, tailLength, ptr);
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
