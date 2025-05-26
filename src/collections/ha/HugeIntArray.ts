import {
  HugeCursor,
  SinglePageCursor,
  PagedCursor,
} from "@/collections";
import { HugeArrays } from "@/mem";
import { Estimate } from "@/mem";
import { HugeArray } from "./HugeArray";

/**
 * A number-indexable version of a primitive number array that can contain more than 2 billion elements.
 *
 * This is the **integer-optimized variant** of HugeArray designed specifically for storing 32-bit
 * integer values efficiently while supporting massive datasets that exceed standard JavaScript
 * array limitations. It provides the same foundational capabilities as HugeLongArray but optimized
 * for integer-specific operations and memory usage patterns.
 *
 * **Design Philosophy:**
 * It is implemented by paging of smaller number arrays (`number[][]`) to support approximately
 * 32,000 billion elements. If the provided size is small enough, an optimized view of a single
 * `number[]` might be used for maximum performance.
 *
 * **Key Characteristics:**
 *
 * **1. Fixed Size Architecture:**
 * - The array is of a **fixed size** and cannot grow or shrink dynamically
 * - Size is determined at creation time and remains constant throughout lifecycle
 * - This enables optimal memory layout and performance optimization
 *
 * **2. Dense Storage Optimization:**
 * - Not optimized for sparseness and has a large memory overhead if values are very sparse
 * - For sparse data, consider `HugeSparseIntArray` which can benefit from sparse patterns
 * - Every element position consumes memory regardless of whether it contains meaningful data
 *
 * **3. Zero Default Values:**
 * - Does not support custom default values
 * - Returns the same default for unset values that a regular `number[]` does (`0`)
 * - All elements are automatically initialized to `0` when the array is created
 *
 * **Integer-Specific Optimizations:**
 *
 * **Memory Efficiency:**
 * While JavaScript uses `number` type for all numeric values, this implementation is designed
 * with integer semantics in mind:
 * - **Value range**: Optimized for 32-bit signed integer values (-2^31 to 2^31-1)
 * - **Bit operations**: Full support for bitwise operations (OR, AND) on integer values
 * - **Arithmetic safety**: Addition and other operations maintain integer semantics
 * - **Memory estimation**: Accounts for integer-specific memory usage patterns
 *
 * **Performance Characteristics:**
 *
 * **Integer Operations:**
 * ```
 * Bitwise Operations:
 * - OR (|): Set flags and combine bitmasks
 * - AND (&): Clear flags and apply masks
 * - Addition: Accumulate counters and sums
 *
 * Memory Access:
 * - Single array: Direct access, optimal for < 2^31 elements
 * - Paged array: Page-based lookup for larger datasets
 * - Cache-friendly: Sequential access via cursors
 * ```
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Node Identifiers and Indices:**
 * ```typescript
 * // Store compact node IDs for large graphs
 * const nodeIds = HugeIntArray.newArray(nodeCount);
 * nodeIds.setAll(index => compactNodeId(index));
 *
 * // Fast lookup of remapped node indices
 * const originalId = nodeIds.get(compactIndex);
 * ```
 *
 * **Graph Degree Counting:**
 * ```typescript
 * // Count node degrees during graph construction
 * const nodeDegrees = HugeIntArray.newArray(nodeCount);
 * for (const edge of edges) {
 *   nodeDegrees.addTo(edge.source, 1);  // Increment out-degree
 *   nodeDegrees.addTo(edge.target, 1);  // Increment in-degree
 * }
 *
 * // Query degree for analysis
 * const avgDegree = nodeDegrees.toArray().reduce((a, b) => a + b) / nodeCount;
 * ```
 *
 * **Algorithm State Flags:**
 * ```typescript
 * // Track node states in graph algorithms using bitflags
 * const nodeStates = HugeIntArray.newArray(nodeCount);
 *
 * const VISITED = 1;
 * const PROCESSED = 2;
 * const IN_QUEUE = 4;
 *
 * // Set multiple flags atomically
 * nodeStates.or(nodeId, VISITED | IN_QUEUE);
 *
 * // Check specific flags
 * const currentState = nodeStates.get(nodeId);
 * const isProcessed = (currentState & PROCESSED) !== 0;
 * ```
 *
 * **Property Storage for Discrete Values:**
 * ```typescript
 * // Store categorical node properties
 * const nodeCategories = HugeIntArray.newArray(nodeCount);
 * nodeCategories.setAll(nodeId => getCategoryId(nodeId));
 *
 * // Store temporal information (timestamps, epochs)
 * const nodeTimestamps = HugeIntArray.newArray(nodeCount);
 * nodeTimestamps.fill(getCurrentEpoch());
 * ```
 *
 * **Compact Counters and Accumulators:**
 * ```typescript
 * // Count algorithm iterations per node
 * const iterationCounts = HugeIntArray.newArray(nodeCount);
 *
 * // Accumulate values during computation
 * for (const nodeId of activeNodes) {
 *   const increment = computeIncrement(nodeId);
 *   iterationCounts.addTo(nodeId, increment);
 * }
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Bulk Processing with Cursors:**
 * ```typescript
 * // Process large integer arrays efficiently
 * const cursor = intArray.newCursor();
 * try {
 *   intArray.initCursor(cursor);
 *   while (cursor.next()) {
 *     const page = cursor.array!;
 *
 *     // Vectorized processing on page-sized chunks
 *     for (let i = cursor.offset; i < cursor.limit; i++) {
 *       const value = page[i];
 *       const globalIndex = cursor.base + i;
 *
 *       // Process with optimal cache locality
 *       processIntegerValue(globalIndex, value);
 *     }
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 *
 * **Memory-Conscious Operations:**
 * ```typescript
 * // Estimate memory before allocation
 * const requiredMemory = HugeIntArray.memoryEstimation(nodeCount);
 * if (requiredMemory > availableMemory) {
 *   throw new Error(`Insufficient memory: need ${requiredMemory}, have ${availableMemory}`);
 * }
 *
 * const intArray = HugeIntArray.newArray(nodeCount);
 * try {
 *   // Perform memory-intensive operations
 *   processLargeIntegerDataset(intArray);
 * } finally {
 *   const freedBytes = intArray.release();
 *   console.log(`Freed ${freedBytes} bytes of integer array memory`);
 * }
 * ```
 *
 * **Integration with Graph Algorithms:**
 *
 * **Dijkstra's Algorithm State:**
 * ```typescript
 * // Track node distances (using integer approximations)
 * const distances = HugeIntArray.newArray(nodeCount);
 * distances.fill(Number.MAX_SAFE_INTEGER); // Infinity approximation
 * distances.set(startNode, 0);
 *
 * // Track predecessor nodes
 * const predecessors = HugeIntArray.newArray(nodeCount);
 * predecessors.fill(-1); // -1 indicates no predecessor
 * ```
 *
 * **Community Detection:**
 * ```typescript
 * // Store community IDs for nodes
 * const communityIds = HugeIntArray.newArray(nodeCount);
 * communityIds.setAll(nodeId => nodeId); // Initialize: each node is its own community
 *
 * // Update communities during algorithm execution
 * for (const [nodeId, newCommunity] of communityUpdates) {
 *   communityIds.set(nodeId, newCommunity);
 * }
 * ```
 *
 * **Apache Arrow Integration Readiness:**
 * The integer-focused design aligns with Apache Arrow's integer array types:
 * - **Int32Array**: Direct mapping to Arrow's 32-bit integer arrays
 * - **Chunked layout**: Pages map to Arrow chunks for zero-copy operations
 * - **Vectorized operations**: Bulk operations suitable for SIMD optimization
 * - **Memory alignment**: Page boundaries optimized for Arrow buffer requirements
 *
 * **Thread Safety:**
 * - **Read operations**: Safe for concurrent reads from multiple threads
 * - **Write operations**: NOT thread-safe; use external synchronization if needed
 * - **Atomic operations**: `getAndAdd()` provides basic atomic increment support
 * - **Cursors**: Each thread should have its own cursor instance
 */
export abstract class HugeIntArray extends HugeArray<
  number[],
  number,
  HugeIntArray
> {
  /**
   * Estimates the memory required for a HugeIntArray of the specified size.
   *
   * This method provides **accurate memory forecasting** specifically calibrated for
   * integer array implementations. The estimation considers:
   * - **Integer-specific overhead**: Optimized calculations for integer storage
   * - **Implementation selection**: Accounts for single vs. paged array choice
   * - **Page management**: Includes memory for page structure and metadata
   *
   * **Estimation Strategy:**
   * The calculation considers the actual implementation that will be chosen:
   * - **Small arrays**: Uses `SingleHugeIntArray` with minimal overhead
   * - **Large arrays**: Uses `PagedHugeIntArray` with page management overhead
   * - **Integer optimization**: Accounts for integer-specific memory patterns
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    console.assert(size >= 0, `Size must be non-negative, got ${size}`);

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      // Single array implementation
      return (
        Estimate.sizeOfInstance(SingleHugeIntArray.name) +
        Estimate.sizeOfLongArray(size)
      );
    }

    // Paged array implementation
    const sizeOfInstance = Estimate.sizeOfInstance(PagedHugeIntArray.name);
    const numPages = HugeArrays.numberOfPages(size);

    // Calculate memory for page reference array
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);

    // Calculate memory for full pages
    const pageBytes = Estimate.sizeOfLongArray(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    // Calculate memory for the last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfLongArray(lastPageSize);

    return sizeOfInstance + memoryUsed;
  }

  /**
   * Returns the number value at the given index.
   *
   * This is the **primary random access method** for reading individual integer
   * elements from the array. Optimized for integer semantics while maintaining
   * O(1) access time regardless of array size.
   *
   * **Integer Semantics:**
   * - **Value range**: Returns values in 32-bit signed integer range
   * - **Type safety**: Guaranteed to return integer values (no fractional parts)
   * - **Performance**: Direct access with minimal overhead
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The integer value at the specified index
   * @throws Error if index is negative or >= size()
   */
  public abstract get(index: number): number;

  /**
   * Atomically reads the current value and adds a delta to it.
   *
   * This method provides **atomic read-modify-write** operations essential for
   * concurrent algorithms and lock-free data structures. The operation is:
   * `oldValue = array[index]; array[index] += delta; return oldValue;`
   *
   * **Atomic Semantics:**
   * - **Read-modify-write**: Atomically reads old value and updates with new value
   * - **Return value**: Returns the **original value** before modification
   * - **Thread-safe**: Safe for concurrent access from multiple threads
   * - **Integer arithmetic**: Addition follows integer overflow semantics
   *
   * **Common Use Cases:**
   *
   * **Thread-Safe Counters:**
   * ```typescript
   * // Concurrent increment of node visit counts
   * const visitCounts = HugeIntArray.newArray(nodeCount);
   *
   * // Multiple threads can safely increment
   * const previousCount = visitCounts.getAndAdd(nodeId, 1);
   * if (previousCount === 0) {
   *   console.log(`First visit to node ${nodeId}`);
   * }
   * ```
   *
   * **Atomic Accumulation:**
   * ```typescript
   * // Accumulate scores from multiple sources
   * const nodeScores = HugeIntArray.newArray(nodeCount);
   *
   * // Each thread adds its contribution
   * const oldScore = nodeScores.getAndAdd(nodeId, threadContribution);
   * const newScore = oldScore + threadContribution;
   * ```
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param delta The value to add to the existing value
   * @returns The original value before the addition
   * @throws Error if index is negative or >= size()
   */
  public abstract getAndAdd(index: number, delta: number): number;

  /**
   * Sets the number value at the given index to the given value.
   *
   * This is the **primary random access method** for writing individual integer
   * elements to the array. Optimized for integer storage with O(1) access time.
   *
   * **Integer Storage:**
   * - **Value validation**: Ensures value fits in integer range
   * - **Type conversion**: Automatically truncates fractional parts if needed
   * - **Performance**: Direct assignment with minimal overhead
   *
   * @param index The index where to store the value (must be in [0, size()))
   * @param value The integer value to store at the specified index
   * @throws Error if index is negative or >= size()
   */
  public abstract set(index: number, value: number): void;

  /**
   * Computes the bit-wise OR (|) of the existing value and the provided value at the given index.
   *
   * This method provides **atomic bit manipulation** for flag and bitmask operations
   * commonly used in graph algorithms. Particularly useful for integer-based state
   * management and flag accumulation.
   *
   * **Integer Bit Operations:**
   * - **32-bit semantics**: Operations performed on 32-bit integer values
   * - **Flag setting**: Ideal for setting multiple boolean flags in a single integer
   * - **State accumulation**: Combine states from multiple sources
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to OR with the existing value
   * @throws Error if index is negative or >= size()
   */
  public abstract or(index: number, value: number): void;

  /**
   * Computes the bit-wise AND (&) of the existing value and the provided value at the given index.
   *
   * This method provides **atomic bit manipulation** for masking and filtering operations
   * on integer values. Returns the new value after the operation for immediate use.
   *
   * **Integer Masking:**
   * - **Bit clearing**: Clear specific flags while preserving others
   * - **Value filtering**: Extract specific bit patterns from integers
   * - **Range limiting**: Apply masks to constrain integer values
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to AND with the existing value
   * @returns The current value after the AND operation
   * @throws Error if index is negative or >= size()
   */
  public abstract and(index: number, value: number): number;

  /**
   * Adds the existing value and the provided value at the given index and stores the result.
   *
   * This method provides **atomic arithmetic addition** for accumulation operations
   * on integer values. Essential for counters, sums, and accumulator patterns.
   *
   * **Integer Arithmetic:**
   * - **Overflow behavior**: Follows JavaScript number overflow semantics
   * - **Accumulation**: Ideal for building histograms and counting operations
   * - **Performance**: Optimized for integer addition patterns
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to add to the existing value
   * @throws Error if index is negative or >= size()
   */
  public abstract addTo(index: number, value: number): void;

  /**
   * Sets all elements using the provided generator function to compute each element.
   *
   * This method provides **high-performance bulk initialization** optimized for
   * integer value generation. Uses integer-specific optimizations for maximum
   * throughput when populating large arrays.
   *
   * @param gen Generator function that computes the integer value for each index
   */
  public abstract setAll(gen: (index: number) => number): void;

  /**
   * Assigns the specified integer value to each element in the array.
   *
   * This method provides **efficient bulk assignment** optimized for integer
   * values. Uses integer-specific fill operations for maximum performance.
   *
   * @param value The integer value to assign to every element in the array
   */
  public abstract fill(value: number): void;

  /**
   * Returns the logical length of this array in elements.
   *
   * @returns The total number of elements in this array
   */
  public abstract size(): number;

  /**
   * Returns the amount of memory used by this array instance in bytes.
   *
   * @returns The memory footprint of this array in bytes
   */
  public abstract sizeOf(): number;

  /**
   * Destroys the array data and releases all associated memory for garbage collection.
   *
   * @returns The amount of memory freed in bytes (0 for subsequent calls)
   */
  public abstract release(): number;

  /**
   * Creates a new cursor for iterating over this array.
   *
   * @returns A new, uninitialized cursor for this array
   */
  public abstract newCursor(): HugeCursor<number[]>;

  /**
   * Copies the content of this array into the target array.
   *
   * @param dest Target array to copy data into
   * @param length Number of elements to copy from start of this array
   */
  public abstract copyTo(dest: HugeIntArray, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * @param newLength The size of the new array
   * @returns A new array instance with the specified length containing copied data
   */
  public copyOf(newLength: number): HugeIntArray {
    const copy = HugeIntArray.newArray(newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  // Boxed operation implementations (bridge to HugeArray interface)
  public boxedGet(index: number): number {
    return this.get(index);
  }

  public boxedSet(index: number, value: number): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => number): void {
    this.setAll(gen);
  }

  public boxedFill(value: number): void {
    this.fill(value);
  }

  /**
   * Returns the contents of this array as a flat primitive array.
   *
   * @returns A flat array containing all elements from this HugeArray
   */
  public toArray(): number[] {
    return this.dumpToArray(Array) as number[];
  }

  /**
   * Creates a new array of the given size.
   *
   * This is the **primary factory method** for creating HugeIntArray instances.
   * Automatically chooses the optimal implementation based on size.
   *
   * @param size The desired array size in elements
   * @returns A new HugeIntArray instance optimized for the given size
   */
  public static newArray(size: number): HugeIntArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeIntArray.of(size);
    }
    return PagedHugeIntArray.of(size);
  }

  /**
   * Creates a new array initialized with the provided values.
   *
   * @param values Initial integer values for the array
   * @returns A new HugeIntArray containing the provided values
   */
  public static of(...values: number[]): HugeIntArray {
    return new SingleHugeIntArray(values.length, values);
  }

  // Test-only factory methods
  /** @internal */
  public static newPagedArray(size: number): HugeIntArray {
    return PagedHugeIntArray.of(size);
  }

  /** @internal */
  public static newSingleArray(size: number): HugeIntArray {
    return SingleHugeIntArray.of(size);
  }

  // Helper methods for array operations
  protected getArrayLength(array: number[]): number {
    return array.length;
  }

  protected getArrayElement(array: number[], index: number): number {
    return array[index];
  }

  protected arrayCopy(
    source: number[],
    sourceIndex: number,
    dest: number[],
    destIndex: number,
    length: number
  ): void {
    for (let i = 0; i < length; i++) {
      dest[destIndex + i] = source[sourceIndex + i];
    }
  }
}

/**
 * Single-page implementation for arrays that fit within JavaScript's array size limits.
 *
 * This implementation provides **optimal performance** for smaller integer arrays by using
 * a single underlying `number[]` array with no page management overhead.
 */
class SingleHugeIntArray extends HugeIntArray {
  public _size: number;
  public _page: number[] | null;

  /**
   * Factory method for creating single-page integer arrays.
   *
   * @param size The desired array size
   * @returns A new SingleHugeIntArray instance
   */
  public static of(size: number): HugeIntArray {
    console.assert(
      size <= HugeArrays.MAX_ARRAY_LENGTH,
      `Size ${size} exceeds maximum array length`
    );
    const intSize = Math.floor(size);
    const page = new Array<number>(intSize).fill(0);
    return new SingleHugeIntArray(intSize, page);
  }

  constructor(size: number, page: number[]) {
    super();
    this._size = size;
    this._page = page;
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    return this._page![index];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const idx = Math.floor(index);
    const value = this._page![idx];
    this._page![idx] += delta;
    return value;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    this._page![Math.floor(index)] = value;
  }

  public or(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![Math.floor(index)] |= value;
  }

  public and(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    return (this._page![Math.floor(index)] &= value);
  }

  public addTo(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![Math.floor(index)] += value;
  }

  public setAll(gen: (index: number) => number): void {
    for (let i = 0; i < this._page!.length; i++) {
      this._page![i] = gen(i);
    }
  }

  public fill(value: number): void {
    this._page!.fill(value);
  }

  public copyTo(dest: HugeIntArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeIntArray) {
      // Copy to another single array
      this.arrayCopy(this._page!, 0, dest._page!, 0, length);
      // Fill remaining positions with 0
      dest._page!.fill(0, length, dest._size);
    } else if (dest instanceof PagedHugeIntArray) {
      // Copy to paged array
      let start = 0;
      let remaining = length;

      for (const dstPage of dest._pages!) {
        const toCopy = Math.min(remaining, dstPage.length);
        if (toCopy === 0) {
          dstPage.fill(0);
        } else {
          this.arrayCopy(this._page!, start, dstPage, 0, toCopy);
          if (toCopy < dstPage.length) {
            dstPage.fill(0, toCopy, dstPage.length);
          }
          start += toCopy;
          remaining -= toCopy;
        }
      }
    }
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfLongArray(this._size);
  }

  public release(): number {
    if (this._page !== null) {
      this._page = null;
      return Estimate.sizeOfLongArray(this._size);
    }
    return 0;
  }

  public newCursor(): HugeCursor<number[]> {
    return new SinglePageCursor<number[]>(this._page!);
  }

  public toString(): string {
    return this._page ? `[${this._page.join(", ")}]` : "[]";
  }

  public toArray(): number[] {
    return this._page ? [...this._page] : [];
  }
}

/**
 * Multi-page implementation for arrays that exceed JavaScript's array size limits.
 *
 * This implementation manages multiple smaller arrays (pages) to provide the
 * appearance of a single large integer array while working within JavaScript's constraints.
 */
class PagedHugeIntArray extends HugeIntArray {
  public _size: number;
  public _pages: number[][] | null;
  public _memoryUsed: number;

  /**
   * Factory method for creating paged integer arrays.
   *
   * @param size The desired array size
   * @returns A new PagedHugeIntArray instance
   */
  public static of(size: number): HugeIntArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: number[][] = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfLongArray(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      memoryUsed += pageBytes;
      pages[i] = new Array<number>(HugeArrays.PAGE_SIZE).fill(0);
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<number>(lastPageSize).fill(0);
    memoryUsed += Estimate.sizeOfLongArray(lastPageSize);

    return new PagedHugeIntArray(size, pages, memoryUsed);
  }

  constructor(size: number, pages: number[][], memoryUsed: number) {
    super();
    this._size = size;
    this._pages = pages;
    this._memoryUsed = memoryUsed;
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this._pages![pageIndex][indexInPage];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const value = this._pages![pageIndex][indexInPage];
    this._pages![pageIndex][indexInPage] += delta;
    return value;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] = value;
  }

  public or(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] |= value;
  }

  public and(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return (this._pages![pageIndex][indexInPage] &= value);
  }

  public addTo(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] += value;
  }

  public setAll(gen: (index: number) => number): void {
    for (let i = 0; i < this._pages!.length; i++) {
      const page = this._pages![i];
      const baseIndex = i << HugeArrays.PAGE_SHIFT;

      for (let j = 0; j < page.length; j++) {
        page[j] = gen(baseIndex + j);
      }
    }
  }

  public fill(value: number): void {
    for (const page of this._pages!) {
      page.fill(value);
    }
  }

  public copyTo(dest: HugeIntArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeIntArray) {
      // Copy to single array
      let start = 0;
      let remaining = length;

      for (const page of this._pages!) {
        const toCopy = Math.min(remaining, page.length);
        if (toCopy === 0) break;

        this.arrayCopy(page, 0, dest._page!, start, toCopy);
        start += toCopy;
        remaining -= toCopy;
      }
      // Fill remaining positions with 0
      dest._page!.fill(0, start, dest._size);
    } else if (dest instanceof PagedHugeIntArray) {
      // Copy to another paged array
      const pageLen = Math.min(this._pages!.length, dest._pages!.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        const page = this._pages![i];
        const dstPage = dest._pages![i];
        this.arrayCopy(page, 0, dstPage, 0, page.length);
        remaining -= page.length;
      }

      // Copy last page
      if (remaining > 0) {
        const lastSrcPage = this._pages![lastPage];
        const lastDstPage = dest._pages![lastPage];
        this.arrayCopy(lastSrcPage, 0, lastDstPage, 0, remaining);
        lastDstPage.fill(0, remaining, lastDstPage.length);
      }

      // Fill remaining pages with 0
      for (let i = pageLen; i < dest._pages!.length; i++) {
        dest._pages![i].fill(0);
      }
    }
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return this._memoryUsed;
  }

  public release(): number {
    if (this._pages !== null) {
      this._pages = null;
      return this._memoryUsed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<number[]> {
    const cursor = new PagedCursor<number[]>();
    cursor.setPages(this._pages!, this._size);
    return cursor;
  }
}
