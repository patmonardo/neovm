/**
 * Interface for creating and initializing pages in huge atomic array implementations.
 *
 * This interface provides **page initialization strategies** for atomic huge arrays that need
 * to create and populate pages on-demand. It's designed for memory-efficient initialization
 * of massive datasets where not all pages may be needed immediately, and supports both
 * bulk page creation and individual page initialization patterns.
 *
 * **Design Philosophy:**
 *
 * **1. Lazy Page Allocation:**
 * Pages are created and initialized only when needed, reducing memory footprint for
 * sparse data structures commonly found in graph analytics (e.g., sparse adjacency
 * matrices, partial node property arrays).
 *
 * **2. Initialization Strategy Pattern:**
 * Different page creators can implement various initialization strategies:
 * - **Zero initialization**: Fill pages with default values (0, 0.0, null)
 * - **Computed initialization**: Fill pages with calculated values based on global index
 * - **Pattern initialization**: Fill pages with specific patterns or sequences
 * - **Sparse initialization**: Initialize only specific elements within pages
 *
 * **3. Atomic Array Integration:**
 * Designed specifically for atomic huge arrays where page initialization must be
 * thread-safe and support atomic operations from the moment pages are created.
 *
 * **Memory Management Benefits:**
 *
 * **Reduced Peak Memory Usage:**
 * By creating pages on-demand, applications can process datasets larger than available
 * memory by working with subsets of data and allowing garbage collection to reclaim
 * unused pages.
 *
 * **Cache-Friendly Initialization:**
 * Page-by-page initialization ensures that newly created pages are hot in CPU cache
 * when first accessed, improving performance for algorithms with strong locality.
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Sparse Node Property Arrays:**
 * ```typescript
 * // Initialize pages only for nodes that have specific properties
 * class SparsePropertyPageCreator implements DoublePageCreator {
 *   private nodeHasProperty: Set<number>;
 *
 *   constructor(nodesWithProperty: Set<number>) {
 *     this.nodeHasProperty = nodesWithProperty;
 *   }
 *
 *   fill(pages: Float64Array[], lastPageSize: number, pageShift: number): void {
 *     const pageSize = 1 << pageShift;
 *
 *     for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
 *       const currentPageSize = pageIndex === pages.length - 1 ? lastPageSize : pageSize;
 *       pages[pageIndex] = new Float64Array(currentPageSize);
 *       this.fillPage(pages[pageIndex], pageIndex * pageSize);
 *     }
 *   }
 *
 *   fillPage(page: Float64Array, base: number): void {
 *     for (let i = 0; i < page.length; i++) {
 *       const globalIndex = base + i;
 *       if (this.nodeHasProperty.has(globalIndex)) {
 *         page[i] = this.computePropertyValue(globalIndex);
 *       }
 *       // Other elements remain 0.0 (default)
 *     }
 *   }
 *
 *   private computePropertyValue(nodeId: number): number {
 *     // Compute property value for node
 *     return Math.random() * 100; // Example
 *   }
 * }
 * ```
 *
 * **Distance Matrix Initialization:**
 * ```typescript
 * // Initialize distance matrices with infinity for shortest path algorithms
 * class DistanceMatrixPageCreator implements DoublePageCreator {
 *   private sourceNodes: Set<number>;
 *
 *   constructor(sourceNodes: Set<number>) {
 *     this.sourceNodes = sourceNodes;
 *   }
 *
 *   fill(pages: Float64Array[], lastPageSize: number, pageShift: number): void {
 *     const pageSize = 1 << pageShift;
 *
 *     for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
 *       const currentPageSize = pageIndex === pages.length - 1 ? lastPageSize : pageSize;
 *       pages[pageIndex] = new Float64Array(currentPageSize);
 *       this.fillPage(pages[pageIndex], pageIndex * pageSize);
 *     }
 *   }
 *
 *   fillPage(page: Float64Array, base: number): void {
 *     for (let i = 0; i < page.length; i++) {
 *       const nodeId = base + i;
 *       page[i] = this.sourceNodes.has(nodeId) ? 0.0 : Number.POSITIVE_INFINITY;
 *     }
 *   }
 * }
 * ```
 *
 * **Bit Vector Initialization:**
 * ```typescript
 * // Initialize bit vectors for graph coloring or marking algorithms
 * class BitVectorPageCreator implements BytePageCreator {
 *   private initialPattern: number;
 *
 *   constructor(initialPattern: number = 0) {
 *     this.initialPattern = initialPattern;
 *   }
 *
 *   fill(pages: Int8Array[], lastPageSize: number, pageShift: number): void {
 *     const pageSize = 1 << pageShift;
 *
 *     for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
 *       const currentPageSize = pageIndex === pages.length - 1 ? lastPageSize : pageSize;
 *       pages[pageIndex] = new Int8Array(currentPageSize);
 *       this.fillPage(pages[pageIndex], pageIndex * pageSize);
 *     }
 *   }
 *
 *   fillPage(page: Int8Array, base: number): void {
 *     page.fill(this.initialPattern);
 *   }
 * }
 * ```
 *
 * **Dynamic Range Initialization:**
 * ```typescript
 * // Initialize arrays with values computed from global position
 * class ComputedValuePageCreator implements LongPageCreator {
 *   private computeValue: (index: number) => number;
 *
 *   constructor(computeValue: (index: number) => number) {
 *     this.computeValue = computeValue;
 *   }
 *
 *   fill(pages: BigInt64Array[], lastPageSize: number, pageShift: number): void {
 *     const pageSize = 1 << pageShift;
 *
 *     for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
 *       const currentPageSize = pageIndex === pages.length - 1 ? lastPageSize : pageSize;
 *       pages[pageIndex] = new BigInt64Array(currentPageSize);
 *       this.fillPage(pages[pageIndex], pageIndex * pageSize);
 *     }
 *   }
 *
 *   fillPage(page: BigInt64Array, base: number): void {
 *     for (let i = 0; i < page.length; i++) {
 *       const globalIndex = base + i;
 *       page[i] = BigInt(this.computeValue(globalIndex));
 *     }
 *   }
 * }
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Bulk Initialization:**
 * ```typescript
 * // Optimize for bulk operations when possible
 * class OptimizedPageCreator implements DoublePageCreator {
 *   fill(pages: Float64Array[], lastPageSize: number, pageShift: number): void {
 *     const pageSize = 1 << pageShift;
 *
 *     // Create all pages in a single allocation phase
 *     const totalElements = (pages.length - 1) * pageSize + lastPageSize;
 *     const bulkBuffer = new Float64Array(totalElements);
 *
 *     // Initialize bulk buffer efficiently
 *     this.initializeBulkBuffer(bulkBuffer);
 *
 *     // Copy into individual pages
 *     let offset = 0;
 *     for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
 *       const currentPageSize = pageIndex === pages.length - 1 ? lastPageSize : pageSize;
 *       pages[pageIndex] = bulkBuffer.subarray(offset, offset + currentPageSize);
 *       offset += currentPageSize;
 *     }
 *   }
 *
 *   fillPage(page: Float64Array, base: number): void {
 *     // Individual page initialization for on-demand creation
 *     for (let i = 0; i < page.length; i++) {
 *       page[i] = this.computeValue(base + i);
 *     }
 *   }
 *
 *   private initializeBulkBuffer(buffer: Float64Array): void {
 *     // Efficient bulk initialization
 *     for (let i = 0; i < buffer.length; i++) {
 *       buffer[i] = this.computeValue(i);
 *     }
 *   }
 *
 *   private computeValue(index: number): number {
 *     return index * 0.5; // Example computation
 *   }
 * }
 * ```
 *
 * **Integration with Atomic Arrays:**
 *
 * The PageCreator interface integrates seamlessly with atomic huge arrays:
 * - **Thread-safe initialization**: Pages are fully initialized before being made available
 * - **Atomic operation readiness**: Pages support atomic operations immediately after creation
 * - **Memory visibility**: Proper memory barriers ensure page contents are visible across threads
 * - **Exception safety**: Failed page creation doesn't leave arrays in inconsistent states
 */

/**
 * Generic interface for creating and initializing pages in huge arrays.
 *
 * @template T The type of page array (e.g., Float64Array, Int32Array, Int8Array)
 */
export interface PageCreator<T> {
  /**
   * Creates and initializes all pages for a huge array.
   *
   * This method is responsible for **bulk page creation** when initializing a complete
   * huge array. It must create all pages and initialize them according to the specific
   * strategy implemented by the page creator.
   *
   * **Parameters:**
   * - **pages**: Array to populate with created page instances
   * - **lastPageSize**: Size of the final page (may be smaller than full page size)
   * - **pageShift**: log2(pageSize) for bit manipulation operations
   *
   * **Implementation Requirements:**
   * - Must create exactly `pages.length` page instances
   * - All pages except the last should be full size (1 << pageShift)
   * - The last page should have exactly `lastPageSize` elements
   * - All page elements should be properly initialized
   * - Must be thread-safe if called concurrently
   *
   * @param pages Array to fill with created page instances
   * @param lastPageSize Number of elements in the final page
   * @param pageShift log2 of the page size for address calculation
   */
  fill(pages: T[], lastPageSize: number, pageShift: number): void;

  /**
   * Creates and initializes a single page at the specified base offset.
   *
   * This method handles **on-demand page creation** for lazy initialization strategies.
   * It should create a single page and initialize its contents based on the global
   * offset where the page will be positioned in the huge array.
   *
   * **Base Offset Usage:**
   * The base parameter represents the global index of the first element in this page.
   * This allows the page creator to compute element values based on their position
   * in the overall huge array structure.
   *
   * **Thread Safety:**
   * This method may be called concurrently for different pages and must be thread-safe.
   * However, it will never be called concurrently for the same base offset.
   *
   * @param page The page instance to initialize
   * @param base Global index offset of the first element in this page
   */
  fillPage(page: T, base: number): void;
}

/**
 * Specialized page creator for byte arrays (8-bit signed integers).
 *
 * Used for creating pages in HugeAtomicByteArray implementations. Suitable for:
 * - Bit vectors and boolean arrays
 * - Color coding in graph algorithms
 * - State machines with small state spaces
 * - Memory-efficient flag arrays
 *
 * **Value Range:**
 * Elements should be in the range [-128, 127] for signed bytes or [0, 255] for
 * unsigned byte interpretation.
 */
export interface BytePageCreator extends PageCreator<Int8Array> {}

/**
 * Specialized page creator for double arrays (64-bit floating-point).
 *
 * Used for creating pages in HugeAtomicDoubleArray implementations. Suitable for:
 * - Scientific computing and numerical analysis
 * - Continuous property values (weights, distances, scores)
 * - Statistical computations and probability distributions
 * - High-precision mathematical operations
 *
 * **Precision:**
 * Supports full IEEE 754 double-precision floating-point range and precision.
 */
export interface DoublePageCreator extends PageCreator<Float64Array> {}

/**
 * Specialized page creator for long arrays (64-bit integers).
 *
 * Used for creating pages in HugeAtomicLongArray implementations. Suitable for:
 * - Large integer counters and identifiers
 * - Timestamps and temporal data
 * - Hash values and checksums
 * - High-range discrete values
 *
 * **JavaScript Adaptation:**
 * Uses number[] for true 64-bit integer support, ensuring no precision loss
 * for large integer values beyond JavaScript's safe integer range.
 */
export interface LongPageCreator extends PageCreator<number[]> {}

/**
 * Specialized page creator for integer arrays (32-bit signed integers).
 *
 * Used for creating pages in HugeAtomicIntArray implementations. Suitable for:
 * - Node and edge identifiers in moderate-sized graphs
 * - Integer counters and indices
 * - Enumeration values and categorical data
 * - Compact integer storage
 *
 * **Value Range:**
 * Elements should be in the range [-2^31, 2^31-1] for optimal performance.
 */
export interface IntPageCreator extends PageCreator<Int32Array> {}

/**
 * Utility class providing common page creator implementations.
 *
 * This class contains **pre-built page creators** for common initialization patterns
 * to avoid implementing the same patterns repeatedly across different applications.
 */
export class PageCreators {
  /**
   * Creates a zero-filled page creator for byte arrays.
   */
  public static zeroBytes(): BytePageCreator {
    return {
      fill(pages: Int8Array[], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Int8Array(size); // Zeros by default
        }
      },

      fillPage(page: Int8Array, base: number): void {
        // Int8Array is already zero-filled by default
      },
    };
  }

  /**
   * Creates a zero-filled page creator for integer arrays.
   */
  public static zeroInts(): IntPageCreator {
    return {
      fill(pages: Int32Array[], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Int32Array(size); // Zeros by default
        }
      },

      fillPage(page: Int32Array, base: number): void {
        // Int32Array is already zero-filled by default
      },
    };
  }

  /**
   * Creates a zero-filled page creator for double arrays.
   */
  public static zeroDoubles(): DoublePageCreator {
    return {
      fill(
        pages: Float64Array[],
        lastPageSize: number,
        pageShift: number
      ): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Float64Array(size); // Zeros by default
        }
      },

      fillPage(page: Float64Array, base: number): void {
        // Float64Array is already zero-filled by default
      },
    };
  }

  /**
   * Creates a zero-filled page creator for long arrays.
   */

  public static zeroLongs(): LongPageCreator {
    return {
      fill(pages: number[][], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Array<number>(size).fill(0); // Zero-filled number array
        }
      },

      fillPage(page: number[], base: number): void {
        // number[] needs explicit filling since it's a regular array
        page.fill(0);
      },
    };
  }

  /**
   * Creates a constant-value page creator for integers.
   */
  public static constantInts(value: number): IntPageCreator {
    return {
      fill(pages: Int32Array[], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Int32Array(size);
          pages[i].fill(value);
        }
      },

      fillPage(page: Int32Array, base: number): void {
        page.fill(value);
      },
    };
  }

  /**
   * Creates a constant-value page creator for doubles.
   */
  public static constantDoubles(value: number): DoublePageCreator {
    return {
      fill(
        pages: Float64Array[],
        lastPageSize: number,
        pageShift: number
      ): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Float64Array(size);
          pages[i].fill(value);
        }
      },

      fillPage(page: Float64Array, base: number): void {
        page.fill(value);
      },
    };
  }

  /**
   * Creates a constant-value page creator for longs.
   */
  public static constantLongs(value: number): LongPageCreator {
    return {
      fill(pages: number[][], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Array<number>(size).fill(value);
        }
      },

      fillPage(page: number[], base: number): void {
        page.fill(value);
      },
    };
  }
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {
    throw new Error(
      "PageCreators is a static utility class and cannot be instantiated"
    );
  }
}
