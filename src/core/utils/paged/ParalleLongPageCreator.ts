/**
 * High-performance parallel page creator for huge array initialization.
 *
 * Essential for efficient bulk setup of billion-scale data structures:
 * - Parallel initialization of huge arrays with custom values
 * - Fast setup of identity mappings (node ID arrays)
 * - Bulk population of computed sequences (fibonacci, primes, etc.)
 * - Efficient memory allocation and initialization patterns
 * - Multi-threaded page creation for massive datasets
 *
 * Performance characteristics:
 * - Parallel page creation using worker pool
 * - Custom value generation functions
 * - Optimized memory allocation patterns
 * - Cache-friendly sequential fills within pages
 * - Minimal synchronization overhead
 *
 * Use Cases:
 * - Node ID arrays for graph structures
 * - Index mappings for data reorganization
 * - Precomputed sequences for mathematical operations
 * - Bulk initialization of sparse data structures
 * - Fast setup of lookup tables and mappings
 *
 * @module ParallelLongPageCreator
 */

import { Concurrency } from '@/concurrency';
import { TerminationFlag } from '@/core/termination';
import { ParallelUtil } from '@/concurrency';

export interface LongPageCreator {
  /**
   * Fills a 2D page array with generated values.
   *
   * @param pages 2D array of pages to fill
   * @param lastPageSize Size of the last (potentially partial) page
   * @param pageShift Power of 2 page size (pageSize = 1 << pageShift)
   */
  fill(pages: number[][], lastPageSize: number, pageShift: number): Promise<void>;

  /**
   * Fills a single page with values starting from base index.
   *
   * @param page Array page to fill
   * @param base Starting index for value generation
   */
  fillPage(page: number[], base: number): void;
}

export class ParallelLongPageCreator implements LongPageCreator {
  private readonly concurrency: Concurrency;
  private readonly generator: ((index: number) => number) | null;

  private constructor(concurrency: Concurrency, generator: ((index: number) => number) | null) {
    this.concurrency = concurrency;
    this.generator = generator;
  }

  /**
   * Fills pages in parallel with generated values.
   * Processes all pages except the last one in parallel, then handles the last page separately.
   *
   * @param pages 2D page array to fill
   * @param lastPageSize Size of the last page
   * @param pageShift Page size shift (pageSize = 1 << pageShift)
   *
   * Performance: O(totalElements / numWorkers) with parallel speedup
   *
   * @example
   * ```typescript
   * // Create identity mapping for 1 billion nodes
   * const pageCreator = ParallelLongPageCreator.identity(new Concurrency(8));
   * const pages: number[][] = new Array(15625); // For 1B elements with 64K pages
   *
   * await pageCreator.fill(pages, 64000, 16); // 2^16 = 64K page size
   *
   * // Now pages[0][0] = 0, pages[0][1] = 1, ..., pages[15624][63999] = 999999999
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
      async (pageIndex: number) => {
        this.createAndFillPage(pages, pageIndex, pageSize, pageShift);
      }
    );

    // Handle the last page (potentially partial) separately
    this.createAndFillPage(pages, lastPageIndex, lastPageSize, pageShift);
  }

  /**
   * Fills a single page with generated values.
   * Uses the configured generator function or leaves page empty if no generator.
   *
   * @param page Page array to fill
   * @param base Base index for this page
   *
   * Generator Use Cases:
   * - Identity mapping: (i) => i
   * - Fibonacci sequence: (i) => fibonacci(i)
   * - Random values: (i) => Math.random() * 1000000
   * - Hash codes: (i) => hash(i)
   * - Sparse mappings: (i) => i * 100 + 42
   */
  public fillPage(page: number[], base: number): void {
    if (this.generator !== null) {
      for (let i = 0; i < page.length; i++) {
        page[i] = this.generator(i + base);
      }
    }
    // If no generator, leave page with default values (zeros)
  }

  /**
   * Creates and fills a single page with computed values.
   * Allocates page array and populates it using the generator function.
   *
   * @param pages Pages array to store the new page
   * @param pageIndex Index where to store the new page
   * @param pageSize Size of the page to create
   * @param pageShift Page size shift for base calculation
   */
  private createAndFillPage(pages: number[][], pageIndex: number, pageSize: number, pageShift: number): void {
    const page = new Array<number>(pageSize);
    pages[pageIndex] = page;

    const base = pageIndex << pageShift; // Efficient multiplication by page size
    this.fillPage(page, base);
  }

  /**
   * Creates a parallel page creator with custom value generator.
   *
   * @param concurrency Parallelism configuration
   * @param generator Function to generate values: (globalIndex) => value
   * @returns New parallel page creator
   *
   * @example
   * ```typescript
   * // Create pages with squared values
   * const squareCreator = ParallelLongPageCreator.of(
   *   new Concurrency(4),
   *   (i) => i * i
   * );
   *
   * // Create pages with hash codes
   * const hashCreator = ParallelLongPageCreator.of(
   *   new Concurrency(8),
   *   (i) => hashFunction(i) % 1000000
   * );
   * ```
   */
  public static of(concurrency: Concurrency, generator: (index: number) => number): ParallelLongPageCreator {
    return new ParallelLongPageCreator(concurrency, generator);
  }

  /**
   * Creates an identity mapping page creator.
   * Each element's value equals its index: array[i] = i.
   *
   * Perfect for node ID arrays and identity transformations.
   *
   * @param concurrency Parallelism configuration
   * @returns Identity page creator
   *
   * @example
   * ```typescript
   * // Create node ID mapping for graph
   * const nodeIds = ParallelLongPageCreator.identity(new Concurrency(8));
   * const pages: number[][] = [];
   *
   * await nodeIds.fill(pages, 65536, 16);
   * // Result: pages[0] = [0, 1, 2, ..., 65535]
   * //         pages[1] = [65536, 65537, ..., 131071]
   * //         etc.
   * ```
   */
  public static identity(concurrency: Concurrency): ParallelLongPageCreator {
    return new ParallelLongPageCreator(concurrency, (i) => i);
  }

  /**
   * Creates a pass-through page creator that doesn't initialize values.
   * Pages are allocated but left with default values (zeros).
   *
   * Useful when you need page structure but will fill values later.
   *
   * @param concurrency Parallelism configuration
   * @returns Pass-through page creator
   *
   * @example
   * ```typescript
   * // Allocate pages without initialization
   * const allocator = ParallelLongPageCreator.passThrough(new Concurrency(4));
   * const pages: number[][] = [];
   *
   * await allocator.fill(pages, 32768, 15);
   * // Result: pages allocated but filled with zeros
   * // Fill with custom logic later...
   * ```
   */
  public static passThrough(concurrency: Concurrency): ParallelLongPageCreator {
    return new ParallelLongPageCreator(concurrency, null);
  }
}
