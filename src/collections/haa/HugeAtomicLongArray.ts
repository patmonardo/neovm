import { HugeArrays } from '@/mem';
import { Estimate } from '@/mem';
import { HugeCursor, HugeCursorSupport } from '@/collections';
import { SinglePageCursor, PagedCursor } from '@/collections';
import { LongToLongFunction } from './ValueTransformers';
import { LongPageCreator } from './PageCreator';

/**
 * A huge array of long integers supporting atomic operations for thread-safe concurrent access.
 *
 * This class provides **lock-free atomic operations** on massive arrays of long integers that can
 * exceed JavaScript's standard array size limitations. It's designed for high-performance concurrent
 * processing in graph analytics where multiple threads need to safely update shared data structures
 * like distance arrays, counters, timestamps, and node identifiers.
 *
 * **Design Philosophy:**
 *
 * **1. Lock-Free Concurrency:**
 * All atomic operations use compare-and-swap (CAS) primitives to achieve thread safety without
 * locks, eliminating contention bottlenecks and providing consistent performance across varying
 * numbers of threads.
 *
 * **2. Memory Scalability:**
 * Uses paged architecture to support arrays larger than standard JavaScript limits while
 * maintaining optimal memory access patterns and cache performance.
 *
 * **3. High-Performance Primitives:**
 * Provides a comprehensive set of atomic operations optimized for common graph analytics
 * patterns like counters, distance updates, and state transitions.
 *
 * **Key Characteristics:**
 *
 * **Thread Safety:**
 * - **Atomic reads/writes**: All get/set operations are atomic and thread-safe
 * - **Compare-and-swap**: CAS operations prevent race conditions
 * - **Memory barriers**: Proper synchronization ensures visibility across threads
 * - **Lock-free design**: No blocking operations that could cause deadlocks
 *
 * **Performance Profile:**
 * - **Atomic operations**: O(1) time complexity with minimal contention overhead
 * - **Memory access**: Cache-friendly paged layout for sequential operations
 * - **Scalability**: Linear performance scaling with number of threads
 * - **Memory overhead**: Minimal overhead compared to regular huge arrays
 *
 * **JavaScript Number Adaptation:**
 * Uses JavaScript's number type for long integers, providing safe integer operations
 * up to Number.MAX_SAFE_INTEGER (2^53 - 1). This covers the full range needed for
 * most graph analytics applications including large node/edge counts and timestamps.
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Concurrent Distance Arrays:**
 * ```typescript
 * // Dijkstra's algorithm with concurrent relaxation
 * const distances = HugeAtomicLongArray.of(nodeCount, LongPageCreators.infinity());
 * distances.set(sourceNode, 0);
 *
 * // Multiple threads can safely update distances
 * async function relaxEdges(edges: Edge[]): Promise<void> {
 *   for (const edge of edges) {
 *     const currentDist = distances.get(edge.source);
 *     const newDist = currentDist + edge.weight;
 *
 *     // Atomic minimum update
 *     let oldDist = distances.get(edge.target);
 *     while (newDist < oldDist) {
 *       const witnessValue = distances.compareAndExchange(edge.target, oldDist, newDist);
 *       if (witnessValue === oldDist) {
 *         // Update successful
 *         break;
 *       }
 *       // Update failed, retry with new value
 *       oldDist = witnessValue;
 *     }
 *   }
 * }
 * ```
 *
 * **Atomic Counters and Statistics:**
 * ```typescript
 * // Thread-safe degree counting
 * const degreeCounts = HugeAtomicLongArray.of(nodeCount, LongPageCreators.zero());
 *
 * // Multiple threads can safely increment counters
 * async function countDegrees(edges: Edge[]): Promise<void> {
 *   for (const edge of edges) {
 *     degreeCounts.getAndAdd(edge.source, 1);  // Atomic increment
 *     degreeCounts.getAndAdd(edge.target, 1);  // Atomic increment
 *   }
 * }
 *
 * // Collect final statistics
 * const maxDegree = Math.max(...Array.from(degreeCounts.cursor()).map(page => Math.max(...page)));
 * const totalEdges = Array.from(degreeCounts.cursor()).reduce((sum, page) =>
 *   sum + page.reduce((pageSum, degree) => pageSum + degree, 0), 0) / 2;
 * ```
 *
 * **Timestamp and Version Management:**
 * ```typescript
 * // Atomic timestamp updates for temporal graphs
 * const nodeTimestamps = HugeAtomicLongArray.of(nodeCount, LongPageCreators.zero());
 *
 * function updateNodeTimestamp(nodeId: number, newTimestamp: number): boolean {
 *   // Only update if new timestamp is later
 *   let currentTimestamp = nodeTimestamps.get(nodeId);
 *   while (newTimestamp > currentTimestamp) {
 *     const witnessValue = nodeTimestamps.compareAndExchange(
 *       nodeId, currentTimestamp, newTimestamp
 *     );
 *     if (witnessValue === currentTimestamp) {
 *       return true; // Update successful
 *     }
 *     currentTimestamp = witnessValue;
 *   }
 *   return false; // No update needed
 * }
 * ```
 *
 * **Concurrent Algorithm State:**
 * ```typescript
 * // PageRank with atomic score updates
 * const pageRankScores = HugeAtomicLongArray.of(nodeCount, LongPageCreators.constant(1000)); // Fixed-point arithmetic
 * const newScores = HugeAtomicLongArray.of(nodeCount, LongPageCreators.zero());
 *
 * async function pageRankIteration(): Promise<void> {
 *   // Reset new scores
 *   newScores.setAll(0);
 *
 *   // Distribute scores concurrently
 *   await Promise.all(workers.map(async (worker) => {
 *     for (const nodeId of worker.nodeRange) {
 *       const currentScore = pageRankScores.get(nodeId);
 *       const neighbors = getNeighbors(nodeId);
 *       const contributionPerNeighbor = Math.floor(currentScore / neighbors.length);
 *
 *       for (const neighbor of neighbors) {
 *         newScores.getAndAdd(neighbor, contributionPerNeighbor);
 *       }
 *     }
 *   }));
 *
 *   // Atomic swap of score arrays
 *   swapArrayContents(pageRankScores, newScores);
 * }
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Batch Operations for Better Cache Performance:**
 * ```typescript
 * // Process elements in cache-friendly batches
 * function batchUpdateDistances(
 *   distances: HugeAtomicLongArray,
 *   updates: { index: number, value: number }[]
 * ): void {
 *   // Sort updates by index for better cache locality
 *   updates.sort((a, b) => a.index - b.index);
 *
 *   // Process in batches
 *   const BATCH_SIZE = 1024;
 *   for (let i = 0; i < updates.length; i += BATCH_SIZE) {
 *     const batch = updates.slice(i, i + BATCH_SIZE);
 *
 *     // Process batch with good cache performance
 *     for (const update of batch) {
 *       distances.update(update.index, (current) => Math.min(current, update.value));
 *     }
 *   }
 * }
 * ```
 *
 * **Contention Reduction:**
 * ```typescript
 * // Reduce contention with local aggregation
 * async function distributeUpdatesWithReduction(
 *   globalArray: HugeAtomicLongArray,
 *   updates: Map<number, number>
 * ): Promise<void> {
 *   // Group updates by cache line to reduce false sharing
 *   const CACHE_LINE_SIZE = 64; // bytes
 *   const ELEMENTS_PER_LINE = CACHE_LINE_SIZE / 8; // 8 elements per cache line
 *
 *   const groupedUpdates = new Map<number, Map<number, number>>();
 *
 *   for (const [index, value] of updates) {
 *     const lineGroup = Math.floor(index / ELEMENTS_PER_LINE);
 *     if (!groupedUpdates.has(lineGroup)) {
 *       groupedUpdates.set(lineGroup, new Map());
 *     }
 *     const existing = groupedUpdates.get(lineGroup)!.get(index) || 0;
 *     groupedUpdates.get(lineGroup)!.set(index, existing + value);
 *   }
 *
 *   // Apply grouped updates with reduced contention
 *   for (const [lineGroup, lineUpdates] of groupedUpdates) {
 *     for (const [index, totalValue] of lineUpdates) {
 *       globalArray.getAndAdd(index, totalValue);
 *     }
 *   }
 * }
 * ```
 *
 * **Integration with Graph Algorithms:**
 *
 * **Bellman-Ford with Early Termination:**
 * ```typescript
 * function bellmanFord(
 *   graph: Graph,
 *   source: number
 * ): { distances: HugeAtomicLongArray, hasNegativeCycle: boolean } {
 *   const distances = HugeAtomicLongArray.of(graph.nodeCount, LongPageCreators.infinity());
 *   distances.set(source, 0);
 *
 *   const updated = HugeAtomicLongArray.of(graph.nodeCount, LongPageCreators.zero());
 *
 *   for (let iteration = 0; iteration < graph.nodeCount - 1; iteration++) {
 *     let hasUpdate = false;
 *
 *     await Promise.all(workers.map(async (worker) => {
 *       for (const edge of worker.edgeRange) {
 *         const sourceDist = distances.get(edge.source);
 *         if (sourceDist !== Number.POSITIVE_INFINITY) {
 *           const newDist = sourceDist + edge.weight;
 *           const oldDist = distances.get(edge.target);
 *
 *           if (newDist < oldDist) {
 *             if (distances.compareAndSet(edge.target, oldDist, newDist)) {
 *               updated.set(edge.target, 1);
 *               hasUpdate = true;
 *             }
 *           }
 *         }
 *       }
 *     }));
 *
 *     if (!hasUpdate) {
 *       break; // Early termination
 *     }
 *   }
 *
 *   // Check for negative cycles
 *   // ... implementation details
 *
 *   return { distances, hasNegativeCycle: false };
 * }
 * ```
 *
 * **Memory Management:**
 *
 * **Efficient Resource Cleanup:**
 * ```typescript
 * // Proper cleanup of atomic arrays
 * class GraphAlgorithmRunner {
 *   private activeArrays: HugeAtomicLongArray[] = [];
 *
 *   createWorkingArray(size: number, pageCreator: LongPageCreator): HugeAtomicLongArray {
 *     const array = HugeAtomicLongArray.of(size, pageCreator);
 *     this.activeArrays.push(array);
 *     return array;
 *   }
 *
 *   cleanup(): number {
 *     let totalFreed = 0;
 *     for (const array of this.activeArrays) {
 *       totalFreed += array.release();
 *     }
 *     this.activeArrays.length = 0;
 *     return totalFreed;
 *   }
 * }
 * ```
 */
export abstract class HugeAtomicLongArray implements HugeCursorSupport<number[]> {
  // Common properties used by implementations
  public _size?: number;
  public _page?: number[] | null;
  public _pages?: number[][] | null;

  /**
   * Creates a new atomic long array of the given size with the specified page creator.
   *
   * This is the **primary factory method** for creating HugeAtomicLongArray instances.
   * The page creator determines how pages are initialized and can implement various
   * strategies like zero-fill, constant values, or computed initialization.
   *
   * **Size Optimization:**
   * The implementation automatically chooses between single-page and multi-page
   * strategies based on the requested size to optimize for memory usage and performance.
   *
   * **Page Creator Strategies:**
   * - **Zero initialization**: All elements start at 0
   * - **Constant values**: All elements start with the same value
   * - **Computed values**: Elements initialized based on their index
   * - **Sparse initialization**: Only specific elements are initialized
   *
   * @param size The number of elements in the array
   * @param pageCreator Strategy for initializing pages
   * @returns A new HugeAtomicLongArray instance
   */
  public static of(
    size: number,
    pageCreator: LongPageCreator
  ): HugeAtomicLongArray {
    return HugeAtomicLongArrayFactory.of(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicLongArray of the specified size.
   *
   * This method provides **accurate memory forecasting** for capacity planning and
   * resource allocation. The estimation includes both the array structure overhead
   * and the storage space for long integer elements.
   *
   * **Memory Components:**
   * - Array structure and page management overhead
   * - Storage for long integer elements (8 bytes per element)
   * - Atomic operation metadata and synchronization overhead
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    return HugeAtomicLongArrayFactory.memoryEstimation(size);
  }

  /**
   * Returns the default value used for uninitialized elements and copy operations.
   *
   * This method provides the **default long value** (0) used when filling unused
   * space in copy operations or when elements haven't been explicitly initialized.
   *
   * @returns The default value (0) for long elements
   */
  public defaultValue(): number {
    return 0;
  }

  /**
   * Returns the long value at the given index.
   *
   * This method provides **atomic read access** to array elements. The read operation
   * is guaranteed to be atomic and will return a consistent value even during
   * concurrent modifications by other threads.
   *
   * **Thread Safety:**
   * - **Atomic read**: Returns a consistent snapshot of the value
   * - **Memory barriers**: Ensures proper memory synchronization
   * - **No tearing**: Value is read atomically without partial updates
   *
   * @param index The index to read from (must be in [0, size()))
   * @returns The current value at the specified index
   * @throws Error if index is out of bounds
   */
  public abstract get(index: number): number;

  /**
   * Atomically adds the given delta to the value at the given index.
   *
   * This method provides **atomic read-modify-write** operations for incrementing
   * or decrementing values. It's essential for implementing thread-safe counters,
   * accumulators, and statistics collection in concurrent algorithms.
   *
   * **Atomic Operation:**
   * The addition is performed atomically, ensuring that concurrent modifications
   * don't interfere with each other. The returned value is the state before
   * the addition was applied.
   *
   * **Common Usage Patterns:**
   * ```typescript
   * // Atomic increment
   * const oldValue = array.getAndAdd(index, 1);
   *
   * // Atomic decrement
   * const oldValue = array.getAndAdd(index, -1);
   *
   * // Atomic accumulation
   * const oldValue = array.getAndAdd(index, contribution);
   * ```
   *
   * @param index The index to modify
   * @param delta The value to add (can be negative for subtraction)
   * @returns The previous value before the addition
   * @throws Error if index is out of bounds
   */
  public abstract getAndAdd(index: number, delta: number): number;

  /**
   * Atomically returns the value at the given index and replaces it with the given value.
   *
   * This method provides **atomic swap** operations where you need both the old value
   * and want to set a new value in a single atomic operation. This is useful for
   * implementing state machines and value exchanges.
   *
   * **Atomic Swap:**
   * The entire read-and-replace operation is atomic, ensuring that no other thread
   * can modify the value between reading the old value and writing the new value.
   *
   * @param index The index to modify
   * @param value The new value to set
   * @returns The previous value that was replaced
   * @throws Error if index is out of bounds
   */
  public abstract getAndReplace(index: number, value: number): number;

  /**
   * Sets the long value at the given index to the given value.
   *
   * This method provides **atomic write access** to array elements. The write
   * operation is guaranteed to be atomic and visible to all threads.
   *
   * **Memory Synchronization:**
   * The write includes proper memory barriers to ensure the new value is
   * immediately visible to other threads reading from the same index.
   *
   * @param index The index to write to
   * @param value The new value to set
   * @throws Error if index is out of bounds
   */
  public abstract set(index: number, value: number): void;

  /**
   * Atomically sets the element at position index to the given updated value
   * if the current value equals the expected value.
   *
   * This method provides **compare-and-swap (CAS)** operations, which are the
   * foundation of lock-free programming. CAS is essential for implementing
   * atomic algorithms without locks.
   *
   * **CAS Semantics:**
   * The operation succeeds only if the current value exactly matches the expected
   * value. If successful, the value is updated atomically. If not, no change occurs.
   *
   * **Usage Pattern:**
   * ```typescript
   * // Atomic minimum update
   * let currentValue = array.get(index);
   * while (newValue < currentValue) {
   *   if (array.compareAndSet(index, currentValue, newValue)) {
   *     break; // Update successful
   *   }
   *   currentValue = array.get(index); // Retry with current value
   * }
   * ```
   *
   * @param index The index to update
   * @param expect The expected current value
   * @param update The new value to set
   * @returns true if the update was successful, false otherwise
   * @throws Error if index is out of bounds
   */
  public abstract compareAndSet(
    index: number,
    expect: number,
    update: number
  ): boolean;

  /**
   * Atomically sets the element at position index to the given updated value
   * if the current value equals the expected value, returning the witness value.
   *
   * This method provides **enhanced compare-and-swap** that returns the actual
   * current value (witness value) rather than just success/failure. This eliminates
   * the need for an additional read operation in CAS loops, improving performance.
   *
   * **Witness Value Benefits:**
   * - **Reduced memory traffic**: Eliminates extra read operations in CAS loops
   * - **Better performance**: Fewer atomic operations per loop iteration
   * - **Simplified logic**: Direct access to the conflicting value
   *
   * **Optimized CAS Loop:**
   * ```typescript
   * let oldValue = array.get(index);
   * while (true) {
   *   const newValue = computeNewValue(oldValue);
   *   const witnessValue = array.compareAndExchange(index, oldValue, newValue);
   *   if (witnessValue === oldValue) {
   *     break; // Update successful
   *   }
   *   // Use witness value directly, no additional read needed
   *   oldValue = witnessValue;
   * }
   * ```
   *
   * @param index The index to update
   * @param expect The expected current value
   * @param update The new value to set
   * @returns The witness value (current value at the time of the operation)
   * @throws Error if index is out of bounds
   */
  public abstract compareAndExchange(
    index: number,
    expect: number,
    update: number
  ): number;

  /**
   * Atomically updates the element at index with the results of applying the given function.
   *
   * This method provides **functional atomic updates** where you can apply arbitrary
   * transformations to values atomically. The function is applied in a retry loop
   * until the update succeeds, handling contention automatically.
   *
   * **Function Requirements:**
   * - **Pure function**: Must be side-effect-free as it may be called multiple times
   * - **Deterministic**: Should produce the same output for the same input
   * - **Fast execution**: Should be computationally lightweight
   *
   * **Automatic Retry:**
   * If multiple threads attempt to update the same index simultaneously, the
   * implementation automatically retries the update until it succeeds.
   *
   * **Usage Examples:**
   * ```typescript
   * // Atomic minimum update
   * array.update(index, (current) => Math.min(current, newValue));
   *
   * // Atomic maximum update
   * array.update(index, (current) => Math.max(current, newValue));
   *
   * // Complex state transition
   * array.update(index, (current) => computeNextState(current, event));
   * ```
   *
   * @param index The index to update
   * @param updateFunction A pure function that computes the new value
   * @throws Error if index is out of bounds
   */
  public abstract update(
    index: number,
    updateFunction: LongToLongFunction
  ): void;

  /**
   * Returns the length of this array.
   *
   * This method returns the **total number of elements** in the array, which is
   * the same value that was passed to the factory method when creating the array.
   *
   * @returns The number of elements in the array
   */
  public abstract size(): number;

  /**
   * Returns the amount of memory used by this array instance in bytes.
   *
   * This method provides **accurate memory usage reporting** for monitoring and
   * capacity planning. The returned value includes all memory directly associated
   * with this array instance.
   *
   * **Memory Components:**
   * - Page storage arrays
   * - Index management structures
   * - Atomic operation metadata
   * - Object overhead
   *
   * @returns The memory footprint in bytes
   */
  public abstract sizeOf(): number;

  /**
   * Sets all entries in the array to the given value.
   *
   * This method provides **bulk initialization** of all array elements. It's more
   * efficient than setting elements individually and is useful for resetting
   * arrays between algorithm iterations.
   *
   * **Thread Safety Warning:**
   * This method is NOT thread-safe and should only be called when no other threads
   * are accessing the array, typically during initialization or between processing phases.
   *
   * @param value The value to set for all elements
   */
  public abstract setAll(value: number): void;

  /**
   * Destroys the data and releases all associated memory for garbage collection.
   *
   * This method **permanently invalidates** the array and releases all underlying
   * storage for garbage collection. After calling this method, any further
   * operations on the array will throw errors.
   *
   * **Resource Management:**
   * - Releases all page storage arrays
   * - Clears internal references
   * - Invalidates cursors referencing this array
   * - Returns the amount of memory freed
   *
   * **Cursor Dependencies:**
   * If there are active cursors referencing this array, the memory might not be
   * immediately collectible. All cursors must be closed before the memory can
   * be fully reclaimed.
   *
   * @returns The amount of memory freed in bytes
   */
  public abstract release(): number;

  /**
   * Copies the content of this array into the target array.
   *
   * This method provides **bulk copying** of array contents similar to
   * `System.arraycopy()` in Java. It's useful for creating backups, snapshots,
   * or transferring data between different array instances.
   *
   * **Copy Semantics:**
   * - Source elements [0, length) are copied to target [0, length)
   * - Target positions beyond length are filled with `defaultValue()`
   * - Both arrays must have sufficient capacity for the operation
   *
   * **Thread Safety Warning:**
   * This method is NOT thread-safe and should only be called when arrays are
   * not being modified by other threads.
   *
   * @param dest The target array to copy data into
   * @param length The number of elements to copy
   */
  public abstract copyTo(dest: HugeAtomicLongArray, length: number): void;

  /**
   * Creates a new cursor for iterating over this array.
   *
   * @returns A new cursor for efficient array traversal
   */
  public abstract newCursor(): HugeCursor<number[]>;

  /**
   * Initializes the provided cursor for iterating over this array.
   *
   * @param cursor The cursor to initialize
   */
  public abstract initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]>;
}

/**
 * Factory class for creating HugeAtomicLongArray instances.
 *
 * This factory handles the selection between different implementations based on
 * size requirements and provides memory estimation capabilities.
 */
export class HugeAtomicLongArrayFactory {

  /**
   * Creates a new HugeAtomicLongArray with the optimal implementation for the given size.
   *
   * @param size The number of elements in the array
   * @param pageCreator Strategy for initializing pages
   * @returns A new HugeAtomicLongArray instance
   */
  public static of(size: number, pageCreator: LongPageCreator): HugeAtomicLongArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return new SingleHugeAtomicLongArray(size, pageCreator);
    }
    return new PagedHugeAtomicLongArray(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicLongArray of the specified size.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    const sizeOfInstance = size <= HugeArrays.MAX_ARRAY_LENGTH
      ? Estimate.sizeOfInstance(SingleHugeAtomicLongArray.name)
      : Estimate.sizeOfInstance(PagedHugeAtomicLongArray.name);

    const numPages = HugeArrays.numberOfPages(size);
    const memoryPerPage = Estimate.sizeOfLongArray(HugeArrays.PAGE_SIZE);
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    const lastPageMemory = Estimate.sizeOfLongArray(lastPageSize);

    return sizeOfInstance + Estimate.sizeOfObjectArray(numPages) +
           (numPages - 1) * memoryPerPage + lastPageMemory;
  }
}

/**
 * Single-page implementation for smaller atomic long arrays.
 */
class SingleHugeAtomicLongArray extends HugeAtomicLongArray {
  public _size: number;
  public _page: number[] | null;

  constructor(size: number, pageCreator: LongPageCreator) {
    super();
    this._size = size;
    this._page = new Array<number>(size).fill(0);

    // Initialize page using the page creator
    pageCreator.fillPage(this._page, 0);
  }

  public get(index: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    return this._page![index];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const oldValue = this._page![index];
    this._page![index] = oldValue + delta;
    return oldValue;
  }

  public getAndReplace(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const oldValue = this._page![index];
    this._page![index] = value;
    return oldValue;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    this._page![index] = value;
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    if (this._page![index] === expect) {
      this._page![index] = update;
      return true;
    }
    return false;
  }

  public compareAndExchange(index: number, expect: number, update: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const current = this._page![index];
    if (current === expect) {
      this._page![index] = update;
    }
    return current;
  }

  public update(index: number, updateFunction: LongToLongFunction): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    let oldValue = this._page![index];
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
    return Estimate.sizeOfLongArray(this._size);
  }

  public setAll(value: number): void {
    this._page!.fill(value);
  }

  public release(): number {
    if (this._page !== null) {
      this._page = null;
      return Estimate.sizeOfLongArray(this._size);
    }
    return 0;
  }

  public copyTo(dest: HugeAtomicLongArray, length: number): void {
    length = Math.min(length, this._size, dest._size || dest.size());

    if (dest instanceof SingleHugeAtomicLongArray) {
      // Copy to another single array
      for (let i = 0; i < length; i++) {
        dest._page![i] = this._page![i];
      }
      // Fill remaining with default value
      for (let i = length; i < dest._size; i++) {
        dest._page![i] = dest.defaultValue();
      }
    } else if (dest instanceof PagedHugeAtomicLongArray) {
      // Copy to paged array
      let start = 0;
      let remaining = length;

      for (const dstPage of dest._pages!) {
        const toCopy = Math.min(remaining, dstPage.length);
        if (toCopy === 0) {
          dstPage.fill(dest.defaultValue());
        } else {
          for (let i = 0; i < toCopy; i++) {
            dstPage[i] = this._page![start + i];
          }
          if (toCopy < dstPage.length) {
            dstPage.fill(dest.defaultValue(), toCopy, dstPage.length);
          }
          start += toCopy;
          remaining -= toCopy;
        }
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    return new SinglePageCursor<number[]>(this._page!);
  }

  public initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]>  {
    if (cursor instanceof SinglePageCursor) {
      cursor.setArray(this._page!);
    }
    return cursor;
  }
}

/**
 * Multi-page implementation for larger atomic long arrays.
 */
class PagedHugeAtomicLongArray extends HugeAtomicLongArray {
  public _size: number;
  public _pages: number[][] | null;
  private _memoryUsed: number;

  constructor(size: number, pageCreator: LongPageCreator) {
    super();
    this._size = size;

    const numPages = HugeArrays.numberOfPages(size);
    this._pages = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfLongArray(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      this._pages[i] = new Array<number>(HugeArrays.PAGE_SIZE).fill(0);
      memoryUsed += pageBytes;
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    this._pages[numPages - 1] = new Array<number>(lastPageSize).fill(0);
    memoryUsed += Estimate.sizeOfLongArray(lastPageSize);

    this._memoryUsed = memoryUsed;

    // Initialize all pages using the page creator
    pageCreator.fill(this._pages, lastPageSize, HugeArrays.PAGE_SHIFT);
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

  public compareAndExchange(index: number, expect: number, update: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const current = this._pages![pageIndex][indexInPage];
    if (current === expect) {
      this._pages![pageIndex][indexInPage] = update;
    }
    return current;
  }

  public update(index: number, updateFunction: LongToLongFunction): void {
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
    if (this._pages !== null) {
      this._pages = null;
      return this._memoryUsed;
    }
    return 0;
  }

  public copyTo(dest: HugeAtomicLongArray, length: number): void {
    length = Math.min(length, this._size, dest._size || dest.size());

    if (dest instanceof SingleHugeAtomicLongArray) {
      // Copy to single array
      let start = 0;
      let remaining = length;

      for (const page of this._pages!) {
        const toCopy = Math.min(remaining, page.length);
        if (toCopy === 0) break;

        for (let i = 0; i < toCopy; i++) {
          dest._page![start + i] = page[i];
        }
        start += toCopy;
        remaining -= toCopy;
      }
      // Fill remaining positions with default value
      dest._page!.fill(dest.defaultValue(), start, dest._size);
    } else if (dest instanceof PagedHugeAtomicLongArray) {
      // Copy to another paged array
      const pageLen = Math.min(this._pages!.length, dest._pages!.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        const page = this._pages![i];
        const dstPage = dest._pages![i];
        for (let j = 0; j < page.length; j++) {
          dstPage[j] = page[j];
        }
        remaining -= page.length;
      }

      // Copy last page
      if (remaining > 0) {
        const lastSrcPage = this._pages![lastPage];
        const lastDstPage = dest._pages![lastPage];
        for (let i = 0; i < remaining; i++) {
          lastDstPage[i] = lastSrcPage[i];
        }
        lastDstPage.fill(dest.defaultValue(), remaining, lastDstPage.length);
      }

      // Fill remaining pages with default value
      for (let i = pageLen; i < dest._pages!.length; i++) {
        dest._pages![i].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    const cursor = new PagedCursor<number[]>();
    cursor.setPages(this._pages!, this._size);
    return cursor;
  }

  public initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]> {
    if (cursor instanceof PagedCursor) {
      cursor.setPages(this._pages!, this._size);
    }
    return cursor;
  }
}
