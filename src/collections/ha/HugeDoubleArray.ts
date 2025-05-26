import {
  HugeCursor,
  SinglePageCursor,
  PagedCursor,
} from "@/collections/cursor/HugeCursor";
import { HugeArrays } from "@/mem/HugeArrays";
import { Estimate } from "@/mem/Estimate";
import { HugeArray } from "./HugeArray";

/**
 * A number-indexable version of a primitive number array that can contain more than 2 billion elements.
 *
 * This is the **floating-point optimized variant** of HugeArray designed specifically for storing
 * double-precision floating-point values efficiently while supporting massive datasets that exceed
 * standard JavaScript array limitations. It provides high-performance storage for continuous numeric
 * data such as weights, scores, distances, and other floating-point computations in graph analytics.
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
 * - This enables optimal memory layout and performance optimization for numerical computations
 *
 * **2. Dense Storage Optimization:**
 * - Not optimized for sparseness and has a large memory overhead if values are very sparse
 * - For sparse floating-point data, consider `HugeSparseDoubleArray` which can benefit from sparse patterns
 * - Every element position consumes memory regardless of whether it contains meaningful data
 *
 * **3. Zero Default Values:**
 * - Does not support custom default values
 * - Returns the same default for unset values that a regular `number[]` does (`0.0`)
 * - All elements are automatically initialized to `0.0` when the array is created
 *
 * **Floating-Point Specific Optimizations:**
 *
 * **IEEE 754 Double Precision:**
 * JavaScript's `number` type provides IEEE 754 double-precision floating-point:
 * - **Precision**: 53-bit mantissa providing ~15-17 decimal digits of precision
 * - **Range**: Approximately ±1.8 × 10^308 with minimum positive value ~5 × 10^-324
 * - **Special values**: Supports `Infinity`, `-Infinity`, and `NaN` for edge cases
 * - **Arithmetic operations**: Full IEEE 754 compliance for addition, multiplication, etc.
 *
 * **Performance Characteristics:**
 *
 * **Floating-Point Operations:**
 * ```
 * Arithmetic Operations:
 * - Addition (+): Accumulate weights, scores, distances
 * - Multiplication (*): Scale values, compute products
 * - Division (/): Normalize values, compute averages
 * - Comparison: Sort, find min/max, threshold operations
 *
 * Memory Access:
 * - Single array: Direct access, optimal for < 2^31 elements
 * - Paged array: Page-based lookup for larger datasets
 * - Sequential access: Optimized for numerical processing pipelines
 * ```
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Edge Weights and Distances:**
 * ```typescript
 * // Store edge weights for weighted graph algorithms
 * const edgeWeights = HugeDoubleArray.newArray(edgeCount);
 * edgeWeights.setAll(edgeIndex => loadEdgeWeight(edgeIndex));
 *
 * // Fast access during shortest path computation
 * const weight = edgeWeights.get(edgeIndex);
 * const totalDistance = currentDistance + weight;
 * ```
 *
 * **Node Scores and Rankings:**
 * ```typescript
 * // Store PageRank scores for large graphs
 * const pageRankScores = HugeDoubleArray.newArray(nodeCount);
 * pageRankScores.fill(1.0 / nodeCount); // Initialize with uniform distribution
 *
 * // Update scores during iterative computation
 * for (const nodeId of nodes) {
 *   const newScore = computePageRankScore(nodeId);
 *   pageRankScores.set(nodeId, newScore);
 * }
 * ```
 *
 * **Algorithm Working Arrays:**
 * ```typescript
 * // Dijkstra's algorithm distance tracking
 * const distances = HugeDoubleArray.newArray(nodeCount);
 * distances.fill(Number.POSITIVE_INFINITY);
 * distances.set(startNode, 0.0);
 *
 * // Relaxation step
 * for (const edge of adjacentEdges) {
 *   const newDistance = distances.get(edge.source) + edge.weight;
 *   if (newDistance < distances.get(edge.target)) {
 *     distances.set(edge.target, newDistance);
 *   }
 * }
 * ```
 *
 * **Centrality Measures:**
 * ```typescript
 * // Store betweenness centrality values
 * const betweenness = HugeDoubleArray.newArray(nodeCount);
 * betweenness.fill(0.0);
 *
 * // Accumulate centrality scores
 * for (const nodeId of nodes) {
 *   const contribution = computeCentralityContribution(nodeId);
 *   betweenness.addTo(nodeId, contribution);
 * }
 * ```
 *
 * **Probability and Statistical Data:**
 * ```typescript
 * // Store transition probabilities for random walks
 * const transitionProbs = HugeDoubleArray.newArray(nodeCount);
 * transitionProbs.setAll(nodeId => computeTransitionProbability(nodeId));
 *
 * // Normalize probabilities to sum to 1.0
 * const cursor = transitionProbs.newCursor();
 * let totalSum = 0.0;
 *
 * // First pass: compute sum
 * transitionProbs.initCursor(cursor);
 * while (cursor.next()) {
 *   const page = cursor.array!;
 *   for (let i = cursor.offset; i < cursor.limit; i++) {
 *     totalSum += page[i];
 *   }
 * }
 *
 * // Second pass: normalize
 * transitionProbs.initCursor(cursor);
 * while (cursor.next()) {
 *   const page = cursor.array!;
 *   for (let i = cursor.offset; i < cursor.limit; i++) {
 *     page[i] /= totalSum;
 *   }
 * }
 * ```
 *
 * **Numerical Algorithm Integration:**
 *
 * **Matrix Operations:**
 * ```typescript
 * // Store sparse matrix values in flattened format
 * const matrixValues = HugeDoubleArray.newArray(matrixSize);
 *
 * // Matrix-vector multiplication
 * const result = HugeDoubleArray.newArray(vectorSize);
 * for (let row = 0; row < matrixRows; row++) {
 *   let sum = 0.0;
 *   for (let col = 0; col < matrixCols; col++) {
 *     const matrixValue = matrixValues.get(row * matrixCols + col);
 *     const vectorValue = inputVector.get(col);
 *     sum += matrixValue * vectorValue;
 *   }
 *   result.set(row, sum);
 * }
 * ```
 *
 * **Statistical Aggregation:**
 * ```typescript
 * // Compute moving averages over large datasets
 * const movingAverages = HugeDoubleArray.newArray(timeSeriesLength);
 * const windowSize = 100;
 *
 * for (let i = windowSize; i < timeSeriesLength; i++) {
 *   let sum = 0.0;
 *   for (let j = i - windowSize; j < i; j++) {
 *     sum += timeSeriesData.get(j);
 *   }
 *   movingAverages.set(i, sum / windowSize);
 * }
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Bulk Numerical Processing:**
 * ```typescript
 * // Vectorized operations using cursors
 * const cursor = doubleArray.newCursor();
 * try {
 *   doubleArray.initCursor(cursor);
 *   while (cursor.next()) {
 *     const page = cursor.array!;
 *
 *     // SIMD-friendly operations on page-sized chunks
 *     for (let i = cursor.offset; i < cursor.limit; i++) {
 *       const value = page[i];
 *       const globalIndex = cursor.base + i;
 *
 *       // Apply mathematical transformations
 *       const transformed = Math.sqrt(value * value + 1.0);
 *       page[i] = transformed;
 *     }
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 *
 * **Memory-Efficient Streaming:**
 * ```typescript
 * // Process huge arrays without loading all data into memory
 * function* streamDoubleArray(array: HugeDoubleArray): Generator<number> {
 *   const cursor = array.newCursor();
 *   try {
 *     array.initCursor(cursor);
 *     while (cursor.next()) {
 *       const page = cursor.array!;
 *       for (let i = cursor.offset; i < cursor.limit; i++) {
 *         yield page[i];
 *       }
 *     }
 *   } finally {
 *     cursor.close();
 *   }
 * }
 *
 * // Use streaming for memory-conscious processing
 * let sum = 0.0;
 * let count = 0;
 * for (const value of streamDoubleArray(largeArray)) {
 *   sum += value;
 *   count++;
 * }
 * const average = sum / count;
 * ```
 *
 * **Apache Arrow Integration Readiness:**
 * The floating-point focused design aligns with Apache Arrow's double array types:
 * - **Float64Array**: Direct mapping to Arrow's 64-bit floating-point arrays
 * - **Columnar format**: Optimized for analytical operations and aggregations
 * - **Zero-copy interop**: Direct buffer access for high-performance numerical libraries
 * - **SIMD optimization**: Page layout suitable for vectorized mathematical operations
 *
 * **Numerical Precision Considerations:**
 * - **Accumulation errors**: Be aware of floating-point precision limits in long computations
 * - **Comparison operations**: Use epsilon-based comparisons for floating-point equality
 * - **Special value handling**: Properly handle `NaN`, `Infinity`, and `-Infinity` cases
 * - **Underflow/overflow**: Monitor for numerical overflow in iterative algorithms
 */
export abstract class HugeDoubleArray extends HugeArray<
  number[],
  number,
  HugeDoubleArray
> {
  // Common properties used by implementations
  public _size: number = 0;
  public _page?: number[] | null;
  public _pages?: number[][] | null;

  /**
   * Estimates the memory required for a HugeDoubleArray of the specified size.
   *
   * This method provides **accurate memory forecasting** specifically calibrated for
   * double-precision floating-point array implementations. The estimation considers:
   * - **Double-precision overhead**: 64-bit values require more memory than integers
   * - **Implementation selection**: Accounts for single vs. paged array choice
   * - **Numerical precision**: Optimized for floating-point storage patterns
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    console.assert(size >= 0, `Size must be non-negative, got ${size}`);

    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      // Single array implementation
      return (
        Estimate.sizeOfInstance(SingleHugeDoubleArray.name) +
        Estimate.sizeOfDoubleArray(size)
      );
    }

    // Paged array implementation
    const sizeOfInstance = Estimate.sizeOfInstance(PagedHugeDoubleArray.name);
    const numPages = HugeArrays.numberOfPages(size);

    // Calculate memory for page reference array
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);

    // Calculate memory for full pages
    const pageBytes = Estimate.sizeOfDoubleArray(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    // Calculate memory for the last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfDoubleArray(lastPageSize);

    return sizeOfInstance + memoryUsed;
  }

  /**
   * Returns the double value at the given index.
   *
   * This is the **primary random access method** for reading individual floating-point
   * elements from the array. Optimized for double-precision access with O(1) time complexity.
   *
   * **Floating-Point Semantics:**
   * - **IEEE 754 compliance**: Returns standard double-precision floating-point values
   * - **Special values**: Properly handles `NaN`, `Infinity`, and `-Infinity`
   * - **Precision**: Full 53-bit mantissa precision preserved
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The double-precision floating-point value at the specified index
   * @throws Error if index is negative or >= size()
   */
  public abstract get(index: number): number;

  /**
   * Sets the double value at the given index to the given value.
   *
   * This is the **primary random access method** for writing individual floating-point
   * elements to the array. Optimized for double-precision storage with O(1) time complexity.
   *
   * **Floating-Point Storage:**
   * - **IEEE 754 storage**: Stores values in standard double-precision format
   * - **Special value support**: Properly stores `NaN`, `Infinity`, and `-Infinity`
   * - **Precision preservation**: Maintains full floating-point precision
   *
   * @param index The index where to store the value (must be in [0, size()))
   * @param value The double-precision floating-point value to store
   * @throws Error if index is negative or >= size()
   */
  public abstract set(index: number, value: number): void;

  /**
   * Adds the existing value and the provided value at the given index and stores the result.
   *
   * This method provides **atomic floating-point addition** for accumulation operations
   * commonly used in numerical algorithms. The operation is equivalent to:
   * `array[index] = array[index] + value`
   *
   * **Floating-Point Addition:**
   * - **IEEE 754 arithmetic**: Standard floating-point addition rules apply
   * - **Precision handling**: Maintains double-precision accuracy
   * - **Special value propagation**: Properly handles `NaN` and infinity arithmetic
   * - **Accumulation patterns**: Optimized for iterative numerical algorithms
   *
   * **Common Use Cases:**
   *
   * **Score Accumulation:**
   * ```typescript
   * // Accumulate PageRank contributions
   * const pageRankScores = HugeDoubleArray.newArray(nodeCount);
   * for (const contribution of computeContributions()) {
   *   pageRankScores.addTo(contribution.nodeId, contribution.value);
   * }
   * ```
   *
   * **Weighted Aggregation:**
   * ```typescript
   * // Accumulate weighted sums
   * const weightedSums = HugeDoubleArray.newArray(bucketCount);
   * for (const item of dataItems) {
   *   const bucket = computeBucket(item);
   *   weightedSums.addTo(bucket, item.value * item.weight);
   * }
   * ```
   *
   * **Numerical Integration:**
   * ```typescript
   * // Accumulate numerical integration results
   * const integrationResult = HugeDoubleArray.newArray(intervalCount);
   * for (let i = 0; i < sampleCount; i++) {
   *   const interval = computeInterval(i);
   *   const contribution = evaluateFunction(i) * stepSize;
   *   integrationResult.addTo(interval, contribution);
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
   * This method provides **high-performance bulk initialization** optimized for
   * floating-point value generation. Essential for populating arrays with computed
   * mathematical sequences, probability distributions, and analytical results.
   *
   * @param gen Generator function that computes the floating-point value for each index
   */
  public abstract setAll(gen: (index: number) => number): void;

  /**
   * Assigns the specified double value to each element in the array.
   *
   * This method provides **efficient bulk assignment** optimized for floating-point
   * values. Ideal for initializing arrays with default values, resetting computation
   * state, or creating uniform distributions.
   *
   * @param value The double-precision floating-point value to assign to every element
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
   * Returns a stream of double values from this array.
   *
   * This method provides **streaming access** to array elements, enabling functional
   * programming patterns and memory-efficient processing of large floating-point datasets.
   *
   * **Streaming Benefits:**
   * - **Memory efficiency**: Process elements without loading entire array into memory
   * - **Functional composition**: Chain operations using standard stream operations
   * - **Lazy evaluation**: Elements computed on-demand during iteration
   * - **Pipeline optimization**: Combine multiple operations for optimal performance
   *
   * **Usage Patterns:**
   *
   * **Statistical Operations:**
   * ```typescript
   * // Compute statistics using streaming
   * const array = HugeDoubleArray.newArray(largeSize);
   *
   * const sum = array.stream().reduce((a, b) => a + b, 0);
   * const count = array.size();
   * const average = sum / count;
   *
   * const variance = array.stream()
   *   .map(x => (x - average) * (x - average))
   *   .reduce((a, b) => a + b, 0) / count;
   * ```
   *
   * **Filtering and Transformation:**
   * ```typescript
   * // Process only positive values
   * const positiveSum = array.stream()
   *   .filter(x => x > 0)
   *   .reduce((a, b) => a + b, 0);
   *
   * // Apply mathematical transformations
   * const normalized = array.stream()
   *   .map(x => (x - mean) / standardDeviation)
   *   .toArray();
   * ```
   *
   * @returns A stream of floating-point values for functional processing
   */
  public abstract stream(): Generator<number>;

  /**
   * Copies the content of this array into the target array.
   *
   * @param dest Target array to copy data into
   * @param length Number of elements to copy from start of this array
   */
  public abstract copyTo(dest: HugeDoubleArray, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * @param newLength The size of the new array
   * @returns A new array instance with the specified length containing copied data
   */
  public copyOf(newLength: number): HugeDoubleArray {
    const copy = HugeDoubleArray.newArray(newLength);
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
   * This is the **primary factory method** for creating HugeDoubleArray instances.
   * Automatically chooses the optimal implementation based on size.
   *
   * @param size The desired array size in elements
   * @returns A new HugeDoubleArray instance optimized for the given size
   */
  public static newArray(size: number): HugeDoubleArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeDoubleArray.of(size);
    }
    return PagedHugeDoubleArray.of(size);
  }

  /**
   * Creates a new array initialized with the provided values.
   *
   * @param values Initial floating-point values for the array
   * @returns A new HugeDoubleArray containing the provided values
   */
  public static of(...values: number[]): HugeDoubleArray {
    return new SingleHugeDoubleArray(values.length, values);
  }

  // Test-only factory methods
  /** @internal */
  public static newPagedArray(size: number): HugeDoubleArray {
    return PagedHugeDoubleArray.of(size);
  }

  /** @internal */
  public static newSingleArray(size: number): HugeDoubleArray {
    return SingleHugeDoubleArray.of(size);
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
 * This implementation provides **optimal performance** for smaller floating-point arrays
 * by using a single underlying `number[]` array with no page management overhead.
 */
class SingleHugeDoubleArray extends HugeDoubleArray {
  public _size: number;
  public _page: number[] | null;

  /**
   * Factory method for creating single-page floating-point arrays.
   *
   * @param size The desired array size
   * @returns A new SingleHugeDoubleArray instance
   */
  public static of(size: number): HugeDoubleArray {
    console.assert(
      size <= HugeArrays.MAX_ARRAY_LENGTH,
      `Size ${size} exceeds maximum array length`
    );
    const intSize = Math.floor(size);
    const page = new Array<number>(intSize).fill(0.0);
    return new SingleHugeDoubleArray(intSize, page);
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

  public copyTo(dest: HugeDoubleArray, length: number): void {
    length = Math.min(length, this._size, dest._size);

    if (dest instanceof SingleHugeDoubleArray) {
      // Copy to another single array
      this.arrayCopy(this._page!, 0, dest._page!, 0, length);
      // Fill remaining positions with 0.0
      dest._page!.fill(0.0, length, dest._size);
    } else if (dest instanceof PagedHugeDoubleArray) {
      // Copy to paged array
      let start = 0;
      let remaining = length;

      for (const dstPage of dest._pages!) {
        const toCopy = Math.min(remaining, dstPage.length);
        if (toCopy === 0) {
          dstPage.fill(0.0);
        } else {
          this.arrayCopy(this._page!, start, dstPage, 0, toCopy);
          if (toCopy < dstPage.length) {
            dstPage.fill(0.0, toCopy, dstPage.length);
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
    return Estimate.sizeOfDoubleArray(this._size);
  }

  public release(): number {
    if (this._page !== null) {
      this._page = null;
      return Estimate.sizeOfDoubleArray(this._size);
    }
    return 0;
  }

  public newCursor(): HugeCursor<number[]> {
    return new SinglePageCursor<number[]>(this._page!);
  }

  public *stream(): Generator<number> {
    if (this._page) {
      for (const value of this._page) {
        yield value;
      }
    }
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
 * appearance of a single large floating-point array while working within JavaScript's constraints.
 */
class PagedHugeDoubleArray extends HugeDoubleArray {
  public _size: number;
  public _pages: number[][] | null;
  private _memoryUsed: number;

  /**
   * Factory method for creating paged floating-point arrays.
   *
   * @param size The desired array size
   * @returns A new PagedHugeDoubleArray instance
   */
  public static of(size: number): HugeDoubleArray {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: number[][] = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfDoubleArray(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      memoryUsed += pageBytes;
      pages[i] = new Array<number>(HugeArrays.PAGE_SIZE).fill(0.0);
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<number>(lastPageSize).fill(0.0);
    memoryUsed += Estimate.sizeOfDoubleArray(lastPageSize);

    return new PagedHugeDoubleArray(size, pages, memoryUsed);
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

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] = value;
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

  public copyTo(dest: HugeDoubleArray, length: number): void {
    length = Math.min(length, this._size, dest._size);

    if (dest instanceof SingleHugeDoubleArray) {
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
      // Fill remaining positions with 0.0
      dest._page!.fill(0.0, start, dest._size);
    } else if (dest instanceof PagedHugeDoubleArray) {
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
        lastDstPage.fill(0.0, remaining, lastDstPage.length);
      }

      // Fill remaining pages with 0.0
      for (let i = pageLen; i < dest._pages!.length; i++) {
        dest._pages![i].fill(0.0);
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

  public *stream(): Generator<number> {
    if (this._pages) {
      for (const page of this._pages) {
        for (const value of page) {
          yield value;
        }
      }
    }
  }
}
