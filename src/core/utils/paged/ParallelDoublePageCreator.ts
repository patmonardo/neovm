/**
 * High-performance parallel page creator for double (Float64) array initialization.
 *
 * Essential for massive floating-point data structure setup:
 * - Parallel initialization of huge double arrays with custom values
 * - Fast setup of graph edge weights and node embeddings
 * - Bulk population of mathematical sequences and computations
 * - Efficient memory allocation for scientific computing
 * - Multi-threaded page creation for billion-scale datasets
 *
 * Performance characteristics:
 * - Parallel page creation using configurable concurrency
 * - Custom value generation functions for complex patterns
 * - Optimized memory allocation and initialization
 * - Cache-friendly sequential fills within pages
 * - Minimal synchronization overhead
 *
 * Use Cases:
 * - Graph edge weight arrays (weighted networks)
 * - Node embedding vectors (machine learning features)
 * - Mathematical sequence generation (analysis, algorithms)
 * - Scientific computation datasets (physics, chemistry)
 * - Financial time series data (trading, analysis)
 * - Signal processing buffers (audio, image)
 *
 * @module ParallelDoublePageCreator
 */

import { Concurrency } from '@/core/concurrency';
import { TerminationFlag } from '@/termination';
import { ParallelUtil } from '@/core/concurrency';

export interface DoublePageCreator {
  /**
   * Fills a 2D page array with generated double values.
   *
   * @param pages 2D array of pages to fill
   * @param lastPageSize Size of the last (potentially partial) page
   * @param pageShift Power of 2 page size (pageSize = 1 << pageShift)
   */
  fill(pages: Float64Array[], lastPageSize: number, pageShift: number): Promise<void>;

  /**
   * Fills a single page with values starting from base index.
   *
   * @param page Array page to fill
   * @param base Starting index for value generation
   */
  fillPage(page: Float64Array, base: number): void;
}

export class ParallelDoublePageCreator implements DoublePageCreator {
  private readonly concurrency: Concurrency;
  private readonly generator: ((index: number) => number) | null;

  private constructor(concurrency: Concurrency, generator: ((index: number) => number) | null) {
    this.concurrency = concurrency;
    this.generator = generator;
  }

  /**
   * Fills pages in parallel with generated double values.
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
   * // Create edge weight arrays for 1 billion edges
   * const weightCreator = ParallelDoublePageCreator.of(
   *   new Concurrency(8),
   *   (i) => Math.random() * 100 // Random weights 0-100
   * );
   * const pages: Float64Array[] = new Array(15625); // For 1B elements with 64K pages
   *
   * await weightCreator.fill(pages, 64000, 16); // 2^16 = 64K page size
   *
   * // Now pages contain random edge weights for massive graph
   * ```
   */
  public async fill(pages: Float64Array[], lastPageSize: number, pageShift: number): Promise<void> {
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
        this.createAndFillPage(pages, pageIndex, pageSize, pageShift);
      }
    );

    // Handle the last page (potentially partial) separately
    this.createAndFillPage(pages, lastPageIndex, lastPageSize, pageShift);
  }

  /**
   * Fills a single page with generated values.
   * Uses the configured generator function or leaves page with zeros if no generator.
   *
   * @param page Page array to fill
   * @param base Base index for this page
   *
   * Generator Use Cases:
   * - Identity mapping: (i) => i
   * - Random weights: (i) => Math.random() * 100
   * - Mathematical functions: (i) => Math.sin(i * 0.001)
   * - Embeddings: (i) => gaussianRandom()
   * - Financial data: (i) => stockPrice(i)
   */
  public fillPage(page: Float64Array, base: number): void {
    if (this.generator !== null) {
      for (let i = 0; i < page.length; i++) {
        page[i] = this.generator(i + base);
      }
    }
    // If no generator, leave page with default values (zeros)
  }

  /**
   * Creates and fills a single page with computed values.
   * Allocates Float64Array page and populates it using the generator function.
   *
   * @param pages Pages array to store the new page
   * @param pageIndex Index where to store the new page
   * @param pageSize Size of the page to create
   * @param pageShift Page size shift for base calculation
   */
  private createAndFillPage(pages: Float64Array[], pageIndex: number, pageSize: number, pageShift: number): void {
    const page = new Float64Array(pageSize);
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
   * // Create pages with sine wave values
   * const sineCreator = ParallelDoublePageCreator.of(
   *   new Concurrency(4),
   *   (i) => Math.sin(i * 2 * Math.PI / 1000)
   * );
   *
   * // Create pages with Gaussian random values
   * const gaussianCreator = ParallelDoublePageCreator.of(
   *   new Concurrency(8),
   *   (i) => gaussianRandom(0, 1) // mean=0, std=1
   * );
   * ```
   */
  public static of(concurrency: Concurrency, generator: (index: number) => number): ParallelDoublePageCreator {
    return new ParallelDoublePageCreator(concurrency, generator);
  }

  /**
   * Creates an identity mapping page creator.
   * Each element's value equals its index: array[i] = i.
   *
   * Perfect for index arrays and coordinate systems.
   *
   * @param concurrency Parallelism configuration
   * @returns Identity page creator
   *
   * @example
   * ```typescript
   * // Create coordinate arrays for spatial data
   * const coordinates = ParallelDoublePageCreator.identity(new Concurrency(8));
   * const pages: Float64Array[] = [];
   *
   * await coordinates.fill(pages, 65536, 16);
   * // Result: pages[0] = [0.0, 1.0, 2.0, ..., 65535.0]
   * //         pages[1] = [65536.0, 65537.0, ..., 131071.0]
   * //         etc.
   * ```
   */
  public static identity(concurrency: Concurrency): ParallelDoublePageCreator {
    return new ParallelDoublePageCreator(concurrency, (i) => i);
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
   * const allocator = ParallelDoublePageCreator.passThrough(new Concurrency(4));
   * const pages: Float64Array[] = [];
   *
   * await allocator.fill(pages, 32768, 15);
   * // Result: pages allocated but filled with zeros
   * // Fill with custom logic later...
   * ```
   */
  public static passThrough(concurrency: Concurrency): ParallelDoublePageCreator {
    return new ParallelDoublePageCreator(concurrency, null);
  }
}
