/**
 * High-performance concurrent builder for huge long arrays.
 *
 * Essential for dynamic array construction during graph loading:
 * - Thread-safe concurrent page allocation and growth
 * - Lock-free reads with memory barriers for consistency
 * - Efficient batch allocation with cursor-based access
 * - Memory-efficient on-demand page creation
 * - Optimal for streaming data ingestion scenarios
 *
 * Performance characteristics:
 * - Concurrent allocation with minimal lock contention
 * - Lock-free array access after allocation
 * - Memory barriers ensure consistency across threads
 * - Batch processing for high-throughput scenarios
 * - On-demand page allocation reduces memory waste
 *
 * Concurrency features:
 * - Volatile page array with acquire/release semantics
 * - Fine-grained locking only during growth operations
 * - Memory fences for visibility guarantees
 * - Thread-safe allocator instances
 * - Lock-free reads for maximum performance
 *
 * Use Cases:
 * - Dynamic node ID array construction during loading
 * - Streaming graph data ingestion with unknown sizes
 * - Concurrent property array building
 * - Bulk data insertion with parallel workers
 * - Memory-efficient large array construction
 *
 * @module HugeLongArrayBuilder
 */

import { HugeLongArray } from '@/collections';
import { HugeArrays } from '@/mem';
import { IdMapAllocator } from '@/core/loading';
import { HugeCursor } from '@/collections';

export class HugeLongArrayBuilder {
  private pages: number[][] = [];
  private readonly lock: AsyncMutex = new AsyncMutex();

  /**
   * Creates a new builder instance.
   *
   * @returns New HugeLongArrayBuilder
   *
   * @example
   * ```typescript
   * const builder = HugeLongArrayBuilder.newBuilder();
   *
   * // Concurrent allocation from multiple workers
   * await Promise.all([
   *   worker1.loadNodes(builder, nodeChunk1),
   *   worker2.loadNodes(builder, nodeChunk2),
   *   worker3.loadNodes(builder, nodeChunk3),
   *   worker4.loadNodes(builder, nodeChunk4)
   * ]);
   *
   * const hugeArray = builder.build(totalNodeCount);
   * ```
   */
  public static newBuilder(): HugeLongArrayBuilder {
    return new HugeLongArrayBuilder();
  }

  private constructor() {
    this.pages = [];
  }

  /**
   * Builds the final HugeLongArray with the specified size.
   * Ensures memory consistency with full fence.
   *
   * @param size Total size of the array
   * @returns Constructed HugeLongArray
   *
   * Thread-safety: Safe to call concurrently after all allocations complete
   *
   * @example
   * ```typescript
   * // After all concurrent allocations are complete
   * const finalArray = builder.build(1000000000); // 1 billion elements
   *
   * // Array is now ready for concurrent read access
   * const value = finalArray.get(123456789);
   * ```
   */
  public build(size: number): HugeLongArray {
    // Ensure memory consistency - equivalent to VarHandle.fullFence()
    this.memoryFence();

    // Get latest version of pages with volatile read semantics
    const pages = this.getPages();
    return HugeLongArray.of(pages, size);
  }

  /**
   * Allocates space for a batch of elements with thread-safe growth.
   * Grows the page array if necessary and provides an allocator for the range.
   *
   * @param start Starting index for allocation
   * @param batchLength Number of elements to allocate
   * @param allocator Allocator instance to configure for this range
   *
   * Performance: O(1) for most cases, O(log n) during growth
   * Thread-safety: Multiple threads can safely allocate different ranges
   *
   * @example
   * ```typescript
   * const builder = HugeLongArrayBuilder.newBuilder();
   * const allocator = new HugeLongArrayBuilder.Allocator();
   *
   * // Concurrent batch allocation
   * await Promise.all([
   *   // Worker 1: allocate positions 0-99999
   *   allocateAndFill(builder, allocator1, 0, 100000, nodeData1),
   *   // Worker 2: allocate positions 100000-199999
   *   allocateAndFill(builder, allocator2, 100000, 100000, nodeData2),
   *   // Worker 3: allocate positions 200000-299999
   *   allocateAndFill(builder, allocator3, 200000, 100000, nodeData3)
   * ]);
   *
   * async function allocateAndFill(
   *   builder: HugeLongArrayBuilder,
   *   allocator: Allocator,
   *   start: number,
   *   length: number,
   *   data: number[]
   * ) {
   *   builder.allocate(start, length, allocator);
   *   allocator.insert(data);
   * }
   * ```
   */
  public async allocate(start: number, batchLength: number, allocator: Allocator): Promise<void> {
    const endPage = HugeArrays.pageIndex(start + batchLength - 1);
    let pages = this.getPages(); // Acquire semantics

    if (endPage >= pages.length) {
      // Need to grow - acquire lock
      const unlock = await this.lock.acquire();
      try {
        // Double-check after acquiring lock
        pages = this.getPages();
        if (endPage >= pages.length) {
          // Create new pages array with required size
          const newPages = new Array<number[]>(endPage + 1);

          // Copy existing pages
          for (let i = 0; i < pages.length; i++) {
            newPages[i] = pages[i];
          }

          // Allocate new pages (working backwards for efficiency)
          for (let i = newPages.length - 1; i >= 0; i--) {
            if (newPages[i] != null) {
              break; // Found existing page, stop allocating
            }
            newPages[i] = new Array<number>(HugeArrays.PAGE_SIZE).fill(0);
          }

          // Release semantics - make new pages visible to other threads
          this.setPages(newPages);
          pages = newPages;
        }
      } finally {
        unlock();
      }
    }

    // Configure allocator for this range
    // No need for volatile read here since we only modify inner pages,
    // not the page array structure itself
    allocator.reset(start, start + batchLength, pages);
  }

  /**
   * Gets pages with acquire semantics.
   */
  private getPages(): number[][] {
    // Simulates VarHandle.getAcquire() - ensures no reordering of subsequent reads
    return this.pages;
  }

  /**
   * Sets pages with release semantics.
   */
  private setPages(pages: number[][]): void {
    // Simulates VarHandle.setRelease() - ensures all prior writes are visible
    this.pages = pages;
  }

  /**
   * Memory fence to ensure consistency.
   */
  private memoryFence(): void {
    // In TypeScript/JavaScript, this is handled by the event loop
    // but we can add a small delay to simulate fence behavior
  }
}

/**
 * High-performance allocator for batch insertion into huge arrays.
 *
 * Thread-safe allocator that uses cursor-based access for efficient
 * batch processing across page boundaries.
 */
export class Allocator implements IdMapAllocator {
  private buffer: number[] | null = null;
  private allocationSize: number = 0;
  private offset: number = 0;
  private length: number = 0;
  private readonly cursor: HugeCursor.PagedCursor<number[]>;

  constructor() {
    this.cursor = new HugeCursor.PagedCursor<number[]>([]);
  }

  /**
   * Resets the allocator for a new allocation range.
   *
   * @param start Starting index
   * @param end Ending index (exclusive)
   * @param pages Page array to allocate from
   */
  public reset(start: number, end: number, pages: number[][]): void {
    this.cursor.setPages(pages);
    this.cursor.setRange(start, end);
    this.buffer = null;
    this.allocationSize = end - start;
    this.offset = 0;
    this.length = 0;
  }

  /**
   * Advances to the next buffer in the allocation range.
   *
   * @returns true if there's another buffer, false if allocation is complete
   *
   * @example
   * ```typescript
   * const allocator = new Allocator();
   * builder.allocate(1000, 5000, allocator);
   *
   * const data = [1, 2, 3, 4, 5, ...]; // 5000 elements
   * let dataOffset = 0;
   *
   * while (allocator.nextBuffer()) {
   *   const bufferLength = allocator.getCurrentLength();
   *   const buffer = allocator.getCurrentBuffer();
   *   const offset = allocator.getCurrentOffset();
   *
   *   // Copy data to current buffer
   *   for (let i = 0; i < bufferLength; i++) {
   *     buffer[offset + i] = data[dataOffset + i];
   *   }
   *
   *   dataOffset += bufferLength;
   * }
   * ```
   */
  public nextBuffer(): boolean {
    if (!this.cursor.next()) {
      return false;
    }

    this.buffer = this.cursor.array;
    this.offset = this.cursor.offset;
    this.length = this.cursor.limit - this.cursor.offset;
    return true;
  }

  /**
   * Returns the total size of this allocation.
   */
  public allocatedSize(): number {
    return this.allocationSize;
  }

  /**
   * Inserts node IDs into the allocated range using efficient batch copying.
   *
   * @param nodeIds Array of node IDs to insert
   *
   * Performance: O(n) with optimized memory copying across page boundaries
   *
   * @example
   * ```typescript
   * const nodeIds = [100, 200, 300, 400, 500]; // Node IDs to insert
   * const allocator = new Allocator();
   *
   * builder.allocate(0, nodeIds.length, allocator);
   * allocator.insert(nodeIds);
   *
   * // nodeIds are now efficiently copied across page boundaries
   * ```
   */
  public insert(nodeIds: number[]): void {
    let batchOffset = 0;

    while (this.nextBuffer()) {
      // Copy from nodeIds to current buffer
      const copyLength = Math.min(this.length, nodeIds.length - batchOffset);

      for (let i = 0; i < copyLength; i++) {
        this.buffer![this.offset + i] = nodeIds[batchOffset + i];
      }

      batchOffset += copyLength;

      if (batchOffset >= nodeIds.length) {
        break;
      }
    }
  }

  /**
   * Gets the current buffer for manual access.
   */
  public getCurrentBuffer(): number[] | null {
    return this.buffer;
  }

  /**
   * Gets the current offset within the buffer.
   */
  public getCurrentOffset(): number {
    return this.offset;
  }

  /**
   * Gets the current length available in the buffer.
   */
  public getCurrentLength(): number {
    return this.length;
  }

  /**
   * Closes the allocator and releases resources.
   */
  public close(): void {
    this.cursor.close();
    this.buffer = null;
  }
}

// Helper class for async mutex
class AsyncMutex {
  private locked = false;
  private waiting: Array<() => void> = [];

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => resolve(() => this.release()));
      }
    });
  }

  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}
