import { HugeLongArray } from "@/collections";
import { HugeIntArray } from "@/collections";

/**
 * # PageOrdering - Metadata for Cache Optimization
 *
 * ## Overview
 *
 * **PageOrdering** contains the computed page organization data for memory layout
 * optimization. This interface captures the transformation mapping between the original
 * fragmented page layout and the optimized sequential layout.
 *
 * ## Data Structure Components
 *
 * ### **distinctOrdering**
 * Records the **first occurrence order** of pages in the offset sequence.
 * Only unique pages are recorded in the order they first appear.
 *
 * ### **reverseOrdering**
 * Maps the **access sequence** to new page indices after reordering.
 * Can be larger than total pages since pages may be accessed multiple times.
 *
 * ### **pageOffsets**
 * Defines **range boundaries** within offsets where each page starts/ends.
 * Enables batch processing during offset rewriting.
 *
 * ### **length**
 * Actual length of reverseOrdering array (may be over-allocated).
 *
 * @example
 * ```typescript
 * // Example page ordering for cache optimization
 * const ordering: PageOrdering = {
 *   distinctOrdering: [2, 0, 3, 1],  // Pages first seen in this order
 *   reverseOrdering: [0, 1, 0, 2],   // Index mapping for rewriting
 *   pageOffsets: [0, 3, 6, 8],       // Range boundaries
 *   length: 4                        // Actual length
 * };
 * ```
 */
export interface PageOrdering {
  /**
   * **Order of unique pages for sequential access optimization.**
   *
   * Represents the order in which pages occur according to the offsets. Only
   * the first occurrence of a page is being recorded.
   *
   * ### Usage in Physical Reordering:
   * ```typescript
   * // Original pages: [pageR, pageG, pageB, pageS]
   * // distinctOrdering: [2, 0, 3, 1]
   * // Result: pages become [pageB, pageR, pageS, pageG] - cache optimized!
   * ```
   *
   * @complexity O(number_of_pages) space
   */
  readonly distinctOrdering: number[];

  /**
   * **Index mapping for offset rewriting during optimization.**
   *
   * Represents the order of the indexes at which pages occur according to the offsets.
   * Since a page can occur multiple times within a consecutive range of offsets,
   * the index of its first occurrence can be added multiple times.
   *
   * The size of this array can be larger than the total number of pages.
   *
   * ### Offset Rewriting Process:
   * ```typescript
   * // For each offset range that accessed old page P:
   * // 1. Look up reverseOrdering[P] = new_page_index
   * // 2. Rewrite all offsets in that range to point to new_page_index
   * // 3. Preserve within-page indices (cache line optimization)
   * ```
   *
   * @complexity O(total_offset_ranges) space - can exceed page count
   */
  readonly reverseOrdering: number[];

  /**
   * **Offset range boundaries for efficient memory rewriting.**
   *
   * Represents the start and end indexes within the offsets where a page starts or ends.
   * The length of this array is determined by the length of reverseOrdering.
   *
   * ### Batch Processing Optimization:
   * ```typescript
   * // Instead of: for each offset, rewrite individually (slow)
   * // We do: for each page range [start, end), batch rewrite (fast)
   *
   * for (let i = 0; i < pageOffsets.length - 1; i++) {
   *   const startOffset = pageOffsets[i];
   *   const endOffset = pageOffsets[i + 1];
   *   batchRewriteOffsets(startOffset, endOffset, newPageId);
   * }
   * ```
   *
   * @complexity O(number_of_page_ranges + 1) space
   */
  readonly pageOffsets: number[];

  /**
   * **Actual length of reverse ordering array for bounds checking.**
   *
   * The actual array length of reverseOrdering.
   *
   * Since `reverseOrdering` may be **over-allocated** for performance reasons,
   * this field indicates the **actual number of valid elements** to process
   * during offset rewriting operations.
   *
   * ### Memory Management:
   * ```typescript
   * // reverseOrdering.length might be 1000 (allocated size)
   * // length might be 847 (actual valid elements)
   * // Only process first 847 elements to avoid invalid data
   * ```
   *
   * @complexity O(1) space - single integer value
   */
  readonly length: number;

  /**
   * **Test helper: Returns reverse ordering trimmed to actual length.**
   *
   * @returns Copy of reverseOrdering array with exact length
   * @testonly For debugging and validation purposes
   */
  shrinkToFitReverseOrdering?(): number[];

  /**
   * **Test helper: Returns page offsets trimmed to actual length.**
   *
   * @returns Copy of pageOffsets array with exact length
   * @testonly For debugging and validation purposes
   */
  shrinkToFitPageOffsets?(): number[];
}
/**
 * # PageReordering - Cache-Optimized Memory Layout for Large Graphs
 *
 * ## Overview
 *
 * **PageReordering** implements **memory layout optimization** for large-scale graph data
 * structures by reorganizing pages to improve **cache locality** and **sequential access patterns**.
 * This is crucial for processing **million+ node graphs** where memory bandwidth becomes
 * the primary performance bottleneck.
 *
 * ## Algorithm Overview
 *
 * This method aligns the given pages and offsets with the node id space.
 * Pages and offsets are changed in-place in O(nodeCount) time.
 *
 * Reordering happens in three steps:
 *
 * 1. The offsets are scanned to detect the current page ordering
 *    and the start and end indexes of a page within the offsets.
 * 2. The pages are swapped to end up in order.
 * 3. The offsets are rewritten to contain the new page id,
 *    but the same index within the page.
 *
 * Note that only offsets for nodes with degree > 0 are being rewritten.
 * Nodes with degree = 0 will have offset = 0.
 *
 * ### Example for page size = 8
 *
 * **Input:**
 * ```
 * pages    [  r  g  b  s ]
 * offsets  [ 16, 18, 22, 0, 3, 6, 24, 28, 30, 8, 13, 15 ]
 * ```
 *
 * **Lookup:**
 * ```
 * node 0 → offset 16 → page id 2 → index in page 0 → page b
 * node 4 → offset  3 → page id 0 → index in page 3 → page r
 * ```
 *
 * **Output:**
 * ```
 * page ordering     [  2  0  3  1 ]
 * ordered pages     [  b  r  s  g ]
 * rewritten offsets [  0, 2, 6, 8, 11, 14, 16, 20, 22, 24, 29, 31 ]
 * ```
 *
 * **Lookup:**
 * ```
 * node 0 → offset  0 → page id 0 → index in page 0 → page b
 * node 4 → offset 11 → page id 1 → index in page 3 → page r
 * ```
 *
 * @example
 * ```typescript
 * // Social network analysis with cache optimization
 * const socialGraph = {
 *   userPages: new Array(50_000),                    // User data pages
 *   friendshipOffsets: new HugeLongArray(3_000_000), // Adjacency list pointers
 *   friendCounts: new HugeIntArray(3_000_000)        // Node degrees
 * };
 *
 * // Apply cache optimization
 * PageReordering.reorder(
 *   socialGraph.userPages,
 *   socialGraph.friendshipOffsets,
 *   socialGraph.friendCounts
 * );
 *
 * // Community detection now runs 3-4x faster due to cache optimization
 * ```
 */
export class PageReordering {
  private static readonly ZERO_DEGREE_OFFSET = 0;
  private static readonly PAGE_SHIFT = 12; // BumpAllocator.PAGE_SHIFT equivalent

  /**
   * ## Main entry point for cache-aware page reordering optimization.
   *
   * This method aligns the given pages and offsets with the node id space.
   * Pages and offsets are changed in-place in O(nodeCount) time.
   *
   * Reordering happens in three steps:
   *
   * 1. The offsets are scanned to detect the current page ordering
   *    and the start and end indexes of a page within the offsets.
   * 2. The pages are swapped to end up in order.
   * 3. The offsets are rewritten to contain the new page id,
   *    but the same index within the page.
   *
   * Note that only offsets for nodes with degree > 0 are being rewritten.
   * Nodes with degree = 0 will have offset = 0.
   *
   * @param pages **Array of page objects** to be physically reordered
   * @param offsets **Huge array of memory offsets** pointing to graph data
   * @param degrees **Node degree array** for filtering connected nodes
   */
  public static reorder<PAGE>(
    pages: PAGE[],
    offsets: HugeLongArray,
    degrees: HugeIntArray
  ): void {
    const ordering = this.ordering(
      offsets,
      (nodeId) => degrees.get(nodeId) > 0,
      pages.length,
      this.PAGE_SHIFT
    );

    this.reorderPages(pages, ordering.distinctOrdering);
    this.rewriteOffsets(
      offsets,
      ordering,
      (node) => degrees.get(node) > 0,
      this.PAGE_SHIFT
    );
  }

  /**
   * ## Analyzes offset patterns to determine optimal page ordering.
   *
   * Scans the offset array to understand the current page access patterns and
   * computes the optimal sequential ordering that minimizes cache misses.
   *
   * @param offsets **Huge array of memory offsets** to analyze
   * @param nodeFilter **Predicate** to filter nodes (typically degree > 0)
   * @param pageCount **Total number of pages** in the dataset
   * @param pageShift **Page size** as power of 2 (bits to shift)
   * @returns **PageOrdering metadata** for subsequent optimization phases
   */
  static ordering(
    offsets: HugeLongArray,
    nodeFilter: (nodeId: number) => boolean,
    pageCount: number,
    pageShift: number
  ): PageOrdering {
    const cursor = offsets.initCursor(offsets.newCursor());

    const pageOffsetsList: number[] = [];
    const orderingList: number[] = [];
    const distinctOrdering = new Array<number>(pageCount);
    const reverseDistinctOrdering = new Array<number>(pageCount);

    let orderedIdx = 0;
    let prevPageIdx = -1;
    const seenPages = new Array<boolean>(pageCount).fill(false);

    while (cursor.next()) {
      const offsetArray = cursor.array;
      if (!offsetArray) continue; // Skip if array is null

      const limit = cursor.limit;
      const base = cursor.base;

      for (let i = cursor.offset; i < limit; i++) {
        const nodeId = base + i;
        // typically, the nodeFilter would return false for unconnected nodes
        if (!nodeFilter(nodeId)) {
          continue;
        }

        const offset = offsetArray[i];
        const pageIdx = Math.floor(offset / (1 << pageShift)); // offset >>> pageShift

        if (pageIdx !== prevPageIdx) {
          if (!seenPages[pageIdx]) {
            seenPages[pageIdx] = true;
            distinctOrdering[orderedIdx] = pageIdx;
            reverseDistinctOrdering[pageIdx] = orderedIdx;
            orderedIdx = orderedIdx + 1;
          }
          orderingList.push(reverseDistinctOrdering[pageIdx]);
          pageOffsetsList.push(nodeId);
          prevPageIdx = pageIdx;
        }
      }
    }
    pageOffsetsList.push(offsets.size());

    return {
      distinctOrdering,
      reverseOrdering: orderingList,
      length: orderingList.length,
      pageOffsets: pageOffsetsList,
    };
  }
  /**
   * ## Physically reorders pages in memory for optimal access patterns.
   *
   * Performs in-place swapping of page objects to arrange them in the optimal
   * sequential order determined by the access pattern analysis.
   *
   * @param pages **Array of page objects** to be reordered
   * @param ordering **Target ordering** from page pattern analysis
   * @returns **Swap tracking array** for debugging/validation
   */
  static reorderPages<PAGE>(pages: PAGE[], ordering: number[]): number[] {
    const swaps = new Array<number>(pages.length);

    // Initialize swap tracking: negative values indicate unprocessed pages
    for (let i = 0; i < swaps.length; i++) {
      swaps[i] = -i - 1;
    }

    for (let targetIdx = 0; targetIdx < ordering.length; targetIdx++) {
      const sourceIdx = ordering[targetIdx];

      const swapTargetIdx = swaps[targetIdx];
      if (swapTargetIdx >= 0) {
        throw new Error("target page has already been set");
      }

      // If swapSourceIdx >= 0, the page has been swapped already
      // and we need to follow that index until we find a free slot.
      let swapSourceIdx = sourceIdx;
      while (swaps[swapSourceIdx] >= 0) {
        swapSourceIdx = swaps[swapSourceIdx];
      }

      if (swaps[swapSourceIdx] !== -sourceIdx - 1) {
        throw new Error("source page has already been moved");
      }

      if (swapSourceIdx === targetIdx) {
        swaps[targetIdx] = sourceIdx;
      } else {
        // Swap pages
        const tempPage = pages[targetIdx];
        pages[targetIdx] = pages[swapSourceIdx];
        pages[swapSourceIdx] = tempPage;

        swaps[targetIdx] = sourceIdx;
        swaps[swapSourceIdx] = swapTargetIdx;
      }
    }

    return swaps;
  }

  /**
   * ## Rewrites memory offsets to reflect the new optimized page layout.
   *
   * Updates all memory offsets to point to the new page locations after physical
   * reordering, while preserving within-page indices to maintain data integrity.
   *
   * @param offsets **Huge array of memory offsets** to be rewritten
   * @param pageOrdering **Computed page ordering** from detection phase
   * @param nodeFilter **Filter for connected nodes** (degree > 0)
   * @param pageShift **Page size bits** for offset bit manipulation
   */
  static rewriteOffsets(
    offsets: HugeLongArray,
    pageOrdering: PageOrdering,
    nodeFilter: (nodeId: number) => boolean,
    pageShift: number
  ): void {
    // the pageShift number of lower bits are set, the higher bits are empty.
    const pageMask = (1 << pageShift) - 1;
    const pageOffsets = pageOrdering.pageOffsets;
    const cursor = offsets.newCursor();

    const ordering = pageOrdering.reverseOrdering;
    const length = pageOrdering.length;

    for (let i = 0; i < length; i++) {
      // higher bits in pageId part are set to the pageId
      const newPageId = ordering[i] << pageShift;

      const startIdx = pageOffsets[i];
      const endIdx = pageOffsets[i + 1];

      offsets.initCursor(cursor, startIdx, endIdx);
      while (cursor.next()) {
        const array = cursor.array;
        if (!array) continue; // Skip if array is null

        const limit = cursor.limit;
        const baseNodeId = cursor.base;
        for (let j = cursor.offset; j < limit; j++) {
          array[j] = nodeFilter(baseNodeId + j)
            ? (array[j] & pageMask) | newPageId
            : PageReordering.ZERO_DEGREE_OFFSET;
        }
      }
    }
  }

  /**
   * **Prevent instantiation** - this is a static utility class.
   */
  private constructor() {
    throw new Error(
      "PageReordering is a static utility class and cannot be instantiated"
    );
  }
}
