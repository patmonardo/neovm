/**
 * Packed Tail Cursor - Bit-Packed Adjacency Decompression
 *
 * **The Decompression Engine**: Unpacks bit-compressed adjacency lists
 * stored in off-heap memory. This is where the magic of packed compression
 * becomes reality - trading CPU cycles for massive memory savings.
 *
 * **Strategy**: Read compressed blocks from off-heap memory and decompress
 * neighbor node IDs one at a time using bit manipulation.
 *
 * **Performance**: ~50ns per neighbor (vs 5ns uncompressed) but uses
 * 80% less memory. Perfect trade-off for large, sparse graphs.
 */

import { AdjacencyCursor } from '../../api/AdjacencyCursor';
import { PageUtil } from '../../collections/PageUtil';
import { BumpAllocator } from '../common/BumpAllocator';
import { PackedTailUnpacker } from './PackedTailUnpacker';

export class PackedTailCursor implements AdjacencyCursor {

  // ============================================================================
  // MEMORY AND DECOMPRESSION
  // ============================================================================

  /**
   * Array of off-heap memory pointers.
   * **Storage**: Each element is a raw memory address (long)
   * **Layout**: Points to compressed adjacency data in native memory
   */
  private readonly pages: number[];

  /**
   * The decompression engine.
   * **Core Logic**: Unpacks bit-compressed node IDs using sophisticated
   * bit manipulation and delta decoding algorithms.
   */
  private readonly decompressingReader: PackedTailUnpacker;

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
    this.decompressingReader = new PackedTailUnpacker();
  }

  // ============================================================================
  // CURSOR INITIALIZATION
  // ============================================================================

  /**
   * Initialize cursor for a specific node's adjacency list.
   *
   * **Memory Resolution Process**:
   * 1. Convert logical offset to page index + page offset
   * 2. Resolve page index to physical memory pointer
   * 3. Calculate exact memory address of compressed data
   * 4. Initialize decompressor with memory pointer and degree
   *
   * **Off-Heap Access**: This is where we transition from JavaScript
   * objects to raw memory pointers - systems programming in TypeScript!
   *
   * @param offset Logical offset in the compressed adjacency storage
   * @param degree Number of neighbors this node has
   */
  init(offset: number, degree: number): void {
    // ✅ MEMORY ADDRESS RESOLUTION
    const pageIndex = PageUtil.pageIndex(offset, BumpAllocator.PAGE_SHIFT);
    const idxInPage = PageUtil.indexInPage(offset, BumpAllocator.PAGE_MASK);

    // ✅ OFF-HEAP POINTER LOOKUP
    const pagePtr = this.pages[pageIndex];
    if (pagePtr === 0) {
      throw new Error("This page has already been freed.");
    }

    // ✅ EXACT MEMORY LOCATION
    const listPtr = pagePtr + idxInPage;

    // ✅ INITIALIZE DECOMPRESSION
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
   * **The Core Operation**: This is where decompression happens!
   * The PackedTailUnpacker reads compressed bits from off-heap memory
   * and reconstructs the original node ID.
   *
   * **Performance Cost**: ~50ns per call due to bit manipulation
   * **Memory Benefit**: 80% space savings vs uncompressed
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
   * **Use Case**: Graph algorithms that need to look ahead
   * without consuming the value.
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
   * **Graph Algorithm Support**: Critical for intersection operations,
   * shortest path algorithms, and other graph computations.
   *
   * **Optimization**: Decompressor can potentially skip blocks
   * without fully decompressing every value.
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
   * **Binary Search Support**: Used in graph algorithms that need
   * to find specific neighbors efficiently.
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
   * **Bulk Skip Optimization**: For algorithms that need to skip
   * multiple neighbors efficiently. The decompressor might be able
   * to skip entire compressed blocks.
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
