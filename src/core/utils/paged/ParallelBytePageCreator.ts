/**
 * High-performance parallel page creator for byte array initialization.
 *
 * Essential for efficient byte-based data structure setup:
 * - Parallel allocation of byte array pages
 * - Fast setup of huge byte buffers and storage
 * - Memory-efficient page creation patterns
 * - Multi-threaded allocation for massive byte datasets
 * - Optimized for cache performance and memory bandwidth
 *
 * Performance characteristics:
 * - Parallel page allocation using configurable concurrency
 * - Zero-fill byte arrays (default values)
 * - Optimized memory allocation patterns
 * - Cache-friendly page-by-page allocation
 * - Minimal synchronization overhead
 *
 * Use Cases:
 * - Byte buffer pools for streaming data
 * - Image and binary data storage
 * - Network packet buffers
 * - File I/O buffer management
 * - Compressed data storage arrays
 * - Binary serialization buffers
 *
 * @module ParallelBytePageCreator
 */

import { PageCreator } from '@/collections';
import { ParallelUtil } from '@/collections';
import { TerminationFlag } from '@/core/termination';

export class ParallelBytePageCreator implements PageCreator.BytePageCreator {
  /**
   * Creates a new parallel page creator with the specified concurrency.
   *
   * @param concurrency Number of concurrent threads to use
   */
  private constructor(private readonly concurrency: number) {}

  /**
   * Factory method to create a new instance.
   *
   * @param concurrency Number of concurrent threads to use
   * @returns A new ParallelBytePageCreator
   *
   * @example
   * ```typescript
   * // Create byte page allocator with 8 workers
   * const creator = ParallelBytePageCreator.of(8);
   *
   * // Allocate pages for huge byte buffer
   * const bufferPages: Uint8Array[] = new Array(1000);
   * creator.fill(bufferPages, 32768, 15); // 32K bytes per page
   * ```
   */
  public static of(concurrency: number): ParallelBytePageCreator {
    return new ParallelBytePageCreator(concurrency);
  }

  /**
   * Fills an array of pages with newly allocated byte arrays.
   * All pages except the last one will have size 2^pageShift.
   * The last page will have the specified lastPageSize.
   *
   * @param pages Array to fill with byte arrays
   * @param lastPageSize Size of the last page
   * @param pageShift Bit shift determining regular page size (2^pageShift)
   *
   * Performance: O(numPages / concurrency) with parallel speedup
   *
   * @example
   * ```typescript
   * // Allocate 1GB of byte storage across pages
   * const creator = ParallelBytePageCreator.of(4);
   * const totalBytes = 1024 * 1024 * 1024; // 1GB
   * const pageShift = 16; // 64KB per page
   * const pageSize = 1 << pageShift;
   * const numPages = Math.ceil(totalBytes / pageSize);
   * const lastPageSize = totalBytes % pageSize || pageSize;
   *
   * const pages: Uint8Array[] = new Array(numPages);
   * creator.fill(pages, lastPageSize, pageShift);
   *
   * console.log(`Allocated ${numPages} pages totaling ${totalBytes} bytes`);
   * ```
   */
  public fill(pages: Uint8Array[], lastPageSize: number, pageShift: number): void {
    const lastPageIndex = pages.length - 1;
    const pageSize = 1 << pageShift;

    // Process all pages except the last one in parallel
    ParallelUtil.parallelStreamConsume(
      this.range(0, lastPageIndex),
      this.concurrency,
      TerminationFlag.RUNNING_TRUE,
      (stream) => stream.forEach(pageIndex => this.createPage(pages, pageIndex, pageSize))
    );

    // Process the last page separately (it might have a different size)
    this.createPage(pages, lastPageIndex, lastPageSize);
  }

  /**
   * Fills a single page with data. This implementation is a no-op.
   * Pages are allocated with default zero values.
   *
   * @param page The page to fill
   * @param base Base value (unused in this implementation)
   */
  public fillPage(page: Uint8Array, base: number): void {
    // NO-OP - pages are allocated with default zero values
  }

  /**
   * Creates a new page and assigns it to the specified index in the pages array.
   *
   * @param pages Array of pages
   * @param pageIndex Index where to store the new page
   * @param pageSize Size of the page to create
   */
  private createPage(pages: Uint8Array[], pageIndex: number, pageSize: number): void {
    const page = new Uint8Array(pageSize);
    pages[pageIndex] = page;
  }

  /**
   * Creates a range of integers from start (inclusive) to end (exclusive).
   * Used for parallel iteration.
   *
   * @param start Start value (inclusive)
   * @param end End value (exclusive)
   * @returns Array of integers in the range
   */
  private range(start: number, end: number): number[] {
    return Array.from({ length: end - start }, (_, i) => i + start);
  }

  /**
   * Estimates memory usage for a given configuration.
   *
   * @param totalBytes Total bytes to allocate
   * @param pageShift Page size shift
   * @returns Memory estimation details
   */
  public static estimateMemory(totalBytes: number, pageShift: number): MemoryEstimate {
    const pageSize = 1 << pageShift;
    const numPages = Math.ceil(totalBytes / pageSize);
    const actualBytes = numPages * pageSize;
    const overhead = actualBytes - totalBytes;
    const overheadPercentage = (overhead / totalBytes) * 100;

    return {
      totalBytes,
      pageSize,
      numPages,
      actualBytes,
      overhead,
      overheadPercentage
    };
  }
}

export interface MemoryEstimate {
  totalBytes: number;
  pageSize: number;
  numPages: number;
  actualBytes: number;
  overhead: number;
  overheadPercentage: number;
}
