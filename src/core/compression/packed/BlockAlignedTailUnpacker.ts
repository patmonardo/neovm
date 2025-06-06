/**
 * Block Aligned Tail Unpacker - Cache-Optimized Decompression
 *
 * **The Uniform Block Strategy**: Treats ALL blocks identically, including
 * the zero-padded tail block. This creates perfectly predictable decompression
 * with optimal cache behavior.
 *
 * **Key Simplification**: No special tail handling! Since the packer padded
 * the tail to full BLOCK_SIZE, the unpacker can use identical logic for
 * every block.
 *
 * **Cache Optimization Benefits**:
 * - Predictable memory access patterns
 * - Perfect cache line alignment
 * - Vectorization opportunities (SIMD)
 * - No branch mispredictions (uniform processing)
 *
 * **Zero Handling**: The padded zeros decompress to zeros, which are
 * naturally filtered out during iteration (degree bounds prevent reading them).
 */

import { ByteArrayBuffer } from '@/api/compress';
import { BitUtil } from '@/mem';
import { UnsafeUtil } from '@/mem';
import { AdjacencyPacking } from './AdjacencyPacking';
import { AdjacencyUnpacking } from './AdjacencyUnpacking';
import { AdjacencyPackerUtil } from './AdjacencyPackerUtil';

export class BlockAlignedTailUnpacker {

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  private static readonly BLOCK_SIZE = AdjacencyPacking.BLOCK_SIZE; // 64

  // ============================================================================
  // COMPRESSED DATA STATE
  // ============================================================================

  /**
   * Header buffer containing bit widths for ALL blocks (including padded tail).
   * **Format**: 1 byte per block, indicating bits needed per value
   * **Example**: [4, 5, 7, 2] = blocks need 4,5,7,2 bits per value
   * **Note**: Last block (2 bits) might be mostly zeros from padding!
   */
  private readonly header: ByteArrayBuffer;

  /**
   * Pointer to current position in compressed data.
   * **Off-heap**: Direct memory address for reading compressed blocks
   */
  private targetPtr: number = 0;

  /**
   * Number of blocks (ALL treated as full blocks).
   * **Calculation**: Math.ceil(degree / BLOCK_SIZE) - includes padded tail
   */
  private headerLength: number = 0;

  // ============================================================================
  // DECOMPRESSION STATE
  // ============================================================================

  /**
   * Current decompressed block (64 values).
   * **Uniform**: Always exactly BLOCK_SIZE values, even for padded tail
   */
  private readonly block: number[] = new Array(BlockAlignedTailUnpacker.BLOCK_SIZE);

  /**
   * Current position within the decompressed block.
   * **Range**: 0-63, resets to 0 when moving to next block
   */
  private idxInBlock: number = 0;

  /**
   * Current block being processed.
   * **Progress**: Tracks which block we're currently decompressing
   */
  private blockId: number = 0;

  /**
   * Last value for delta decoding.
   * **Delta Chain**: Each block builds on the last value from previous block
   * **Note**: Padded zeros don't affect the delta chain (zeros add nothing!)
   */
  private lastValue: number = 0;

  constructor() {
    this.header = new ByteArrayBuffer();
  }

  // ============================================================================
  // COPY CONSTRUCTOR PATTERN
  // ============================================================================

  /**
   * Copy state from another unpacker.
   * **Optimization**: Allows reusing unpacker objects without reallocation
   */
  copyFrom(other: BlockAlignedTailUnpacker): void {
    // ✅ COPY DECOMPRESSED BLOCK
    for (let i = 0; i < BlockAlignedTailUnpacker.BLOCK_SIZE; i++) {
      this.block[i] = other.block[i];
    }

    // ✅ COPY HEADER BUFFER
    this.header.ensureCapacity(other.headerLength);
    for (let i = 0; i < other.headerLength; i++) {
      this.header.buffer[i] = other.header.buffer[i];
    }

    // ✅ COPY ALL STATE
    this.targetPtr = other.targetPtr;
    this.headerLength = other.headerLength;
    this.idxInBlock = other.idxInBlock;
    this.blockId = other.blockId;
    this.lastValue = other.lastValue;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize unpacker for a compressed adjacency list.
   *
   * **Block-Aligned Memory Layout**:
   * ```
   * [Header: 1 byte per block] [8-byte alignment] [Block1] [Block2] [Block3 (padded)]
   * ```
   *
   * **Uniform Block Calculation**: Always use Math.ceil(degree / BLOCK_SIZE)
   * to include the potentially padded tail block.
   *
   * @param ptr Off-heap memory pointer to compressed data
   * @param degree Total number of neighbors (excluding padded zeros)
   */
  reset(ptr: number, degree: number): void {
    // ✅ CALCULATE UNIFORM BLOCK STRUCTURE
    // **Key**: Math.ceil includes the potentially padded tail block
    const headerSize = BitUtil.ceilDiv(degree, AdjacencyPacking.BLOCK_SIZE);
    const alignedHeaderSize = BitUtil.align(headerSize, 8); // 8-byte alignment

    // ✅ READ HEADER FROM OFF-HEAP MEMORY
    this.headerLength = headerSize;
    this.header.ensureCapacity(headerSize);
    UnsafeUtil.copyMemory(
      ptr,                                              // Source: off-heap
      this.header.buffer,                               // Destination: header buffer
      AdjacencyPackerUtil.BYTE_ARRAY_BASE_OFFSET,      // Buffer offset
      headerSize                                        // Bytes to copy
    );

    // ✅ SETUP DATA POINTER
    this.targetPtr = ptr + alignedHeaderSize;

    // ✅ INITIALIZE STATE
    this.idxInBlock = 0;
    this.blockId = 0;
    this.lastValue = 0;

    // ✅ DECOMPRESS FIRST BLOCK
    this.decompressBlock();
  }

  // ============================================================================
  // VALUE ACCESS
  // ============================================================================

  /**
   * Get next decompressed value.
   *
   * **Uniform Block Management**: Automatically decompresses next block when
   * current block is exhausted. No special handling for tail blocks!
   *
   * **Performance**: O(1) for values within a block, O(BLOCK_SIZE)
   * when transitioning between blocks.
   *
   * @returns Next neighbor node ID (delta-decoded)
   */
  next(): number {
    if (this.idxInBlock === BlockAlignedTailUnpacker.BLOCK_SIZE) {
      this.decompressBlock();
    }
    return this.block[this.idxInBlock++];
  }

  /**
   * Peek at next value without consuming it.
   *
   * **Cache-Friendly**: Block alignment improves predictability for
   * CPU prefetching during peek operations.
   */
  peek(): number {
    if (this.idxInBlock === BlockAlignedTailUnpacker.BLOCK_SIZE) {
      this.decompressBlock();
    }
    return this.block[this.idxInBlock];
  }

  /**
   * Advance by multiple steps and return the final value.
   *
   * **Vectorized Advancement**: Block alignment enables potential SIMD
   * optimizations for bulk skipping operations.
   *
   * **Delta Chain Requirement**: Must decompress all intermediate blocks
   * to maintain delta decoding consistency.
   *
   * @param steps Number of values to skip
   * @returns Value at position current + steps + 1
   */
  advanceBy(steps: number): number {
    // ✅ HANDLE MULTI-BLOCK ADVANCEMENT
    // Due to delta encoded target ids, we can't skip blocks entirely
    // as we need to decompress all previous blocks to get the correct target id
    while (this.idxInBlock + steps >= BlockAlignedTailUnpacker.BLOCK_SIZE) {
      steps = this.idxInBlock + steps - BlockAlignedTailUnpacker.BLOCK_SIZE;
      this.decompressBlock();
    }

    // ✅ ADVANCE WITHIN BLOCK
    this.idxInBlock += steps;
    return this.block[this.idxInBlock++];
  }

  // ============================================================================
  // UNIFORM BLOCK DECOMPRESSION
  // ============================================================================

  /**
   * Decompress the next block using uniform processing.
   *
   * **The Beautiful Simplification**: No special cases! Every block
   * (including the padded tail) uses identical decompression logic.
   *
   * **Uniform Processing**:
   * 1. Read header byte for bit width
   * 2. Bit-unpack exactly BLOCK_SIZE values
   * 3. Apply delta decoding to all values
   * 4. Padded zeros naturally don't affect delta chain
   *
   * **Cache Optimization**: Perfect predictability enables:
   * - CPU prefetching
   * - SIMD vectorization
   * - Cache line alignment
   */
  private decompressBlock(): void {
    if (this.blockId < this.headerLength) {
      // ✅ UNIFORM BLOCK UNPACKING
      const blockHeader = this.header.buffer[this.blockId];

      // **Key**: Always unpack exactly BLOCK_SIZE values, even for padded tail
      this.targetPtr = AdjacencyUnpacking.unpack(
        blockHeader,                                    // Bits per value for this block
        this.block,                                     // Output buffer
        0,                                              // Start index in buffer
        this.targetPtr                                  // Current position in compressed data
      );

      // ✅ DELTA DECODE ALL VALUES IN BLOCK
      // **Note**: For padded tail, zeros don't change the delta chain!
      let value = this.lastValue;
      for (let i = 0; i < AdjacencyPacking.BLOCK_SIZE; i++) {
        value = this.block[i] += value;                 // In-place delta decode
      }
      this.lastValue = value;                           // Track for next block

      this.blockId++;
    }

    // ✅ RESET BLOCK POSITION
    this.idxInBlock = 0;
  }
}
