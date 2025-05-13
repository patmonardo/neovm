import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { HugeCursor } from '../../../collections/cursor/HugeCursor';
import { HugeArrays } from '../../mem/HugeArrays';
import { IdMapAllocator } from '../../loading/IdMapAllocator';

/**
 * Builder for creating HugeLongArrays with concurrent allocation capabilities.
 * Allows efficient memory allocation and building of large arrays across multiple threads.
 */
export class HugeLongArrayBuilder {
  /**
   * The pages of the array being built.
   * Each page is a fixed-size array of numbers (representing longs).
   */
  private pages: BigInt64Array[] = [];

  /**
   * Lock for synchronizing page allocation.
   */
  private readonly lock = new Mutex();

  /**
   * Creates a new builder.
   */
  public static newBuilder(): HugeLongArrayBuilder {
    return new HugeLongArrayBuilder();
  }

  /**
   * Private constructor to enforce factory method usage.
   */
  private constructor() {}

  /**
   * Builds a HugeLongArray with the given size.
   *
   * @param size The size of the array to build
   * @returns A new HugeLongArray
   */
  public build(size: number): HugeLongArray {
    // Ensure all writes are visible before building the final array
    return HugeLongArray.of(this.pages, size);
  }

  /**
   * Allocates memory for the given range and makes it available to the allocator.
   *
   * @param start The start index (inclusive)
   * @param batchLength The length of the batch
   * @param allocator The allocator to use
   */
  public async allocate(start: number, batchLength: number, allocator: Allocator): Promise<void> {
    const endPage = HugeArrays.pageIndex(start + batchLength - 1, HugeArrays.PAGE_SHIFT);

    // Check if we need to grow the pages array
    if (endPage >= this.pages.length) {
      // Lock to ensure thread safety during page allocation
      await this.lock.acquire();

      try {
        // Check again after acquiring the lock
        if (endPage >= this.pages.length) {
          // Create a new array with additional pages
          const newPages = [...this.pages];

          // Extend the array to the required size
          while (newPages.length <= endPage) {
            newPages.push(new BigInt64Array(HugeArrays.PAGE_SIZE));
          }

          // Update the pages reference
          this.pages = newPages;
        }
      } finally {
        this.lock.release();
      }
    }

    // Reset the allocator to use the newly allocated pages
    allocator.reset(start, start + batchLength, this.pages);
  }

  /**
   * Allocator for writing values to the array being built.
   * Provides efficient access to the underlying storage.
   */
  public static Allocator = class implements IdMapAllocator, AutoCloseable {
    private buffer: BigInt64Array | null = null;
    private allocationSize = 0;
    private offset = 0;
    private length = 0;

    private readonly cursor: HugeCursor.PagedCursor<BigInt64Array>;

    /**
     * Creates a new allocator.
     */
    constructor() {
      this.cursor = new HugeCursor.PagedCursor<BigInt64Array>([]);
    }

    /**
     * Resets the allocator to work with the given range and pages.
     *
     * @param start The start index (inclusive)
     * @param end The end index (exclusive)
     * @param pages The pages to allocate from
     */
    reset(start: number, end: number, pages: BigInt64Array[]): void {
      this.cursor.setPages(pages);
      this.cursor.setRange(start, end);
      this.buffer = null;
      this.allocationSize = end - start;
      this.offset = 0;
      this.length = 0;
    }

    /**
     * Advances to the next buffer.
     *
     * @returns true if a buffer is available, false otherwise
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

    /**
     * Returns the total allocated size.
     */
    allocatedSize(): number {
      return this.allocationSize;
    }

    /**
     * Inserts node IDs into the allocated space.
     *
     * @param nodeIds The node IDs to insert
     */
    insert(nodeIds: number[]): void {
      let batchOffset = 0;
      while (this.nextBuffer()) {
        if (this.buffer) {
          for (let i = 0; i < this.length; i++) {
            this.buffer[this.offset + i] = nodeIds[batchOffset + i];
          }
          batchOffset += this.length;
        }
      }
    }

    /**
     * Closes the allocator and releases resources.
     */
    close(): void {
      this.cursor.close();
    }
  }
}

/**
 * Interface for objects that can be automatically closed.
 */
interface AutoCloseable {
  close(): void;
}

/**
 * Simple mutex implementation for exclusive access.
 */
class Mutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  /**
   * Acquires the lock.
   */
  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /**
   * Releases the lock.
   */
  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    } else {
      this.locked = false;
    }
  }
}
