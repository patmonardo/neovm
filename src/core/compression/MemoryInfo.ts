import {
  ImmutableHistogram,
  EMPTY_HISTOGRAM,
} from "./common/ImmutableHistogram";

/**
 * Memory and compression statistics for adjacency list storage.
 *
 * **The Big Picture**: This is the "flight recorder" for graph compression systems.
 * Every bit, every allocation, every compression decision gets tracked here.
 *
 * **Why This Matters**:
 * Graph compression is a complex optimization problem. You need detailed metrics
 * to understand which strategies work for different graph topologies.
 *
 * **Performance Philosophy**:
 * - Track everything during development
 * - Optimize based on real data patterns
 * - Selectively disable tracking in production
 */

export interface MemoryInfo {
  // ============================================================================
  // BASIC MEMORY ACCOUNTING
  // ============================================================================

  /**
   * The number of pages this adjacency list occupies.
   *
   * **Graph Context**: Large adjacency lists are split across multiple pages
   * for memory management. Page count affects cache locality.
   */
  pages: number;

  /**
   * Number of bytes this adjacency list occupies on heap.
   *
   * **JavaScript Context**: All allocations are "on heap" but we track
   * this for compatibility with systems that have heap/off-heap distinction.
   */
  bytesOnHeap?: number;

  /**
   * Number of bytes this adjacency list occupies off heap.
   *
   * **Future Consideration**: SharedArrayBuffer allocations could be
   * considered "off heap" from a garbage collection perspective.
   */
  bytesOffHeap?: number;

  // ============================================================================
  // ALLOCATION PATTERN TRACKING
  // ============================================================================

  /**
   * Histogram tracking heap allocation sizes during adjacency list construction.
   * Each allocation is the number of bytes allocated for a single adjacency list.
   *
   * **Optimization Insight**: Shows memory fragmentation patterns.
   * Many small allocations = more GC pressure.
   */
  heapAllocations: ImmutableHistogram;

  /**
   * Histogram tracking native allocation sizes during adjacency list construction.
   *
   * **JavaScript Adaptation**: Could track SharedArrayBuffer allocations
   * or WebAssembly memory usage.
   */
  nativeAllocations: ImmutableHistogram;

  /**
   * Histogram tracking page sizes of an adjacency list.
   *
   * **Memory Strategy**: Different page sizes for different node degrees.
   * High-degree nodes might get larger pages for efficiency.
   */
  pageSizes: ImmutableHistogram;

  // ============================================================================
  // COMPRESSION ALGORITHM METRICS
  // ============================================================================

  /**
   * Histogram tracking the number of bits used to encode a block of target IDs.
   *
   * **Compression Core**: This is the heart of integer compression.
   * Lower bits = better compression ratio.
   */
  headerBits: ImmutableHistogram;

  /**
   * Histogram tracking bytes used to store header information for a single adjacency list.
   * This allocation is included in either heapAllocations or nativeAllocations.
   *
   * **Overhead Tracking**: Headers contain metadata for decompression.
   * Large headers reduce compression benefits.
   */
  headerAllocations: ImmutableHistogram;

  /**
   * Tracks the number of blocks in the adjacency list.
   *
   * **Block Strategy**: Large adjacency lists are split into blocks
   * for better compression and random access.
   */
  blockCount?: number;

  // ============================================================================
  // ADVANCED COMPRESSION STATISTICS
  // ============================================================================

  /**
   * Statistical measures of bit usage across blocks.
   * These metrics help evaluate compression algorithm effectiveness.
   */
  stdDevBits?: ImmutableHistogram; // Consistency of compression
  meanBits?: ImmutableHistogram; // Average compression efficiency
  medianBits?: ImmutableHistogram; // Typical compression performance
  maxBits?: ImmutableHistogram; // Worst-case scenarios
  minBits?: ImmutableHistogram; // Best-case scenarios

  /**
   * Block structure analysis.
   */
  blockLengths?: ImmutableHistogram; // How big are compression blocks?
  indexOfMinValue?: ImmutableHistogram; // Where do small values cluster?
  indexOfMaxValue?: ImmutableHistogram; // Where do large values cluster?

  // ============================================================================
  // SPECIALIZED COMPRESSION ALGORITHM METRICS
  // ============================================================================

  /**
   * Head-tail compression analysis.
   *
   * **Algorithm**: First value (head) often needs more bits than subsequent
   * delta-encoded values (tail). This tracks the difference.
   */
  headTailDiffBits?: ImmutableHistogram;

  /**
   * Best-case vs worst-case bit usage within blocks.
   *
   * **Algorithm Tuning**: Large differences suggest outliers that hurt compression.
   * Might need exception handling or block splitting.
   */
  bestMaxDiffBits?: ImmutableHistogram;

  /**
   * PFOR (Patched Frame of Reference) exception tracking.
   *
   * **PFOR Algorithm**: Most values compress well, but outliers need "patches".
   * This tracks how many outliers each block contains.
   */
  pforExceptions?: ImmutableHistogram;
}

/**
 * Empty MemoryInfo for initialization.
 */
export const EMPTY_MEMORY_INFO: MemoryInfo = {
  pages: 0,
  heapAllocations: EMPTY_HISTOGRAM,
  nativeAllocations: EMPTY_HISTOGRAM,
  pageSizes: EMPTY_HISTOGRAM,
  headerBits: EMPTY_HISTOGRAM,
  headerAllocations: EMPTY_HISTOGRAM,
};

/**
 * Utility functions for MemoryInfo manipulation.
 */
export class MemoryInfoUtils {
  /**
   * Returns the total number of bytes occupied by this adjacency list,
   * including both on heap and off heap.
   */
  static bytesTotal(info: MemoryInfo): number | undefined {
    const onHeap = info.bytesOnHeap || 0;
    const offHeap = info.bytesOffHeap || 0;

    if (onHeap === 0 && offHeap === 0) {
      return undefined;
    }

    return onHeap + offHeap;
  }

  /**
   * Merge two MemoryInfo objects, combining all their statistics.
   */
  static merge(left: MemoryInfo, right: MemoryInfo): MemoryInfo {
    return {
      pages: left.pages + right.pages,

      bytesOnHeap: this.addOptional(left.bytesOnHeap, right.bytesOnHeap),
      bytesOffHeap: this.addOptional(left.bytesOffHeap, right.bytesOffHeap),

      heapAllocations: left.heapAllocations.merge(right.heapAllocations),
      nativeAllocations: left.nativeAllocations.merge(right.nativeAllocations),
      pageSizes: left.pageSizes.merge(right.pageSizes),
      headerBits: left.headerBits.merge(right.headerBits),
      headerAllocations: left.headerAllocations.merge(right.headerAllocations),

      blockCount: this.addOptional(left.blockCount, right.blockCount),

      stdDevBits: this.mergeOptionalHistograms(
        left.stdDevBits,
        right.stdDevBits
      ),
      meanBits: this.mergeOptionalHistograms(left.meanBits, right.meanBits),
      medianBits: this.mergeOptionalHistograms(
        left.medianBits,
        right.medianBits
      ),
      blockLengths: this.mergeOptionalHistograms(
        left.blockLengths,
        right.blockLengths
      ),
      maxBits: this.mergeOptionalHistograms(left.maxBits, right.maxBits),
      minBits: this.mergeOptionalHistograms(left.minBits, right.minBits),
      indexOfMinValue: this.mergeOptionalHistograms(
        left.indexOfMinValue,
        right.indexOfMinValue
      ),
      indexOfMaxValue: this.mergeOptionalHistograms(
        left.indexOfMaxValue,
        right.indexOfMaxValue
      ),
      headTailDiffBits: this.mergeOptionalHistograms(
        left.headTailDiffBits,
        right.headTailDiffBits
      ),
      bestMaxDiffBits: this.mergeOptionalHistograms(
        left.bestMaxDiffBits,
        right.bestMaxDiffBits
      ),
      pforExceptions: this.mergeOptionalHistograms(
        left.pforExceptions,
        right.pforExceptions
      ),
    };
  }

  private static addOptional(a?: number, b?: number): number | undefined {
    if (a !== undefined && b !== undefined) {
      return a + b;
    }
    if (a !== undefined) {
      return a;
    }
    if (b !== undefined) {
      return b;
    }
    return undefined; // Both are undefined
  }

  private static mergeOptionalHistograms(
    a?: ImmutableHistogram,
    b?: ImmutableHistogram
  ): ImmutableHistogram | undefined {
    if (a && b) {
      return a.merge(b);
    }
    if (a) {
      return a;
    }
    if (b) {
      return b;
    }
    return undefined; // Both are undefined
  }
  /**
   * Generate a compression efficiency report from MemoryInfo.
   */
  static generateReport(info: MemoryInfo): string {
    const totalBytes = this.bytesTotal(info);
    const avgPageSize = info.pages > 0 ? (totalBytes || 0) / info.pages : 0;

    // ✅ CLEAN FIX: Consistent pattern for all optional histogram access
    const headerBitsMean = info.headerBits.mean();
    const stdDevMean = info.stdDevBits?.mean();
    const pforTotal = info.pforExceptions?.total?.() ?? 0;
    const headerAllocMean = info.headerAllocations.mean();

    return `
Compression Report:
==================
Pages: ${info.pages}
Total Bytes: ${totalBytes ?? "unknown"}
Avg Page Size: ${avgPageSize.toFixed(2)} bytes
Blocks: ${info.blockCount ?? "unknown"}

Bit Usage:
- Header Bits: ${headerBitsMean.toFixed(2)} avg
- Std Dev: ${stdDevMean?.toFixed(2) ?? "unknown"}
- PFOR Exceptions: ${pforTotal}

Memory Distribution:
- Heap: ${info.bytesOnHeap ?? 0} bytes
- Off-Heap: ${info.bytesOffHeap ?? 0} bytes
- Header Overhead: ${headerAllocMean.toFixed(2)} bytes avg
  `;
  }
}
