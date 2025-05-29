/**
 * Inlined Head Packed Tail Packer - Ultimate Micro-Optimization
 *
 * **The Brilliant Strategy**: Separate the first (usually largest) value from
 * the rest and handle it with different compression strategies:
 *
 * 1. **First Value**: VarLong encode and store in header (inlined)
 * 2. **Remaining Values**: Bit-pack using standard block compression
 * 3. **Result**: Best compression + fastest access for first value
 *
 * **Why This Works**:
 * - First value is often largest (after delta encoding) → VarLong optimal
 * - Remaining values are smaller deltas → bit-packing optimal
 * - First value access is most common → inlining gives speed boost
 *
 * **Memory Layout**:
 * ```
 * [Header with VarLong first value] [Alignment] [Bit-packed remaining values]
 * [blockBits|blockBits|varLongBytes] [padding]  [compressed tail blocks]
 * ```
 *
 * **Perfect For**: Power-law graphs where first neighbor is highly connected
 * hub and remaining neighbors are smaller nodes.
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

export class InlinedHeadPackedTailPacker {

  /**
   * Compress adjacency list with sorting and aggregation.
   *
   * **The Hybrid Optimization Pipeline**:
   * 1. Sort values for delta encoding optimization
   * 2. Apply delta encoding (first value becomes largest)
   * 3. Handle aggregation (remove duplicates/combine values)
   * 4. Extract first value for VarLong inlining
   * 5. Bit-pack remaining values in blocks
   *
   * **Strategic Separation**: The first value gets special treatment
   * because it's often the largest delta and benefits from VarLong encoding.
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

    if (length > 0) {
      // ✅ DELTA ENCODING + AGGREGATION
      // After delta encoding, first value is often the largest
      length = AdjacencyCompression.deltaEncodeSortedValues(values, 0, length, aggregation);
    }

    // ✅ UPDATE FINAL DEGREE
    degree.setValue(length);

    return InlinedHeadPackedTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  /**
   * Compress property values without sorting/aggregation.
   *
   * **For Property Values**: Must maintain order, so no sorting allowed
   * but still benefit from first-value inlining optimization.
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
    return InlinedHeadPackedTailPacker.preparePacking(allocator, slice, values, length, memoryTracker);
  }

  // ============================================================================
  // HYBRID COMPRESSION ANALYSIS
  // ============================================================================

  /**
   * Analyze compression requirements for inlined head strategy.
   *
   * **The Key Innovation**: If length > 0, extract the first value and
   * compress it separately using VarLong encoding in the header.
   *
   * **Block Structure Calculation**:
   * - If has first value: blocks = ceil((length - 1) / BLOCK_SIZE)
   * - If no values: blocks = ceil(length / BLOCK_SIZE) = 0
   *
   * **Header Composition**:
   * - Block headers: 1 byte per block (bit widths)
   * - VarLong first value: Variable bytes (1-10 bytes typically)
   *
   * **Memory Layout Planning**:
   * ```
   * Header: [block0_bits][block1_bits][...][varlong_first_value]
   * Data:   [block0_packed_data][block1_packed_data][...]
   * ```
   */
  private static preparePacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    length: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    // ✅ CALCULATE BLOCK STRUCTURE WITH FIRST VALUE EXTRACTION
    let blockCount: number;
    let header: Uint8Array;
    let offset: number;

    if (length > 0) {
      // ✅ EXTRACT FIRST VALUE FOR INLINING
      // We assume that the first value is the largest exception within the adjacency list.
      // We move it out of the values and compress it separately as part of the header
      // using var-length encoding.
      blockCount = BitUtil.ceilDiv(length - 1, AdjacencyPacking.BLOCK_SIZE);
      const headSize = VarLongEncoding.encodedVLongSize(values[0]);
      header = new Uint8Array(blockCount + headSize);

      // ✅ ENCODE FIRST VALUE IN HEADER
      VarLongEncoding.encodeVLong(header, values[0], blockCount);
      offset = 1; // Skip the first value for block processing
    } else {
      // ✅ NO VALUES TO COMPRESS
      blockCount = BitUtil.ceilDiv(length, AdjacencyPacking.BLOCK_SIZE);
      header = new Uint8Array(blockCount);
      offset = 0;
    }

    // ✅ ANALYZE REMAINING VALUES FOR BIT-PACKING
    const hasTail = (length - offset) === 0 || (length - offset) % AdjacencyPacking.BLOCK_SIZE !== 0;
    let bytes = 0;
    let blockIdx = 0;
    const lastFullBlock = hasTail ? blockCount - 1 : blockCount;

    // ✅ ANALYZE FULL BLOCKS (remaining values after first)
    for (; blockIdx < lastFullBlock; blockIdx++, offset += AdjacencyPacking.BLOCK_SIZE) {
      const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, AdjacencyPacking.BLOCK_SIZE);
      memoryTracker.recordHeaderBits(bits);
      bytes += AdjacencyPackerUtil.bytesNeeded(bits);
      header[blockIdx] = bits;
    }

    // ✅ ANALYZE TAIL BLOCK (< BLOCK_SIZE remaining values)
    if (hasTail) {
      const tailLength = length - offset;
      const bits = AdjacencyPackerUtil.bitsNeeded(values, offset, tailLength);
      memoryTracker.recordHeaderBits(bits);
      bytes += AdjacencyPackerUtil.bytesNeeded(bits, tailLength);
      header[blockIdx] = bits;
    }

    return InlinedHeadPackedTailPacker.runPacking(
      allocator,
      slice,
      values,
      header,
      bytes,
      blockCount,
      length - offset, // tailLength
      memoryTracker
    );
  }

  // ============================================================================
  // INLINED HEAD COMPRESSION EXECUTION
  // ============================================================================

  /**
   * Execute the inlined head compression strategy.
   *
   * **Memory Layout Execution**:
   * ```
   * [Header: block bits + VarLong first value] [8-byte alignment] [Bit-packed blocks]
   * ```
   *
   * **The Inlined Process**:
   * 1. Write block bit widths to header
   * 2. Write VarLong encoded first value to header
   * 3. Add alignment padding
   * 4. Bit-pack remaining values (skipping first)
   *
   * **Key Optimization**: First value is immediately accessible from header
   * without requiring decompression of any blocks!
   */
  private static async runPacking(
    allocator: AdjacencyListBuilder.Allocator<Address>,
    slice: ModifiableSlice<Address>,
    values: number[],
    header: Uint8Array,
    bytes: number,
    blockCount: number,
    tailLength: number,
    memoryTracker: MemoryTracker
  ): Promise<number> {
    // ✅ MEMORY LAYOUT CALCULATION
    const headerSize = header.length * 1; // bytes
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

    // ✅ WRITE HYBRID HEADER (block bits + VarLong first value)
    UnsafeUtil.copyMemory(header, 0, ptr, headerSize);
    ptr += alignedHeaderSize;

    // ✅ BIT-PACK REMAINING VALUES (skip first value)
    const hasTail = tailLength > 0;
    // **Key**: Always skip the first element, because it's stored in the header
    let valueIndex = 1;
    const fullBlocks = hasTail ? blockCount - 1 : blockCount;

    // ✅ MAIN PACKING LOOP (full blocks of remaining values)
    for (let i = 0; i < fullBlocks; i++) {
      const bits = header[i];
      memoryTracker.recordBlockStatistics(values, valueIndex, AdjacencyPacking.BLOCK_SIZE);
      ptr = AdjacencyPacking.pack(bits, values, valueIndex, ptr);
      valueIndex += AdjacencyPacking.BLOCK_SIZE;
    }

    // ✅ TAIL PACKING (partial block of remaining values)
    if (hasTail) {
      const bits = header[blockCount - 1];
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
