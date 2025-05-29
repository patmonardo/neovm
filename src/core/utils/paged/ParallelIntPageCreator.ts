/**
 * High-performance parallel page creator for integer array initialization.
 *
 * Streamlined version focused on efficient page allocation:
 * - Parallel allocation of integer array pages
 * - Fast setup of huge integer data structures
 * - Memory-efficient page creation patterns
 * - Multi-threaded allocation for massive datasets
 * - Simple allocation without custom value generation
 *
 * Performance characteristics:
 * - Parallel page allocation using worker pool
 * - Zero-fill integer arrays (default values)
 * - Optimized memory allocation patterns
 * - Cache-friendly page-by-page allocation
 * - Minimal synchronization overhead
 *
 * Use Cases:
 * - Integer array backing for huge data structures
 * - Graph node property arrays (degrees, colors, etc.)
 * - Counter arrays for algorithm state
 * - Index arrays for data organization
 * - Buffer allocation for streaming algorithms
 *
 * @module ParallelIntPageCreator
 */

import { Concurrency } from '@/core/concurrency';
import { TerminationFlag } from '@/termination';
import { ParallelUtil } from '@/core/concurrency';

export interface IntPageCreator {
  /**
   * Fills a 2D page array with allocated integer arrays.
   *
   * @param pages 2D array of pages to allocate
   * @param lastPageSize Size of the last (potentially partial) page
   * @param pageShift Power of 2 page size (pageSize = 1 << pageShift)
   */
  fill(pages: number[][], lastPageSize: number, pageShift: number): Promise<void>;

  /**
   * Fills a single page (no-op for basic allocator).
   *
   * @param page Array page (already allocated)
   * @param base Starting index for this page
   */
  fillPage(page: number[], base: number): void;
}

export class ParallelIntPageCreator implements IntPageCreator {
  private readonly concurrency: Concurrency;

  constructor(concurrency: Concurrency) {
    this.concurrency = concurrency;
  }

  /**
   * Allocates pages in parallel for integer arrays.
   * Creates all pages except the last one in parallel, then handles the last page separately.
   *
   * @param pages 2D page array to allocate
   * @param lastPageSize Size of the last page
   * @param pageShift Page size shift (pageSize = 1 << pageShift)
   *
   * Performance: O(numPages / numWorkers) with parallel speedup
   *
   * @example
   * ```typescript
   * // Allocate pages for 1 billion integers
   * const pageCreator = ParallelIntPageCreator.of(new Concurrency(8));
   * const pages: number[][] = new Array(15625); // For 1B elements with 64K pages
   *
   * await pageCreator.fill(pages, 64000, 16); // 2^16 = 64K page size
   *
   * // Now all pages are allocated with zero-filled integer arrays
   * // pages[0] = [0, 0, 0, ..., 0] (65536 zeros)
   * // pages[1] = [0, 0, 0, ..., 0] (65536 zeros)
   * // ... etc
   * ```
   */
  public async fill(pages: number[][], lastPageSize: number, pageShift: number): Promise<void> {
    const lastPageIndex = pages.length - 1;
    const pageSize = 1 << pageShift;

    // Create array of page indices for parallel processing
    const pageIndices = Array.from({ length: lastPageIndex }, (_, i) => i);

    // Process all pages except the last one in parallel
    await ParallelUtil.parallelStreamConsume(
      pageIndices,
      this.concurrency,
      TerminationFlag.RUNNING_TRUE,
      async (pageIndex) => {
        this.createPage(pages, pageIndex, pageSize);
      }
    );

    // Handle the last page (potentially partial) separately
    this.createPage(pages, lastPageIndex, lastPageSize);
  }

  /**
   * No-op implementation for basic page creator.
   * Pages are already allocated with default zero values.
   *
   * @param page Page array (already allocated)
   * @param base Base index for this page (unused)
   */
  public fillPage(page: number[], base: number): void {
    // NO-OP - pages are allocated with default zero values
  }

  /**
   * Creates a single page with the specified size.
   * Allocates a new integer array and assigns it to the pages array.
   *
   * @param pages Pages array to store the new page
   * @param pageIndex Index where to store the new page
   * @param pageSize Size of the page to create
   */
  private createPage(pages: number[][], pageIndex: number, pageSize: number): void {
    const page = new Array<number>(pageSize).fill(0);
    pages[pageIndex] = page;
  }

  /**
   * Factory method to create a parallel integer page creator.
   *
   * @param concurrency Parallelism configuration
   * @returns New parallel integer page creator
   *
   * @example
   * ```typescript
   * // Create page allocator with 4 workers
   * const creator = ParallelIntPageCreator.of(new Concurrency(4));
   *
   * // Allocate pages for huge integer array
   * const nodeColors: number[][] = new Array(1000);
   * await creator.fill(nodeColors, 32768, 15); // 32K integers per page
   * ```
   */
  public static of(concurrency: Concurrency): ParallelIntPageCreator {
    return new ParallelIntPageCreator(concurrency);
  }
}
