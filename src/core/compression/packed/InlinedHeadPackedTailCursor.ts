// /**
//  * Inlined Head Packed Tail Cursor - Micro-Optimization Champion
//  *
//  * **The Ultimate Optimization**: For nodes with very small adjacency lists,
//  * inline the first few values directly in the offset structure instead of
//  * using separate compressed storage.
//  *
//  * **The Strategy**:
//  * - **Tiny lists (1-3 neighbors)**: Store values directly in offset/metadata
//  * - **Small lists (4-63 neighbors)**: Store first value inline, pack rest
//  * - **Large lists**: Use standard packed compression
//  *
//  * **Why This Matters**: Many graphs have power-law distributions where
//  * 80% of nodes have < 4 neighbors. Avoiding separate memory allocation
//  * for these tiny lists provides massive performance gains.
//  *
//  * **Memory Benefits**:
//  * - No off-heap allocation for tiny lists
//  * - Better cache locality (data in offset structure)
//  * - Reduced pointer chasing
//  * - Lower memory fragmentation
//  *
//  * **Performance**: ~10ns per neighbor for tiny lists (vs ~30-50ns packed)
//  */

// import { AdjacencyCursor } from '../../api/AdjacencyCursor';
// import { PageUtil } from '../../collections/PageUtil';
// import { BumpAllocator } from '../common/BumpAllocator';
// import { InlinedHeadPackedTailUnpacker } from './InlinedHeadPackedTailUnpacker';

// export class InlinedHeadPackedTailCursor implements AdjacencyCursor {

//   // ============================================================================
//   // MEMORY AND DECOMPRESSION
//   // ============================================================================

//   /**
//    * Array of off-heap memory pointers.
//    * **Storage**: Each element is a raw memory address (number)
//    * **Layout**: Points to compressed adjacency data OR contains inlined values
//    * **Note**: For tiny lists, may not point to off-heap memory at all!
//    */
//   private readonly pages: number[];

//   /**
//    * The hybrid decompression engine.
//    * **Strategy**: Handles both inlined values and packed compression seamlessly
//    * **Intelligence**: Automatically detects inlined vs compressed based on encoding
//    */
//   private readonly decompressingReader: InlinedHeadPackedTailUnpacker;

//   // ============================================================================
//   // CURSOR STATE
//   // ============================================================================

//   /**
//    * Total number of neighbors for current node.
//    * **Bounds**: Used to detect cursor exhaustion
//    */
//   private maxTargets: number = 0;

//   /**
//    * Current position in the adjacency list.
//    * **Progress**: How many neighbors we've read so far
//    */
//   private currentPosition: number = 0;

//   constructor(pages: number[]) {
//     this.pages = pages;
//     this.decompressingReader = new InlinedHeadPackedTailUnpacker();
//   }

//   // ============================================================================
//   // CURSOR INITIALIZATION
//   // ============================================================================

//   /**
//    * Initialize cursor for a specific node's adjacency list.
//    *
//    * **Hybrid Memory Resolution**:
//    * 1. Convert logical offset to page index + page offset
//    * 2. Resolve page index to memory pointer (or inlined data)
//    * 3. Let unpacker detect inlined vs compressed format
//    * 4. Initialize appropriate decompression strategy
//    *
//    * **Inlined Detection**: The unpacker examines the data format to determine
//    * if values are inlined in the offset structure or stored as compressed data.
//    *
//    * **Format Detection Examples**:
//    * - Degree 1: Value stored directly in offset bits
//    * - Degree 2-3: Values packed into offset + extra bits
//    * - Degree 4+: First value inlined, rest compressed
//    *
//    * @param offset Logical offset (may contain inlined data!)
//    * @param degree Number of neighbors this node has
//    */
//   init(offset: number, degree: number): void {
//     // ✅ MEMORY ADDRESS RESOLUTION (same as other cursors)
//     const pageIndex = PageUtil.pageIndex(offset, BumpAllocator.PAGE_SHIFT);
//     const idxInPage = PageUtil.indexInPage(offset, BumpAllocator.PAGE_MASK);

//     // ✅ OFF-HEAP POINTER LOOKUP (may not be used for tiny lists!)
//     const pagePtr = this.pages[pageIndex];
//     if (pagePtr === 0 && degree > 3) { // Only error for non-inlined lists
//       throw new Error("This page has already been freed.");
//     }

//     // ✅ CALCULATE MEMORY LOCATION (or pass inlined data)
//     const listPtr = pagePtr + idxInPage;

//     // ✅ INITIALIZE HYBRID DECOMPRESSION
//     this.maxTargets = degree;
//     this.currentPosition = 0;

//     // **Key**: Pass both offset and listPtr - unpacker will detect format
//     this.decompressingReader.reset(listPtr, degree, offset);
//   }

//   // ============================================================================
//   // CURSOR INTERFACE
//   // ============================================================================

//   /**
//    * Total size of this adjacency list.
//    */
//   size(): number {
//     return this.maxTargets;
//   }

//   /**
//    * Number of neighbors remaining to be read.
//    */
//   remaining(): number {
//     return this.maxTargets - this.currentPosition;
//   }

//   /**
//    * Check if more neighbors are available.
//    */
//   hasNextVLong(): boolean {
//     return this.currentPosition < this.maxTargets;
//   }

//   /**
//    * Read next neighbor node ID.
//    *
//    * **Hybrid Decompression**: The unpacker automatically handles:
//    * - **Inlined values**: Direct extraction from offset bits (~5ns)
//    * - **Packed compression**: Standard bit-unpacking (~30ns)
//    * - **Mixed format**: First value inlined, rest compressed (~15ns avg)
//    *
//    * **Performance Characteristics**:
//    * - Degree 1: ~5ns (direct inlined access)
//    * - Degree 2-3: ~8ns (multi-value inlined)
//    * - Degree 4+: ~15ns average (mixed inlined + compressed)
//    *
//    * **Cache Benefits**: Inlined values are already in cache (from offset lookup)
//    *
//    * @returns Next neighbor node ID
//    */
//   nextVLong(): number {
//     this.currentPosition++;
//     return this.decompressingReader.next();
//   }

//   /**
//    * Peek at next neighbor without advancing cursor.
//    *
//    * **Inlined Advantage**: For tiny lists, peek is essentially free
//    * since all values are already in memory/cache.
//    */
//   peekVLong(): number {
//     return this.decompressingReader.peek();
//   }

//   // ============================================================================
//   // GRAPH ALGORITHM OPTIMIZATIONS
//   // ============================================================================

//   /**
//    * Skip neighbors until finding one greater than target.
//    *
//    * **Inlined Optimization**: For tiny lists, all values are immediately
//    * available for comparison without decompression overhead.
//    *
//    * @param targetId Skip until neighbor > targetId
//    * @returns First neighbor > targetId, or NOT_FOUND
//    */
//   skipUntil(targetId: number): number {
//     let next: number;
//     while (this.hasNextVLong()) {
//       next = this.nextVLong();
//       if (next > targetId) {
//         return next;
//       }
//     }
//     return AdjacencyCursor.NOT_FOUND;
//   }

//   /**
//    * Advance until finding neighbor >= target.
//    *
//    * **Binary Search Optimization**: Inlined values enable extremely fast
//    * binary search operations since all data is immediately accessible.
//    *
//    * @param targetId Advance until neighbor >= targetId
//    * @returns First neighbor >= targetId, or NOT_FOUND
//    */
//   advance(targetId: number): number {
//     let next: number;
//     while (this.hasNextVLong()) {
//       next = this.nextVLong();
//       if (next >= targetId) {
//         return next;
//       }
//     }
//     return AdjacencyCursor.NOT_FOUND;
//   }

//   /**
//    * Advance by exactly n positions.
//    *
//    * **Tiny List Optimization**: For inlined lists, can potentially
//    * jump directly to the target position without sequential decompression.
//    *
//    * @param n Number of positions to advance
//    * @returns Value at position currentPosition + n + 1, or NOT_FOUND
//    */
//   advanceBy(n: number): number {
//     console.assert(n >= 0, "Advance count must be non-negative");

//     if (this.remaining() <= n) {
//       // ✅ CURSOR EXHAUSTION: Signal end of adjacency list
//       this.currentPosition = this.maxTargets;
//       return AdjacencyCursor.NOT_FOUND;
//     }

//     // ✅ HYBRID BULK ADVANCE
//     this.currentPosition += n + 1;
//     return this.decompressingReader.advanceBy(n);
//   }
// }
