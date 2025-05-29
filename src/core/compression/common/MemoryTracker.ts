/**
 * Memory tracker for compression operations.
 *
 * **Design Pattern**: Strategy pattern with Empty/NonEmpty implementations
 * **Threading**: Uses thread-local storage for block statistics to avoid contention
 * **Performance**: Can be completely disabled via feature toggle for production
 */

import { ImmutableHistogram, EMPTY_HISTOGRAM } from "./ImmutableHistogram";
import { BlockStatistics } from "./BlockStatistics";
// At the top of the file
declare const WorkerGlobalScope: any;

export interface MemoryTracker {
  recordHeapAllocation(size: number): void;
  recordNativeAllocation(size: number): void;
  recordPageSize(size: number): void;
  recordHeaderBits(bits: number): void;
  recordHeaderAllocation(size: number): void;
  recordBlockStatistics(values: number[], start: number, length: number): void;

  heapAllocations(): ImmutableHistogram;
  nativeAllocations(): ImmutableHistogram;
  pageSizes(): ImmutableHistogram;
  headerBits(): ImmutableHistogram;
  headerAllocations(): ImmutableHistogram;
  blockStatistics(): BlockStatistics;
}

/**
 * Feature toggle configuration for memory tracking.
 *
 * **Performance**: Memory tracking has overhead - disable in production if needed.
 */
export class GdsFeatureToggles {
  static ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING = {
    isEnabled(): boolean {
      // Check environment variable or config
      return (
        process.env.GDS_ENABLE_MEMORY_TRACKING === "true" ||
        process.env.NODE_ENV === "development"
      );
    },
  };
}

/**
 * Thread-local storage simulation for JavaScript.
 *
 * **JavaScript Adaptation**: Since JS is single-threaded, we simulate
 * thread-local storage for web workers using a Map keyed by worker ID.
 */
class ThreadLocalStorage<T> {
  private storage = new Map<string, T>();
  private factory: () => T;

  constructor(factory: () => T) {
    this.factory = factory;
  }

  get(): T {
    const workerId = this.getWorkerId();
    if (!this.storage.has(workerId)) {
      this.storage.set(workerId, this.factory());
    }
    return this.storage.get(workerId)!;
  }

  forEach(callback: (value: T) => void): void {
    this.storage.forEach(callback);
  }

  private getWorkerId(): string {
    // In browser: use worker global scope
    if (
      typeof WorkerGlobalScope !== "undefined" &&
      self instanceof WorkerGlobalScope
    ) {
      return "worker-" + (self as any).workerId || "main";
    }
    // In Node.js: use worker_threads
    if (typeof process !== "undefined" && process.versions?.node) {
      const worker_threads = require("worker_threads");
      return worker_threads.isMainThread
        ? "main"
        : `worker-${worker_threads.threadId}`;
    }
    // Fallback: main thread
    return "main";
  }

  close(): void {
    this.storage.clear();
  }
}

/**
 * Full memory tracking implementation with histograms.
 *
 * **Concurrency**: Uses concurrent histograms (approximated with our ImmutableHistogram)
 * **Thread Safety**: Block statistics are thread-local to avoid contention
 */

class NonEmptyMemoryTracker implements MemoryTracker {
  private heapAllocationsHist: ImmutableHistogram.Concurrent;
  private nativeAllocationsHist: ImmutableHistogram.Concurrent;
  private pageSizesHist: ImmutableHistogram.Concurrent;
  private headerBitsHist: ImmutableHistogram.Concurrent;
  private headerAllocationsHist: ImmutableHistogram.Concurrent;
  private blockStatisticsLocal: ThreadLocalStorage<BlockStatistics>;

  constructor() {
    // ✅ FIX: Use the concurrent factory method
    this.heapAllocationsHist = ImmutableHistogram.concurrent();
    this.nativeAllocationsHist = ImmutableHistogram.concurrent();
    this.pageSizesHist = ImmutableHistogram.concurrent();
    this.headerBitsHist = ImmutableHistogram.concurrent();
    this.headerAllocationsHist = ImmutableHistogram.concurrent();
    this.blockStatisticsLocal = new ThreadLocalStorage(
      () => new BlockStatistics()
    );
  }

  recordHeapAllocation(size: number): void {
    this.heapAllocationsHist.record(size); // ✅ Now this works!
  }

  recordNativeAllocation(size: number): void {
    this.nativeAllocationsHist.record(size);
  }

  recordPageSize(size: number): void {
    this.pageSizesHist.record(size);
  }

  recordHeaderBits(bits: number): void {
    this.headerBitsHist.record(bits);
  }

  recordHeaderAllocation(size: number): void {
    this.headerAllocationsHist.record(size);
  }

  recordBlockStatistics(values: number[], start: number, length: number): void {
    this.blockStatisticsLocal.get().record(values, start, length);
  }

  heapAllocations(): ImmutableHistogram {
    return this.heapAllocationsHist;
  }

  nativeAllocations(): ImmutableHistogram {
    return this.nativeAllocationsHist;
  }

  pageSizes(): ImmutableHistogram {
    return this.pageSizesHist;
  }

  headerBits(): ImmutableHistogram {
    return this.headerBitsHist;
  }

  headerAllocations(): ImmutableHistogram {
    return this.headerAllocationsHist;
  }

  blockStatistics(): BlockStatistics {
    // Merge all thread-local block statistics
    const union = new BlockStatistics();
    this.blockStatisticsLocal.forEach((localStats) => {
      localStats.mergeInto(union);
    });
    return union;
  }

  /**
   * Cleanup resources - important for web workers
   */
  close(): void {
    this.blockStatisticsLocal.close();
  }
}

/**
 * No-op memory tracker for production use.
 *
 * **Performance**: Zero overhead when memory tracking is disabled.
 * All methods are empty and will be optimized away by JS engines.
 */
class EmptyMemoryTracker implements MemoryTracker {
  recordHeapAllocation(size: number): void {
    // No-op for performance
  }

  recordNativeAllocation(size: number): void {
    // No-op for performance
  }

  recordPageSize(size: number): void {
    // No-op for performance
  }

  recordHeaderBits(bits: number): void {
    // No-op for performance
  }

  recordHeaderAllocation(size: number): void {
    // No-op for performance
  }

  recordBlockStatistics(values: number[], start: number, length: number): void {
    // No-op for performance
  }

  heapAllocations(): ImmutableHistogram {
    return EMPTY_HISTOGRAM;
  }

  nativeAllocations(): ImmutableHistogram {
    return EMPTY_HISTOGRAM;
  }

  pageSizes(): ImmutableHistogram {
    return EMPTY_HISTOGRAM;
  }

  headerBits(): ImmutableHistogram {
    return EMPTY_HISTOGRAM;
  }

  headerAllocations(): ImmutableHistogram {
    return EMPTY_HISTOGRAM;
  }

  blockStatistics(): BlockStatistics {
    return BlockStatistics.EMPTY;
  }
}

/**
 * Factory for creating MemoryTracker instances.
 */
export class MemoryTrackerFactory {
  private static readonly EMPTY: MemoryTracker = new EmptyMemoryTracker();

  /**
   * Create a memory tracker based on feature toggle configuration.
   *
   * **Production**: Returns empty tracker for zero overhead
   * **Development**: Returns full tracking implementation
   */
  static create(): MemoryTracker {
    return GdsFeatureToggles.ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING.isEnabled()
      ? new NonEmptyMemoryTracker()
      : MemoryTrackerFactory.empty();
  }

  /**
   * Create an empty (no-op) memory tracker.
   */
  static empty(): MemoryTracker {
    return MemoryTrackerFactory.EMPTY;
  }
}

/**
 * Usage example:
 *
 * ```typescript
 * // During graph compression
 * const tracker = MemoryTrackerFactory.create();
 *
 * // Record allocations as they happen
 * tracker.recordHeapAllocation(adjacencyList.byteLength);
 * tracker.recordHeaderBits(compressionHeader.bitCount);
 * tracker.recordBlockStatistics(compressedBlock, 0, blockSize);
 *
 * // Generate final report
 * const memoryInfo = MemoryInfoUtil.fromMemoryTracker(tracker, pageCount);
 * console.log(MemoryInfoUtils.generateReport(memoryInfo));
 * ```
 */
