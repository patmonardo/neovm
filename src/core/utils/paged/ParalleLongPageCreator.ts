import { PageCreator } from '../../../collections/haa/PageCreator';
import { ParallelUtil } from '../../../concurrency/ParallelUtil';
import { TerminationFlag } from '../../../termination/TerminationFlag';

/**
 * Creates and fills long (64-bit integer) array pages in parallel to improve allocation performance.
 * Includes utilities for generating values based on indices.
 */
export class ParallelLongPageCreator implements PageCreator.LongPageCreator {
  /**
   * Creates a new parallel page creator.
   *
   * @param concurrency Number of concurrent threads to use
   * @param gen Optional function to generate values from indices
   */
  private constructor(
    private readonly concurrency: number,
    private readonly gen?: (index: number) => number
  ) {}

  /**
   * Fills an array of pages with newly allocated BigInt64Array instances.
   * All pages except the last one will have size 2^pageShift.
   * The last page will have the specified lastPageSize.
   *
   * @param pages Array to fill with long arrays
   * @param lastPageSize Size of the last page
   * @param pageShift Bit shift determining regular page size (2^pageShift)
   */
  public fill(pages: BigInt64Array[], lastPageSize: number, pageShift: number): void {
    const lastPageIndex = pages.length - 1;
    const pageSize = 1 << pageShift;

    // Process all pages except the last one in parallel
    ParallelUtil.parallelStreamConsume(
      this.range(0, lastPageIndex),
      this.concurrency,
      TerminationFlag.RUNNING_TRUE,
      (stream) => stream.forEach(pageIndex =>
        this.createAndFillPage(pages, pageIndex, pageSize, pageShift)
      )
    );

    // Process the last page separately (it might have a different size)
    this.createAndFillPage(pages, lastPageIndex, lastPageSize, pageShift);
  }

  /**
   * Fills a single page with data using the generator function.
   *
   * @param page The page to fill
   * @param base Base index value for filling
   */
  public fillPage(page: BigInt64Array, base: number): void {
    if (this.gen) {
      for (let i = 0; i < page.length; i++) {
        page[i] = this.gen(i + base);
      }
    }
  }

  /**
   * Creates a new page, assigns it to the pages array, and fills it with data.
   *
   * @param pages Array of pages
   * @param pageIndex Index where to store the new page
   * @param pageSize Size of the page to create
   * @param pageShift Bit shift for calculating base index
   */
  private createAndFillPage(
    pages: BigInt64Array[],
    pageIndex: number,
    pageSize: number,
    pageShift: number
  ): void {
    const page = new BigInt64Array(pageSize);
    pages[pageIndex] = page;

    const base = pageIndex << pageShift;
    this.fillPage(page, base);
  }

  /**
   * Creates a range of integers from start (inclusive) to end (exclusive).
   *
   * @param start Start value (inclusive)
   * @param end End value (exclusive)
   * @returns Array of integers in the range
   */
  private range(start: number, end: number): number[] {
    return Array.from({ length: end - start }, (_, i) => i + start);
  }

  /**
   * Creates a ParallelLongPageCreator with the specified generator function.
   *
   * @param concurrency Number of concurrent threads to use
   * @param gen Function to generate values from indices
   * @returns A new ParallelLongPageCreator
   */
  public static of(
    concurrency: number,
    gen: (index: number) => number
  ): ParallelLongPageCreator {
    return new ParallelLongPageCreator(concurrency, gen);
  }

  /**
   * Creates a ParallelLongPageCreator that generates identity values (i -> i).
   *
   * @param concurrency Number of concurrent threads to use
   * @returns A new ParallelLongPageCreator
   */
  public static identity(concurrency: number): ParallelLongPageCreator {
    return new ParallelLongPageCreator(concurrency, i => BigInt(i));
  }

  /**
   * Creates a ParallelLongPageCreator that doesn't modify values.
   *
   * @param concurrency Number of concurrent threads to use
   * @returns A new ParallelLongPageCreator
   */
  public static passThrough(concurrency: number): ParallelLongPageCreator {
    return new ParallelLongPageCreator(concurrency);
  }
}
