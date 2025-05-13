import { BitUtil } from '../mem/BitUtil';

/**
 * Utility methods for paged arrays and collections.
 */
export class PageUtil {
  /**
   * Maximum array length to avoid triggering full GC.
   * Arrays larger than this have a higher risk of triggering a full GC.
   * This prevents full GC more often as not so much consecutive memory is allocated in one go 
   * compared to a page shift of 30 or 32.
   */
  public static readonly MAX_ARRAY_LENGTH = 1 << 28;

  /**
   * Standard page size of 4KB (2^12 bytes)
   */
  public static readonly PAGE_SIZE_4KB = 1 << 12;

  /**
   * Standard page size of 32KB (2^15 bytes)
   */
  public static readonly PAGE_SIZE_32KB = 1 << 15;

  /**
   * Calculate the number of elements that fit in a page of the given byte size.
   * 
   * @param pageSizeInBytes Size of the page in bytes
   * @param sizeOfElement Size of each element in bytes (must be a power of 2)
   * @returns Number of elements per page
   */
  public static pageSizeFor(pageSizeInBytes: number, sizeOfElement: number): number {
    if (!BitUtil.isPowerOfTwo(sizeOfElement)) {
      throw new Error(`Element size must be a power of 2: ${sizeOfElement}`);
    }
    return pageSizeInBytes >>> BitUtil.numberOfTrailingZeros(sizeOfElement);
  }

  /**
   * Calculate the number of pages needed for the given capacity and page size.
   * 
   * @param capacity Total number of elements to store
   * @param pageSize Number of elements per page
   * @returns Number of pages needed
   */
  public static numPagesFor(capacity: number, pageSize: number): number {
    const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
    const pageMask = pageSize - 1;
    return this.numPagesForWithMask(capacity, pageShift, pageMask);
  }

  /**
   * Calculate the number of pages needed for the given capacity using pageShift and pageMask.
   * 
   * @param capacity Total number of elements to store
   * @param pageShift Bit shift for page indexing (log2 of page size)
   * @param pageMask Bitmask for indexing within a page (pageSize - 1)
   * @returns Number of pages needed
   */
  public static numPagesForWithMask(capacity: number, pageShift: number, pageMask: number): number {
    const numPages = (capacity + pageMask) >>> pageShift;
    if (numPages > Number.MAX_SAFE_INTEGER) {
      throw new Error(`pageSize=${pageMask + 1} is too small for such a capacity: ${capacity}`);
    }
    return numPages;
  }

  /**
   * Calculate the total capacity provided by the given number of pages.
   * 
   * @param numPages Number of pages
   * @param pageShift Bit shift for page indexing (log2 of page size)
   * @returns Total capacity
   */
  public static capacityFor(numPages: number, pageShift: number): number {
    return numPages << pageShift;
  }

  /**
   * Get the page index for a global index.
   * 
   * @param index Global index
   * @param pageShift Bit shift for page indexing (log2 of page size)
   * @returns Page index
   */
  public static pageIndex(index: number, pageShift: number): number {
    return index >>> pageShift;
  }

  /**
   * Get the index within a page for a global index.
   * 
   * @param index Global index
   * @param pageMask Bitmask for indexing within a page (pageSize - 1)
   * @returns Index within the page
   */
  public static indexInPage(index: number, pageMask: number): number {
    return index & pageMask;
  }

  /**
   * Get the exclusive index of an element within a page.
   * This is used to find the last valid index for a page that may not be completely filled.
   * 
   * @param index Global index
   * @param pageMask Bitmask for indexing within a page (pageSize - 1)
   * @returns Exclusive index within the page
   */
  public static exclusiveIndexOfPage(index: number, pageMask: number): number {
    return 1 + ((index - 1) & pageMask);
  }

  /**
   * Calculates the page shift (log2 of page size) for a given page size
   * 
   * @param pageSize Number of elements per page
   * @returns The page shift value
   */
  public static pageShift(pageSize: number): number {
    if (!BitUtil.isPowerOfTwo(pageSize)) {
      throw new Error(`Page size must be a power of 2: ${pageSize}`);
    }
    return BitUtil.numberOfTrailingZeros(pageSize);
  }

  /**
   * Calculates the page mask for a given page size
   * 
   * @param pageSize Number of elements per page
   * @returns The page mask (pageSize - 1)
   */
  public static pageMask(pageSize: number): number {
    if (!BitUtil.isPowerOfTwo(pageSize)) {
      throw new Error(`Page size must be a power of 2: ${pageSize}`);
    }
    return pageSize - 1;
  }

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("No instances allowed");
  }
}