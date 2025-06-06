// /**
//  * Compressed adjacency list using VarLong encoding.
//  *
//  * **The Full Monty**: This combines ALL our compression techniques:
//  * - Delta encoding (differences between node IDs)
//  * - VarLong encoding (variable-length integers)
//  * - Page-based storage (efficient memory layout)
//  * - Decompressing cursors (on-demand decoding)
//  *
//  * **Compression Ratio**: 80-90% space savings on real graph data!
//  * **Trade-off**: Requires decompression during traversal
//  * **Best For**: Large graphs, storage-constrained environments
//  */

// import { BitUtil } from "@/mem";
// import { Estimate } from "@/mem";
// import { MemoryEstimation, MemoryEstimations, MemoryRange } from "@/mem";
// import { AdjacencyList } from "@/api";
// import { AdjacencyCursor } from "@/api";
// import { RelationshipType } from "@/projection";
// import { HugeIntArray } from "@/collections";
// import { HugeLongArray } from "@/collections";
// import { PageUtil } from "@/collections";
// import { BumpAllocatorConstants } from "@/core/compression";
// import { VarLongEncoding } from "@/core/compression";
// import { MutableIntValue } from "@/core";
// import { MemoryInfo } from "../MemoryInfo";
// import { AdjacencyDecompressingReader } from "./AdjacencyDecompressingReader";

// export class CompressedAdjacencyList implements AdjacencyList {

//   // ============================================================================
//   // MEMORY ESTIMATION - Critical for Graph Database Performance
//   // ============================================================================

//   /**
//    * Estimate memory requirements for a compressed adjacency list.
//    *
//    * **Graph Database Reality**: Memory planning is CRITICAL.
//    * We need to predict memory usage before loading massive graphs.
//    *
//    * **Algorithm**:
//    * 1. Calculate best-case compression (delta=1, perfect clustering)
//    * 2. Calculate worst-case compression (maximum delta values)
//    * 3. Provide range estimate for capacity planning
//    */
//   static adjacencyListEstimation(relationshipType: RelationshipType, undirected: boolean): MemoryEstimation {
//     return MemoryEstimations.setup("", dimensions => {
//       const nodeCount = dimensions.nodeCount();
//       const relCountForType = dimensions
//         .relationshipCounts()
//         .get(relationshipType) ?? dimensions.relCountUpperBound();
//       const relCount = undirected ? relCountForType * 2 : relCountForType;
//       const avgDegree = nodeCount > 0 ? BitUtil.ceilDiv(relCount, nodeCount) : 0;

//       return CompressedAdjacencyList.adjacencyListEstimationFromStats(avgDegree, nodeCount);
//     });
//   }

//   static adjacencyListEstimationFromStats(avgDegree: number, nodeCount: number): MemoryEstimation {
//     // ✅ BEST CASE: Perfect clustering - each node connects to adjacent nodes
//     // Delta encoding becomes [nodeId, +1, +1, +1, ...] = 1 byte per relationship!
//     const deltaBestCase = 1;
//     const bestCaseAdjacencySize = CompressedAdjacencyList.computeAdjacencyByteSize(
//       avgDegree,
//       nodeCount,
//       deltaBestCase
//     );

//     // ❌ WORST CASE: Random connections - deltas are huge
//     // Delta encoding becomes [nodeId, +massive_gap, +massive_gap, ...]
//     const deltaWorstCase = avgDegree > 0 ? BitUtil.ceilDiv(nodeCount, avgDegree) : 0;
//     const worstCaseAdjacencySize = CompressedAdjacencyList.computeAdjacencyByteSize(
//       avgDegree,
//       nodeCount,
//       deltaWorstCase
//     );

//     // ✅ PAGE CALCULATION: How many 256KB pages needed?
//     const minPages = PageUtil.numPagesFor(
//       bestCaseAdjacencySize,
//       BumpAllocatorConstants.PAGE_SHIFT,
//       BumpAllocatorConstants.PAGE_MASK
//     );
//     const maxPages = PageUtil.numPagesFor(
//       worstCaseAdjacencySize,
//       BumpAllocatorConstants.PAGE_SHIFT,
//       BumpAllocatorConstants.PAGE_MASK
//     );

//     // ✅ MEMORY CALCULATION: Include page arrays + metadata
//     const bytesPerPage = Estimate.sizeOfByteArray(BumpAllocatorConstants.PAGE_SIZE);
//     const minMemoryReqs = minPages * bytesPerPage + Estimate.sizeOfObjectArray(minPages);
//     const maxMemoryReqs = maxPages * bytesPerPage + Estimate.sizeOfObjectArray(maxPages);

//     const pagesMemoryRange = MemoryRange.of(minMemoryReqs, maxMemoryReqs);

//     return MemoryEstimations
//       .builder(CompressedAdjacencyList.name)
//       .fixed("pages", pagesMemoryRange)
//       .perNode("degrees", HugeIntArray.memoryEstimation())
//       .perNode("offsets", HugeLongArray.memoryEstimation())
//       .build();
//   }

//   /**
//    * Calculate compressed adjacency storage requirements.
//    *
//    * **Compression Math**:
//    * - First node ID: ~log₂(nodeCount)/2 bytes average
//    * - Subsequent deltas: log₂(avgDelta) bits each
//    * - VarLong overhead: minimal for small deltas
//    *
//    * **Example**: Social network with 1M users, avg 100 friends
//    * - Uncompressed: 100 * 8 bytes = 800 bytes per user
//    * - Compressed: ~150 bytes per user = 81% savings!
//    */
//   static computeAdjacencyByteSize(avgDegree: number, nodeCount: number, delta: number): number {
//     // First adjacency ID size (base value for delta encoding)
//     const firstAdjacencyIdAvgByteSize = avgDegree > 0
//       ? BitUtil.ceilDiv(VarLongEncoding.encodedVLongSize(nodeCount), 2)
//       : 0;

//     // Delta-encoded relationship size
//     const relationshipByteSize = VarLongEncoding.encodedVLongSize(delta);
//     const compressedAdjacencyByteSize = relationshipByteSize * Math.max(0, avgDegree - 1);

//     return (firstAdjacencyIdAvgByteSize + compressedAdjacencyByteSize) * nodeCount;
//   }

//   // ============================================================================
//   // CORE DATA STRUCTURES
//   // ============================================================================

//   /**
//    * Page-based storage for compressed adjacency data.
//    * **Layout**: 256KB pages containing VarLong-encoded adjacency lists
//    */
//   private pages: Uint8Array[];

//   /**
//    * Node degrees after compression and aggregation.
//    * **Key Point**: May differ from original degrees due to parallel edge aggregation
//    */
//   private degrees: HugeIntArray;

//   /**
//    * Byte offsets where each node's compressed data starts.
//    * **Performance**: Enables O(1) random access to any node's neighbors
//    */
//   private offsets: HugeLongArray;

//   /**
//    * Memory usage and compression statistics.
//    */
//   private readonly memoryInfo: MemoryInfo;

//   constructor(
//     pages: Uint8Array[],
//     degrees: HugeIntArray,
//     offsets: HugeLongArray,
//     memoryInfo: MemoryInfo
//   ) {
//     this.pages = pages;
//     this.degrees = degrees;
//     this.offsets = offsets;
//     this.memoryInfo = memoryInfo;
//   }

//   // ============================================================================
//   // ADJACENCY LIST INTERFACE
//   // ============================================================================

//   /**
//    * Get node degree (number of neighbors).
//    * **O(1) Performance**: Direct array lookup, no decompression needed
//    */
//   degree(node: number): number {
//     return this.degrees.get(node);
//   }

//   /**
//    * Create cursor for traversing node's neighbors.
//    *
//    * **Lazy Decompression**: Only decompresses data as you traverse.
//    * This is key to maintaining good performance despite compression overhead.
//    *
//    * @param node Target node ID
//    * @param fallbackValue Default value for missing relationships (unused here)
//    * @returns Cursor for iterating through compressed neighbors
//    */
//   adjacencyCursor(node: number, fallbackValue: number = 0): AdjacencyCursor {
//     const degree = this.degrees.get(node);
//     if (degree === 0) {
//       return AdjacencyCursor.empty();
//     }

//     const cursor = new DecompressingCursor(this.pages);
//     const offset = this.offsets.get(node);
//     cursor.init(offset, degree);
//     return cursor;
//   }

//   /**
//    * Create cursor with reuse optimization.
//    *
//    * **Performance Optimization**: Reusing cursors avoids object allocation
//    * in hot paths like graph traversal algorithms.
//    */
//   adjacencyCursorReuse(reuse: AdjacencyCursor | null, node: number, fallbackValue: number = 0): AdjacencyCursor {
//     const degree = this.degrees.get(node);
//     if (degree === 0) {
//       return AdjacencyCursor.empty();
//     }

//     if (reuse instanceof DecompressingCursor) {
//       reuse.init(this.offsets.get(node), degree);
//       return reuse;
//     }

//     return this.adjacencyCursor(node, fallbackValue);
//   }

//   /**
//    * Create raw cursor for advanced usage.
//    * **Use Case**: Batch processing, custom traversal algorithms
//    */
//   rawAdjacencyCursor(): AdjacencyCursor {
//     return new DecompressingCursor(this.pages);
//   }

//   /**
//    * Get memory usage and compression statistics.
//    */
//   memoryInfo(): MemoryInfo {
//     return this.memoryInfo;
//   }
// }

// // ============================================================================
// // HIGH-PERFORMANCE DECOMPRESSING CURSOR
// // ============================================================================

// /**
//  * Cursor that decompresses adjacency data on-demand.
//  *
//  * **Performance Critical**: This is in the hot path for ALL graph traversals.
//  * Every optimization here directly impacts query performance.
//  *
//  * **Key Features**:
//  * - Lazy decompression (only decode what you need)
//  * - Skip/advance operations (avoid decoding unneeded data)
//  * - Peek operations (look ahead without consuming)
//  * - Batch operations (process multiple values efficiently)
//  */
// export class DecompressingCursor extends MutableIntValue implements AdjacencyCursor {

//   private readonly pages: Uint8Array[];
//   private readonly decompress: AdjacencyDecompressingReader;

//   private maxTargets: number = 0;
//   private currentPosition: number = 0;

//   constructor(pages: Uint8Array[]) {
//     super();
//     this.pages = pages;
//     this.decompress = new AdjacencyDecompressingReader();
//   }

//   /**
//    * Initialize cursor for a specific node's adjacency list.
//    *
//    * **Setup Phase**: Positions the decompression reader at the start
//    * of the compressed data for this node.
//    */
//   init(fromIndex: number, degree: number): void {
//     const pageIndex = PageUtil.pageIndex(fromIndex, BumpAllocatorConstants.PAGE_SHIFT);
//     const indexInPage = PageUtil.indexInPage(fromIndex, BumpAllocatorConstants.PAGE_MASK);

//     this.maxTargets = this.decompress.reset(
//       this.pages[pageIndex],
//       indexInPage,
//       degree
//     );
//     this.currentPosition = 0;
//   }

//   /**
//    * Total number of neighbors for this node.
//    */
//   size(): number {
//     return this.maxTargets;
//   }

//   /**
//    * How many neighbors haven't been processed yet.
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
//    * Get next neighbor node ID.
//    *
//    * **Decompression**: Decodes the next VarLong value and applies
//    * delta decoding to reconstruct the absolute node ID.
//    */
//   nextVLong(): number {
//     const current = this.currentPosition++;
//     const remaining = this.maxTargets - current;
//     return this.decompress.next(remaining);
//   }

//   /**
//    * Peek at next neighbor without consuming it.
//    *
//    * **Use Case**: Lookahead for merge operations, binary search, etc.
//    */
//   peekVLong(): number {
//     const remaining = this.maxTargets - this.currentPosition;
//     return this.decompress.peek(remaining);
//   }

//   /**
//    * Skip neighbors until finding one > target.
//    *
//    * **Graph Algorithm Optimization**: Critical for intersection algorithms,
//    * shortest path, and other graph queries that need to skip ranges.
//    *
//    * **Performance**: Avoids decompressing values we don't need!
//    */
//   skipUntil(target: number): number {
//     const value = this.decompress.skipUntil(target, this.remaining(), this);
//     this.currentPosition += this.value; // MutableIntValue.value
//     return value;
//   }

//   /**
//    * Advance to first neighbor >= target.
//    *
//    * **Binary Search Support**: Essential for efficient graph queries
//    * that need to find specific relationships quickly.
//    */
//   advance(target: number): number {
//     const targetsLeftToBeDecoded = this.remaining();
//     if (targetsLeftToBeDecoded <= 0) {
//       return AdjacencyCursor.NOT_FOUND;
//     }

//     const value = this.decompress.advance(target, targetsLeftToBeDecoded, this);
//     this.currentPosition += this.value;
//     return value;
//   }

//   /**
//    * Skip ahead by N neighbors.
//    *
//    * **Batch Processing**: Skip multiple relationships at once
//    * without decompressing intermediate values.
//    */
//   advanceBy(n: number): number {
//     console.assert(n >= 0, "Advance count must be non-negative");

//     const targetsLeftToBeDecoded = this.remaining();
//     if (targetsLeftToBeDecoded <= n) {
//       // Cursor exhausted
//       this.currentPosition = this.maxTargets;
//       return AdjacencyCursor.NOT_FOUND;
//     }

//     const value = this.decompress.advanceBy(n, targetsLeftToBeDecoded, this);
//     this.currentPosition += this.value;
//     return value;
//   }
// }
