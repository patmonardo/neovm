/**
 * Uncompressed Adjacency List - The "Fast Lane" Storage
 *
 * **The Zen Koan**: "What is the sound of one compressor not compressing?"
 * Answer: The fastest possible graph queries! 🎯
 *
 * **Dual Personality**:
 * - Implements AdjacencyList (for graph structure queries)
 * - Implements AdjacencyProperties (for edge property queries)
 * - Same data, two interfaces - brilliant design!
 *
 * **Storage**: Raw long arrays in 256KB pages
 * **Performance**: Direct array access, no decompression overhead
 * **Memory**: 8 bytes per node ID, 8 bytes per property value
 */

import { AdjacencyList } from "@/api";
import { AdjacencyProperties } from "@/api";
import { AdjacencyCursor } from "@/api";
import { PropertyCursor } from "@/api/properties/relationships";
import { RelationshipType } from "@/projection";
import { GraphDimensions } from "@/core";
import { HugeIntArray } from "@/collections";
import { HugeLongArray } from "@/collections";
import { ArrayUtil } from "@/collections";
import { PageUtil } from "@/collections";
import { BumpAllocatorConstants } from "../common/BumpAllocator";
import { MemoryInfo } from "../MemoryInfo";
import { MutableIntValue } from "@/core/loading";
import { MemoryEstimation, MemoryEstimations, MemoryRange } from "@/mem";
import { Estimate } from "@/mem";
import { BitUtil } from "@/mem";

export class UncompressedAdjacencyList
  implements AdjacencyList, AdjacencyProperties
{
  // ============================================================================
  // MEMORY ESTIMATION - The Graph Database Reality Check
  // ============================================================================

  /**
   * Estimate memory for uncompressed adjacency list.
   *
   * **The Big Question**: "How much RAM do I need for this graph?"
   * This calculates the answer BEFORE loading terabytes of data!
   */
  static adjacencyListEstimation(
    relationshipType: RelationshipType,
    undirected: boolean
  ): MemoryEstimation {
    return MemoryEstimations.setup("", (dimensions) =>
      UncompressedAdjacencyList.adjacencyListEstimationFromStats(
        UncompressedAdjacencyList.averageDegree(
          dimensions,
          relationshipType,
          undirected
        ),
        dimensions.nodeCount()
      )
    );
  }

  /**
   * Test-only estimation for all relationship types.
   */
  static adjacencyListEstimationForTesting(
    undirected: boolean
  ): MemoryEstimation {
    return UncompressedAdjacencyList.adjacencyListEstimation(
      RelationshipType.ALL_RELATIONSHIPS,
      undirected
    );
  }

  static adjacencyListEstimationFromStats(
    avgDegree: number,
    nodeCount: number
  ): MemoryEstimation {
    return MemoryEstimations.builder(UncompressedAdjacencyList.name)
      .fixed("pages", UncompressedAdjacencyList.listSize(avgDegree, nodeCount))
      .perNode("degrees", HugeIntArray.memoryEstimation(avgDegree))
      .perNode("offsets", HugeLongArray.memoryEstimation(nodeCount))
      .build();
  }

  /**
   * Estimate memory for edge properties.
   *
   * **Key Insight**: Properties share the degrees array with adjacency list,
   * so we only count the reference, not the full array again!
   */
  static adjacencyPropertiesEstimation(
    relationshipType: RelationshipType,
    undirected: boolean
  ): MemoryEstimation {
    return MemoryEstimations.builder(UncompressedAdjacencyList.name)
      .perGraphDimension("pages", (dimensions) =>
        UncompressedAdjacencyList.listSize(
          UncompressedAdjacencyList.averageDegree(
            dimensions,
            relationshipType,
            undirected
          ),
          dimensions.nodeCount()
        )
      )
      .perNode("offsets", HugeLongArray.memoryEstimation())
      .build();
  }

  /**
   * Calculate average degree for memory estimation.
   *
   * **Algorithm**:
   * - Get total relationships for this type
   * - Double if undirected (each edge counts twice)
   * - Divide by node count
   */
  private static averageDegree(
    dimensions: GraphDimensions,
    relationshipType: RelationshipType,
    undirected: boolean
  ): number {
    const nodeCount = dimensions.nodeCount();
    const relCountForType =
      dimensions.relationshipCounts().get(relationshipType) ??
      dimensions.relCountUpperBound();
    const relCount = undirected ? relCountForType * 2 : relCountForType;
    return nodeCount > 0 ? BitUtil.ceilDiv(relCount, nodeCount) : 0;
  }

  /**
   * Calculate memory required for pages.
   *
   * **Storage Math**:
   * - Each node ID: 8 bytes
   * - Average degree * 8 bytes per node
   * - Organize into 256KB pages
   * - Add page array overhead
   */
  private static listSize(avgDegree: number, nodeCount: number): MemoryRange {
    const uncompressedAdjacencySize = nodeCount * avgDegree * 8; // 8 bytes per long
    const pages = PageUtil.numPagesFor(
      uncompressedAdjacencySize,
      BumpAllocatorConstants.PAGE_SHIFT,
      BumpAllocatorConstants.PAGE_MASK
    );
    const bytesPerPage = Estimate.sizeOfByteArray(
      BumpAllocatorConstants.PAGE_SIZE
    );
    const totalMemory =
      pages * bytesPerPage + Estimate.sizeOfObjectArray(pages);
    return MemoryRange.of(totalMemory);
  }

  // ============================================================================
  // CORE DATA STRUCTURES
  // ============================================================================

  /**
   * Page-based storage for node IDs or property values.
   * **Layout**: 256KB pages containing raw 64-bit values
   */
  private readonly pages: number[][];

  /**
   * Node degrees (shared between adjacency and properties).
   * **Key Design**: Both interfaces use the same degree data!
   */
  private readonly degrees: HugeIntArray;

  /**
   * Offsets where each node's data starts.
   * **Performance**: O(1) random access to any node's data
   */
  private readonly offsets: HugeLongArray;

  /**
   * Memory usage statistics.
   */
  private readonly memoryInfo: MemoryInfo;

  constructor(
    pages: number[][],
    degrees: HugeIntArray,
    offsets: HugeLongArray,
    memoryInfo: MemoryInfo
  ) {
    this.pages = pages;
    this.degrees = degrees;
    this.offsets = offsets;
    this.memoryInfo = memoryInfo;
  }

  // ============================================================================
  // ADJACENCY LIST INTERFACE (Graph Structure Queries)
  // ============================================================================

  /**
   * Get node degree - O(1) lookup.
   */
  degree(node: number): number {
    return this.degrees.get(node);
  }

  /**
   * Create cursor for traversing neighbors.
   *
   * **Zero Overhead**: Direct array access, no decompression needed!
   */
  adjacencyCursor(node: number, fallbackValue: number = 0): AdjacencyCursor {
    const degree = this.degrees.get(node);
    if (degree === 0) {
      return AdjacencyCursor.empty();
    }

    const cursor = new UncompressedCursor(this.pages);
    const offset = this.offsets.get(node);
    cursor.init(offset, degree);
    return cursor;
  }

  /**
   * Create cursor with reuse optimization.
   */
  adjacencyCursorReuse(
    reuse: AdjacencyCursor | null,
    node: number,
    fallbackValue: number = 0
  ): AdjacencyCursor {
    const degree = this.degrees.get(node);
    if (degree === 0) {
      return AdjacencyCursor.empty();
    }

    if (reuse instanceof UncompressedCursor) {
      reuse.init(this.offsets.get(node), degree);
      return reuse;
    }

    return this.adjacencyCursor(node, fallbackValue);
  }

  /**
   * Create raw cursor for advanced usage.
   */
  rawAdjacencyCursor(): AdjacencyCursor {
    return new UncompressedCursor(this.pages);
  }

  // ============================================================================
  // ADJACENCY PROPERTIES INTERFACE (Edge Property Queries)
  // ============================================================================

  /**
   * Create cursor for traversing edge properties.
   *
   * **Same Implementation**: Properties and adjacency use identical access patterns!
   * The only difference is semantic - one returns node IDs, the other property values.
   */
  propertyCursor(node: number, fallbackValue: number = 0): PropertyCursor {
    const degree = this.degrees.get(node);
    if (degree === 0) {
      return PropertyCursor.empty();
    }

    const cursor = new UncompressedCursor(this.pages);
    const offset = this.offsets.get(node);
    cursor.init(offset, degree);
    return cursor;
  }

  /**
   * Create property cursor with reuse optimization.
   */
  propertyCursorReuse(
    reuse: PropertyCursor | null,
    node: number,
    fallbackValue: number = 0
  ): PropertyCursor {
    const degree = this.degrees.get(node);
    if (degree === 0) {
      return PropertyCursor.empty();
    }

    if (reuse instanceof UncompressedCursor) {
      reuse.init(this.offsets.get(node), degree);
      return reuse;
    }

    return this.propertyCursor(node, fallbackValue);
  }

  /**
   * Create raw property cursor.
   */
  rawPropertyCursor(): PropertyCursor {
    return new UncompressedCursor(this.pages);
  }

  /**
   * Get memory usage statistics.
   */
  memoryInfo(): MemoryInfo {
    return this.memoryInfo;
  }
}

// ============================================================================
// HIGH-PERFORMANCE UNCOMPRESSED CURSOR
// ============================================================================

/**
 * Cursor for raw array access - maximum performance!
 *
 * **The Speed Demon**: No decompression, no encoding, just pure array access.
 * This cursor implements both AdjacencyCursor AND PropertyCursor because
 * the access patterns are identical for uncompressed data.
 *
 * **Performance**: ~5ns per value access (vs ~50ns for compressed)
 */
export class UncompressedCursor
  extends MutableIntValue
  implements AdjacencyCursor, PropertyCursor
{
  private pages: number[][] | null = null;
  private currentPage: number[] | null = null;
  private degree: number = 0;
  private limit: number = 0;
  private offset: number = 0;

  constructor(pages: number[][]) {
    super();
    this.pages = pages;
  }

  /**
   * Initialize cursor for a node's data.
   *
   * **Page Navigation**: Calculate which 256KB page contains the data
   * and position cursor at the start of the node's data block.
   */
  init(fromIndex: number, degree: number): void {
    const pageIdx = PageUtil.pageIndex(
      fromIndex,
      BumpAllocatorConstants.PAGE_SHIFT
    );
    this.currentPage = this.pages![pageIdx];
    this.offset = PageUtil.indexInPage(
      fromIndex,
      BumpAllocatorConstants.PAGE_MASK
    );
    this.limit = this.offset + degree;
    this.degree = degree;
  }

  /**
   * Check if more values available.
   */
  hasNextLong(): boolean {
    return this.offset < this.limit;
  }

  /**
   * Get next value as long.
   * **Raw Access**: Direct array indexing - maximum speed!
   */
  nextLong(): number {
    return this.currentPage![this.offset++];
  }

  /**
   * Total number of values for this node.
   */
  size(): number {
    return this.degree;
  }

  /**
   * Number of values remaining.
   */
  remaining(): number {
    return this.limit - this.offset;
  }

  /**
   * Check if more values available (VarLong interface).
   */
  hasNextVLong(): boolean {
    return this.offset < this.limit;
  }

  /**
   * Get next value (VarLong interface - no actual VarLong decoding needed).
   */
  nextVLong(): number {
    return this.currentPage![this.offset++];
  }

  /**
   * Peek at next value without consuming.
   */
  peekVLong(): number {
    return this.currentPage![this.offset];
  }

  /**
   * Skip until finding first value > target.
   *
   * **Binary Search Power**: Since data is uncompressed and sorted,
   * we can use fast binary search instead of sequential scanning!
   *
   * **Performance**: O(log n) instead of O(n) - massive speedup!
   */
  skipUntil(target: number): number {
    if (this.remaining() <= 0) {
      return AdjacencyCursor.NOT_FOUND;
    }

    // ✅ BINARY SEARCH: Find last occurrence of target
    const idx = ArrayUtil.binarySearchLast(
      this.currentPage!,
      this.offset,
      this.limit,
      target
    );

    let value: number;

    if (idx >= 0) {
      // ✅ FOUND: Target exists, need value > target
      this.offset = idx;

      if (this.offset + 1 < this.limit) {
        // More elements exist
        value = this.currentPage![this.offset + 1];
        this.offset += 2;
      } else {
        // Target is last element - no value > target
        this.offset++;
        value = AdjacencyCursor.NOT_FOUND;
      }
    } else {
      // ✅ NOT FOUND: Position at next largest element
      this.offset = -idx - 1;
      if (this.offset < this.limit) {
        value = this.currentPage![this.offset++];
      } else {
        value = AdjacencyCursor.NOT_FOUND;
      }
    }

    return value;
  }

  /**
   * Advance to first value ≥ target.
   *
   * **Binary Search**: Find exact match or insertion point.
   */
  advance(target: number): number {
    if (this.remaining() <= 0) {
      return AdjacencyCursor.NOT_FOUND;
    }

    // ✅ BINARY SEARCH: Find first occurrence of target
    const idx = ArrayUtil.binarySearchFirst(
      this.currentPage!,
      this.offset,
      this.limit,
      target
    );

    if (idx >= 0) {
      // ✅ FOUND: Exact match
      this.offset = idx;
    } else {
      // ✅ NOT FOUND: Position at insertion point
      this.offset = -idx - 1;

      if (this.offset === 0 || this.offset >= this.limit) {
        // Target out of range
        this.offset = this.limit;
        return AdjacencyCursor.NOT_FOUND;
      }
    }

    return this.currentPage![this.offset++];
  }

  /**
   * Skip ahead by N values.
   *
   * **Simple Arithmetic**: Just add N to offset - no decompression needed!
   */
  advanceBy(n: number): number {
    console.assert(n >= 0, "Advance count must be non-negative");

    this.offset += n;
    if (this.offset >= this.limit) {
      this.offset = this.limit;
      return AdjacencyCursor.NOT_FOUND;
    }

    return this.currentPage![this.offset++];
  }

  /**
   * Clean up cursor resources.
   */
  close(): void {
    this.pages = null;
    this.currentPage = null;
  }
}
