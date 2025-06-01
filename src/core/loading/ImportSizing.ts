/**
 * IMPORT SIZING - OPTIMAL MEMORY LAYOUT CALCULATOR FOR GRAPH IMPORT
 *
 * This module calculates the optimal page size and thread distribution for
 * importing large graphs into memory-efficient data structures.
 *
 * KEY RESPONSIBILITIES:
 * 🧮 PAGE SIZE CALCULATION: Determines optimal chunk sizes for memory arrays
 * 🧵 THREAD DISTRIBUTION: Balances work across available CPU cores
 * 💾 MEMORY CONSTRAINTS: Respects Java integer limits and memory boundaries
 * 📊 POWER-OF-TWO OPTIMIZATION: Uses powers of 2 for efficient memory access
 *
 * CORE ALGORITHM:
 * 1. Start with ideal page size: nodeCount / (threads * pagesPerThread)
 * 2. Round down to nearest power of 2 (CPU cache optimization)
 * 3. Clamp between MIN_PAGE_SIZE and MAX_PAGE_SIZE (practical limits)
 * 4. Calculate actual number of pages needed
 * 5. If too many pages, double page size and recalculate
 * 6. Validate final configuration doesn't exceed array limits
 *
 * MEMORY LAYOUT STRATEGY:
 * - Uses nested arrays to handle > 2B elements (Java int array limit)
 * - Each "page" is a contiguous array for cache efficiency
 * - Power-of-2 sizes enable bit operations instead of division
 * - Balances memory efficiency vs. CPU cache performance
 *
 * WHY THIS IS COMPLEX:
 * - Java arrays are limited to Integer.MAX_VALUE elements
 * - Large graphs (billions of nodes) require multiple arrays
 * - Memory allocation must be contiguous for performance
 * - Thread distribution affects CPU cache behavior
 */

import { Concurrency } from "@/concurrency";
import { BitUtil } from "@/mem/BitUtil";
import { OptionalInt } from "@/core";
import { GdsFeatureToggles } from "@/utils/GdsFeatureToggles";
import { formatWithLocale } from "@/utils/StringFormatting";

/**
 * Calculates optimal page sizing and thread distribution for graph import operations.
 *
 * DESIGN GOALS:
 * - Maximize CPU cache efficiency with power-of-2 page sizes
 * - Balance memory usage vs. allocation overhead
 * - Distribute work evenly across available threads
 * - Handle graphs larger than Java's array size limits
 * - Provide predictable memory allocation patterns
 */
export class ImportSizing {
  // =============================================================================
  // CONSTANTS - MEMORY AND THREADING LIMITS
  // =============================================================================

  /**
   * Java Integer.MAX_VALUE = 2^31 - 1 = 2,147,483,647
   * This is the maximum size of any single Java array.
   */
  private static readonly JAVA_INTEGER_MAX_VALUE = 2147483647;

  /**
   * Maximum page size = largest power of 2 less than Integer.MAX_VALUE
   * = 2^30 = 1,073,741,824 elements
   *
   * WHY POWER OF 2:
   * - Enables bit operations instead of division (pageIndex = offset >> pageBits)
   * - Aligns with CPU cache line boundaries
   * - Optimizes memory access patterns
   */
  private static readonly MAX_PAGE_SIZE = BitUtil.previousPowerOfTwo(
    ImportSizing.JAVA_INTEGER_MAX_VALUE
  );

  /**
   * Minimum page size = 1,024 elements
   *
   * WHY 1024:
   * - Balances allocation overhead vs. memory usage
   * - Provides reasonable granularity for thread distribution
   * - Avoids excessive array allocation for small graphs
   */
  public static readonly MIN_PAGE_SIZE = 1024;

  /**
   * Error message for impossible memory layouts.
   * Thrown when a graph is so large it would require more arrays than can be addressed.
   */
  private static readonly TOO_MANY_PAGES_REQUIRED =
    "Importing %s nodes would need %s arrays of %s-long nested arrays each, which cannot be created.";

  // =============================================================================
  // IMMUTABLE STATE - COMPUTED SIZING PARAMETERS
  // =============================================================================

  /** Total number of threads that will participate in import */
  public readonly totalThreads: number;

  /** Total number of memory pages needed to store all data */
  public readonly numberOfPages: number;

  /**
   * Size of each memory page in elements.
   * Empty if this sizing is for thread-only calculation (no specific node count).
   */
  public readonly pageSize: OptionalInt;

  /**
   * Private constructor - use static factory methods.
   * Ensures all sizing calculations go through validation logic.
   */
  private constructor(
    totalThreads: number,
    numberOfPages: number,
    pageSize: OptionalInt
  ) {
    this.totalThreads = totalThreads;
    this.numberOfPages = numberOfPages;
    this.pageSize = pageSize;
  }

  // =============================================================================
  // FACTORY METHODS - ENTRY POINTS FOR SIZING CALCULATIONS
  // =============================================================================

  /**
   * Calculate optimal sizing for importing a specific number of nodes.
   *
   * ALGORITHM OVERVIEW:
   * 1. Start with target: nodeCount / (threads * pagesPerThread)
   * 2. Round to power of 2 for cache efficiency
   * 3. Clamp to reasonable bounds
   * 4. Calculate actual pages needed
   * 5. Adjust if page count exceeds limits
   *
   * @param concurrency Available CPU concurrency
   * @param nodeCount Total number of nodes to import
   * @returns Optimal sizing configuration
   */
  public static of(concurrency: Concurrency, nodeCount: number): ImportSizing {
    return ImportSizing.determineBestThreadSize(nodeCount, concurrency.value());
  }

  /**
   * Calculate optimal sizing for concurrency without specific node count.
   * Used when you know thread count but not data size yet.
   *
   * USES CASE:
   * - Pre-allocating thread pools
   * - Estimating resource requirements
   * - Configuration validation
   *
   * @param concurrency Available CPU concurrency
   * @returns Thread-optimized sizing (no specific page size)
   */
  public static ofThreads(concurrency: Concurrency): ImportSizing {
    return ImportSizing.determineBestThreadSizeForConcurrency(
      concurrency.value()
    );
  }

  // =============================================================================
  // CORE ALGORITHM - PAGE SIZE AND THREAD OPTIMIZATION
  // =============================================================================

  /**
   * Calculate optimal page size and thread distribution for given node count.
   *
   * DETAILED ALGORITHM:
   *
   * Step 1: Calculate Initial Page Size
   * - Target: nodeCount / (threads * pagesPerThread)
   * - This gives rough pages per thread for work distribution
   *
   * Step 2: Round to Power of 2
   * - previousPowerOfTwo() rounds DOWN to nearest power of 2
   * - Example: 1500 → 1024, 3000 → 2048
   * - Enables bit operations: index = offset >> log2(pageSize)
   *
   * Step 3: Apply Practical Limits
   * - Clamp to [MIN_PAGE_SIZE, MAX_PAGE_SIZE]
   * - Prevents tiny pages (allocation overhead) and giant pages (array limits)
   *
   * Step 4: Calculate Actual Page Count
   * - numberOfPages = ceil(nodeCount / pageSize)
   * - This is how many arrays we'll actually need
   *
   * Step 5: Handle Page Count Overflow
   * - If numberOfPages > MAX_PAGE_SIZE, we have too many arrays
   * - Solution: Double page size, halve page count
   * - Repeat until page count is manageable
   *
   * Step 6: Final Validation
   * - Ensure configuration doesn't exceed Java array limits
   * - Throw clear error if impossible to represent
   *
   * @param nodeCount Total nodes to import
   * @param targetThreads Desired thread count
   * @returns Validated sizing configuration
   */
  private static determineBestThreadSize(
    nodeCount: number,
    targetThreads: number
  ): ImportSizing {
    // Step 1: Calculate initial page size based on work distribution
    // Goal: Each thread gets PAGES_PER_THREAD pages to work on
    const pagesPerThread = GdsFeatureToggles.PAGES_PER_THREAD.get();
    let pageSizeNum = BitUtil.ceilDiv(
      nodeCount,
      targetThreads * pagesPerThread
    );

    // Step 2: Round down to nearest power of 2 for cache efficiency
    // Examples: 1500 → 1024, 3000 → 2048, 5000 → 4096
    pageSizeNum = BitUtil.previousPowerOfTwo(pageSizeNum);

    // Step 3: Apply practical limits
    // Upper bound: Don't exceed Java array size limits
    pageSizeNum = Math.min(ImportSizing.MAX_PAGE_SIZE, pageSizeNum);

    // Lower bound: Don't create tiny pages with high allocation overhead
    pageSizeNum = Math.max(ImportSizing.MIN_PAGE_SIZE, pageSizeNum);

    // Step 4: Calculate how many pages we actually need
    let numberOfPagesNum = BitUtil.ceilDiv(nodeCount, pageSizeNum);

    // Step 5: Handle page count overflow
    // If we need more pages than can fit in an integer, increase page size
    while (
      numberOfPagesNum > ImportSizing.MAX_PAGE_SIZE &&
      pageSizeNum < ImportSizing.MAX_PAGE_SIZE
    ) {
      // Double the page size (bit shift left = multiply by 2)
      const nextPageSizeNum = pageSizeNum << 1;

      // Safety check: Prevent infinite loop if we hit numeric limits
      if (
        nextPageSizeNum <= pageSizeNum ||
        nextPageSizeNum > ImportSizing.MAX_PAGE_SIZE
      ) {
        break;
      }

      pageSizeNum = nextPageSizeNum;
      numberOfPagesNum = BitUtil.ceilDiv(nodeCount, pageSizeNum);
    }

    // Final adjustment: If page size grew too large, clamp it
    if (pageSizeNum > ImportSizing.MAX_PAGE_SIZE) {
      pageSizeNum = ImportSizing.MAX_PAGE_SIZE;
      numberOfPagesNum = BitUtil.ceilDiv(nodeCount, pageSizeNum);
    }

    // Step 6: Final validation - ensure configuration is possible
    if (numberOfPagesNum > ImportSizing.MAX_PAGE_SIZE) {
      throw new Error(
        formatWithLocale(
          ImportSizing.TOO_MANY_PAGES_REQUIRED,
          nodeCount.toString(),
          numberOfPagesNum.toString(),
          pageSizeNum.toString()
        )
      );
    }

    return new ImportSizing(
      targetThreads,
      numberOfPagesNum,
      OptionalInt.of(pageSizeNum)
    );
  }

  /**
   * Calculate optimal page count for concurrency without specific node count.
   *
   * ALGORITHM:
   * 1. Start with: threads * pagesPerThread
   * 2. Round UP to nearest power of 2 (for even distribution)
   * 3. Clamp to maximum addressable page count
   *
   * USE CASE:
   * When you need to pre-configure thread pools but don't know
   * the final data size yet.
   *
   * @param targetThreads Desired thread count
   * @returns Thread-optimized sizing without specific page size
   */
  private static determineBestThreadSizeForConcurrency(
    targetThreads: number
  ): ImportSizing {
    // Calculate ideal number of pages for thread distribution
    const pagesPerThread = GdsFeatureToggles.PAGES_PER_THREAD.get();
    let numberOfPagesNum = targetThreads * pagesPerThread;

    // Round UP to next power of 2 for even work distribution
    // Example: 6 threads * 4 pages = 24 → 32 pages
    // This ensures perfect load balancing across threads
    numberOfPagesNum = BitUtil.nextHighestPowerOfTwo(numberOfPagesNum);

    // Clamp to maximum addressable page count
    numberOfPagesNum = Math.min(ImportSizing.MAX_PAGE_SIZE, numberOfPagesNum);

    return new ImportSizing(
      targetThreads,
      numberOfPagesNum,
      OptionalInt.empty() // No specific page size since no node count given
    );
  }

  // =============================================================================
  // ACCESSOR METHODS - RETRIEVE CALCULATED VALUES
  // =============================================================================

  /**
   * Get the number of threads this sizing is optimized for.
   *
   * @returns Thread count for optimal parallel processing
   */
  public threadCount(): number {
    return this.totalThreads;
  }

  /**
   * Get the total number of memory pages needed.
   *
   * USAGE:
   * - Pre-allocate arrays: for (int i = 0; i < numberOfPages; i++)
   * - Calculate memory requirements: pages * pageSize * elementSize
   * - Distribute work across threads: pages / threadCount
   *
   * @returns Total page count for memory allocation
   */
  public getNumberOfPages(): number {
    return this.numberOfPages;
  }

  /**
   * Get the size of each memory page in elements.
   *
   * USAGE:
   * - Array allocation: new long[pageSize]
   * - Index calculation: pageIndex = nodeId / pageSize, offset = nodeId % pageSize
   * - Memory estimation: pageSize * numberOfPages * elementSize
   *
   * EMPTY WHEN:
   * - Sizing calculated without specific node count
   * - Used for thread pool configuration only
   *
   * @returns Page size in elements, or empty if not calculated
   */
  public getPageSize(): OptionalInt {
    return this.pageSize;
  }

  // =============================================================================
  // UTILITY METHODS - HELPFUL CALCULATIONS
  // =============================================================================

  /**
   * Calculate total capacity of this sizing configuration.
   *
   * @returns Maximum number of elements that can be stored
   */
  public totalCapacity(): number {
    if (!this.pageSize.isPresent()) {
      return 0;
    }
    return this.numberOfPages * this.pageSize.value();
  }

  /**
   * Calculate memory overhead ratio.
   *
   * @param nodeCount Actual nodes to store
   * @returns Ratio of allocated vs. used capacity (1.0 = perfect, >1.0 = overhead)
   */
  public memoryOverheadRatio(nodeCount: number): number {
    const totalCapacity = this.totalCapacity();
    return totalCapacity === 0 ? 1.0 : totalCapacity / nodeCount;
  }

  /**
   * Get average pages per thread for work distribution analysis.
   *
   * @returns Average number of pages each thread will process
   */
  public averagePagesPerThread(): number {
    return this.numberOfPages / this.totalThreads;
  }

  /**
   * Check if this sizing uses power-of-2 page sizes for optimal performance.
   *
   * @returns true if page size is a power of 2 (enables bit operations)
   */
  public isOptimalPageSize(): boolean {
    if (!this.pageSize.isPresent()) {
      return false;
    }
    const size = this.pageSize.value();
    return (size & (size - 1)) === 0; // Bit trick: power of 2 check
  }

  /**
   * Generate human-readable description of this sizing configuration.
   *
   * @returns Detailed sizing information for debugging/logging
   */
  public toString(): string {
    const pageSizeStr = this.pageSize.isPresent()
      ? this.pageSize.value().toString()
      : "unspecified";

    return `ImportSizing{threads=${this.totalThreads}, pages=${this.numberOfPages}, pageSize=${pageSizeStr}}`;
  }
}
