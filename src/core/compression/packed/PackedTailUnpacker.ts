/**
 * Packed Tail Unpacker - Delta Decompression Engine
 *
 * **The Decompression Process**:
 * 1. Read compressed header (bit widths for each block)
 * 2. Decompress blocks on-demand using AdjacencyUnpacking
 * 3. Apply delta decoding to reconstruct original values
 * 4. Provide streaming access to decompressed data
 *
 * **Performance Strategy**:
 * - Block-by-block decompression (memory efficient)
 * - Delta decoding maintains sorted order
 * - Peek/advance operations for flexible access
 * - Copy semantics for cursor management
 */

import { BitUtil } from '@/mem';
import { ByteArrayBuffer } from '@/api/compression';
import { AdjacencyCompression } from '../common/AdjacencyCompression';
import { AdjacencyPacking } from './AdjacencyPacking';
import { AdjacencyUnpacking } from './AdjacencyUnpacking';
import { AdjacencyPackerUtil } from './AdjacencyPackerUtil';

import { UnsafeUtil } from '../../../internal/unsafe/UnsafeUtil';

export class PackedTailUnpacker {

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  private static readonly BLOCK_SIZE = AdjacencyPacking.BLOCK_SIZE;

  // ============================================================================
  // COMPRESSED DATA STATE
  // ============================================================================

  /**
   * Header containing bit width for each block
   */
  private readonly header: ByteArrayBuffer;

  /**
   * Current pointer in compressed data
   */
  private targetPtr: number = 0;

  /**
   * Length of the header in bytes
   */
  private headerLength: number = 0;

  // ============================================================================
  // DECOMPRESSION STATE
  // ============================================================================

  /**
   * Current decompressed block (64 values)
   */
  private readonly block: number[];

  /**
   * Current index within the decompressed block
   */
  private idxInBlock: number = 0;

  /**
   * Current block ID being processed
   */
  private blockId: number = 0;

  /**
   * Last delta-decoded value (for delta encoding)
   */
  private lastValue: number = 0;

  /**
   * Remaining values to decompress
   */
  private remaining: number = 0;

  // ============================================================================
  // CONSTRUCTION
  // ============================================================================

  constructor() {
    this.block = new Array(PackedTailUnpacker.BLOCK_SIZE);
    this.header = new ByteArrayBuffer();
  }

  // ============================================================================
  // CURSOR MANAGEMENT
  // ============================================================================

  /**
   * Copy state from another unpacker (for cursor cloning).
   *
   * **Use Case**: Creating multiple cursors from the same compressed data
   * **Performance**: Avoids re-reading and re-decompressing shared state
   */
  copyFrom(other: PackedTailUnpacker): void {
    // Copy decompressed block
    for (let i = 0; i < PackedTailUnpacker.BLOCK_SIZE; i++) {
      this.block[i] = other.block[i];
    }

    // Copy header buffer
    this.header.ensureCapacity(other.headerLength);
    const otherBuffer = other.header.buffer;
    const thisBuffer = this.header.buffer;
    for (let i = 0; i < other.headerLength; i++) {
      thisBuffer[i] = otherBuffer[i];
    }

    // Copy state
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
   * Reset and initialize for new compressed data.
   *
   * **Initialization Process**:
   * 1. Calculate header size based on degree
   * 2. Read header containing bit widths
   * 3. Set up pointers and state
   * 4. Decompress first block
   *
   * @param ptr Pointer to start of compressed data
   * @param degree Total number of values to decompress
   */
  reset(ptr: number, degree: number): void {
    // Calculate header size: 1 byte per block
    const headerSize = BitUtil.ceilDiv(degree, AdjacencyPacking.BLOCK_SIZE);
    const alignedHeaderSize = BitUtil.align(headerSize, 8); // Long.BYTES = 8

    // Read header bytes containing bit widths
    this.headerLength = headerSize;
    this.header.ensureCapacity(headerSize);
    UnsafeUtil.copyMemory(
      ptr,                                           // source ptr
      this.header.buffer,                           // dest array
      AdjacencyPackerUtil.BYTE_ARRAY_BASE_OFFSET,   // dest offset
      headerSize                                    // length
    );

    // Set up decompression state
    this.targetPtr = ptr + alignedHeaderSize;
    this.idxInBlock = 0;
    this.blockId = 0;
    this.lastValue = 0;
    this.remaining = degree;

    // Decompress the first block
    this.decompressBlock();
  }

  // ============================================================================
  // ACCESS OPERATIONS
  // ============================================================================

  /**
   * Get the next decompressed value.
   *
   * **Streaming Access**: Advances the cursor position
   * **Block Management**: Automatically decompresses next block when needed
   *
   * @returns Next decompressed value
   */
  next(): number {
    if (this.idxInBlock === PackedTailUnpacker.BLOCK_SIZE) {
      this.decompressBlock();
    }
    return this.block[this.idxInBlock++];
  }

  /**
   * Peek at the next value without advancing cursor.
   *
   * **Non-Destructive**: Does not change cursor position
   * **Block Management**: Decompresses next block if needed
   *
   * @returns Next value that would be returned by next()
   */
  peek(): number {
    if (this.idxInBlock === PackedTailUnpacker.BLOCK_SIZE) {
      this.decompressBlock();
    }
    return this.block[this.idxInBlock];
  }

  /**
   * Advance cursor by multiple steps and return the final value.
   *
   * **Challenge**: Due to delta encoding, we can't skip blocks because
   * each block depends on the previous block's final value.
   *
   * **Strategy**: Decompress intermediate blocks but don't expose values
   *
   * @param steps Number of positions to advance
   * @returns Value at the final position
   */
  advanceBy(steps: number): number {
    // Due to delta encoded target ids, we can't yet skip blocks
    // as we need to decompress all the previous blocks to get
    // the correct target id.
    while (this.idxInBlock + steps >= PackedTailUnpacker.BLOCK_SIZE) {
      steps = this.idxInBlock + steps - PackedTailUnpacker.BLOCK_SIZE;
      this.decompressBlock();
    }
    this.idxInBlock += steps;
    return this.block[this.idxInBlock++];
  }

  // ============================================================================
  // BLOCK DECOMPRESSION
  // ============================================================================

  /**
   * Decompress the next block of data.
   *
   * **The Decompression Process**:
   * 1. Read bit width from header
   * 2. Unpack compressed data using AdjacencyUnpacking
   * 3. Apply delta decoding to reconstruct original values
   * 4. Handle partial blocks (tail blocks)
   *
   * **Delta Decoding**: Maintains sorted order and reconstructs original IDs
   */
  private decompressBlock(): void {
    if (this.blockId < this.headerLength) {
      // Read bit width for this block
      const bits = this.header.buffer[this.blockId];
      let length: number;

      if (this.remaining < PackedTailUnpacker.BLOCK_SIZE) {
        // Last block - may be partial
        this.targetPtr = AdjacencyUnpacking.loopUnpack(
          bits,           // bit width
          this.block,     // output array
          0,              // offset in output
          this.remaining, // number of values
          this.targetPtr  // input pointer
        );
        length = this.remaining;
        this.remaining = 0;
      } else {
        // Full block
        this.targetPtr = AdjacencyUnpacking.unpack(
          bits,           // bit width
          this.block,     // output array
          0,              // offset in output
          this.targetPtr  // input pointer
        );
        this.remaining -= PackedTailUnpacker.BLOCK_SIZE;
        length = PackedTailUnpacker.BLOCK_SIZE;
      }

      // Apply delta decoding to reconstruct original values
      this.lastValue = AdjacencyCompression.deltaDecode(
        this.block,     // array to decode in-place
        length,         // number of values
        this.lastValue  // previous value for delta chain
      );

      this.blockId++;
    }

    // Reset block index for new block
    this.idxInBlock = 0;
  }
}
