/**
 * Utility class for managing huge arrays by splitting them into pages.
 */
export class HugeArrays {
  // Constants can remain as number since they're conceptually 32-bit values
  public static readonly MAX_ARRAY_LENGTH: number = 1 << 28;
  public static readonly PAGE_SHIFT: number = 14;
  public static readonly PAGE_SIZE: number = 1 << HugeArrays.PAGE_SHIFT;
  private static readonly PAGE_MASK: number = HugeArrays.PAGE_SIZE - 1;

  /**
   * Calculates the page index for a given global array index
   */
  public static pageIndex(index: number): number {
    return Number(BigInt(index) >> BigInt(HugeArrays.PAGE_SHIFT));
  }

  /**
   * Calculates the index within a page for a given global array index
   */
  public static indexInPage(index: number): number {
    return Number(BigInt(index) & BigInt(HugeArrays.PAGE_MASK));
  }

  /**
   * Calculates the page index with a custom page shift value
   */
  public static pageIndexWithShift(index: number, pageShift: number): number {
    return Number(BigInt(index) >> BigInt(pageShift));
  }

  /**
   * Calculates the index within a page with a custom page mask
   */
  public static indexInPageWithMask(index: number, pageMask: number): number {
    return Number(BigInt(index) & BigInt(pageMask));
  }

  /**
   * Calculates the exclusive index of a page
   */
  public static exclusiveIndexOfPage(index: number): number {
    return Number(1n + (BigInt(index - 1) & BigInt(HugeArrays.PAGE_MASK)));
  }

  /**
   * Reconstructs a global index from a page index and an index within that page
   */
  public static indexFromPageIndexAndIndexInPage(
    pageIndex: number,
    indexInPage: number
  ): number {
    return Number(
      (BigInt(pageIndex) << BigInt(HugeArrays.PAGE_SHIFT)) | BigInt(indexInPage)
    );
  }

  /**
   * Calculates the number of pages needed for the given capacity
   */
  public static numberOfPages(capacity: number): number {
    const numPages =
      BigInt(capacity + HugeArrays.PAGE_MASK) >> BigInt(HugeArrays.PAGE_SHIFT);
    // Check is still valuable but needs different approach with number
    if (numPages > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        `pageSize=${HugeArrays.PAGE_SIZE} is too small for capacity: ${capacity}`
      );
    }
    return Number(numPages);
  }

  /**
   * Calculates the number of pages with custom page shift and mask values
   */
  public static numberOfPagesCustom(
    capacity: number,
    pageShift: number,
    pageMask: number
  ): number {
    const numPages = (BigInt(capacity) + BigInt(pageMask)) >> BigInt(pageShift);
    if (numPages > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        `pageSize=${1 << pageShift} is too small for capacity: ${capacity}`
      );
    }
    return Number(numPages);
  }
}
