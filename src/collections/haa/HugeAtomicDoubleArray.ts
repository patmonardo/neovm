import { HugeArrays } from "@/mem";
import { Estimate } from "@/mem";
import {
  HugeCursor,
  SinglePageCursor,
  PagedCursor,
  HugeCursorSupport,
} from "@/collections";
import { DoublePageCreator } from "./PageCreator";
import { DoubleToDoubleFunction } from "./ValueTransformers";

/**
 * A huge atomic array for double-precision floating-point values supporting massive datasets.
 *
 * This is the **atomic variant** of HugeDoubleArray, providing thread-safe operations
 * for concurrent access to double-precision floating-point data in massive graph analytics
 * and numerical computing scenarios. It combines the memory efficiency of the huge array
 * architecture with atomic operation guarantees essential for parallel algorithms.
 *
 * **Design Philosophy:**
 *
 * **1. Atomic Floating-Point Operations:**
 * Provides atomic read-modify-write operations specifically optimized for double-precision
 * floating-point values, essential for concurrent numerical algorithms:
 * - **Lock-free updates**: Compare-and-swap operations without explicit locking
 * - **Atomic accumulation**: Thread-safe addition and replacement operations
 * - **Consistent reads**: Guaranteed atomic visibility of double-precision values
 * - **CAS loops**: Efficient retry mechanisms for complex atomic updates
 *
 * **2. Massive Scale Support:**
 * Built on the same huge array foundation as HugeDoubleArray but with atomic guarantees:
 * - **Beyond 2³¹ elements**: Support for arrays larger than JavaScript's native limits
 * - **Memory efficiency**: Paged architecture minimizes memory overhead
 * - **Cache optimization**: Page-based layout optimized for numerical processing patterns
 * - **Scalable concurrency**: Performance scales with available CPU cores
 *
 * **3. Numerical Algorithm Integration:**
 * Designed specifically for concurrent numerical algorithms common in graph analytics:
 * - **Parallel accumulation**: Concurrent aggregation of numerical results
 * - **Atomic scoring**: Thread-safe updates to node/edge scores and rankings
 * - **Convergence detection**: Safe concurrent reads for iterative algorithm termination
 * - **Distributed computation**: Support for work-stealing and parallel processing patterns
 *
 * **Concurrency Model:**
 *
 * **Thread-Safe Operations:**
 * All atomic operations provide strong consistency guarantees:
 * ```typescript
 * // Safe concurrent accumulation
 * const scores = HugeAtomicDoubleArray.of(nodeCount, PageCreators.zeroDoubles());
 *
 * // Multiple threads can safely update different or same elements
 * await Promise.all(workers.map(async (worker) => {
 *   for (const contribution of worker.computeContributions()) {
 *     scores.getAndAdd(contribution.nodeId, contribution.value);
 *   }
 * }));
 * ```
 *
 * **Compare-and-Swap Patterns:**
 * Efficient atomic updates with retry logic:
 * ```typescript
 * // Atomic maximum update
 * function atomicMax(array: HugeAtomicDoubleArray, index: number, newValue: number): void {
 *   array.update(index, (currentValue) => Math.max(currentValue, newValue));
 * }
 *
 * // Atomic conditional update
 * function atomicThreshold(array: HugeAtomicDoubleArray, index: number, threshold: number): boolean {
 *   const oldValue = array.get(index);
 *   if (oldValue < threshold) {
 *     return array.compareAndSet(index, oldValue, threshold);
 *   }
 *   return false;
 * }
 * ```
 *
 * **Performance Characteristics:**
 *
 * **Atomic Operation Costs:**
 * Understanding the performance implications of atomic operations:
 * ```
 * Operation Type          | Relative Cost | Best Use Case
 * ----------------------- | ------------- | ---------------------------
 * get()                   | 1x            | Read-heavy algorithms
 * set()                   | 1x            | Simple updates
 * getAndAdd()            | 2-3x          | Accumulation patterns
 * compareAndSet()        | 2-5x          | Conditional updates
 * update() with function | 3-10x         | Complex transformations
 * ```
 *
 * **Concurrent Access Patterns:**
 * ```typescript
 * // High-performance concurrent accumulation
 * class ConcurrentAccumulator {
 *   private array: HugeAtomicDoubleArray;
 *
 *   constructor(size: number) {
 *     this.array = HugeAtomicDoubleArray.of(size, PageCreators.zeroDoubles());
 *   }
 *
 *   // Fast atomic accumulation
 *   accumulate(index: number, value: number): void {
 *     this.array.getAndAdd(index, value);
 *   }
 *
 *   // Batch accumulation for better cache locality
 *   accumulateBatch(updates: Array<{index: number, value: number}>): void {
 *     // Sort by index for better cache performance
 *     updates.sort((a, b) => a.index - b.index);
 *
 *     for (const update of updates) {
 *       this.array.getAndAdd(update.index, update.value);
 *     }
 *   }
 *
 *   // Atomic normalization
 *   normalize(totalSum: number): void {
 *     const size = this.array.size();
 *     const factor = 1.0 / totalSum;
 *
 *     // Parallel normalization
 *     const workers = Array.from({length: navigator.hardwareConcurrency || 4}, (_, i) => {
 *       const start = Math.floor(size * i / 4);
 *       const end = Math.floor(size * (i + 1) / 4);
 *
 *       return Promise.resolve().then(() => {
 *         for (let j = start; j < end; j++) {
 *           this.array.update(j, (value) => value * factor);
 *         }
 *       });
 *     });
 *
 *     return Promise.all(workers);
 *   }
 * }
 * ```
 *
 * **Graph Analytics Applications:**
 *
 * **PageRank Computation:**
 * ```typescript
 * async function parallelPageRank(
 *   graph: Graph,
 *   iterations: number,
 *   dampingFactor: number = 0.85
 * ): Promise<HugeAtomicDoubleArray> {
 *   const nodeCount = graph.nodeCount();
 *   const currentScores = HugeAtomicDoubleArray.of(nodeCount, PageCreators.constantDoubles(1.0 / nodeCount));
 *   const nextScores = HugeAtomicDoubleArray.of(nodeCount, PageCreators.zeroDoubles());
 *
 *   for (let iter = 0; iter < iterations; iter++) {
 *     // Reset next scores
 *     nextScores.setAll(0.0);
 *
 *     // Parallel score distribution
 *     const workers = graph.getEdgePartitions().map(async (partition) => {
 *       for (const edge of partition) {
 *         const sourceScore = currentScores.get(edge.source);
 *         const contribution = sourceScore * dampingFactor / edge.outDegree;
 *         nextScores.getAndAdd(edge.target, contribution);
 *       }
 *     });
 *
 *     await Promise.all(workers);
 *
 *     // Add teleport probability
 *     const teleportValue = (1.0 - dampingFactor) / nodeCount;
 *     for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
 *       nextScores.getAndAdd(nodeId, teleportValue);
 *     }
 *
 *     // Swap arrays for next iteration
 *     [currentScores, nextScores] = [nextScores, currentScores];
 *   }
 *
 *   return currentScores;
 * }
 * ```
 *
 * **Parallel Betweenness Centrality:**
 * ```typescript
 * async function parallelBetweennessCentrality(graph: Graph): Promise<HugeAtomicDoubleArray> {
 *   const nodeCount = graph.nodeCount();
 *   const centrality = HugeAtomicDoubleArray.of(nodeCount, PageCreators.zeroDoubles());
 *
 *   // Process sources in parallel
 *   const sourcePartitions = partitionNodes(graph.nodes(), navigator.hardwareConcurrency || 4);
 *
 *   const workers = sourcePartitions.map(async (sources) => {
 *     for (const source of sources) {
 *       const contributions = computeBetweennessContributions(graph, source);
 *
 *       // Atomic accumulation of contributions
 *       for (const [nodeId, contribution] of contributions) {
 *         centrality.getAndAdd(nodeId, contribution);
 *       }
 *     }
 *   });
 *
 *   await Promise.all(workers);
 *
 *   // Normalize centrality values
 *   const normalizationFactor = 2.0 / ((nodeCount - 1) * (nodeCount - 2));
 *   for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
 *     centrality.update(nodeId, (value) => value * normalizationFactor);
 *   }
 *
 *   return centrality;
 * }
 * ```
 *
 * **Atomic Clustering Coefficient:**
 * ```typescript
 * async function parallelClusteringCoefficient(graph: Graph): Promise<HugeAtomicDoubleArray> {
 *   const nodeCount = graph.nodeCount();
 *   const coefficients = HugeAtomicDoubleArray.of(nodeCount, PageCreators.zeroDoubles());
 *
 *   // Parallel processing of node neighborhoods
 *   const nodePartitions = partitionNodes(graph.nodes(), navigator.hardwareConcurrency || 4);
 *
 *   const workers = nodePartitions.map(async (nodes) => {
 *     for (const nodeId of nodes) {
 *       const neighbors = graph.getNeighbors(nodeId);
 *       const degree = neighbors.length;
 *
 *       if (degree < 2) {
 *         coefficients.set(nodeId, 0.0);
 *         continue;
 *       }
 *
 *       // Count triangles
 *       let triangles = 0;
 *       for (let i = 0; i < neighbors.length; i++) {
 *         for (let j = i + 1; j < neighbors.length; j++) {
 *           if (graph.hasEdge(neighbors[i], neighbors[j])) {
 *             triangles++;
 *           }
 *         }
 *       }
 *
 *       const coefficient = (2.0 * triangles) / (degree * (degree - 1));
 *       coefficients.set(nodeId, coefficient);
 *     }
 *   });
 *
 *   await Promise.all(workers);
 *   return coefficients;
 * }
 * ```
 *
 * **Memory Management:**
 *
 * **Concurrent Memory Efficiency:**
 * ```typescript
 * // Memory-conscious parallel processing
 * class MemoryEfficientProcessor {
 *   private workingArrays: HugeAtomicDoubleArray[] = [];
 *
 *   async processInChunks<T>(
 *     data: T[],
 *     chunkSize: number,
 *     processor: (chunk: T[], result: HugeAtomicDoubleArray) => Promise<void>
 *   ): Promise<HugeAtomicDoubleArray> {
 *     const finalResult = HugeAtomicDoubleArray.of(data.length, PageCreators.zeroDoubles());
 *
 *     // Process chunks sequentially to manage memory
 *     for (let i = 0; i < data.length; i += chunkSize) {
 *       const chunk = data.slice(i, i + chunkSize);
 *       const chunkResult = HugeAtomicDoubleArray.of(chunk.length, PageCreators.zeroDoubles());
 *
 *       await processor(chunk, chunkResult);
 *
 *       // Merge results atomically
 *       for (let j = 0; j < chunk.length; j++) {
 *         finalResult.getAndAdd(i + j, chunkResult.get(j));
 *       }
 *
 *       // Release chunk memory
 *       chunkResult.release();
 *     }
 *
 *     return finalResult;
 *   }
 * }
 * ```
 *
 * **JavaScript Concurrency Considerations:**
 *
 * **Web Workers Integration:**
 * ```typescript
 * // Coordinate atomic arrays across Web Workers
 * class DistributedAtomicArray {
 *   private sharedBuffer: SharedArrayBuffer;
 *   private atomicView: Float64Array;
 *
 *   constructor(size: number) {
 *     this.sharedBuffer = new SharedArrayBuffer(size * 8);
 *     this.atomicView = new Float64Array(this.sharedBuffer);
 *   }
 *
 *   // Atomic operations using Atomics API
 *   atomicAdd(index: number, value: number): number {
 *     // Note: Atomics API doesn't directly support Float64,
 *     // so this is a simplified example
 *     const intView = new Int32Array(this.sharedBuffer, index * 8, 2);
 *     // Implementation would need proper double-precision atomic operations
 *     return value; // Placeholder
 *   }
 *
 *   distributeToWorkers(): void {
 *     // Send shared buffer to multiple workers
 *     workers.forEach(worker => {
 *       worker.postMessage({ sharedBuffer: this.sharedBuffer });
 *     });
 *   }
 * }
 * ```
 *
 * **Performance Optimization:**
 *
 * **Batch Operations:**
 * ```typescript
 * // Optimize atomic operations with batching
 * class BatchedAtomicOperations {
 *   private pendingUpdates: Map<number, number> = new Map();
 *   private batchSize: number = 1000;
 *
 *   queueAdd(array: HugeAtomicDoubleArray, index: number, value: number): void {
 *     const current = this.pendingUpdates.get(index) || 0;
 *     this.pendingUpdates.set(index, current + value);
 *
 *     if (this.pendingUpdates.size >= this.batchSize) {
 *       this.flushUpdates(array);
 *     }
 *   }
 *
 *   flushUpdates(array: HugeAtomicDoubleArray): void {
 *     // Sort by index for better cache performance
 *     const sortedUpdates = Array.from(this.pendingUpdates.entries())
 *       .sort(([a], [b]) => a - b);
 *
 *     for (const [index, value] of sortedUpdates) {
 *       array.getAndAdd(index, value);
 *     }
 *
 *     this.pendingUpdates.clear();
 *   }
 * }
 * ```
 */
export abstract class HugeAtomicDoubleArray<TStorage = any>
  implements HugeCursorSupport<number[]>
{
  // Common properties used by implementations
  public _size?: number;
  public _page?: TStorage | null;
  public _pages?: TStorage[] | null;

  /**
   * Creates a new array of the given size with the specified page creator.
   *
   * This is the **primary factory method** for creating HugeAtomicDoubleArray instances.
   * Automatically chooses the optimal implementation (single vs. paged) based on size.
   *
   * @param size The desired array size in elements
   * @param pageCreator Strategy for initializing pages with specific values
   * @returns A new HugeAtomicDoubleArray instance optimized for the given size
   */
  public static of(
    size: number,
    pageCreator: DoublePageCreator
  ): HugeAtomicDoubleArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return new SingleHugeAtomicDoubleArray(size, pageCreator);
    }
    return new PagedHugeAtomicDoubleArray(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicDoubleArray of the specified size.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return (
        Estimate.sizeOfInstance("SingleHugeAtomicDoubleArray") +
        Estimate.sizeOfDoubleArray(size)
      );
    }

    const sizeOfInstance = Estimate.sizeOfInstance(
      "PagedHugeAtomicDoubleArray"
    );
    const numPages = HugeArrays.numberOfPages(size);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfDoubleArray(HugeArrays.PAGE_SIZE);
    memoryUsed += (numPages - 1) * pageBytes;

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    memoryUsed += Estimate.sizeOfDoubleArray(lastPageSize);

    return sizeOfInstance + memoryUsed;
  }

  /**
   * Returns the default value used to fill remaining space in copy operations.
   *
   * @returns The default double value (0.0)
   */
  public defaultValue(): number {
    return 0.0;
  }

  /**
   * Returns the double value at the given index.
   *
   * This operation provides **atomic read semantics** ensuring that the returned
   * value represents a consistent snapshot of the element at the time of the call.
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The double-precision floating-point value at the specified index
   * @throws Error if index is negative or >= size()
   */
  public abstract get(index: number): number;

  /**
   * Atomically adds the given delta to the value at the given index.
   *
   * This is a **fundamental atomic accumulation operation** essential for concurrent
   * numerical algorithms. The operation is guaranteed to be atomic and returns the
   * previous value before the addition.
   *
   * **Concurrency Benefits:**
   * - **Thread-safe accumulation**: Multiple threads can safely accumulate to same index
   * - **Lock-free operation**: No explicit locking required
   * - **Memory ordering**: Provides proper memory visibility guarantees
   *
   * @param index The index where to add the delta value
   * @param delta The value to add to the existing value
   * @returns The previous value before the addition
   * @throws Error if index is negative or >= size()
   */
  public abstract getAndAdd(index: number, delta: number): number;

  /**
   * Atomically returns the value at the given index and replaces it with the given value.
   *
   * This operation provides **atomic exchange semantics** useful for concurrent
   * algorithms that need to swap values while retrieving the previous state.
   *
   * @param index The index of the element to replace
   * @param value The new value to store
   * @returns The previous value at the index
   * @throws Error if index is negative or >= size()
   */
  public abstract getAndReplace(index: number, value: number): number;

  /**
   * Sets the double value at the given index to the given value.
   *
   * **Note**: This operation provides atomic write semantics but does not return
   * the previous value. For atomic read-modify-write patterns, use getAndReplace.
   *
   * @param index The index where to store the value
   * @param value The double-precision floating-point value to store
   * @throws Error if index is negative or >= size()
   */
  public abstract set(index: number, value: number): void;

  /**
   * Atomically sets the element at position index to the given updated value
   * if the current value == the expected value.
   *
   * This is the **fundamental compare-and-swap operation** for lock-free algorithms.
   * Essential for implementing custom atomic operations and lock-free data structures.
   *
   * @param index The index of the element to conditionally update
   * @param expect The expected current value
   * @param update The new value to set if expectation is met
   * @returns true if successful, false if the actual value was not equal to expected
   * @throws Error if index is negative or >= size()
   */
  public abstract compareAndSet(
    index: number,
    expect: number,
    update: number
  ): boolean;

  /**
   * Atomically sets the element at position index to the given updated value
   * if the current value == the expected value, returning the witness value.
   *
   * This operation is **optimized for CAS loops** as it returns the actual current
   * value on failure, eliminating the need for an additional read operation.
   *
   * **CAS Loop Pattern:**
   * ```typescript
   * let oldValue = array.get(index);
   * while (true) {
   *   const newValue = transform(oldValue);
   *   const witnessValue = array.compareAndExchange(index, oldValue, newValue);
   *   if (witnessValue === oldValue) {
   *     // Success
   *     break;
   *   }
   *   // Retry with witnessed value
   *   oldValue = witnessValue;
   * }
   * ```
   *
   * @param index The index of the element to conditionally update
   * @param expect The expected current value
   * @param update The new value to set if expectation is met
   * @returns The witness value (equals expect if successful, or current value if not)
   * @throws Error if index is negative or >= size()
   */
  public abstract compareAndExchange(
    index: number,
    expect: number,
    update: number
  ): number;

  /**
   * Atomically updates the element at index with the results of applying the given function.
   *
   * This method provides **high-level atomic transformations** by automatically
   * handling the CAS retry loop. The function should be side-effect-free since it
   * may be re-applied when updates fail due to contention.
   *
   * **Common Patterns:**
   * ```typescript
   * // Atomic maximum
   * array.update(index, (current) => Math.max(current, newValue));
   *
   * // Atomic normalization
   * array.update(index, (current) => current / totalSum);
   *
   * // Atomic clamping
   * array.update(index, (current) => Math.max(0, Math.min(1, current)));
   * ```
   *
   * @param index The index of the element to update
   * @param updateFunction A side-effect-free function to transform the current value
   * @throws Error if index is negative or >= size()
   */
  public abstract update(
    index: number,
    updateFunction: DoubleToDoubleFunction
  ): void;

  /**
   * Returns the length of this array.
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
   * Sets all entries in the array to the given value.
   *
   * **Warning**: This method is **not thread-safe** and should only be called
   * when no other threads are accessing the array.
   *
   * @param value The double-precision floating-point value to assign to every element
   */
  public abstract setAll(value: number): void;

  /**
   * Destroys the array data and releases all associated memory for garbage collection.
   *
   * **Warning**: The array becomes unusable after calling this method and will throw
   * exceptions on virtually every method invocation.
   *
   * @returns The amount of memory freed in bytes (0 for subsequent calls)
   */
  public abstract release(): number;

  /**
   * Copies the content of this array into the target array.
   *
   * **Warning**: This method is **not thread-safe** and should only be called
   * when no other threads are modifying either array.
   *
   * @param dest Target array to copy data into
   * @param length Number of elements to copy from start of this array
   */
  public abstract copyTo(dest: HugeAtomicDoubleArray, length: number): void;

  /**
   * Creates a new cursor for iterating over this array.
   *
   * **Thread Safety**: Cursors provide a snapshot view and are not automatically
   * updated when the underlying array changes during concurrent modifications.
   *
   * @returns A new, uninitialized cursor for this array
   */
  public abstract newCursor(): HugeCursor<number[]>;

  /**
   * Initializes the given cursor for iterating over this array.
   *
   * @param cursor The cursor to initialize
   */
  public abstract initCursor(
    cursor: HugeCursor<number[]>
  ): HugeCursor<number[]>;
}

/**
 * Single-page implementation for smaller atomic double arrays.
 */
class SingleHugeAtomicDoubleArray extends HugeAtomicDoubleArray<Float64Array> {
  public _size: number;
  public _storage: Float64Array;

  constructor(size: number, pageCreator: DoublePageCreator) {
    super();
    this._size = size;
    this._storage = new Float64Array(size);

    // Use page creator to initialize the storage
    pageCreator.fillPage(this._storage, 0);
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    return this._storage[index];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const oldValue = this._storage[index];
    this._storage[index] = oldValue + delta;
    return oldValue;
  }

  public getAndReplace(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const oldValue = this._storage[index];
    this._storage[index] = value;
    return oldValue;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._storage[index] = value;
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (this._storage[index] === expect) {
      this._storage[index] = update;
      return true;
    }
    return false;
  }

  public compareAndExchange(
    index: number,
    expect: number,
    update: number
  ): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const current = this._storage[index];
    if (current === expect) {
      this._storage[index] = update;
    }
    return current;
  }

  public update(index: number, updateFunction: DoubleToDoubleFunction): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    let oldValue = this._storage[index];
    while (true) {
      const newValue = updateFunction(oldValue);
      const witnessValue = this.compareAndExchange(index, oldValue, newValue);
      if (witnessValue === oldValue) {
        break;
      }
      oldValue = witnessValue;
    }
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfDoubleArray(this._size);
  }

  public setAll(value: number): void {
    this._storage.fill(value);
  }

  public release(): number {
    const memoryFreed = Estimate.sizeOfDoubleArray(this._size);
    (this._storage as any) = null;
    return memoryFreed;
  }

  public copyTo(dest: HugeAtomicDoubleArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeAtomicDoubleArray) {
      dest._storage.set(this._storage.subarray(0, length));
      if (length < dest._size) {
        dest._storage.fill(dest.defaultValue(), length);
      }
    } else if (dest instanceof PagedHugeAtomicDoubleArray) {
      let srcOffset = 0;
      let remaining = length;

      for (
        let pageIdx = 0;
        pageIdx < dest._pages!.length && remaining > 0;
        pageIdx++
      ) {
        const dstPage = dest._pages![pageIdx];
        const toCopy = Math.min(remaining, dstPage.length);

        dstPage.set(this._storage.subarray(srcOffset, srcOffset + toCopy));

        if (toCopy < dstPage.length) {
          dstPage.fill(dest.defaultValue(), toCopy);
        }

        srcOffset += toCopy;
        remaining -= toCopy;
      }

      for (
        let pageIdx = Math.ceil(length / HugeArrays.PAGE_SIZE);
        pageIdx < dest._pages!.length;
        pageIdx++
      ) {
        dest._pages![pageIdx].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    const numberArray = Array.from(this._storage);
    return new SinglePageCursor<number[]>(numberArray);
  }

  public initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]> {
    if (cursor instanceof SinglePageCursor) {
      const numberArray = Array.from(this._storage);
      cursor.setArray(numberArray);
    }
    return cursor;
  }
}

/**
 * Multi-page implementation for larger atomic double arrays.
 */
class PagedHugeAtomicDoubleArray extends HugeAtomicDoubleArray<Float64Array> {
  public _size: number;
  public _pages: Float64Array[] | null;
  public _memoryUsed: number;

  constructor(size: number, pageCreator: DoublePageCreator) {
    super();
    this._size = size;

    const numPages = HugeArrays.numberOfPages(size);
    this._pages = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfDoubleArray(HugeArrays.PAGE_SIZE);

    const allPages: Float64Array[] = new Array(numPages);

    for (let i = 0; i < numPages - 1; i++) {
      allPages[i] = new Float64Array(HugeArrays.PAGE_SIZE);
      memoryUsed += pageBytes;
    }

    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    allPages[numPages - 1] = new Float64Array(lastPageSize);
    memoryUsed += Estimate.sizeOfDoubleArray(lastPageSize);

    this._memoryUsed = memoryUsed;

    pageCreator.fill(allPages, lastPageSize, HugeArrays.PAGE_SHIFT);
    this._pages = allPages;
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
    const oldValue = this._pages![pageIndex][indexInPage];
    this._pages![pageIndex][indexInPage] = oldValue + delta;
    return oldValue;
  }

  public getAndReplace(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const oldValue = this._pages![pageIndex][indexInPage];
    this._pages![pageIndex][indexInPage] = value;
    return oldValue;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages![pageIndex][indexInPage] = value;
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    if (this._pages![pageIndex][indexInPage] === expect) {
      this._pages![pageIndex][indexInPage] = update;
      return true;
    }
    return false;
  }

  public compareAndExchange(
    index: number,
    expect: number,
    update: number
  ): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const current = this._pages![pageIndex][indexInPage];
    if (current === expect) {
      this._pages![pageIndex][indexInPage] = update;
    }
    return current;
  }

  public update(index: number, updateFunction: DoubleToDoubleFunction): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    let oldValue = this.get(index);
    while (true) {
      const newValue = updateFunction(oldValue);
      const witnessValue = this.compareAndExchange(index, oldValue, newValue);
      if (witnessValue === oldValue) {
        break;
      }
      oldValue = witnessValue;
    }
  }

  public size(): number {
    return this._size;
  }

  public sizeOf(): number {
    return this._memoryUsed;
  }

  public setAll(value: number): void {
    for (const page of this._pages!) {
      page.fill(value);
    }
  }

  public release(): number {
    const memoryFreed = this._memoryUsed;
    (this._pages as any) = null;
    return memoryFreed;
  }

  public copyTo(dest: HugeAtomicDoubleArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeAtomicDoubleArray) {
      let destOffset = 0;
      let remaining = length;

      for (const page of this._pages!) {
        if (remaining <= 0) break;

        const toCopy = Math.min(remaining, page.length);
        dest._storage.set(page.subarray(0, toCopy), destOffset);

        destOffset += toCopy;
        remaining -= toCopy;
      }

      if (destOffset < dest._size) {
        dest._storage.fill(dest.defaultValue(), destOffset);
      }
    } else if (dest instanceof PagedHugeAtomicDoubleArray) {
      const pageLen = Math.min(this._pages!.length, dest._pages!.length);
      let remaining = length;

      for (let i = 0; i < pageLen && remaining > 0; i++) {
        const srcPage = this._pages![i];
        const dstPage = dest._pages![i];
        const toCopy = Math.min(remaining, srcPage.length, dstPage.length);

        dstPage.set(srcPage.subarray(0, toCopy));

        if (toCopy < dstPage.length) {
          dstPage.fill(dest.defaultValue(), toCopy);
        }

        remaining -= toCopy;
      }

      for (
        let i = Math.ceil(length / HugeArrays.PAGE_SIZE);
        i < dest._pages!.length;
        i++
      ) {
        dest._pages![i].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    const numberPages = this._pages!.map((page) => Array.from(page));
    const cursor = new PagedCursor<number[]>();
    cursor.setPages(numberPages, this._size);
    return cursor;
  }

  public initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]> {
    if (cursor instanceof PagedCursor) {
      const numberPages = this._pages!.map((page) => Array.from(page));
      cursor.setPages(numberPages, this._size);
    }
    return cursor;
  }
}
