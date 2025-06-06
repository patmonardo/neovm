import { IdMap } from '@/api';
import { HugeCursor } from '@/collections';
import { HugeLongArray } from '@/collections';
import { Concurrency } from '@/concurrency';
import { CloseableThreadLocal } from '@/utils';
import { IdMapBuilder } from './IdMapBuilder';
import { IdMapAllocator } from './IdMapAllocator';
import { ArrayIdMapBuilderOps } from './ArrayIdMapBuilderOps';

/**
 * High-performance array-based ID map builder with concurrent allocation.
 *
 * Uses atomic allocation for thread-safe space reservation and thread-local
 * bulk adders for contention-free insertion. Optimized for dense, sequential
 * node ID patterns with excellent cache locality.
 *
 * Key features:
 * - Atomic batch allocation with zero insertion contention
 * - Cursor-based huge array access for >2GB datasets
 * - Thread-local bulk adders for maximum throughput
 * - Streaming insertion with automatic page management
 */
export class ArrayIdMapBuilder implements IdMapBuilder {
  public static readonly ID = 'array';

  private readonly _array: HugeLongArray;
  private readonly capacity: number;
  private readonly allocationIndex: AtomicLong;
  private readonly adders: CloseableThreadLocal<BulkAdder>;

  /**
   * Create a new ArrayIdMapBuilder with the specified capacity.
   *
   * @param capacity Maximum number of nodes this builder can handle
   * @returns A new ArrayIdMapBuilder instance
   */
  static of(capacity: number): ArrayIdMapBuilder {
    const array = HugeLongArray.newArray(capacity);
    return new ArrayIdMapBuilder(array, capacity);
  }

  private constructor(array: HugeLongArray, capacity: number) {
    this._array = array;
    this.capacity = capacity;
    this.allocationIndex = new AtomicLong();
    this.adders = CloseableThreadLocal.withInitial(() => this.newBulkAdder());
  }

  allocate(batchLength: number): BulkAdder {
    // Atomically reserve space in the array
    const startIndex = this.allocationIndex.getAndAccumulate(batchLength, (lower, nodes) =>
      this.upperAllocation(lower, nodes)
    );

    // Get thread-local bulk adder and configure it for this allocation
    const adder = this.adders.get();
    adder.reset(startIndex, this.upperAllocation(startIndex, batchLength));
    return adder;
  }

  build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number,
    concurrency: Concurrency
  ): IdMap {
    // Close all thread-local resources
    this.adders.close();

    // Get final state
    const nodeCount = this.size();
    const internalToOriginalIds = this._array();

    // Delegate to ArrayIdMapBuilderOps for final assembly
    return ArrayIdMapBuilderOps.build(
      internalToOriginalIds,
      nodeCount,
      labelInformationBuilder,
      highestNodeId,
      concurrency
    );
  }

  /**
   * Get the underlying huge array.
   */
  array(): HugeLongArray {
    return this._array;
  }

  /**
   * Get the current number of allocated nodes.
   */
  size(): number {
    return this.allocationIndex.get();
  }

  /**
   * Get builder statistics for monitoring and debugging.
   */
  getBuilderStats(): ArrayIdMapBuilderStats {
    return {
      builderId: ArrayIdMapBuilder.ID,
      capacity: this.capacity,
      allocatedNodes: this.size(),
      remainingCapacity: this.capacity - this.size(),
      utilizationPercentage: (this.size() / this.capacity) * 100,
      hasActiveAdders: !this.adders.isClosed()
    };
  }

  /**
   * Calculate the upper bound of an allocation.
   */
  private upperAllocation(lower: number, nodes: number): number {
    return Math.min(this.capacity, lower + nodes);
  }

  private newBulkAdder(): BulkAdder {
    return new BulkAdder(this._array, this._array.newCursor());
  }
}

/**
 * Thread-local bulk adder for efficient batch insertion with cursor-based access.
 *
 * Handles streaming insertion across multiple memory pages using HugeCursor
 * for efficient page-by-page processing. Designed for zero-contention operation
 * within a pre-allocated address space.
 */
export class BulkAdder implements IdMapAllocator {
  private buffer: number[] | null = null;
  private allocationSize: number = 0;
  private offset: number = 0;
  private length: number = 0;
  private readonly array: HugeLongArray;
  private readonly cursor: HugeCursor<number[]>;

  constructor(array: HugeLongArray, cursor: HugeCursor<number[]>) {
    this._array = array;
    this.cursor = cursor;
  }

  /**
   * Reset this bulk adder for a new allocation range.
   *
   * @param start Starting index in the huge array
   * @param end Ending index (exclusive) in the huge array
   */
  reset(start: number, end: number): void {
    this._array.initCursor(this.cursor, start, end);
    this.buffer = null;
    this.allocationSize = end - start;
    this.offset = 0;
    this.length = 0;
  }

  /**
   * Move to the next buffer page.
   *
   * @returns true if a next buffer is available, false if at end
   */
  nextBuffer(): boolean {
    if (!this.cursor.next()) {
      return false;
    }

    this.buffer = this.cursor.array;
    this.offset = this.cursor.offset;
    this.length = this.cursor.limit - this.cursor.offset;
    return true;
  }

  allocatedSize(): number {
    return this.allocationSize;
  }

  insert(nodeIds: number[]): void {
    if (nodeIds.length !== this.allocationSize) {
      throw new Error(
        `Insert size mismatch: expected ${this.allocationSize}, got ${nodeIds.length}`
      );
    }

    let batchOffset = 0;

    // Stream insertion across multiple pages
    while (this.nextBuffer()) {
      if (!this.buffer) {
        throw new Error('Buffer is null after successful nextBuffer()');
      }

      // Copy chunk to current page
      this.buffer.splice(this.offset, this.length, ...nodeIds.slice(batchOffset, batchOffset + this.length));
      batchOffset += this.length;
    }

    if (batchOffset !== nodeIds.length) {
      throw new Error(
        `Incomplete insertion: wrote ${batchOffset} of ${nodeIds.length} nodes`
      );
    }
  }

  /**
   * Check if this bulk adder is properly initialized.
   */
  isInitialized(): boolean {
    return this.allocationSize > 0;
  }

  /**
   * Get debug information about the current state.
   */
  getDebugInfo(): BulkAdderDebugInfo {
    return {
      allocationSize: this.allocationSize,
      currentOffset: this.offset,
      currentLength: this.length,
      hasBuffer: this.buffer !== null,
      bufferSize: this.buffer?.length ?? 0
    };
  }
}

/**
 * Statistics about ArrayIdMapBuilder state.
 */
export interface ArrayIdMapBuilderStats {
  builderId: string;
  capacity: number;
  allocatedNodes: number;
  remainingCapacity: number;
  utilizationPercentage: number;
  hasActiveAdders: boolean;
}

/**
 * Debug information about BulkAdder state.
 */
interface BulkAdderDebugInfo {
  allocationSize: number;
  currentOffset: number;
  currentLength: number;
  hasBuffer: boolean;
  bufferSize: number;
}

/**
 * Simple atomic long implementation for allocation indexing.
 */
class AtomicLong {
  private value: number = 0;

  get(): number {
    return this.value;
  }

  getAndAccumulate(delta: number, accumulatorFunction: (current: number, delta: number) => number): number {
    const currentValue = this.value;
    this.value = accumulatorFunction(currentValue, delta);
    return currentValue;
  }

  set(newValue: number): void {
    this.value = newValue;
  }

  incrementAndGet(): number {
    return ++this.value;
  }

  addAndGet(delta: number): number {
    this.value += delta;
    return this.value;
  }
}
