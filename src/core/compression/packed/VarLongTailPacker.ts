/**
 * VarLong Tail Packer - Hybrid Compression Strategy
 *
 * **The Brilliant Hybrid**: Combines the best of both compression worlds:
 *
 * 1. **Full Blocks (64 values)**: Use bit-packing for maximum compression
 * 2. **Tail Block (< 64 values)**: Use VarLong encoding for simplicity
 *
 * **Why This Works**:
 * - Bit-packing shines with full 64-value blocks (vectorization, cache alignment)
 * - VarLong is simpler for irregular tail sizes (no complex bit alignment)
 * - Result: Maximum compression + implementation simplicity! 🎯
 *
 * **Memory Layout**:
 * ```
 * [Header: bits per block] [Packed Blocks] [VarLong Tail]
 * [4,5,7,6,4,5,7,8,...]    [bit-packed]   [var-encoded]
 * ```
 */

import { AdjacencyListBuilder } from '../../api/compress/AdjacencyListBuilder';
import { ModifiableSlice } from '../../api/compress/ModifiableSlice';
import { Aggregation } from '../../core/Aggregation';
import { AdjacencyCompression } from '../common/AdjacencyCompression';
import { VarLongEncoding } from '../common/VarLongEncoding';
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

export class VarLongTailPacker {

  /**
   * Compress adjacency list with sorting and aggregation.
   *
   * **The Hybrid Pipeline**:
   * 1. Sort values for delta encoding optimization
   * 2. Apply delta encoding (reduces bit requirements)
   * 3. Handle aggregation (remove duplicates/combine values)
   * 4. Bit-pack full blocks + VarLong encode tail
   *
   * **Best of Both Worlds**: Maximum compression where it matters most,
   * simplicity where irregularity would cause complexity.
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
    return VarLongTailPacker.deltaCompress(allocator, slice, values, length, aggregation, degree, memoryTracker);
  }

  /**
   * Compress property values without sorting/aggregation.
   *
   * **For Property Values**: Must maintain order, so no sorting allowed
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
    return VarLongTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  // ============================================================================
  // DELTA COMPRESSION PIPELINE
  // ============================================================================

  /**
   * Apply delta encoding and prepare for hybrid packing.
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

    return VarLongTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  // ============================================================================
  // HYBRID COMPRESSION ANALYSIS
  // ============================================================================

  /**
   * Analyze compression requirements for hybrid strategy.
   *
   * **Block Structure Analysis**:
   * - Full blocks (64 values): Analyze for bit-packing
   * - Tail block (< 64 values): Calculate VarLong size
   *
   * **Memory Planning**: Calculate exact space needed for both strategies
   */
  private static preparePacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    // ✅ BLOCK ANALYSIS: Only full blocks get headers
    const blocks = Math.floor(length / AdjacencyPacking.BLOCK_SIZE);
    const header = new Uint8Array(blocks);

    let blockBytes = 0;
    let offset = 0;
    let blockIdx = 0;

    // ✅ ANALYZE FULL BLOCKS (64 values each) - BIT PACKING
    for (; blockIdx < blocks; blockIdx++, offset += AdjacencyPacking.BLOCK_SIZE) {
      const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, AdjacencyPacking.BLOCK_SIZE);
      memoryTracker.recordHeaderBits(bits);
      blockBytes += AdjacencyPackerUtil.bytesNeeded(bits);
      header[blockIdx] = bits;
    }

    // ✅ ANALYZE TAIL (< 64 values) - VARLONG ENCODING
    const tailLength = length - offset;
    const tailBytes = VarLongEncoding.encodedVLongsSize(values, length - tailLength, tailLength);

    return VarLongTailPacker.runPacking(
      allocator,
      slice,
      values,
      header,
      blockBytes,
      tailBytes,
      length,
      tailLength,
      memoryTracker
    );
  }

  // ============================================================================
  // HYBRID COMPRESSION EXECUTION
  // ============================================================================

  /**
   * Execute the hybrid compression strategy.
   *
   * **Memory Layout**:
   * ```
   * [Header: 1 byte per full block] [Alignment] [Bit-Packed Blocks] [VarLong Tail]
   * ```
   *
   * **The Hybrid Process**:
   * 1. Write header for full blocks only
   * 2. Bit-pack all full blocks (64 values each)
   * 3. VarLong encode the tail block (< 64 values)
   *
   * **Why This Is Optimal**:
   * - Full blocks: Maximum compression via bit-packing
   * - Tail block: Simple encoding without complex bit alignment
   */
  private static async runPacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    header: Uint8Array,
    blockBytes: number,
    tailBytes: number,
    length: number,
    tailLength: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    console.assert(
      values.length % AdjacencyPacking.BLOCK_SIZE === 0,
      `values length must be a multiple of ${AdjacencyPacking.BLOCK_SIZE}, but was ${values.length}`
    );

    // ✅ MEMORY LAYOUT CALCULATION
    const headerSize = header.length * 1; // 1 byte per full block
    // Align header to 8-byte boundary for efficient long writes
    const alignedHeaderSize = BitUtil.align(headerSize, 8);
    const fullSize = alignedHeaderSize + blockBytes + tailBytes;
    // Align total size to 8 bytes for safe memory access
    const alignedFullSize = BitUtil.align(fullSize, 8);
    const allocationSize = alignedFullSize;

    // ✅ ALLOCATE OFF-HEAP MEMORY
    const adjacencyOffset = await allocator.allocate(allocationSize, slice);

    const address = slice.slice();
    let ptr = address.address() + slice.offset();

    // ✅ WRITE HEADER (only for full blocks)
    UnsafeUtil.copyMemory(header, 0, ptr, headerSize);
    ptr += alignedHeaderSize;

    // ✅ BIT-PACK FULL BLOCKS
    let valueIndex = 0;
    for (const bits of header) {
      memoryTracker.recordBlockStatistics(values, valueIndex, AdjacencyPacking.BLOCK_SIZE);
      ptr = AdjacencyPacking.pack(bits, values, valueIndex, ptr);
      valueIndex += AdjacencyPacking.BLOCK_SIZE;
    }

    // ✅ VARLONG ENCODE TAIL BLOCK
    if (tailLength > 0) {
      AdjacencyCompression.compress(values, length - tailLength, tailLength, ptr);
    }

    return adjacencyOffset;
  }

  private constructor() {
    // Static utility class
  }
}
