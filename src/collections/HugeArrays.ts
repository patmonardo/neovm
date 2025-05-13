/**
 * Utilities for working with huge arrays that need to be split into pages.
 */
export class HugeArrays {
  /**
   * Maximum array length to avoid triggering full GC.
   * Arrays larger than this have a higher risk of triggering a full GC.
   * This prevents full GC more often as not so much consecutive memory is allocated in one go 
   * compared to a page shift of 30 or 32.
   */
  public static readonly MAX_ARRAY_LENGTH = 1 << 28;

  /**
   * Bit shift for pages (2^14 = 16384 elements per page)
   */
  public static readonly PAGE_SHIFT = 14;
  
  /**
   * Size of each page (16384 elements)
   */
  public static readonly PAGE_SIZE = 1 << HugeArrays.PAGE_SHIFT;
  
  /**
   * Bitmask for getting the index within a page
   */
  private static readonly PAGE_MASK = HugeArrays.PAGE_SIZE - 1;

  /**
   * Calculates the page index for the given global index using the default page size.
   * 
   * @param index Global index
   * @returns The page index
   */
  public static pageIndex(index: number): number {
    return (index / HugeArrays.PAGE_SIZE) | 0;
  }

  /**
   * Calculates the index within a page for the given global index using the default page mask.
   * 
   * @param index Global index
   * @returns Index within the page
   */
  public static indexInPage(index: number): number {
    return index & HugeArrays.PAGE_MASK;
  }

  /**
   * Calculates the page index for the given global index using a custom page shift.
   * 
   * @param index Global index
   * @param pageShift Custom page shift
   * @returns The page index
   */
  public static pageIndexWithShift(index: number, pageShift: number): number {
    return (index / (1 << pageShift)) | 0;
  }

  /**
   * Calculates the index within a page for the given global index using a custom page mask.
   * 
   * @param index Global index
   * @param pageMask Custom page mask
   * @returns Index within the page
   */
  public static indexInPageWithMask(index: number, pageMask: number): number {
    return index & pageMask;
  }

  /**
   * Calculates the exclusive index of the page for the given global index.
   * This is used to find the last valid index for a page that may not be completely filled.
   * 
   * @param index Global index
   * @returns Exclusive index within the page
   */
  public static exclusiveIndexOfPage(index: number): number {
    return 1 + ((index - 1) & HugeArrays.PAGE_MASK);
  }

  /**
   * Reconstructs a global index from a page index and an index within that page.
   * 
   * @param pageIndex Page index
   * @param indexInPage Index within the page
   * @returns The global index
   */
  public static indexFromPageIndexAndIndexInPage(pageIndex: number, indexInPage: number): number {
    // Use multiplication for large values since left shift has 32-bit limit in JavaScript
    return (pageIndex * HugeArrays.PAGE_SIZE) + indexInPage;
  }

  /**
   * Calculates the number of pages needed for the given capacity using the default page size.
   * 
   * @param capacity Total capacity needed
   * @returns Number of pages required
   */
  public static numberOfPages(capacity: number): number {
    const numPages = Math.ceil(capacity / HugeArrays.PAGE_SIZE);
    if (numPages > Number.MAX_SAFE_INTEGER) {
      throw new Error(`pageSize=${HugeArrays.PAGE_SIZE} is too small for capacity: ${capacity}`);
    }
    return numPages;
  }

  /**
   * Calculates the number of pages needed for the given capacity using a custom page size.
   * 
   * @param capacity Total capacity needed
   * @param pageShift Custom page shift
   * @param pageMask Custom page mask
   * @returns Number of pages required
   */
  public static numberOfPagesWithShift(capacity: number, pageShift: number, pageMask: number): number {
    const pageSize = 1 << pageShift;
    const numPages = Math.ceil(capacity / pageSize);
    if (numPages > Number.MAX_SAFE_INTEGER) {
      throw new Error(`pageSize=${pageSize} is too small for capacity: ${capacity}`);
    }
    return numPages;
  }

  /**
   * Create a correctly sized array of pages for the given capacity and element type
   * 
   * @param capacity Total number of elements
   * @param createPageFn Function that creates a page of the specified size
   * @returns Array of pages
   */
  public static createPagedArray<T>(
    capacity: number, 
    createPageFn: (size: number) => T
  ): T[] {
    const numPages = HugeArrays.numberOfPages(capacity);
    const pages: T[] = new Array(numPages);
    
    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      pages[i] = createPageFn(HugeArrays.PAGE_SIZE);
    }
    
    // Create last page (might be smaller)
    if (numPages > 0) {
      const lastPageSize = HugeArrays.exclusiveIndexOfPage(capacity);
      pages[numPages - 1] = createPageFn(lastPageSize || HugeArrays.PAGE_SIZE);
    }
    
    return pages;
  }

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("No instances allowed");
  }
}