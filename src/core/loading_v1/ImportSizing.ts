import { Concurrency } from '../concurrency/Concurrency'; // Adjust path
import { BitUtil } from '../../mem/BitUtil'; // Adjust path
import { OptionalInt } from '../utils/OptionalInt'; // Adjust path
import { GdsFeatureToggles } from '../../utils/GdsFeatureToggles'; // Adjust path
import { StringFormatting } from '../../utils/StringFormatting'; // Adjust path

export class ImportSizing {
  // Integer.MAX_VALUE in JavaScript is Number.MAX_SAFE_INTEGER for some contexts,
  // but Java's int is 32-bit signed. (2^31 - 1 = 2147483647)
  private static readonly JAVA_INTEGER_MAX_VALUE = 2147483647;

  // MAX_PAGE_SIZE = BitUtil.previousPowerOfTwo(Integer.MAX_VALUE);
  // previousPowerOfTwo(2147483647) = 1073741824 (2^30)
  private static readonly MAX_PAGE_SIZE = BitUtil.previousPowerOfTwo(ImportSizing.JAVA_INTEGER_MAX_VALUE);

  public static readonly MIN_PAGE_SIZE = 1024;

  private static readonly TOO_MANY_PAGES_REQUIRED =
    "Importing %s nodes would need %s arrays of %s-long nested arrays each, which cannot be created.";

  public readonly totalThreads: number;
  public readonly numberOfPages: number;
  public readonly pageSize: OptionalInt;

  private constructor(totalThreads: number, numberOfPages: number, pageSize: OptionalInt) {
    this.totalThreads = totalThreads;
    this.numberOfPages = numberOfPages;
    this.pageSize = pageSize;
  }

  public static of(concurrency: Concurrency, nodeCount: number | number): ImportSizing {
    // Ensure nodeCount is treated as a number for calculations, as targetThreads is number
    return ImportSizing.determineBestThreadSize(Number(nodeCount), concurrency.value());
  }

  public static ofThreads(concurrency: Concurrency): ImportSizing {
    return ImportSizing.determineBestThreadSizeForConcurrency(concurrency.value());
  }

  private static determineBestThreadSize(nodeCount: number, targetThreads: number): ImportSizing {
    let pageSizeNum = BitUtil.ceilDiv(nodeCount, targetThreads * GdsFeatureToggles.PAGES_PER_THREAD.get());

    pageSizeNum = BitUtil.previousPowerOfTwo(pageSizeNum);
    pageSizeNum = Math.min(ImportSizing.MAX_PAGE_SIZE, pageSizeNum);
    pageSizeNum = Math.max(ImportSizing.MIN_PAGE_SIZE, pageSizeNum);

    let numberOfPagesNum = BitUtil.ceilDiv(nodeCount, pageSizeNum);

    while (numberOfPagesNum > ImportSizing.MAX_PAGE_SIZE && pageSizeNum < ImportSizing.MAX_PAGE_SIZE) {
      // Check to prevent infinite loop if pageSizeNum stops increasing but is still less than MAX_PAGE_SIZE
      const nextPageSizeNum = pageSizeNum << 1;
      if (nextPageSizeNum <= pageSizeNum) { // pageSizeNum might have hit Number.MAX_SAFE_INTEGER or MAX_PAGE_SIZE
          break;
      }
      pageSizeNum = nextPageSizeNum;
      numberOfPagesNum = BitUtil.ceilDiv(nodeCount, pageSizeNum);
    }

    // Final check after loop
    if (pageSizeNum > ImportSizing.MAX_PAGE_SIZE) { // If pageSize itself grew too large
        pageSizeNum = ImportSizing.MAX_PAGE_SIZE;
        numberOfPagesNum = BitUtil.ceilDiv(nodeCount, pageSizeNum);
    }


    if (numberOfPagesNum > ImportSizing.MAX_PAGE_SIZE) {
      throw new Error( // Using standard Error, can be custom
        StringFormatting.formatWithLocale(
          ImportSizing.TOO_MANY_PAGES_REQUIRED,
          nodeCount,
          numberOfPagesNum,
          pageSizeNum
        )
      );
    }

    // In Java, casts to (int) are safe. Here, we assume values fit in standard number ranges.
    return new ImportSizing(
      targetThreads, // Already number
      numberOfPagesNum, // Already number
      OptionalInt.of(pageSizeNum) // Already number
    );
  }

  private static determineBestThreadSizeForConcurrency(targetThreads: number): ImportSizing {
    let numberOfPagesNum = targetThreads * GdsFeatureToggles.PAGES_PER_THREAD.get();

    numberOfPagesNum = BitUtil.nextHighestPowerOfTwo(numberOfPagesNum);
    numberOfPagesNum = Math.min(ImportSizing.MAX_PAGE_SIZE, numberOfPagesNum);

    return new ImportSizing(
      targetThreads, // Already number
      numberOfPagesNum, // Already number
      OptionalInt.empty()
    );
  }

  public threadCount(): number {
    return this.totalThreads;
  }

  public getNumberOfPages(): number { // Renamed to avoid conflict if used as property
    return this.numberOfPages;
  }

  public getPageSize(): OptionalInt { // Renamed to avoid conflict
    return this.pageSize;
  }
}
