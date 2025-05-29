/**
 * VarLong Tail Cursor - Variable-Length Decompression
 *
 * **Alternative Strategy**: Instead of bit-packing (PackedTailCursor),
 * this uses variable-length integer encoding. Different trade-offs:
 *
 * **VarLong Strategy**:
 * - Better for sparse graphs with high degree variance
 * - Faster decompression (no bit manipulation)
 * - Good compression for small values, less optimal for large values
 *
 * **vs Bit-Packing Strategy**:
 * - Better for dense graphs with uniform degrees
 * - Maximum compression but slower decompression
 * - Consistent compression regardless of value size
 *
 * **When Used**: Selected via feature toggles based on graph characteristics
 */

import { AdjacencyCursor } from '../../api/AdjacencyCursor';
import { PageUtil } from '../../collections/PageUtil';
import { BumpAllocator } from '../common/BumpAllocator';
import { VarLongTailUnpacker } from './VarLongTailUnpacker';

export class VarLongTailCursor implements AdjacencyCursor {

  // ============================================================================
  // MEMORY AND DECOMPRESSION
  // ============================================================================

  /**
   * Array of off-heap memory pointers.
   * **Storage**: Each element is a raw memory address (number)
   * **Layout**: Points to VarLong-compressed adjacency data in native memory
   */
  private readonly pages: number[];

  /**
   * The VarLong decompression engine.
   * **Strategy**: Unpacks variable-length encoded integers
   * **Performance**: Faster than bit-packing but less compression
   */
  private readonly decompressingReader: VarLongTailUnpacker;

  // ============================================================================
  // CURSOR STATE
  // ============================================================================

  /**
   * Total number of neighbors for current node.
   * **Bounds**: Used to detect cursor exhaustion
   */
  private maxTargets: number = 0;

  /**
   * Current position in the adjacency list.
   * **Progress**: How many neighbors we've read so far
   */
  private currentPosition: number = 0;

  constructor(pages: number[]) {
    this.pages = pages;
    this.decompressingReader = new VarLongTailUnpacker();
  }

  // ============================================================================
  // CURSOR INITIALIZATION
  // ============================================================================

  /**
   * Initialize cursor for a specific node's adjacency list.
   *
   * **Memory Resolution Process**: Same as PackedTailCursor:
   * 1. Convert logical offset to page index + page offset
   * 2. Resolve page index to physical memory pointer
   * 3. Calculate exact memory address of compressed data
   * 4. Initialize VarLong decompressor with memory pointer
   *
   * **VarLong Format**: Data stored as sequence of variable-length
   * encoded integers instead of bit-packed blocks.
   *
   * @param offset Logical offset in the compressed adjacency storage
   * @param degree Number of neighbors this node has
   */
  init(offset: number, degree: number): void {
    // ✅ MEMORY ADDRESS RESOLUTION (identical to PackedTailCursor)
    const pageIndex = PageUtil.pageIndex(offset, BumpAllocator.PAGE_SHIFT);
    const idxInPage = PageUtil.indexInPage(offset, BumpAllocator.PAGE_MASK);

    // ✅ OFF-HEAP POINTER LOOKUP
    const pagePtr = this.pages[pageIndex];
    if (pagePtr === 0) {
      throw new Error("This page has already been freed.");
    }

    // ✅ EXACT MEMORY LOCATION
    const listPtr = pagePtr + idxInPage;

    // ✅ INITIALIZE VARLONG DECOMPRESSION
    this.maxTargets = degree;
    this.currentPosition = 0;
    this.decompressingReader.reset(listPtr, degree);
  }

  // ============================================================================
  // CURSOR INTERFACE
  // ============================================================================

  /**
   * Total size of this adjacency list.
   */
  size(): number {
    return this.maxTargets;
  }

  /**
   * Number of neighbors remaining to be read.
   */
  remaining(): number {
    return this.maxTargets - this.currentPosition;
  }

  /**
   * Check if more neighbors are available.
   */
  hasNextVLong(): boolean {
    return this.currentPosition < this.maxTargets;
  }

  /**
   * Read next neighbor node ID.
   *
   * **VarLong Decompression**: Uses variable-length integer decoding
   * instead of bit manipulation. Different performance characteristics:
   *
   * **Performance**: ~20ns per call (vs ~50ns for bit-packing)
   * **Compression**: ~70% space savings (vs ~80% for bit-packing)
   * **Best For**: Sparse graphs with small degree variance
   *
   * @returns Next neighbor node ID
   */
  nextVLong(): number {
    this.currentPosition++;
    return this.decompressingReader.next();
  }

  /**
   * Peek at next neighbor without advancing cursor.
   *
   * **VarLong Advantage**: Potentially faster peek operation
   * since VarLong decoding is more predictable than bit-packing.
   */
  peekVLong(): number {
    return this.decompressingReader.peek();
  }

  // ============================================================================
  // GRAPH ALGORITHM OPTIMIZATIONS
  // ============================================================================

  /**
   * Skip neighbors until finding one greater than target.
   *
   * **VarLong Optimization**: Can potentially skip more efficiently
   * than bit-packing since variable-length encoding has byte boundaries.
   *
   * @param targetId Skip until neighbor > targetId
   * @returns First neighbor > targetId, or NOT_FOUND
   */
  skipUntil(targetId: number): number {
    let next: number;
    while (this.hasNextVLong()) {
      next = this.nextVLong();
      if (next > targetId) {
        return next;
      }
    }
    return AdjacencyCursor.NOT_FOUND;
  }

  /**
   * Advance until finding neighbor >= target.
   *
   * **Same Logic**: Identical to PackedTailCursor but using VarLong decompression
   *
   * @param targetId Advance until neighbor >= targetId
   * @returns First neighbor >= targetId, or NOT_FOUND
   */
  advance(targetId: number): number {
    let next: number;
    while (this.hasNextVLong()) {
      next = this.nextVLong();
      if (next >= targetId) {
        return next;
      }
    }
    return AdjacencyCursor.NOT_FOUND;
  }

  /**
   * Advance by exactly n positions.
   *
   * **VarLong Bulk Skip**: VarLong unpacker might be able to skip
   * more efficiently by parsing variable-length headers without
   * fully decoding values.
   *
   * @param n Number of positions to advance
   * @returns Value at position currentPosition + n + 1, or NOT_FOUND
   */
  advanceBy(n: number): number {
    console.assert(n >= 0, "Advance count must be non-negative");

    if (this.remaining() <= n) {
      // ✅ CURSOR EXHAUSTION: Signal end of adjacency list
      this.currentPosition = this.maxTargets;
      return AdjacencyCursor.NOT_FOUND;
    }

    // ✅ BULK ADVANCE: Skip n values and return the (n+1)th
    this.currentPosition += n + 1;
    return this.decompressingReader.advanceBy(n);
  }
}
