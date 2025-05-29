/**
 * Core memory page allocation system for huge data structures.
 *
 * Provides efficient memory management through page-based allocation:
 * - Consistent page sizes for predictable memory usage
 * - Type-safe page creation for different data types
 * - Memory estimation for capacity planning
 * - Factory pattern for allocator configuration
 *
 * Essential for billion-scale data structures:
 * - HugeLongArray: pages of long arrays
 * - HugeDoubleArray: pages of double arrays
 * - HugeObjectArray: pages of object arrays
 * - Matrix implementations: efficient 2D page layouts
 *
 * Performance characteristics:
 * - Page sizes optimized for cache performance (32KB default)
 * - Power-of-2 page sizes for efficient index calculations
 * - Minimal allocation overhead through page reuse
 * - Memory-mapped file compatibility
 *
 * Memory Management Benefits:
 * - Predictable allocation patterns
 * - Reduced garbage collection pressure
 * - Better cache locality within pages
 * - Support for memory-mapped storage
 * - Efficient memory estimation and planning
 *
 * @module PageAllocator
 */

import { BitUtil } from "@/mem";
import { Estimate } from "@/mem";
import { PageUtil } from "@/collections";

/**
 * Abstract base class for page allocation strategies.
 * Defines the contract for creating and managing memory pages.
 */
export abstract class PageAllocator<T> {
  /**
   * Creates a new page of type T.
   * Each page contains a fixed number of elements.
   *
   * @returns New page instance
   */
  public abstract newPage(): T;

  /**
   * Returns the number of elements per page.
   * This is constant for a given allocator instance.
   *
   * @returns Elements per page
   */
  public abstract pageSize(): number;

  /**
   * Returns empty pages array for type inference.
   * Used by TypeScript for proper array typing.
   *
   * @returns Empty pages array of correct type
   */
  public abstract emptyPages(): T[];

  /**
   * Returns memory usage per page in bytes.
   * Includes array overhead and element storage.
   *
   * @returns Bytes per page
   */
  public abstract bytesPerPage(): number;

  /**
   * Estimates total memory usage for given number of elements.
   * Essential for capacity planning and resource allocation.
   *
   * @param size Total number of elements needed
   * @returns Estimated memory usage in bytes
   *
   * @example
   * ```typescript
   * const allocator = PageAllocator.ofArray(Number);
   * const memoryNeeded = allocator.estimateMemoryUsage(1000000000);
   * console.log(`1B elements needs ~${memoryNeeded / 1024 / 1024 / 1024} GB`);
   * ```
   */
  public estimateMemoryUsage(size: number): number {
    const numPages = PageUtil.numPagesFor(size, this.pageSize());
    return numPages * this.bytesPerPage();
  }

  /**
   * Creates a factory for custom page allocators.
   *
   * @param pageSize Number of elements per page (must be power of 2)
   * @param bytesPerPage Memory usage per page
   * @param newPage Function to create new pages
   * @param emptyPages Empty pages array for typing
   * @returns Factory for creating allocators
   */
  public static of<T>(
    pageSize: number,
    bytesPerPage: number,
    newPage: PageFactory<T>,
    emptyPages: T[]
  ): Factory<T> {
    return new Factory<T>(pageSize, bytesPerPage, newPage, emptyPages);
  }

  /**
   * Creates a factory for primitive array page allocators.
   * Mirrors the Java Class<T> arrayClass pattern.
   *
   * @param arrayClass String identifier for the array type
   * @returns Factory configured for the specified array type
   */
  public static ofArray<T extends ArrayLike<number>>(
    arrayClass:
      | "Int8Array"
      | "Int16Array"
      | "Int32Array"
      | "Float32Array"
      | "Float64Array"
  ): Factory<T> {
    // Get the constructor and element info
    const arrayInfo = this.getArrayInfo(arrayClass);

    // Calculate optimal page size (target 32KB pages)
    const pageSize = PageUtil.pageSizeFor(
      PageUtil.PAGE_SIZE_32KB,
      arrayInfo.bytesPerElement
    );

    // Calculate actual bytes per page including overhead
    const bytesPerPage = Estimate.sizeOfArray(
      pageSize,
      arrayInfo.bytesPerElement
    );

    // Create empty pages array for typing
    const emptyPages = [] as T[];

    // Page factory function
    const newPage: PageFactory<T> = () =>
      new arrayInfo.constructor(pageSize) as T;

    return PageAllocator.of(pageSize, bytesPerPage, newPage, emptyPages);
  }

  /**
   * Get array constructor and metadata from class name.
   */
  private static getArrayInfo(arrayClass: string): {
    constructor: new (size: number) => ArrayLike<number>;
    bytesPerElement: number;
  } {
    switch (arrayClass) {
      case "Int8Array":
        return { constructor: Int8Array, bytesPerElement: 1 };
      case "Int16Array":
        return { constructor: Int16Array, bytesPerElement: 2 };
      case "Int32Array":
        return { constructor: Int32Array, bytesPerElement: 4 };
      case "Float32Array":
        return { constructor: Float32Array, bytesPerElement: 4 };
      case "Float64Array":
        return { constructor: Float64Array, bytesPerElement: 8 };
      default:
        throw new Error(`Unsupported array class: ${arrayClass}`);
    }
  }

  /**
   * Creates a factory for JavaScript number arrays.
   * Uses standard Arrays for compatibility.
   */
  public static ofNumberArray(): Factory<number[]> {
    const bytesPerElement = 8; // JavaScript numbers are 64-bit floats
    const pageSize = PageUtil.pageSizeFor(
      PageUtil.PAGE_SIZE_32KB,
      bytesPerElement
    );
    const bytesPerPage = Estimate.sizeOfArray(pageSize, bytesPerElement);

    const emptyPages: number[][] = [];
    const newPage: PageFactory<number[]> = () => new Array<number>(pageSize);

    return PageAllocator.of(pageSize, bytesPerPage, newPage, emptyPages);
  }
}

/**
 * Factory for creating page allocators with specific configurations.
 * Encapsulates all the parameters needed for consistent allocation.
 */
export class Factory<T> {
  constructor(
    private readonly pageSize: number,
    private readonly bytesPerPage: number,
    private readonly newPage: PageFactory<T>,
    private readonly emptyPages: T[]
  ) {}

  /**
   * Creates a new allocator instance.
   * Each allocator maintains its own allocation state.
   *
   * @returns New page allocator
   */
  public newAllocator(): PageAllocator<T> {
    return new DirectAllocator<T>(
      this.newPage,
      this.emptyPages,
      this.pageSize,
      this.bytesPerPage
    );
  }

  /**
   * Gets the page size for this factory.
   */
  public getPageSize(): number {
    return this.pageSize;
  }

  /**
   * Gets the bytes per page for this factory.
   */
  public getBytesPerPage(): number {
    return this.bytesPerPage;
  }

  /**
   * Estimates memory usage for a given number of elements.
   */
  public estimateMemoryUsage(size: number): number {
    const numPages = PageUtil.numPagesFor(size, this.pageSize);
    return numPages * this.bytesPerPage;
  }
}

/**
 * Function interface for creating new pages.
 */
export interface PageFactory<T> {
  (): T;
}

/**
 * Direct implementation of PageAllocator.
 * Uses simple delegation to factory functions.
 */
class DirectAllocator<T> extends PageAllocator<T> {
  constructor(
    private readonly newPageFn: PageFactory<T>,
    private readonly emptyPagesArray: T[],
    private readonly pageSizeValue: number,
    private readonly bytesPerPageValue: number
  ) {
    super();
    console.assert(
      BitUtil.isPowerOfTwo(pageSizeValue),
      "Page size must be power of 2"
    );
  }

  public newPage(): T {
    return this.newPageFn();
  }

  public pageSize(): number {
    return this.pageSizeValue;
  }

  public bytesPerPage(): number {
    return this.bytesPerPageValue;
  }

  public emptyPages(): T[] {
    return this.emptyPagesArray;
  }
}

/**
 * Determines bytes per element for different array types.
 */
export function getBytesPerElement<T extends ArrayLike<number>>(
  arrayType: new (size: number) => T
): number {
  // Create a small test array to determine element size
  const testArray = new arrayType(1);

  if (testArray instanceof Int8Array || testArray instanceof Uint8Array) {
    return 1;
  } else if (
    testArray instanceof Int16Array ||
    testArray instanceof Uint16Array
  ) {
    return 2;
  } else if (
    testArray instanceof Int32Array ||
    testArray instanceof Uint32Array ||
    testArray instanceof Float32Array
  ) {
    return 4;
  } else if (
    testArray instanceof Float64Array ||
    testArray instanceof BigInt64Array ||
    testArray instanceof BigUint64Array
  ) {
    return 8;
  } else {
    // Default to 8 bytes for JavaScript numbers
    return 8;
  }
}
