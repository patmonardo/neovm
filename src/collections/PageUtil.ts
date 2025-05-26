import { BitUtil } from "@/mem";

/**
 * Utility class for page-based memory management and address calculation.
 *
 * This class provides **foundational algorithms** for implementing paged data structures
 * that can handle massive datasets exceeding standard JavaScript array limitations.
 * It's designed specifically for graph data science applications that need to manage
 * billions of elements efficiently through memory paging strategies.
 *
 * **Paging Architecture Philosophy:**
 *
 * **1. Memory Fragmentation Prevention:**
 * By using smaller, fixed-size pages instead of massive contiguous arrays, the paging
 * system reduces memory fragmentation and garbage collection pressure. This is crucial
 * for long-running graph analytics that process datasets over extended periods.
 *
 * **2. Cache-Friendly Access Patterns:**
 * Page sizes are chosen to align with CPU cache hierarchies (4KB, 32KB) to maximize
 * cache hit rates during sequential and random access patterns common in graph traversals.
 *
 * **3. Platform Optimization:**
 * The algorithms use bit manipulation and power-of-2 mathematics to ensure optimal
 * performance across different JavaScript engines and hardware architectures.
 *
 * **Key Design Principles:**
 *
 * **Page Size Selection:**
 * - **4KB pages**: Align with most CPU L1 cache sizes for hot data
 * - **32KB pages**: Balance between memory overhead and access locality
 * - **Power-of-2 sizes**: Enable fast bit-shift arithmetic for address calculation
 *
 * **Address Translation:**
 * - **Page index**: Upper bits determine which page contains an element
 * - **Index within page**: Lower bits determine position within the page
 * - **Bit masking**: Uses efficient bitwise operations for address decomposition
 *
 * **Memory Layout:**
 * ```
 * Global Index: |  Page Index  |  Index in Page  |
 * Bits:         | High bits    |  Low bits       |
 * Example:      | 20 bits      |  12 bits (4KB)  |
 * ```
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Huge Array Implementation:**
 * ```typescript
 * // Calculate page structure for billion-element array
 * const totalElements = 1_000_000_000;
 * const pageSize = PageUtil.PAGE_SIZE_32KB;
 * const numPages = PageUtil.numPagesFor(totalElements, pageSize);
 *
 * // Create paged structure
 * const pages: number[][] = new Array(numPages);
 * for (let i = 0; i < numPages; i++) {
 *   const pageCapacity = i === numPages - 1
 *     ? PageUtil.exclusiveIndexOfPage(totalElements - 1, pageSize - 1)
 *     : pageSize;
 *   pages[i] = new Array(pageCapacity);
 * }
 * ```
 *
 * **Element Access Translation:**
 * ```typescript
 * // Fast element access using bit operations
 * function getValue(globalIndex: number): number {
 *   const pageShift = 15; // log2(32KB)
 *   const pageMask = (1 << pageShift) - 1;
 *
 *   const pageIndex = PageUtil.pageIndex(globalIndex, pageShift);
 *   const indexInPage = PageUtil.indexInPage(globalIndex, pageMask);
 *
 *   return pages[pageIndex][indexInPage];
 * }
 * ```
 *
 * **Dynamic Page Allocation:**
 * ```typescript
 * // Calculate optimal page size for element type
 * const elementSize = 8; // 8 bytes per double
 * const optimalPageSize = PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, elementSize);
 *
 * // Elements per page = 32KB / 8 bytes = 4096 elements
 * ```
 *
 * **Performance Characteristics:**
 *
 * **Address Calculation Complexity:**
 * - **Page index**: O(1) - single bit shift operation
 * - **Index in page**: O(1) - single bit mask operation
 * - **Memory overhead**: ~0.1% for page reference arrays
 * - **Cache performance**: Optimal for sequential and local access patterns
 */
export class PageUtil {
  /**
   * Maximum safe array length to prevent garbage collection pressure.
   *
   * Arrays larger than this threshold have a higher risk of triggering full GC cycles.
   * This limit (256MB worth of references) prevents full GC events by avoiding
   * large consecutive memory allocations that can fragment the heap.
   *
   * **GC Optimization Strategy:**
   * By keeping individual arrays smaller than this limit, the garbage collector
   * can manage memory more efficiently using generational collection strategies
   * rather than falling back to expensive full heap collections.
   *
   * **Memory Calculation:**
   * - 2^28 = 268,435,456 elements
   * - At 8 bytes per reference = ~2GB of reference space
   * - Actual object memory is allocated separately and managed incrementally
   */
  public static readonly MAX_ARRAY_LENGTH = 1 << 28;

  /**
   * Standard 4KB page size for cache-aligned data structures.
   *
   * This page size aligns with:
   * - **CPU L1 cache**: Most modern CPUs have 32KB L1 data cache
   * - **Memory pages**: Operating system virtual memory page size
   * - **Cache lines**: Optimal for sequential access patterns
   *
   * **Element Capacity Examples:**
   * - Numbers (8 bytes): 512 elements per page
   * - Integers (4 bytes): 1,024 elements per page
   * - References (8 bytes): 512 references per page
   */
  public static readonly PAGE_SIZE_4KB = 1 << 12;

  /**
   * Standard 32KB page size for balanced performance and memory overhead.
   *
   * This page size provides:
   * - **Lower overhead**: Fewer page references to manage
   * - **Good locality**: Large enough for meaningful sequential access
   * - **Cache friendly**: Fits comfortably in L2 cache (256KB-1MB typical)
   *
   * **Element Capacity Examples:**
   * - Numbers (8 bytes): 4,096 elements per page
   * - Integers (4 bytes): 8,192 elements per page
   * - References (8 bytes): 4,096 references per page
   */
  public static readonly PAGE_SIZE_32KB = 1 << 15;

  /**
   * Calculates the number of elements that fit in a page of the given byte size.
   *
   * This method computes **element density** for pages by determining how many
   * elements of a given size can fit within a specified page size in bytes.
   * It's essential for optimizing memory layout and access patterns.
   *
   * **Element Size Requirements:**
   * The element size must be a power of 2 (1, 2, 4, 8, 16, etc.) to enable
   * efficient bit-shift arithmetic for the calculation.
   *
   * **Calculation Strategy:**
   * Uses bit shifting instead of division for optimal performance:
   * `elementsPerPage = pageSizeInBytes >> log2(elementSize)`
   *
   * **Usage Examples:**
   * ```typescript
   * // Calculate elements per page for different data types
   * const doublesPerPage = PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 8);  // 4,096
   * const intsPerPage = PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 4);     // 8,192
   * const bytesPerPage = PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 1);    // 32,768
   *
   * // Use for array allocation
   * const pageCapacity = PageUtil.pageSizeFor(pageSize, elementSize);
   * const page = new Array(pageCapacity);
   * ```
   *
   * @param pageSizeInBytes The page size in bytes (typically 4KB or 32KB)
   * @param sizeOfElement The size of each element in bytes (must be power of 2)
   * @returns Number of elements that fit in a page of the given size
   * @throws Error if sizeOfElement is not a power of 2
   */
  public static pageSizeFor(
    pageSizeInBytes: number,
    sizeOfElement: number
  ): number {
    console.assert(
      BitUtil.isPowerOfTwo(sizeOfElement),
      `Element size ${sizeOfElement} must be a power of 2`
    );
    return pageSizeInBytes >> BitUtil.numberOfTrailingZeros(sizeOfElement);
  }

  /**
   * Calculates the number of pages using precomputed bit manipulation values.
   */
  public static numPagesFor(
    capacity: number,
    pageShift: number,
    pageMask: number
  ): number;
  /**
   * Calculates the number of pages needed to store the given capacity of elements.
   */
  public static numPagesFor(capacity: number, pageSize: number): number;
  public static numPagesFor(
    capacity: number,
    pageSizeOrPageShift: number,
    pageMask?: number
  ): number {
    if (pageMask !== undefined) {
      // Three-parameter version: (capacity, pageShift, pageMask)
      // This assumes power-of-2 page sizes with precomputed values
      const pageShift = pageSizeOrPageShift;
      const numPages = (capacity + pageMask) >>> pageShift;
      console.assert(
        numPages <= Number.MAX_SAFE_INTEGER,
        `pageSize=${pageMask + 1} is too small for capacity: ${capacity}`
      );
      return Math.floor(numPages);
    } else {
      // Two-parameter version: (capacity, pageSize)
      const pageSize = pageSizeOrPageShift;

      // Check if pageSize is power of 2
      if (BitUtil.isPowerOfTwo(pageSize)) {
        // Use fast bit operations for power-of-2 page sizes
        const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
        const computedPageMask = pageSize - 1;
        return this.numPagesFor(capacity, pageShift, computedPageMask);
      } else {
        // Use standard division for non-power-of-2 page sizes
        if (capacity === 0) return 0;
        return Math.ceil(capacity / pageSize);
      }
    }
  }

  /**
   * Calculates the total capacity for a given number of pages.
   *
   * This method computes the **maximum number of elements** that can be stored
   * in a specified number of pages. It's the inverse operation of `numPagesFor`.
   *
   * **Use Cases:**
   * - **Memory estimation**: Calculate total memory requirements
   * - **Capacity planning**: Determine maximum elements for allocated pages
   * - **Index validation**: Ensure indices don't exceed page boundaries
   *
   * @param numPages Number of pages allocated
   * @param pageShift log2(pageSize) for bit shift operations
   * @returns Total capacity (maximum number of elements)
   */
  public static capacityFor(numPages: number, pageShift: number): number {
    return numPages << pageShift;
  }

  /**
   * Extracts the page index from a global element index.
   *
   * This method performs **address translation** to determine which page
   * contains the element at the specified global index. It uses bit shifting
   * for optimal performance.
   *
   * **Address Decomposition:**
   * The global index is split into two parts:
   * - **High bits**: Page index (which page?)
   * - **Low bits**: Index within page (where in the page?)
   *
   * **Bit Operation:**
   * `pageIndex = globalIndex >> pageShift`
   *
   * **Usage Example:**
   * ```typescript
   * // Access element in paged array
   * const globalIndex = 1_000_000;
   * const pageShift = 15; // 32KB pages
   * const pageIndex = PageUtil.pageIndex(globalIndex, pageShift);
   * const page = pages[pageIndex];
   * ```
   *
   * @param index Global element index
   * @param pageShift log2(pageSize) for bit shift operations
   * @returns Index of the page containing the element
   */
  public static pageIndex(index: number, pageShift: number): number {
    return Math.floor(index >>> pageShift);
  }

  /**
   * Extracts the index within a page from a global element index.
   *
   * This method performs **address translation** to determine the position
   * of an element within its containing page. It uses bit masking for
   * optimal performance.
   *
   * **Bit Operation:**
   * `indexInPage = globalIndex & pageMask`
   *
   * **Usage Example:**
   * ```typescript
   * // Access element within its page
   * const globalIndex = 1_000_000;
   * const pageMask = (1 << 15) - 1; // 32KB pages
   * const indexInPage = PageUtil.indexInPage(globalIndex, pageMask);
   * const element = page[indexInPage];
   * ```
   *
   * @param index Global element index
   * @param pageMask (pageSize - 1) for bit masking operations
   * @returns Index of the element within its page
   */
  public static indexInPage(index: number, pageMask: number): number {
    return Math.floor(index & pageMask);
  }
  /**
   * Calculates the exclusive (one-past-the-end) index of the last element in a page.
   *
   * This method determines the **boundary position** for partial pages, which is
   * essential for handling the last page in a paged array that may not be completely
   * filled.
   *
   * **Boundary Handling:**
   * Most pages are completely filled, but the last page typically contains fewer
   * elements than the page capacity. This method calculates the correct boundary
   * for safe iteration and memory allocation.
   *
   * **Calculation Strategy:**
   * - For power-of-2 page sizes: Uses bit masking for optimal performance
   * - For non-power-of-2 page sizes: Uses modulo arithmetic for correctness
   *
   * @param index Global element index (typically the last element index)
   * @param pageMask (pageSize - 1) for bit masking operations
   * @returns Exclusive index (length) of elements in the page containing the index
   */
  /**
   * Calculates the exclusive (one-past-the-end) index within the page.
   *
   * This gives the position immediately after the given index within its page.
   * Useful for determining iteration boundaries within a page.
   */
  public static exclusiveIndexOfPage(index: number, pageMask: number): number {
    const pageSize = pageMask + 1;

    if (BitUtil.isPowerOfTwo(pageSize)) {
      // For power-of-2: use bit masking
      return (index & pageMask) + 1;
    } else {
      // For non-power-of-2: use modulo
      return (index % pageSize) + 1;
    }
  }

  /**
   * Private constructor to prevent instantiation of utility class.
   *
   * This class is designed as a static utility class and should not be instantiated.
   * All methods are static and operate on provided parameters without maintaining state.
   */
  private constructor() {
    throw new Error(
      "PageUtil is a static utility class and cannot be instantiated"
    );
  }
}
