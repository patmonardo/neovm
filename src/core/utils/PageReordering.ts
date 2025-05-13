import { BitSet } from '../../collections/BitSet';
import { HugeIntArray } from '../collections/ha/HugeIntArray';
import { HugeLongArray } from '../collections/ha/HugeLongArray';
import { BumpAllocator } from '../compression/common/BumpAllocator';

/**
 * Interface representing page ordering information.
 */
export interface PageOrdering {
  /**
   * Represents the order in which pages occur according to the offsets.
   * Only the first occurrence of a page is being recorded.
   */
  distinctOrdering(): number[];

  /**
   * Represents the order of the indexes at which pages occur according to the offsets.
   * Since a page can occur multiple times within a consecutive range of offsets,
   * the index of its first occurrence can be added multiple times.
   *
   * The size of this array can be larger than the total number of pages.
   */
  reverseOrdering(): number[];

  /**
   * Represents the start and end indexes within the offsets
   * where a page starts or ends. The length of this array is
   * determined by the length of reverseOrdering + 1.
   */
  pageOffsets(): number[];

  /**
   * The actual array length of reverseOrdering.
   */
  length(): number;

  /**
   * Returns a copy of the reverse ordering array trimmed to the actual length.
   * For testing purposes only.
   */
  shrinkToFitReverseOrdering(): number[];

  /**
   * Returns a copy of the page offsets array trimmed to the actual length + 1.
   * For testing purposes only.
   */
  shrinkToFitPageOffsets(): number[];
}

/**
 * Implementation of PageOrdering interface
 */
class PageOrderingImpl implements PageOrdering {
  private readonly _distinctOrdering: number[];
  private readonly _reverseOrdering: number[];
  private readonly _pageOffsets: number[];
  private readonly _length: number;

  constructor(
    distinctOrdering: number[],
    reverseOrdering: number[],
    pageOffsets: number[],
    length: number
  ) {
    this._distinctOrdering = distinctOrdering;
    this._reverseOrdering = reverseOrdering;
    this._pageOffsets = pageOffsets;
    this._length = length;
  }

  distinctOrdering(): number[] {
    return this._distinctOrdering;
  }

  reverseOrdering(): number[] {
    return this._reverseOrdering;
  }

  pageOffsets(): number[] {
    return this._pageOffsets;
  }

  length(): number {
    return this._length;
  }

  shrinkToFitReverseOrdering(): number[] {
    return this._reverseOrdering.slice(0, this._length);
  }

  shrinkToFitPageOffsets(): number[] {
    return this._pageOffsets.slice(0, this._length + 1);
  }
}

/**
 * Utility class for reordering graph data based on page access patterns.
 */
export class PageReordering {
  private static readonly ZERO_DEGREE_OFFSET = 0n;

  /**
   * This method aligns the given pages and offsets with the node id space.
   * Pages and offsets are changed in-place in O(nodeCount) time.
   *
   * @param pages Array of pages to reorder
   * @param offsets Array of offsets
   * @param degrees Array of node degrees
   */
  public static reorder<PAGE>(
    pages: PAGE[],
    offsets: HugeLongArray,
    degrees: HugeIntArray
  ): void {
    const ordering = this.ordering(
      offsets,
      nodeId => degrees.get(Number(nodeId)) > 0,
      pages.length,
      BumpAllocator.PAGE_SHIFT
    );

    this.reorderPages(pages, ordering.distinctOrdering());
    this.rewriteOffsets(
      offsets,
      ordering,
      node => degrees.get(Number(node)) > 0,
      BumpAllocator.PAGE_SHIFT
    );
  }

  /**
   * Computes the page ordering based on the access pattern in the offsets array.
   *
   * @param offsets Array of offsets
   * @param nodeFilter Predicate to filter nodes
   * @param pageCount Total number of pages
   * @param pageShift Bit shift for page size
   * @returns Page ordering information
   */
  public static ordering(
    offsets: HugeLongArray,
    nodeFilter: (nodeId: number) => boolean,
    pageCount: number,
    pageShift: number
  ): PageOrdering {
    const cursor = offsets.initCursor(offsets.newCursor());

    const pageOffsets: number[] = new Array(pageCount + 1);
    const ordering: number[] = [];
    const distinctOrdering = new Array(pageCount).fill(0);
    const reverseDistinctOrdering = new Array(pageCount).fill(0);

    let orderedIdx = 0;
    let prevPageIdx = -1;
    const seenPages = new BitSet(pageCount);

    while (cursor.next()) {
      const offsetArray = cursor.array;
      const limit = cursor.limit;
      const base = cursor.base;

      for (let i = cursor.offset; i < limit; i++) {
        const nodeId = base + BigInt(i);
        // typically, the nodeFilter would return false for unconnected nodes
        if (!nodeFilter(nodeId)) {
          continue;
        }

        const offset = offsetArray[i];
        const pageIdx = Number(offset >> BigInt(pageShift));

        if (pageIdx !== prevPageIdx) {
          if (!seenPages.getAndSet(pageIdx)) {
            distinctOrdering[orderedIdx] = pageIdx;
            reverseDistinctOrdering[pageIdx] = orderedIdx;
            orderedIdx++;
          }
          ordering.push(reverseDistinctOrdering[pageIdx]);
          pageOffsets[ordering.length - 1] = nodeId;
          prevPageIdx = pageIdx;
        }
      }
    }

    pageOffsets[ordering.length] = offsets.size();

    return new PageOrderingImpl(
      distinctOrdering,
      ordering,
      pageOffsets,
      ordering.length
    );
  }

  /**
   * Reorders the pages array based on the computed ordering.
   *
   * @param pages Array of pages to reorder
   * @param ordering Page ordering
   * @returns Array of swaps performed
   */
  public static reorderPages<PAGE>(pages: PAGE[], ordering: number[]): number[] {
    let tempPage: PAGE;
    const swaps = new Array(pages.length);

    for (let i = 0; i < swaps.length; i++) {
      swaps[i] = -i - 1;
    }

    for (let targetIdx = 0; targetIdx < ordering.length; targetIdx++) {
      const sourceIdx = ordering[targetIdx];

      const swapTargetIdx = swaps[targetIdx];
      console.assert(swapTargetIdx < 0, "target page has already been set");

      // If swapSourceIdx > 0, the page has been swapped already
      // and we need to follow that index until we find a free slot.
      let swapSourceIdx = sourceIdx;

      while (swaps[swapSourceIdx] >= 0) {
        swapSourceIdx = swaps[swapSourceIdx];
      }

      console.assert(
        swaps[swapSourceIdx] === -sourceIdx - 1,
        "source page has already been moved"
      );

      if (swapSourceIdx === targetIdx) {
        swaps[targetIdx] = sourceIdx;
      } else {
        tempPage = pages[targetIdx];
        pages[targetIdx] = pages[swapSourceIdx];
        pages[swapSourceIdx] = tempPage;

        swaps[targetIdx] = sourceIdx;
        swaps[swapSourceIdx] = swapTargetIdx;
      }
    }

    return swaps;
  }

  /**
   * Rewrites the offsets array to match the new page order.
   *
   * @param offsets Array of offsets to rewrite
   * @param pageOrdering Page ordering information
   * @param nodeFilter Predicate to filter nodes
   * @param pageShift Bit shift for page size
   */
  public static rewriteOffsets(
    offsets: HugeLongArray,
    pageOrdering: PageOrdering,
    nodeFilter: (nodeId: number) => boolean,
    pageShift: number
  ): void {
    // the pageShift number of lower bits are set, the higher bits are empty.
    const pageMask = (1n << BigInt(pageShift)) - 1n;
    const pageOffsets = pageOrdering.pageOffsets();

    const cursor = offsets.newCursor();
    try {
      const ordering = pageOrdering.reverseOrdering();
      const length = pageOrdering.length();

      for (let i = 0; i < length; i++) {
        // higher bits in pageId part are set to the pageId
        const newPageId = BigInt(ordering[i]) << BigInt(pageShift);

        const startIdx = Number(pageOffsets[i]);
        const endIdx = Number(pageOffsets[i + 1]);

        offsets.initCursor(cursor, startIdx, endIdx);
        while (cursor.next()) {
          const array = cursor.array;
          const limit = cursor.limit;
          const baseNodeId = cursor.base;

          for (let j = cursor.offset; j < limit; j++) {
            const nodeId = baseNodeId + BigInt(j);
            array[j] = nodeFilter(nodeId)
              ? (array[j] & pageMask) | newPageId
              : this.ZERO_DEGREE_OFFSET;
          }
        }
      }
    } finally {
      cursor.close();
    }
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}
