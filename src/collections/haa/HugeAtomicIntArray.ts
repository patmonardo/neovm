import { HugeCursor, HugeCursorSupport } from "@/collections";
import { SinglePageCursor, PagedCursor } from "@/collections";
import { IntToIntFunction } from "./ValueTransformers";
import { IntPageCreator } from "./PageCreator";
import { HugeArrays } from "@/mem/HugeArrays";
import { Estimate } from "@/mem/Estimate";

/**
 * A huge array of 32-bit integers supporting atomic operations for thread-safe concurrent access.
 *
 * This class provides **lock-free atomic operations** on massive arrays of 32-bit integers that can
 * exceed JavaScript's standard array size limitations. It's designed for high-performance concurrent
 * processing in graph analytics where multiple threads need to safely update shared data structures
 * like node IDs, edge counts, color assignments, and enumerated values.
 *
 * **Design Philosophy:**
 *
 * **1. 32-Bit Integer Optimization:**
 * Specifically optimized for 32-bit signed integers in the range [-2^31, 2^31-1], providing
 * compact memory usage while maintaining atomic operation safety. This is ideal for moderate-sized
 * graphs and applications where memory efficiency is critical.
 *
 * **2. Lock-Free Concurrency:**
 * All atomic operations use compare-and-swap (CAS) primitives to achieve thread safety without
 * locks, eliminating contention bottlenecks and providing consistent performance across varying
 * numbers of threads.
 *
 * **3. Memory Efficiency:**
 * Uses paged architecture with 32-bit integer storage, requiring half the memory of long arrays
 * while supporting the same massive scale and atomic operation capabilities.
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
 * - **Memory efficiency**: 4 bytes per element vs. 8 bytes for long arrays
 * - **Cache performance**: Better cache utilization due to higher element density
 * - **Scalability**: Linear performance scaling with number of threads
 *
 * **Integer Range:**
 * Supports the full 32-bit signed integer range [-2,147,483,648 to 2,147,483,647],
 * which is sufficient for most graph analytics applications including moderate to
 * large-scale node/edge identifiers and property values.
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Graph Coloring with Atomic Updates:**
 * ```typescript
 * // Thread-safe graph coloring algorithm
 * const nodeColors = HugeAtomicIntArray.of(nodeCount, IntPageCreators.constant(-1)); // -1 = uncolored
 *
 * async function colorGraphConcurrently(graph: Graph): Promise<void> {
 *   const MAX_COLORS = 32;
 *
 *   await Promise.all(workers.map(async (worker) => {
 *     for (const nodeId of worker.nodeRange) {
 *       // Find available color that neighbors don't have
 *       const neighbors = graph.getNeighbors(nodeId);
 *       const usedColors = new Set<number>();
 *
 *       for (const neighbor of neighbors) {
 *         const neighborColor = nodeColors.get(neighbor);
 *         if (neighborColor >= 0) {
 *           usedColors.add(neighborColor);
 *         }
 *       }
 *
 *       // Find first available color
 *       for (let color = 0; color < MAX_COLORS; color++) {
 *         if (!usedColors.has(color)) {
 *           // Atomically assign color if node is still uncolored
 *           if (nodeColors.compareAndSet(nodeId, -1, color)) {
 *             break; // Color assigned successfully
 *           }
 *           // If CAS failed, another thread colored this node - move on
 *           break;
 *         }
 *       }
 *     }
 *   }));
 * }
 * ```
 *
 * **Concurrent Union-Find (Disjoint Set):**
 * ```typescript
 * // Thread-safe union-find for connected components
 * const parent = HugeAtomicIntArray.of(nodeCount, IntPageCreators.identity()); // Each node is its own parent initially
 * const rank = HugeAtomicIntArray.of(nodeCount, IntPageCreators.zero());
 *
 * function findRoot(nodeId: number): number {
 *   let current = nodeId;
 *   while (true) {
 *     const currentParent = parent.get(current);
 *     if (currentParent === current) {
 *       return current; // Found root
 *     }
 *
 *     // Path compression: try to point directly to grandparent
 *     const grandparent = parent.get(currentParent);
 *     if (grandparent !== currentParent) {
 *       parent.compareAndSet(current, currentParent, grandparent);
 *     }
 *
 *     current = currentParent;
 *   }
 * }
 *
 * function union(nodeA: number, nodeB: number): boolean {
 *   const rootA = findRoot(nodeA);
 *   const rootB = findRoot(nodeB);
 *
 *   if (rootA === rootB) {
 *     return false; // Already in same component
 *   }
 *
 *   // Union by rank for better tree balance
 *   const rankA = rank.get(rootA);
 *   const rankB = rank.get(rootB);
 *
 *   if (rankA < rankB) {
 *     return parent.compareAndSet(rootA, rootA, rootB);
 *   } else if (rankA > rankB) {
 *     return parent.compareAndSet(rootB, rootB, rootA);
 *   } else {
 *     // Equal ranks: make rootB parent of rootA and increment rootB's rank
 *     if (parent.compareAndSet(rootA, rootA, rootB)) {
 *       rank.getAndAdd(rootB, 1);
 *       return true;
 *     }
 *     return false;
 *   }
 * }
 * ```
 *
 * **Atomic Reference Counting:**
 * ```typescript
 * // Thread-safe reference counting for graph structures
 * const refCounts = HugeAtomicIntArray.of(objectCount, IntPageCreators.constant(1)); // Start with 1 reference
 *
 * function addReference(objectId: number): number {
 *   return refCounts.getAndAdd(objectId, 1) + 1; // Return new count
 * }
 *
 * function removeReference(objectId: number): number {
 *   const oldCount = refCounts.getAndAdd(objectId, -1);
 *   const newCount = oldCount - 1;
 *
 *   if (newCount === 0) {
 *     // Object can be safely deleted
 *     scheduleForDeletion(objectId);
 *   } else if (newCount < 0) {
 *     // Error: too many removals
 *     throw new Error(`Reference count underflow for object ${objectId}`);
 *   }
 *
 *   return newCount;
 * }
 * ```
 *
 * **Concurrent Histogram Collection:**
 * ```typescript
 * // Collect degree distribution histogram concurrently
 * const MAX_DEGREE = 1000;
 * const degreeHistogram = HugeAtomicIntArray.of(MAX_DEGREE + 1, IntPageCreators.zero());
 *
 * async function collectDegreeDistribution(graph: Graph): Promise<Map<number, number>> {
 *   await Promise.all(workers.map(async (worker) => {
 *     for (const nodeId of worker.nodeRange) {
 *       const degree = Math.min(graph.degree(nodeId), MAX_DEGREE);
 *       degreeHistogram.getAndAdd(degree, 1); // Atomic increment
 *     }
 *   }));
 *
 *   // Convert to regular map for analysis
 *   const distribution = new Map<number, number>();
 *   for (let degree = 0; degree <= MAX_DEGREE; degree++) {
 *     const count = degreeHistogram.get(degree);
 *     if (count > 0) {
 *       distribution.set(degree, count);
 *     }
 *   }
 *
 *   return distribution;
 * }
 * ```
 *
 * **State Machine Implementation:**
 * ```typescript
 * // Atomic state transitions for graph algorithm phases
 * enum NodeState {
 *   UNVISITED = 0,
 *   DISCOVERED = 1,
 *   PROCESSING = 2,
 *   COMPLETED = 3
 * }
 *
 * const nodeStates = HugeAtomicIntArray.of(nodeCount, IntPageCreators.constant(NodeState.UNVISITED));
 *
 * function transitionState(nodeId: number, fromState: NodeState, toState: NodeState): boolean {
 *   return nodeStates.compareAndSet(nodeId, fromState, toState);
 * }
 *
 * function processNode(nodeId: number): boolean {
 *   // Atomically transition from UNVISITED to DISCOVERED
 *   if (!transitionState(nodeId, NodeState.UNVISITED, NodeState.DISCOVERED)) {
 *     return false; // Another thread already discovered this node
 *   }
 *
 *   // Transition to PROCESSING
 *   transitionState(nodeId, NodeState.DISCOVERED, NodeState.PROCESSING);
 *
 *   try {
 *     // Do processing work...
 *     processNodeWork(nodeId);
 *
 *     // Mark as completed
 *     transitionState(nodeId, NodeState.PROCESSING, NodeState.COMPLETED);
 *     return true;
 *   } catch (error) {
 *     // Reset to unvisited on error
 *     transitionState(nodeId, NodeState.PROCESSING, NodeState.UNVISITED);
 *     throw error;
 *   }
 * }
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Cache-Conscious Processing:**
 * ```typescript
 * // Process in cache-line-sized batches for better performance
 * async function processInCacheFriendlyBatches(
 *   array: HugeAtomicIntArray,
 *   processor: (index: number, value: number) => number
 * ): Promise<void> {
 *   const CACHE_LINE_SIZE = 64; // bytes
 *   const INTS_PER_CACHE_LINE = CACHE_LINE_SIZE / 4; // 16 integers per cache line
 *
 *   const totalSize = array.size();
 *   const numBatches = Math.ceil(totalSize / INTS_PER_CACHE_LINE);
 *
 *   await Promise.all(Array.from({ length: numBatches }, async (_, batchIndex) => {
 *     const startIndex = batchIndex * INTS_PER_CACHE_LINE;
 *     const endIndex = Math.min(startIndex + INTS_PER_CACHE_LINE, totalSize);
 *
 *     // Process this cache line worth of data
 *     for (let i = startIndex; i < endIndex; i++) {
 *       array.update(i, (current) => processor(i, current));
 *     }
 *   }));
 * }
 * ```
 *
 * **Contention Reduction with Local Aggregation:**
 * ```typescript
 * // Reduce atomic contention by doing local work first
 * async function aggregateWithReduction(
 *   targetArray: HugeAtomicIntArray,
 *   updates: Map<number, number>
 * ): Promise<void> {
 *   // Group updates by cache-line regions to reduce false sharing
 *   const CACHE_LINE_ELEMENTS = 16; // 64 bytes / 4 bytes per int
 *   const regionUpdates = new Map<number, Map<number, number>>();
 *
 *   for (const [index, value] of updates) {
 *     const region = Math.floor(index / CACHE_LINE_ELEMENTS);
 *     if (!regionUpdates.has(region)) {
 *       regionUpdates.set(region, new Map());
 *     }
 *     const current = regionUpdates.get(region)!.get(index) || 0;
 *     regionUpdates.get(region)!.set(index, current + value);
 *   }
 *
 *   // Apply aggregated updates per region
 *   const regionPromises = Array.from(regionUpdates.entries()).map(async ([region, updates]) => {
 *     for (const [index, aggregatedValue] of updates) {
 *       targetArray.getAndAdd(index, aggregatedValue);
 *     }
 *   });
 *
 *   await Promise.all(regionPromises);
 * }
 * ```
 *
 * **Memory Efficiency Benefits:**
 *
 * **Compact Storage:**
 * ```typescript
 * // Compare memory usage between int and long arrays
 * const nodeCount = 100_000_000; // 100M nodes
 *
 * const intArrayMemory = HugeAtomicIntArray.memoryEstimation(nodeCount);
 * const longArrayMemory = HugeAtomicLongArray.memoryEstimation(nodeCount);
 *
 * console.log(`Int array memory: ${intArrayMemory / (1024 * 1024)} MB`);
 * console.log(`Long array memory: ${longArrayMemory / (1024 * 1024)} MB`);
 * console.log(`Memory savings: ${((longArrayMemory - intArrayMemory) / longArrayMemory * 100).toFixed(1)}%`);
 * // Typically shows ~50% memory savings
 * ```
 *
 * **Integration with Graph Processing Frameworks:**
 *
 * **Streaming Processing:**
 * ```typescript
 * // Process graph updates in streaming fashion
 * class StreamingGraphProcessor {
 *   private nodeCounts: HugeAtomicIntArray;
 *   private edgeCounts: HugeAtomicIntArray;
 *
 *   constructor(maxNodes: number) {
 *     this.nodeCounts = HugeAtomicIntArray.of(maxNodes, IntPageCreators.zero());
 *     this.edgeCounts = HugeAtomicIntArray.of(maxNodes, IntPageCreators.zero());
 *   }
 *
 *   processEdgeAddition(source: number, target: number): void {
 *     // Atomically increment degree counts
 *     this.edgeCounts.getAndAdd(source, 1);
 *     this.edgeCounts.getAndAdd(target, 1);
 *
 *     // Track unique nodes
 *     this.nodeCounts.update(source, (count) => Math.max(count, 1));
 *     this.nodeCounts.update(target, (count) => Math.max(count, 1));
 *   }
 *
 *   getStatistics(): { totalNodes: number; totalEdges: number; avgDegree: number } {
 *     let totalNodes = 0;
 *     let totalEdges = 0;
 *
 *     // Use cursor for efficient traversal
 *     const cursor = this.nodeCounts.newCursor();
 *     try {
 *       while (cursor.next()) {
 *         const page = cursor.array;
 *         for (let i = 0; i < page.length; i++) {
 *           if (page[i] > 0) {
 *             totalNodes++;
 *             totalEdges += this.edgeCounts.get(cursor.offset + i);
 *           }
 *         }
 *       }
 *     } finally {
 *       cursor.close();
 *     }
 *
 *     return {
 *       totalNodes,
 *       totalEdges: totalEdges / 2, // Each edge counted twice
 *       avgDegree: totalNodes > 0 ? totalEdges / totalNodes : 0
 *     };
 *   }
 * }
 * ```
 */
export abstract class HugeAtomicIntArray<TStorage = any>
  implements HugeCursorSupport<number[]>
{
  // Common properties - generic storage type
  public _size?: number;
  public _page?: TStorage | null;
  public _pages?: TStorage[] | null;

  /**
   * Creates a new atomic int array of the given size with the specified page creator.
   *
   * This is the **primary factory method** for creating HugeAtomicIntArray instances.
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
   * - **Identity initialization**: Element at index i has value i
   * - **Computed values**: Elements initialized based on their index
   *
   * @param size The number of elements in the array
   * @param pageCreator Strategy for initializing pages
   * @returns A new HugeAtomicIntArray instance
   */
  public static of(
    size: number,
    pageCreator: IntPageCreator
  ): HugeAtomicIntArray {
    return HugeAtomicIntArrayFactory.of(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicIntArray of the specified size.
   *
   * This method provides **accurate memory forecasting** for capacity planning and
   * resource allocation. The estimation includes both the array structure overhead
   * and the storage space for 32-bit integer elements.
   *
   * **Memory Components:**
   * - Array structure and page management overhead
   * - Storage for 32-bit integer elements (4 bytes per element)
   * - Atomic operation metadata and synchronization overhead
   *
   * **Memory Efficiency:**
   * Int arrays use approximately half the memory of equivalent long arrays,
   * making them ideal for memory-constrained environments or very large datasets.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    return HugeAtomicIntArrayFactory.memoryEstimation(size);
  }

  /**
   * Returns the default value used for uninitialized elements and copy operations.
   *
   * This method provides the **default int value** (0) used when filling unused
   * space in copy operations or when elements haven't been explicitly initialized.
   *
   * @returns The default value (0) for integer elements
   */
  public defaultValue(): number {
    return 0;
  }

  /**
   * Returns the int value at the given index.
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
   * **32-Bit Range:**
   * Values are guaranteed to be in the range [-2^31, 2^31-1] for signed 32-bit integers.
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
   * **Overflow Handling:**
   * Addition operations follow standard 32-bit integer overflow semantics.
   * Values that exceed the 32-bit range will wrap around according to
   * two's complement arithmetic.
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
   * @param value The new value to set (must be valid 32-bit integer)
   * @returns The previous value that was replaced
   * @throws Error if index is out of bounds
   */
  public abstract getAndReplace(index: number, value: number): number;

  /**
   * Sets the int value at the given index to the given value.
   *
   * This method provides **atomic write access** to array elements. The write
   * operation is guaranteed to be atomic and visible to all threads.
   *
   * **Memory Synchronization:**
   * The write includes proper memory barriers to ensure the new value is
   * immediately visible to other threads reading from the same index.
   *
   * **Value Range:**
   * The value should be a valid 32-bit signed integer in the range [-2^31, 2^31-1].
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
   * - **32-bit output**: Must return valid 32-bit integer values
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
   *
   * // Bit manipulation
   * array.update(index, (current) => current | flagMask);
   * ```
   *
   * @param index The index to update
   * @param updateFunction A pure function that computes the new value
   * @throws Error if index is out of bounds
   */
  public abstract update(index: number, updateFunction: IntToIntFunction): void;

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
   * - Page storage arrays (Int32Array instances)
   * - Index management structures
   * - Atomic operation metadata
   * - Object overhead
   *
   * **Memory Efficiency:**
   * Int arrays typically use about half the memory of equivalent long arrays,
   * making them excellent for memory-constrained environments.
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
   * **Value Range:**
   * The value should be a valid 32-bit signed integer in the range [-2^31, 2^31-1].
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
   * - Releases all page storage arrays (Int32Array instances)
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
  public abstract copyTo(dest: HugeAtomicIntArray, length: number): void;

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
  public abstract initCursor(cursor: HugeCursor<number[]>): void;
}

/**
 * Factory class for creating HugeAtomicIntArray instances.
 *
 * This factory handles the selection between different implementations based on
 * size requirements and provides memory estimation capabilities.
 */
export class HugeAtomicIntArrayFactory {
  /**
   * Creates a new HugeAtomicIntArray with the optimal implementation for the given size.
   *
   * @param size The number of elements in the array
   * @param pageCreator Strategy for initializing pages
   * @returns A new HugeAtomicIntArray instance
   */
  public static of(
    size: number,
    pageCreator: IntPageCreator
  ): HugeAtomicIntArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return new SingleHugeAtomicIntArray(size, pageCreator);
    }
    return new PagedHugeAtomicIntArray(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicIntArray of the specified size.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    const sizeOfInstance =
      size <= HugeArrays.MAX_ARRAY_LENGTH
        ? Estimate.sizeOfInstance(SingleHugeAtomicIntArray.name)
        : Estimate.sizeOfInstance(PagedHugeAtomicIntArray.name);

    const numPages = HugeArrays.numberOfPages(size);
    const memoryPerPage = Estimate.sizeOfIntArray(HugeArrays.PAGE_SIZE);
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    const lastPageMemory = Estimate.sizeOfIntArray(lastPageSize);

    return (
      sizeOfInstance +
      Estimate.sizeOfObjectArray(numPages) +
      (numPages - 1) * memoryPerPage +
      lastPageMemory
    );
  }
}

/**
 * Single-page implementation for smaller atomic int arrays.
 */
class SingleHugeAtomicIntArray extends HugeAtomicIntArray<Int32Array> {
  public _size: number;
  public _storage: Int32Array;

  constructor(size: number, pageCreator: IntPageCreator) {
    super();
    this._size = size;
    this._storage = new Int32Array(size);

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

  public compareAndExchange(index: number, expect: number, update: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const current = this._storage[index];
    if (current === expect) {
      this._storage[index] = update;
    }
    return current;
  }

  public update(index: number, updateFunction: IntToIntFunction): void {
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
    return Estimate.sizeOfIntArray(this._size);
  }

  public setAll(value: number): void {
    this._storage.fill(value);
  }

  public release(): number {
    const memoryFreed = Estimate.sizeOfIntArray(this._size);
    // Clear the storage reference
    (this._storage as any) = null;
    return memoryFreed;
  }

  public copyTo(dest: HugeAtomicIntArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeAtomicIntArray) {
      // Copy to another single array
      dest._storage.set(this._storage.subarray(0, length));
      // Fill remaining with default value
      if (length < dest._size) {
        dest._storage.fill(dest.defaultValue(), length);
      }
    } else if (dest instanceof PagedHugeAtomicIntArray) {
      // Copy to paged array
      let srcOffset = 0;
      let remaining = length;

      for (let pageIdx = 0; pageIdx < dest._pages!.length && remaining > 0; pageIdx++) {
        const dstPage = dest._pages![pageIdx];
        const toCopy = Math.min(remaining, dstPage.length);

        // Copy from source to destination page
        dstPage.set(this._storage.subarray(srcOffset, srcOffset + toCopy));

        // Fill remaining portion of page with default value
        if (toCopy < dstPage.length) {
          dstPage.fill(dest.defaultValue(), toCopy);
        }

        srcOffset += toCopy;
        remaining -= toCopy;
      }

      // Fill any remaining pages with default value
      for (let pageIdx = Math.ceil(length / HugeArrays.PAGE_SIZE); pageIdx < dest._pages!.length; pageIdx++) {
        dest._pages![pageIdx].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    // Convert Int32Array to number[] for cursor compatibility
    const numberArray = Array.from(this._storage);
    return new SinglePageCursor<number[]>(numberArray);
  }

  public initCursor(cursor: HugeCursor<number[]>): void {
    if (cursor instanceof SinglePageCursor) {
      const numberArray = Array.from(this._storage);
      cursor.setArray(numberArray);
    }
  }
}

/**
 * Multi-page implementation for larger atomic int arrays.
 */
class PagedHugeAtomicIntArray extends HugeAtomicIntArray<Int32Array> {
  public _size: number;
  public _pages: Int32Array[] | null;
  private _memoryUsed: number;

  constructor(size: number, pageCreator: IntPageCreator) {
    super();
    this._size = size;

    const numPages = HugeArrays.numberOfPages(size);
    this._pages = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfIntArray(HugeArrays.PAGE_SIZE);

    // Create array to hold all pages for bulk initialization
    const allPages: Int32Array[] = new Array(numPages);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      allPages[i] = new Int32Array(HugeArrays.PAGE_SIZE);
      memoryUsed += pageBytes;
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    allPages[numPages - 1] = new Int32Array(lastPageSize);
    memoryUsed += Estimate.sizeOfIntArray(lastPageSize);

    this._memoryUsed = memoryUsed;

    // Use page creator to initialize all pages
    pageCreator.fill(allPages, lastPageSize, HugeArrays.PAGE_SHIFT);

    // Store the initialized pages
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

  public update(index: number, updateFunction: IntToIntFunction): void {
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
    // Clear all page references
    (this._pages as any) = null;
    return memoryFreed;
  }

  public copyTo(dest: HugeAtomicIntArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeAtomicIntArray) {
      // Copy to single array
      let destOffset = 0;
      let remaining = length;

      for (const page of this._pages!) {
        if (remaining <= 0) break;

        const toCopy = Math.min(remaining, page.length);
        dest._storage.set(page.subarray(0, toCopy), destOffset);

        destOffset += toCopy;
        remaining -= toCopy;
      }

      // Fill remaining with default value
      if (destOffset < dest._size) {
        dest._storage.fill(dest.defaultValue(), destOffset);
      }
    } else if (dest instanceof PagedHugeAtomicIntArray) {
      // Copy to another paged array
      const pageLen = Math.min(this._pages!.length, dest._pages!.length);
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < pageLen && remaining > 0; i++) {
        const srcPage = this._pages![i];
        const dstPage = dest._pages![i];
        const toCopy = Math.min(remaining, srcPage.length, dstPage.length);

        dstPage.set(srcPage.subarray(0, toCopy));

        // Fill remaining portion of destination page
        if (toCopy < dstPage.length) {
          dstPage.fill(dest.defaultValue(), toCopy);
        }

        remaining -= toCopy;
      }

      // Fill any remaining destination pages with default value
      for (let i = Math.ceil(length / HugeArrays.PAGE_SIZE); i < dest._pages!.length; i++) {
        dest._pages![i].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    // Convert Int32Array pages to number[][] for cursor compatibility
    const numberPages = this._pages!.map(page => Array.from(page));
    const cursor = new PagedCursor<number[]>();
    cursor.setPages(numberPages, this._size);
    return cursor;
  }

  public initCursor(cursor: HugeCursor<number[]>): void {
    if (cursor instanceof PagedCursor) {
      const numberPages = this._pages!.map(page => Array.from(page));
      cursor.setPages(numberPages, this._size);
    }
  }
}
