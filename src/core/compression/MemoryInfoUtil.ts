import { MemoryInfo } from './MemoryInfo';
import { ImmutableHistogram } from './common/ImmutableHistogram';

/**
 * Memory tracker interface - collects statistics during compression operations.
 *
 * **Role**: The "data collector" that feeds the MemoryInfo "analyzer".
 * This is what's actively recording statistics during graph compression.
 */
export interface MemoryTracker {
  heapAllocations(): ImmutableHistogram;
  nativeAllocations(): ImmutableHistogram;
  pageSizes(): ImmutableHistogram;
  headerBits(): ImmutableHistogram;
  headerAllocations(): ImmutableHistogram;
}

/**
 * Block-level compression statistics.
 *
 * **Granular Analysis**: While MemoryTracker tracks allocations,
 * BlockStatistics tracks compression algorithm performance within blocks.
 */
export interface BlockStatistics {
  blockCount(): number;
  blockLengths(): ImmutableHistogram;
  stdDevBits(): ImmutableHistogram;
  meanBits(): ImmutableHistogram;
  medianBits(): ImmutableHistogram;
  maxBits(): ImmutableHistogram;
  minBits(): ImmutableHistogram;
  indexOfMinValue(): ImmutableHistogram;
  indexOfMaxValue(): ImmutableHistogram;
  headTailDiffBits(): ImmutableHistogram;
  bestMaxDiffBits(): ImmutableHistogram;
  exceptions(): ImmutableHistogram; // PFOR exceptions
}

/**
 * Builder for MemoryInfo objects.
 *
 * **Pattern**: Fluent interface for constructing complex MemoryInfo instances.
 * Handles the complexity of optional fields and statistics combination.
 */
export class MemoryInfoBuilder {
  private memoryInfo: Partial<MemoryInfo> = {};

  pages(pages: number): MemoryInfoBuilder {
    this.memoryInfo.pages = pages;
    return this;
  }

  bytesOnHeap(bytes: number): MemoryInfoBuilder {
    this.memoryInfo.bytesOnHeap = bytes;
    return this;
  }

  bytesOffHeap(bytes: number): MemoryInfoBuilder {
    this.memoryInfo.bytesOffHeap = bytes;
    return this;
  }

  heapAllocations(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.heapAllocations = histogram;
    return this;
  }

  nativeAllocations(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.nativeAllocations = histogram;
    return this;
  }

  pageSizes(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.pageSizes = histogram;
    return this;
  }

  headerBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.headerBits = histogram;
    return this;
  }

  headerAllocations(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.headerAllocations = histogram;
    return this;
  }

  blockCount(count: number): MemoryInfoBuilder {
    this.memoryInfo.blockCount = count;
    return this;
  }

  blockLengths(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.blockLengths = histogram;
    return this;
  }

  stdDevBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.stdDevBits = histogram;
    return this;
  }

  meanBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.meanBits = histogram;
    return this;
  }

  medianBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.medianBits = histogram;
    return this;
  }

  maxBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.maxBits = histogram;
    return this;
  }

  minBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.minBits = histogram;
    return this;
  }

  indexOfMinValue(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.indexOfMinValue = histogram;
    return this;
  }

  indexOfMaxValue(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.indexOfMaxValue = histogram;
    return this;
  }

  headTailDiffBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.headTailDiffBits = histogram;
    return this;
  }

  bestMaxDiffBits(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.bestMaxDiffBits = histogram;
    return this;
  }

  pforExceptions(histogram: ImmutableHistogram): MemoryInfoBuilder {
    this.memoryInfo.pforExceptions = histogram;
    return this;
  }

  build(): MemoryInfo {
    // Ensure required fields are present
    if (this.memoryInfo.pages === undefined) {
      throw new Error("pages is required");
    }
    if (!this.memoryInfo.heapAllocations) {
      throw new Error("heapAllocations is required");
    }
    if (!this.memoryInfo.nativeAllocations) {
      throw new Error("nativeAllocations is required");
    }
    if (!this.memoryInfo.pageSizes) {
      throw new Error("pageSizes is required");
    }
    if (!this.memoryInfo.headerBits) {
      throw new Error("headerBits is required");
    }
    if (!this.memoryInfo.headerAllocations) {
      throw new Error("headerAllocations is required");
    }

    return this.memoryInfo as MemoryInfo;
  }
}

/**
 * Utility class for creating MemoryInfo objects from various data sources.
 *
 * **Factory Pattern**: Handles the complexity of combining MemoryTracker
 * and BlockStatistics into a unified MemoryInfo object.
 */
export class MemoryInfoUtil {

  /**
   * Create a MemoryInfo builder from a MemoryTracker and optional BlockStatistics.
   *
   * **Primary Factory Method**: This is how most MemoryInfo objects get created
   * during graph compression operations.
   *
   * @param memoryTracker Basic memory allocation statistics
   * @param blockStatistics Optional block-level compression statistics
   * @returns A builder ready to construct MemoryInfo
   */
  static builder(
    memoryTracker: MemoryTracker,
    blockStatistics?: BlockStatistics
  ): MemoryInfoBuilder {

    const builder = new MemoryInfoBuilder()
      .heapAllocations(memoryTracker.heapAllocations())
      .nativeAllocations(memoryTracker.nativeAllocations())
      .pageSizes(memoryTracker.pageSizes())
      .headerBits(memoryTracker.headerBits())
      .headerAllocations(memoryTracker.headerAllocations());

    // Add block statistics if available
    if (blockStatistics) {
      builder
        .blockCount(blockStatistics.blockCount())
        .blockLengths(blockStatistics.blockLengths())
        .stdDevBits(blockStatistics.stdDevBits())
        .meanBits(blockStatistics.meanBits())
        .medianBits(blockStatistics.medianBits())
        .maxBits(blockStatistics.maxBits())
        .minBits(blockStatistics.minBits())
        .indexOfMinValue(blockStatistics.indexOfMinValue())
        .indexOfMaxValue(blockStatistics.indexOfMaxValue())
        .headTailDiffBits(blockStatistics.headTailDiffBits())
        .bestMaxDiffBits(blockStatistics.bestMaxDiffBits())
        .pforExceptions(blockStatistics.exceptions());
    }

    return builder;
  }

  /**
   * Quick factory for basic MemoryInfo without block statistics.
   *
   * **Use Case**: Simple memory tracking without compression algorithm analysis.
   */
  static fromMemoryTracker(memoryTracker: MemoryTracker, pages: number = 1): MemoryInfo {
    return this.builder(memoryTracker).pages(pages).build();
  }

  /**
   * Create MemoryInfo with full compression analysis.
   *
   * **Use Case**: Complete compression performance analysis including
   * both memory allocation patterns and block-level compression statistics.
   */
  static withBlockStatistics(
    memoryTracker: MemoryTracker,
    blockStatistics: BlockStatistics,
    pages: number = 1,
    bytesOnHeap?: number,
    bytesOffHeap?: number
  ): MemoryInfo {

    const builder = this.builder(memoryTracker, blockStatistics).pages(pages);

    if (bytesOnHeap !== undefined) {
      builder.bytesOnHeap(bytesOnHeap);
    }

    if (bytesOffHeap !== undefined) {
      builder.bytesOffHeap(bytesOffHeap);
    }

    return builder.build();
  }
}
