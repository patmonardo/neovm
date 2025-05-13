import { PageCreator } from '../../../collections/haa/PageCreator';
import { ParallelUtil } from '../../../concurrency/ParallelUtil';
import { TerminationFlag } from '../../../termination/TerminationFlag';

/**
 * Creates byte array pages in parallel to improve allocation performance.
 * This is particularly useful when initializing large data structures.
 */
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
   * 
   * @param page The page to fill
   * @param base Base value (unused)
   */
  public fillPage(page: Uint8Array, base: number): void {
    // NO-OP
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
}