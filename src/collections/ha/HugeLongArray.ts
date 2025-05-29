import { HugeArrays, Estimate } from "@/mem";
import { ArrayUtil } from "@/collections";
import { HugeCursor, SinglePageCursor, PagedCursor } from "@/collections";
import { HugeArray } from "./HugeArray";

/**
 * A number-indexable version of a primitive number array that can contain more than 2 billion elements.
 *
 * This is the **core numeric array implementation** for the graph data science system, designed to
 * handle massive datasets that exceed standard JavaScript array limitations while maintaining
 * high performance for graph algorithms and analytics.
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
 * - For sparse data, consider `HugeSparseLongArray` which can benefit from sparse patterns
 * - Every element position consumes memory regardless of whether it contains meaningful data
 *
 * **3. Zero Default Values:**
 * - Does not support custom default values
 * - Returns the same default for unset values that a regular `number[]` does (`0`)
 * - All elements are automatically initialized to `0` when the array is created
 *
 * **Performance Characteristics:**
 *
 * **Memory Layout:**
 * ```
 * Single Array (≤ MAX_ARRAY_LENGTH):
 * [0][1][2][3][4][5]...[n]  ← Direct access, optimal performance
 *
 * Paged Array (> MAX_ARRAY_LENGTH):
 * Page 0: [0][1][2][3]       ← 4 elements per page (example)
 * Page 1: [4][5][6][7]       ← Page-based lookup required
 * Page 2: [8][9][10][11]     ← Slightly more overhead
 * ```
 *
 * **Access Patterns:**
 * - **Random access**: O(1) for both single and paged implementations
 * - **Sequential access**: Optimal cache performance with cursor-based iteration
 * - **Bulk operations**: Highly optimized using native array operations where possible
 *
 * **Memory Efficiency:**
 * Uses JavaScript's native number arrays (`Float64Array` could be used for better memory density,
 * but `number[]` provides better compatibility and debugging experience):
 * - **Single array**: 8 bytes per element + minimal overhead
 * - **Paged array**: 8 bytes per element + small page management overhead
 * - **Memory estimation**: Accurate pre-allocation size calculation available
 *
 * **Graph Algorithm Integration:**
 *
 * **Node Properties Storage:**
 * ```typescript
 * // Store node ages for 10 million nodes
 * const nodeAges = HugeLongArray.newArray(10_000_000);
 * nodeAges.setAll(nodeId => computeNodeAge(nodeId));
 *
 * // Fast random access during algorithm execution
 * const age = nodeAges.get(randomNodeId); // O(1) access
 * ```
 *
 * **Algorithm Working Arrays:**
 * ```typescript
 * // Dijkstra's algorithm distance array
 * const distances = HugeLongArray.newArray(nodeCount);
 * distances.fill(Number.POSITIVE_INFINITY);
 * distances.set(startNode, 0);
 *
 * // PageRank computation values
 * const pageRankValues = HugeLongArray.newArray(nodeCount);
 * pageRankValues.fill(1.0 / nodeCount); // Initialize with uniform distribution
 * ```
 *
 * **Bulk Data Processing:**
 * ```typescript
 * // Process huge arrays efficiently using cursors
 * const cursor = hugeArray.newCursor();
 * try {
 *   hugeArray.initCursor(cursor);
 *   while (cursor.next()) {
 *     const page = cursor.array!;
 *     for (let i = cursor.offset; i < cursor.limit; i++) {
 *       const value = page[i];
 *       // Process value with optimal cache performance
 *       processValue(cursor.base + i, value);
 *     }
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 *
 * **Memory Management Best Practices:**
 * ```typescript
 * // Large-scale processing with explicit memory management
 * const tempArray = HugeLongArray.newArray(HUGE_SIZE);
 * try {
 *   // Perform memory-intensive operations
 *   processLargeDataset(tempArray);
 * } finally {
 *   const freedBytes = tempArray.release(); // Free memory immediately
 *   console.log(`Freed ${freedBytes} bytes of memory`);
 * }
 * ```
 *
 * **Apache Arrow Integration Readiness:**
 * The architecture aligns with Apache Arrow's columnar format:
 * - **Chunked arrays**: Pages map naturally to Arrow chunks
 * - **Primitive types**: Direct compatibility with Arrow's primitive array types
 * - **Memory layout**: Contiguous memory blocks suitable for zero-copy operations
 * - **Bulk operations**: Vectorized operations can be applied at the page level
 *
 * **Thread Safety:**
 * - **Read operations**: Safe for concurrent reads from multiple threads
 * - **Write operations**: NOT thread-safe; use external synchronization if needed
 * - **Cursors**: Each thread should have its own cursor instance
 * - **Atomic operations**: Use `HugeAtomicLongArray` for thread-safe modifications
 */
export abstract class HugeLongArray extends HugeArray<
  number[],
  number,
  HugeLongArray
> {
  public _size: number = 0;

  // Optional properties that implementations may use
  public _page?: number[] | null;
  public _pages?: number[][] | null;

  /**
   * Estimates the memory required for a HugeLongArray of the specified size.
   *
   * This method provides **accurate memory forecasting** essential for:
   * - **Memory budgeting**: Ensuring operations stay within available memory limits
   * - **Capacity planning**: Determining optimal array sizes for available resources
   * - **Resource allocation**: Making informed decisions about data structure choices
   * - **Performance optimization**: Avoiding memory pressure and excessive GC activity
   *
   * **Estimation Strategy:**
   * The calculation considers the actual implementation that will be chosen:
   * - **Small arrays**: Uses `SingleHugeLongArray` with minimal overhead
   * - **Large arrays**: Uses `PagedHugeLongArray` with page management overhead
   * - **Accurate accounting**: Includes object overhead, page arrays, and metadata
   *
   * **Memory Components:**
   * - **Instance overhead**: Object header and field storage
   * - **Page storage**: The actual data arrays (the majority of memory usage)
   * - **Page array**: Array of references to pages (for paged implementation)
   * - **Metadata**: Size tracking, memory accounting, and structural information
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    console.assert(size >= 0, `Size must be non-negative, got ${size}`);

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      // Single array implementation
      return (
        Estimate.sizeOfInstance(SingleHugeLongArray.name) +
        Estimate.sizeOfLongArray(size)
      );
    }

    // Paged array implementation
    const sizeOfInstance = Estimate.sizeOfInstance(PagedHugeLongArray.name);
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
   * This is the **primary random access method** for reading individual elements
   * from the array. It provides O(1) access time regardless of array size or
   * whether the array uses single or paged implementation.
   *
   * **Performance Characteristics:**
   * - **Single array**: Direct array access, optimal performance
   * - **Paged array**: Page lookup + index calculation, still very fast
   * - **Bounds checking**: Includes validation in debug builds for safety
   * - **No boxing overhead**: Returns primitive number directly
   *
   * **Index Addressing:**
   * For paged arrays, the method automatically handles the translation:
   * ```typescript
   * // Logical index 1000000 might map to:
   * // Page 15, index 23456 within that page
   * const value = array.get(1000000); // Transparent to caller
   * ```
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The number value at the specified index
   * @throws Error if index is negative or >= size()
   */
  public abstract get(index: number): number;

  /**
   * Sets the number value at the given index to the given value.
   *
   * This is the **primary random access method** for writing individual elements
   * to the array. Like `get()`, it provides O(1) access time with automatic
   * page management for large arrays.
   *
   * **Performance Characteristics:**
   * - **Single array**: Direct array assignment, optimal performance
   * - **Paged array**: Page lookup + index calculation, still very fast
   * - **Bounds checking**: Includes validation in debug builds for safety
   * - **No unboxing overhead**: Accepts primitive number directly
   *
   * **Thread Safety Warning:**
   * This method is **NOT thread-safe**. Concurrent writes to the same index
   * from multiple threads may result in data corruption. Use external
   * synchronization or `HugeAtomicLongArray` for thread-safe operations.
   *
   * @param index The index where to store the value (must be in [0, size()))
   * @param value The number value to store at the specified index
   * @throws Error if index is negative or >= size()
   */
  public abstract set(index: number, value: number): void;

  /**
   * Computes the bit-wise OR (|) of the existing value and the provided value at the given index.
   *
   * This method provides **atomic bit manipulation** for flag and bitmask operations
   * commonly used in graph algorithms. The operation is equivalent to:
   * `array[index] = array[index] | value`
   *
   * **Bit-wise OR Semantics:**
   * - If there was no previous value (0), the result is set to the provided value (`x | 0 == x`)
   * - Each bit in the result is 1 if either corresponding bit in the operands is 1
   * - Commonly used for **setting flags** and **accumulating bitmasks**
   *
   * **Common Use Cases:**
   *
   * **Flag Accumulation:**
   * ```typescript
   * // Accumulate node visit flags during graph traversal
   * const VISITED = 1;
   * const PROCESSED = 2;
   * const IN_QUEUE = 4;
   *
   * nodeFlags.or(nodeId, VISITED);    // Mark as visited
   * nodeFlags.or(nodeId, PROCESSED);  // Also mark as processed
   * // nodeFlags[nodeId] now contains (VISITED | PROCESSED) = 3
   * ```
   *
   * **Bit Set Operations:**
   * ```typescript
   * // Set multiple bits in a compact representation
   * const permissions = HugeLongArray.newArray(userCount);
   * permissions.or(userId, READ_PERMISSION | WRITE_PERMISSION);
   * ```
   *
   * **Algorithm State Tracking:**
   * ```typescript
   * // Track multiple states for nodes in complex algorithms
   * const nodeStates = HugeLongArray.newArray(nodeCount);
   * nodeStates.or(nodeId, STATE_ACTIVE | STATE_DIRTY);
   * ```
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to OR with the existing value
   * @throws Error if index is negative or >= size()
   */
  public abstract or(index: number, value: number): void;

  /**
   * Computes the bit-wise AND (&) of the existing value and the provided value at the given index.
   *
   * This method provides **atomic bit manipulation** for masking and filtering operations.
   * The operation is equivalent to: `array[index] = array[index] & value`
   *
   * **Bit-wise AND Semantics:**
   * - If there was no previous value (0), the result is 0 (`x & 0 == 0`)
   * - Each bit in the result is 1 only if both corresponding bits in the operands are 1
   * - Commonly used for **clearing flags**, **applying masks**, and **filtering bits**
   *
   * **Return Value:**
   * Returns the **new current value** after the AND operation, which is useful
   * for checking the result of the operation without a separate read.
   *
   * **Common Use Cases:**
   *
   * **Flag Clearing:**
   * ```typescript
   * // Clear specific flags while preserving others
   * const VISITED = 1;
   * const PROCESSED = 2;
   * const IN_QUEUE = 4;
   *
   * // Clear the IN_QUEUE flag while keeping others
   * const newValue = nodeFlags.and(nodeId, ~IN_QUEUE);
   * if (newValue & VISITED) {
   *   console.log('Node is still marked as visited');
   * }
   * ```
   *
   * **Bit Masking:**
   * ```typescript
   * // Extract only the lower 16 bits of a value
   * const LOWER_16_BITS = 0xFFFF;
   * const maskedValue = values.and(index, LOWER_16_BITS);
   * ```
   *
   * **Permission Filtering:**
   * ```typescript
   * // Check if user has specific permissions
   * const requiredPermissions = READ_PERMISSION | EXECUTE_PERMISSION;
   * const actualPermissions = permissions.and(userId, requiredPermissions);
   * const hasAllPermissions = actualPermissions === requiredPermissions;
   * ```
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
   * commonly used in graph algorithms. The operation is equivalent to:
   * `array[index] = array[index] + value`
   *
   * **Addition Semantics:**
   * - If there was no previous value (0), the result is set to the provided value (`x + 0 == x`)
   * - Standard arithmetic addition with overflow behavior following JavaScript number semantics
   * - Commonly used for **counters**, **accumulators**, and **weight summation**
   *
   * **Common Use Cases:**
   *
   * **Degree Counting:**
   * ```typescript
   * // Count node degrees during graph construction
   * const nodeDegrees = HugeLongArray.newArray(nodeCount);
   * for (const edge of edges) {
   *   nodeDegrees.addTo(edge.source, 1);  // Increment out-degree
   *   nodeDegrees.addTo(edge.target, 1);  // Increment in-degree
   * }
   * ```
   *
   * **Weight Accumulation:**
   * ```typescript
   * // Accumulate edge weights per node
   * const nodeWeights = HugeLongArray.newArray(nodeCount);
   * for (const edge of weightedEdges) {
   *   nodeWeights.addTo(edge.source, edge.weight);
   * }
   * ```
   *
   * **Algorithm Counters:**
   * ```typescript
   * // Count visits during graph traversal
   * const visitCounts = HugeLongArray.newArray(nodeCount);
   * for (const nodeId of traversalPath) {
   *   visitCounts.addTo(nodeId, 1);
   * }
   * ```
   *
   * **Histogram Construction:**
   * ```typescript
   * // Build histogram of node property values
   * const histogram = HugeLongArray.newArray(NUM_BUCKETS);
   * for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
   *   const bucket = computeBucket(nodeProperty.get(nodeId));
   *   histogram.addTo(bucket, 1);
   * }
   * ```
   *
   * @param index The index of the element to modify (must be in [0, size()))
   * @param value The value to add to the existing value
   * @throws Error if index is negative or >= size()
   */
  public abstract addTo(index: number, value: number): void;

  /**
   * Sets all elements using the provided generator function to compute each element.
   *
   * This method provides **high-performance bulk initialization** of array elements
   * using a function that computes each value based on its index. It's the most
   * efficient way to populate large arrays with computed values.
   *
   * **Performance Optimization:**
   * The behavior is identical to JavaScript's `Array.prototype.forEach()` combined
   * with assignment, but optimized for the HugeArray's paged architecture to
   * provide maximum performance and optimal memory access patterns.
   *
   * **Generator Function Contract:**
   * - **Input**: The index of the element to compute (0 to size()-1)
   * - **Output**: The number value to store at that index
   * - **Pure function**: Should return the same output for the same input
   * - **Index-based**: Can use the index to compute mathematically derived values
   *
   * **Implementation Strategy:**
   * - **Page-aware processing**: Processes elements page by page for optimal cache usage
   * - **Sequential access**: Writes elements in order to maximize memory bandwidth
   * - **Minimal overhead**: Direct assignment without unnecessary intermediate operations
   *
   * @param gen Generator function that computes the value for each index
   */
  public abstract setAll(gen: (index: number) => number): void;

  /**
   * Assigns the specified number value to each element in the array.
   *
   * This method provides **efficient bulk assignment** of the same value to all
   * array elements. It's the fastest way to initialize or reset large arrays
   * to a uniform value.
   *
   * **Performance Optimization:**
   * The behavior is identical to JavaScript's `Array.prototype.fill()`, but
   * optimized for HugeArray's paged architecture to provide maximum throughput
   * and minimal memory allocation overhead.
   *
   * **Implementation Strategy:**
   * - **Page-level operations**: Uses native array fill operations on each page
   * - **Sequential memory access**: Optimal cache usage and memory bandwidth
   * - **Zero intermediate allocation**: Direct assignment without temporary objects
   *
   * @param value The value to assign to every element in the array
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
   * Performs binary search to find the insertion point for a value in a sorted array.
   *
   * This method provides **optimized search capability** for sorted HugeLongArrays,
   * essential for algorithms that maintain sorted data structures or need to perform
   * range queries on ordered data.
   *
   * **Search Semantics:**
   * The result differs from standard binary search in that this method returns a
   * **positive index even if the array does not directly contain the searched value**.
   *
   * **Return Value Interpretation:**
   * - **Exact match**: Returns the index where `array[index] === searchValue`
   * - **Insertion point**: Returns index where `array[index] <= searchValue < array[index + 1]`
   * - **Value too small**: Returns -1 if `searchValue < array[0]`
   * - **Value too large**: Returns `size() - 1` if `searchValue >= array[size() - 1]`
   *
   * **Algorithm Behavior:**
   * Finds the index where `(values[idx] <= searchValue) && (values[idx + 1] > searchValue)`.
   * This is particularly useful for:
   * - **Range queries**: Finding the start/end of a range in sorted data
   * - **Insertion points**: Determining where to insert a value to maintain sort order
   * - **Histogram lookups**: Finding the appropriate bucket for a value
   *
   * **Use Cases:**
   *
   * **Sorted Node IDs:**
   * ```typescript
   * // Find position in sorted array of node IDs
   * const sortedNodeIds = HugeLongArray.newArray(nodeCount);
   * // ... populate and sort ...
   * const insertionPoint = sortedNodeIds.binarySearch(newNodeId);
   * ```
   *
   * **Timestamp Ranges:**
   * ```typescript
   * // Find events within a time range
   * const timestamps = HugeLongArray.newArray(eventCount);
   * // ... populate with sorted timestamps ...
   * const startIndex = timestamps.binarySearch(rangeStart);
   * const endIndex = timestamps.binarySearch(rangeEnd);
   * ```
   *
   * **Weight Distributions:**
   * ```typescript
   * // Find position in cumulative weight distribution
   * const cumulativeWeights = HugeLongArray.newArray(nodeCount);
   * // ... populate with cumulative sums ...
   * const selectedIndex = cumulativeWeights.binarySearch(randomValue);
   * ```
   *
   * @param searchValue The value to search for in the sorted array
   * @returns Index where value should be inserted, or -1 if value is smaller than all elements
   */
  public abstract binarySearch(searchValue: number): number;

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
  public abstract copyTo(dest: HugeLongArray, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * @param newLength The size of the new array
   * @returns A new array instance with the specified length containing copied data
   */
  public copyOf(newLength: number): HugeLongArray {
    const copy = HugeLongArray.newArray(newLength);
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
   * This is the **primary factory method** for creating HugeLongArray instances.
   * It automatically chooses the optimal implementation based on the requested size:
   * - Small arrays use `SingleHugeLongArray` for maximum performance
   * - Large arrays use `PagedHugeLongArray` for memory efficiency
   *
   * @param size The desired array size in elements
   * @returns A new HugeLongArray instance optimized for the given size
   */
  public static newArray(size: number): HugeLongArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeLongArray.singleOf(size);
    }
    return PagedHugeLongArray.pagedOf(size);
  }

  // Internal factory methods for testing

  public static newSingleArray(size: number): HugeLongArray {
    // Creates a new SingleHugeLongArray with the specified size
    return SingleHugeLongArray.singleOf(size);
  }

  public static newPagedArray(size: number): HugeLongArray {
    // Creates a new PagedHugeLongArray with the specified size
    return PagedHugeLongArray.pagedOf(size);
  }

  // Purpose: Test paging logic with 1KB arrays instead of 1GB arrays!
  /**
   * Creates a new array initialized with the provided values.
   *
   * @param values Initial values for the array
   * @returns A new HugeLongArray containing the provided values
   */
  // In abstract parent HugeLongArray:
  public static of(values: number[]): HugeLongArray; // Array form
  public static of(...values: number[]): HugeLongArray; // Varargs form
  public static of(pages: number[][], size: number): HugeLongArray; // Pages form

  public static of(
    arg: number[] | number[][] | number,
    ...moreArgs: any[]
  ): HugeLongArray {
    // Varargs case: of(1, 2, 3, 4, 5)
    if (typeof arg === "number") {
      const values = [arg, ...(moreArgs as number[])];
      return new SingleHugeLongArray(values.length, values);
    }

    // Array case: of([1, 2, 3, 4, 5])
    if (
      Array.isArray(arg) &&
      (arg.length === 0 || typeof arg[0] === "number")
    ) {
      const values = arg as number[];
      return new SingleHugeLongArray(values.length, values);
    }

    // Pages case: of([[1,2], [3,4]], 4)
    const pages = arg as number[][];
    const size = moreArgs[0] as number;
    const memoryUsed = PagedHugeLongArray.memoryUsed(pages, size);
    return new PagedHugeLongArray(size, pages, memoryUsed);
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
 * This implementation provides **optimal performance** for smaller arrays by using
 * a single underlying `number[]` array with no page management overhead.
 */
class SingleHugeLongArray extends HugeLongArray {
  public _size: number;
  public _page: number[] | null;

  public static singleOf(size: number): HugeLongArray {
    console.assert(
      size <= HugeArrays.MAX_ARRAY_LENGTH,
      `Size ${size} exceeds maximum array length`
    );
    const intSize = Math.floor(size);
    const page = new Array<number>(intSize).fill(0);
    return new SingleHugeLongArray(intSize, page);
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

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    this._page![index] = value;
  }

  public or(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![index] |= value;
  }

  public and(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    return (this._page![index] &= value);
  }

  public addTo(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![index] += value;
  }

  public setAll(gen: (index: number) => number): void {
    for (let i = 0; i < this._page!.length; i++) {
      this._page![i] = gen(i);
    }
  }

  public fill(value: number): void {
    this._page!.fill(value);
  }

  public copyTo(dest: HugeLongArray, length: number): void {
    length = Math.min(length, this._size, dest._size);

    if (dest instanceof SingleHugeLongArray) {
      // dest = dest as SingleHugeLongArray;
      // Copy to another single array
      this.arrayCopy(this._page!, 0, dest._page!, 0, length);
      // Fill remaining positions with 0
      dest._page!.fill(0, length, dest._size);
    } else if (dest instanceof PagedHugeLongArray) {
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

  public binarySearch(searchValue: number): number {
    return ArrayUtil.binaryLookup(searchValue, this._page!);
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
 * appearance of a single large array while working within JavaScript's constraints.
 */
class PagedHugeLongArray extends HugeLongArray {
  public _size: number;
  public _pages: number[][] | null;
  private _memoryUsed: number;

  /**
   * Factory method for creating paged arrays.
   *
   * @param size The desired array size
   * @returns A new PagedHugeLongArray instance
   */

  // In PagedHugeLongArray class:
  public static pagedOf(size: number): HugeLongArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: number[][] = new Array(numPages);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      pages[i] = new Array<number>(HugeArrays.PAGE_SIZE).fill(0);
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<number>(lastPageSize).fill(0);

    const memoryUsed = this.memoryUsed(pages, size);
    return new PagedHugeLongArray(size, pages, memoryUsed);
  }

  /**
   * Calculates memory usage for a given page array configuration.
   *
   * @param pages Array of pages
   * @param size Logical array size
   * @returns Memory usage in bytes
   */
  public static memoryUsed(pages: number[][], size: number): number {
    const numPages = pages.length;
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);

    const pageBytes = Estimate.sizeOfLongArray(HugeArrays.PAGE_SIZE);
    memoryUsed += pageBytes * (numPages - 1);

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfLongArray(lastPageSize);

    return memoryUsed;
  }

  constructor(size: number, pages: number[][], memoryUsed: number) {
    super();
    this._size = size;
    this._pages = pages;
    this._memoryUsed = memoryUsed;
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds for array size ${this._size}`
      );
    }
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this._pages![pageIndex][indexInPage];
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

  public copyTo(dest: HugeLongArray, length: number): void {
    length = Math.min(length, this._size, dest._size);

    if (dest instanceof SingleHugeLongArray) {
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
    } else if (dest instanceof PagedHugeLongArray) {
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

  public binarySearch(searchValue: number): number {
    // Search from last page to first
    for (let pageIndex = this._pages!.length - 1; pageIndex >= 0; pageIndex--) {
      const page = this._pages![pageIndex];
      const value = ArrayUtil.binaryLookup(searchValue, page);

      if (value !== -1) {
        return HugeArrays.indexFromPageIndexAndIndexInPage(pageIndex, value);
      }
    }
    return -1;
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
