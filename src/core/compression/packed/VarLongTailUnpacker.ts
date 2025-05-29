/**
 * VarLong Tail Unpacker - Hybrid Decompression Engine
 *
 * **The Decompression Counterpart**: Reverses the hybrid compression:
 * 1. **Full blocks**: Bit-unpack using headers (maximum compression)
 * 2. **Tail block**: VarLong decode (simple irregular handling)
 *
 * **Block Streaming**: Decompresses one 64-value block at a time
 * to minimize memory usage and maximize cache efficiency.
 *
 * **Delta Decoding**: Reconstructs original values from delta-encoded
 * compressed data: [1000, 2, 3] → [1000, 1002, 1005]
 *
 * **State Management**: Tracks position across blocks and handles
 * the transition from bit-packed blocks to VarLong tail seamlessly.
 */

import { ByteArrayBuffer } from '../../api/compress/ByteArrayBuffer';
import { AdjacencyCompression } from '../common/AdjacencyCompression';
import { VarLongDecoding } from '../common/VarLongDecoding';
import { BitUtil } from '../../mem/BitUtil';
import { UnsafeUtil } from '../../internal/unsafe/UnsafeUtil';
import { AdjacencyPacking } from './AdjacencyPacking';
import { AdjacencyUnpacking } from './AdjacencyUnpacking';
import { AdjacencyPackerUtil } from './AdjacencyPackerUtil';

export class VarLongTailUnpacker {

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  private static readonly BLOCK_SIZE = AdjacencyPacking.BLOCK_SIZE; // 64

  // ============================================================================
  // COMPRESSED DATA STATE
  // ============================================================================

  /**
   * Header buffer containing bit widths for each full block.
   * **Format**: 1 byte per block, indicating bits needed per value
   * **Example**: [4, 5, 7, 6] = blocks need 4,5,7,6 bits per value
   */
  private readonly header: ByteArrayBuffer;

  /**
   * Pointer to current position in compressed data.
   * **Off-heap**: Direct memory address for reading compressed blocks
   */
  private targetPtr: number = 0;

  /**
   * Number of full blocks (have headers).
   * **Calculation**: degree / BLOCK_SIZE (integer division)
   */
  private headerLength: number = 0;

  // ============================================================================
  // DECOMPRESSION STATE
  // ============================================================================

  /**
   * Current decompressed block (64 values).
   * **Streaming**: Only one block in memory at a time for efficiency
   */
  private readonly block: number[] = new Array(VarLongTailUnpacker.BLOCK_SIZE);

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
   * **Example**: Block1 ends at 1005, Block2 starts delta from 1005
   */
  private lastValue: number = 0;

  /**
   * Total remaining values to decompress.
   * **Countdown**: Decreases by BLOCK_SIZE for each block processed
   */
  private remaining: number = 0;

  constructor() {
    this.header = new ByteArrayBuffer();
  }

  // ============================================================================
  // COPY CONSTRUCTOR PATTERN
  // ============================================================================

  /**
   * Copy state from another unpacker.
   * **Optimization**: Allows reusing unpacker objects without reallocation
   * **Use Case**: Cursor reuse patterns in graph algorithms
   */
  copyFrom(other: VarLongTailUnpacker): void {
    // ✅ COPY DECOMPRESSED BLOCK
    for (let i = 0; i < VarLongTailUnpacker.BLOCK_SIZE; i++) {
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
    this.remaining = other.remaining;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize unpacker for a compressed adjacency list.
   *
   * **Memory Layout Analysis**:
   * ```
   * [Header: 1 byte per block] [8-byte alignment] [Compressed data]
   * ```
   *
   * **Setup Process**:
   * 1. Calculate header size (number of full blocks)
   * 2. Read header from off-heap memory
   * 3. Calculate data pointer (after aligned header)
   * 4. Initialize state and decompress first block
   *
   * @param ptr Off-heap memory pointer to compressed data
   * @param degree Total number of neighbors to decompress
   */
  reset(ptr: number, degree: number): void {
    // ✅ CALCULATE BLOCK STRUCTURE
    const headerSize = Math.floor(degree / AdjacencyPacking.BLOCK_SIZE);
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
    this.remaining = degree;

    // ✅ DECOMPRESS FIRST BLOCK
    this.decompressBlock();
  }

  // ============================================================================
  // VALUE ACCESS
  // ============================================================================

  /**
   * Get next decompressed value.
   *
   * **Block Management**: Automatically decompresses next block when
   * current block is exhausted.
   *
   * **Performance**: O(1) for values within a block, O(BLOCK_SIZE)
   * when transitioning between blocks.
   *
   * @returns Next neighbor node ID (delta-decoded)
   */
  next(): number {
    if (this.idxInBlock === VarLongTailUnpacker.BLOCK_SIZE) {
      this.decompressBlock();
    }
    return this.block[this.idxInBlock++];
  }

  /**
   * Peek at next value without consuming it.
   *
   * **Look-ahead**: Useful for graph algorithms that need to inspect
   * the next value before deciding whether to consume it.
   */
  peek(): number {
    if (this.idxInBlock === VarLongTailUnpacker.BLOCK_SIZE) {
      this.decompressBlock();
    }
    return this.block[this.idxInBlock];
  }

  /**
   * Advance by multiple steps and return the final value.
   *
   * **Bulk Skip**: Efficient for algorithms that need to skip
   * multiple values. Due to delta encoding, we must decompress
   * all intermediate blocks to maintain the delta chain.
   *
   * **Limitation**: Can't skip blocks entirely because each block's
   * delta decoding depends on the final value from the previous block.
   *
   * @param steps Number of values to skip
   * @returns Value at position current + steps + 1
   */
  advanceBy(steps: number): number {
    // ✅ HANDLE MULTI-BLOCK ADVANCEMENT
    while (this.idxInBlock + steps >= VarLongTailUnpacker.BLOCK_SIZE) {
      steps = this.idxInBlock + steps - VarLongTailUnpacker.BLOCK_SIZE;
      this.decompressBlock();
    }

    // ✅ ADVANCE WITHIN BLOCK
    this.idxInBlock += steps;
    return this.block[this.idxInBlock++];
  }

  // ============================================================================
  // BLOCK DECOMPRESSION ENGINE
  // ============================================================================

  /**
   * Decompress the next block using hybrid strategy.
   *
   * **Hybrid Decompression**:
   * 1. **Full blocks**: Use bit-unpacking with header
   * 2. **Tail block**: Use VarLong decoding
   *
   * **Delta Decoding**: Convert compressed deltas back to original values
   * **State Update**: Advance pointers and maintain delta chain
   */
  private decompressBlock(): void {
    if (this.blockId < this.headerLength) {
      // ✅ BIT-UNPACK FULL BLOCK
      const blockHeader = this.header.buffer[this.blockId];
      this.targetPtr = AdjacencyUnpacking.unpack(
        blockHeader,           // Bits per value for this block
        this.block,           // Output buffer
        0,                    // Start index in buffer
        this.targetPtr        // Current position in compressed data
      );

      // ✅ DELTA DECODE: Convert deltas back to original values
      this.lastValue = AdjacencyCompression.deltaDecode(
        this.block,
        AdjacencyPacking.BLOCK_SIZE,
        this.lastValue
      );

      this.blockId++;
    } else {
      // ✅ VARLONG DECODE TAIL BLOCK
      VarLongDecoding.unsafeDecodeDeltaVLongs(
        this.remaining,       // Number of values in tail
        this.lastValue,       // Starting value for delta chain
        this.targetPtr,       // Position in compressed data
        this.block,           // Output buffer
        0                     // Start index in output buffer
      );

      // ✅ NO MORE DATA: Tail block is final
      this.targetPtr = 0;
    }

    // ✅ UPDATE STATE
    this.remaining -= VarLongTailUnpacker.BLOCK_SIZE;
    this.idxInBlock = 0;
  }
}
