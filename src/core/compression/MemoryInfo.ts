import { ImmutableHistogram } from "./common/ImmutableHistogram";
import { Optional } from "@/utils/Optional";

/**
 * Information about memory usage of compressed structures.
 * Collects statistics about compression rates and memory allocation.
 */
export interface MemoryInfo {
  bytesTotal(): Optional<number>;
  pages(): number;
  bytesOnHeap(): Optional<number>;
  bytesOffHeap(): Optional<number>;
  heapAllocations(): ImmutableHistogram;
  nativeAllocations(): ImmutableHistogram;
  pageSizes(): ImmutableHistogram;
  headerBits(): ImmutableHistogram;
  headerAllocations(): ImmutableHistogram;
  blockCount(): Optional<number>;
  stdDevBits(): Optional<ImmutableHistogram>;
  meanBits(): Optional<ImmutableHistogram>;
  medianBits(): Optional<ImmutableHistogram>;
  blockLengths(): Optional<ImmutableHistogram>;
  maxBits(): Optional<ImmutableHistogram>;
  minBits(): Optional<ImmutableHistogram>;
  indexOfMinValue(): Optional<ImmutableHistogram>;
  indexOfMaxValue(): Optional<ImmutableHistogram>;
  headTailDiffBits(): Optional<ImmutableHistogram>;
  bestMaxDiffBits(): Optional<ImmutableHistogram>;
  pforExceptions(): Optional<ImmutableHistogram>;
  merge(other: MemoryInfo): MemoryInfo;
}

/**
 * Configuration for creating MemoryInfo instances.
 */
export interface MemoryInfoConfig {
  pages: number;
  bytesOnHeap?: Optional<number>;
  bytesOffHeap?: Optional<number>;
  heapAllocations: ImmutableHistogram;
  nativeAllocations: ImmutableHistogram;
  pageSizes: ImmutableHistogram;
  headerBits: ImmutableHistogram;
  headerAllocations: ImmutableHistogram;
  blockCount?: Optional<number>;
  stdDevBits?: Optional<ImmutableHistogram>;
  meanBits?: Optional<ImmutableHistogram>;
  medianBits?: Optional<ImmutableHistogram>;
  blockLengths?: Optional<ImmutableHistogram>;
  maxBits?: Optional<ImmutableHistogram>;
  minBits?: Optional<ImmutableHistogram>;
  indexOfMinValue?: Optional<ImmutableHistogram>;
  indexOfMaxValue?: Optional<ImmutableHistogram>;
  headTailDiffBits?: Optional<ImmutableHistogram>;
  bestMaxDiffBits?: Optional<ImmutableHistogram>;
  pforExceptions?: Optional<ImmutableHistogram>;
}

/**
 * Immutable implementation of MemoryInfo.
 */
export class ImmutableMemoryInfo implements MemoryInfo {
  private readonly _pages: number;
  private readonly _bytesOnHeap: Optional<number>;
  private readonly _bytesOffHeap: Optional<number>;
  private readonly _heapAllocations: ImmutableHistogram;
  private readonly _nativeAllocations: ImmutableHistogram;
  private readonly _pageSizes: ImmutableHistogram;
  private readonly _headerBits: ImmutableHistogram;
  private readonly _headerAllocations: ImmutableHistogram;
  private readonly _blockCount: Optional<number>;
  private readonly _stdDevBits: Optional<ImmutableHistogram>;
  private readonly _meanBits: Optional<ImmutableHistogram>;
  private readonly _medianBits: Optional<ImmutableHistogram>;
  private readonly _blockLengths: Optional<ImmutableHistogram>;
  private readonly _maxBits: Optional<ImmutableHistogram>;
  private readonly _minBits: Optional<ImmutableHistogram>;
  private readonly _indexOfMinValue: Optional<ImmutableHistogram>;
  private readonly _indexOfMaxValue: Optional<ImmutableHistogram>;
  private readonly _headTailDiffBits: Optional<ImmutableHistogram>;
  private readonly _bestMaxDiffBits: Optional<ImmutableHistogram>;
  private readonly _pforExceptions: Optional<ImmutableHistogram>;

  constructor(config: MemoryInfoConfig) {
    this._pages = config.pages;
    this._bytesOnHeap = config.bytesOnHeap ?? Optional.empty();
    this._bytesOffHeap = config.bytesOffHeap ?? Optional.empty();
    this._heapAllocations = config.heapAllocations;
    this._nativeAllocations = config.nativeAllocations;
    this._pageSizes = config.pageSizes;
    this._headerBits = config.headerBits;
    this._headerAllocations = config.headerAllocations;
    this._blockCount = config.blockCount ?? Optional.empty();
    this._stdDevBits = config.stdDevBits ?? Optional.empty();
    this._meanBits = config.meanBits ?? Optional.empty();
    this._medianBits = config.medianBits ?? Optional.empty();
    this._blockLengths = config.blockLengths ?? Optional.empty();
    this._maxBits = config.maxBits ?? Optional.empty();
    this._minBits = config.minBits ?? Optional.empty();
    this._indexOfMinValue = config.indexOfMinValue ?? Optional.empty();
    this._indexOfMaxValue = config.indexOfMaxValue ?? Optional.empty();
    this._headTailDiffBits = config.headTailDiffBits ?? Optional.empty();
    this._bestMaxDiffBits = config.bestMaxDiffBits ?? Optional.empty();
    this._pforExceptions = config.pforExceptions ?? Optional.empty();
  }

  bytesTotal(): Optional<number> {
    if (this._bytesOnHeap.isPresent() && this._bytesOffHeap.isPresent()) {
      return Optional.of(this._bytesOnHeap.get() + this._bytesOffHeap.get());
    } else if (this._bytesOnHeap.isPresent()) {
      return this._bytesOnHeap;
    } else if (this._bytesOffHeap.isPresent()) {
      return this._bytesOffHeap;
    }
    return Optional.empty();
  }

  pages(): number { return this._pages; }
  bytesOnHeap(): Optional<number> { return this._bytesOnHeap; }
  bytesOffHeap(): Optional<number> { return this._bytesOffHeap; }
  heapAllocations(): ImmutableHistogram { return this._heapAllocations; }
  nativeAllocations(): ImmutableHistogram { return this._nativeAllocations; }
  pageSizes(): ImmutableHistogram { return this._pageSizes; }
  headerBits(): ImmutableHistogram { return this._headerBits; }
  headerAllocations(): ImmutableHistogram { return this._headerAllocations; }
  blockCount(): Optional<number> { return this._blockCount; }
  stdDevBits(): Optional<ImmutableHistogram> { return this._stdDevBits; }
  meanBits(): Optional<ImmutableHistogram> { return this._meanBits; }
  medianBits(): Optional<ImmutableHistogram> { return this._medianBits; }
  blockLengths(): Optional<ImmutableHistogram> { return this._blockLengths; }
  maxBits(): Optional<ImmutableHistogram> { return this._maxBits; }
  minBits(): Optional<ImmutableHistogram> { return this._minBits; }
  indexOfMinValue(): Optional<ImmutableHistogram> { return this._indexOfMinValue; }
  indexOfMaxValue(): Optional<ImmutableHistogram> { return this._indexOfMaxValue; }
  headTailDiffBits(): Optional<ImmutableHistogram> { return this._headTailDiffBits; }
  bestMaxDiffBits(): Optional<ImmutableHistogram> { return this._bestMaxDiffBits; }
  pforExceptions(): Optional<ImmutableHistogram> { return this._pforExceptions; }

  merge(other: MemoryInfo): MemoryInfo {
    return new ImmutableMemoryInfo({
      pages: this.pages() + other.pages(),
      bytesOnHeap: this._mergeOptionalNumbers(this.bytesOnHeap(), other.bytesOnHeap()),
      bytesOffHeap: this._mergeOptionalNumbers(this.bytesOffHeap(), other.bytesOffHeap()),
      heapAllocations: this.heapAllocations().merge(other.heapAllocations()),
      nativeAllocations: this.nativeAllocations().merge(other.nativeAllocations()),
      pageSizes: this.pageSizes().merge(other.pageSizes()),
      headerBits: this.headerBits().merge(other.headerBits()),
      headerAllocations: this.headerAllocations().merge(other.headerAllocations()),
      blockCount: this._mergeOptionalNumbers(this.blockCount(), other.blockCount()),
      blockLengths: this._mergeOptionalHistograms(this.blockLengths(), other.blockLengths()),
      stdDevBits: this._mergeOptionalHistograms(this.stdDevBits(), other.stdDevBits()),
      meanBits: this._mergeOptionalHistograms(this.meanBits(), other.meanBits()),
      medianBits: this._mergeOptionalHistograms(this.medianBits(), other.medianBits()),
      maxBits: this._mergeOptionalHistograms(this.maxBits(), other.maxBits()),
      minBits: this._mergeOptionalHistograms(this.minBits(), other.minBits()),
      indexOfMaxValue: this._mergeOptionalHistograms(this.indexOfMaxValue(), other.indexOfMaxValue()),
      indexOfMinValue: this._mergeOptionalHistograms(this.indexOfMinValue(), other.indexOfMinValue()),
      headTailDiffBits: this._mergeOptionalHistograms(this.headTailDiffBits(), other.headTailDiffBits()),
      bestMaxDiffBits: this._mergeOptionalHistograms(this.bestMaxDiffBits(), other.bestMaxDiffBits()),
      pforExceptions: this._mergeOptionalHistograms(this.pforExceptions(), other.pforExceptions())
    });
  }

  private _mergeOptionalNumbers(left: Optional<number>, right: Optional<number>): Optional<number> {
    if (left.isPresent() && right.isPresent()) {
      return Optional.of(left.get() + right.get());
    } else if (left.isPresent()) {
      return left;
    } else {
      return right;
    }
  }

  private _mergeOptionalHistograms(
    left: Optional<ImmutableHistogram>,
    right: Optional<ImmutableHistogram>
  ): Optional<ImmutableHistogram> {
    if (left.isPresent() && right.isPresent()) {
      return Optional.of(left.get().merge(right.get()));
    } else if (left.isPresent()) {
      return left;
    } else {
      return right;
    }
  }
}

/**
 * Static methods and constants for MemoryInfo.
 */
export namespace MemoryInfo {
  export const EMPTY: MemoryInfo = new ImmutableMemoryInfo({
    pages: 0,
    heapAllocations: ImmutableHistogram.EMPTY,
    nativeAllocations: ImmutableHistogram.EMPTY,
    pageSizes: ImmutableHistogram.EMPTY,
    headerBits: ImmutableHistogram.EMPTY,
    headerAllocations: ImmutableHistogram.EMPTY
  });

  export function of(config: MemoryInfoConfig): MemoryInfo {
    return new ImmutableMemoryInfo(config);
  }
}
