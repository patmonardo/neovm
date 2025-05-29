import { HugeArrays } from '@/mem';
import { Estimate } from '@/mem';
import { HugeCursor, HugeCursorSupport } from '@/collections';
import { SinglePageCursor, PagedCursor } from '@/collections';
import { ByteToByteFunction } from './ValueTransformers';
import { BytePageCreator } from './PageCreator';

/**
 * A huge array of 8-bit signed integers supporting atomic operations for thread-safe concurrent access.
 *
 * This class provides **lock-free atomic operations** on massive arrays of 8-bit signed integers that can
 * exceed JavaScript's standard array size limitations. It's designed for high-performance concurrent
 * processing in graph analytics where memory efficiency is critical and values can be represented
 * in a compact 8-bit format, such as flags, states, colors, and small counters.
 *
 * **Design Philosophy:**
 *
 * **1. Maximum Memory Efficiency:**
 * With only 1 byte per element, this array provides the most compact storage possible while
 * maintaining atomic operation capabilities. This is ideal for applications that need to store
 * billions of small values with minimal memory footprint.
 *
 * **2. Lock-Free Concurrency:**
 * All atomic operations use compare-and-swap (CAS) primitives to achieve thread safety without
 * locks, eliminating contention bottlenecks and providing consistent performance across varying
 * numbers of threads.
 *
 * **3. Bit-Level Operations:**
 * Optimized for applications that use bytes as containers for multiple bit flags or small
 * enumerated values, common in graph coloring, state machines, and boolean arrays.
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
 * - **Cache efficiency**: Maximum cache utilization due to highest element density
 * - **Memory bandwidth**: Optimal memory bandwidth utilization
 * - **Scalability**: Linear performance scaling with number of threads
 *
 * **Byte Range:**
 * Supports the full 8-bit signed integer range [-128 to 127], which is sufficient
 * for most graph analytics applications that need compact flag storage, small counters,
 * or enumerated state values.
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Bit Vector Operations for Large Sets:**
 * ```typescript
 * // Thread-safe bit vector for marking visited nodes
 * const visitedNodes = HugeAtomicByteArray.of(nodeCount, BytePageCreators.zero());
 *
 * enum VisitState {
 *   UNVISITED = 0,
 *   QUEUED = 1,
 *   VISITED = 2,
 *   PROCESSED = 3
 * }
 *
 * async function parallelBFS(graph: Graph, startNode: number): Promise<void> {
 *   const queue = new ConcurrentQueue<number>();
 *
 *   // Mark start node as queued
 *   if (visitedNodes.compareAndSet(startNode, VisitState.UNVISITED, VisitState.QUEUED)) {
 *     queue.enqueue(startNode);
 *   }
 *
 *   await Promise.all(workers.map(async (worker) => {
 *     while (true) {
 *       const nodeId = queue.tryDequeue();
 *       if (nodeId === null) break;
 *
 *       // Atomically transition to visited
 *       if (!visitedNodes.compareAndSet(nodeId, VisitState.QUEUED, VisitState.VISITED)) {
 *         continue; // Another thread already processed this node
 *       }
 *
 *       // Process neighbors
 *       const neighbors = graph.getNeighbors(nodeId);
 *       for (const neighbor of neighbors) {
 *         // Try to mark neighbor as queued
 *         if (visitedNodes.compareAndSet(neighbor, VisitState.UNVISITED, VisitState.QUEUED)) {
 *           queue.enqueue(neighbor);
 *         }
 *       }
 *
 *       // Mark as fully processed
 *       visitedNodes.set(nodeId, VisitState.PROCESSED);
 *     }
 *   }));
 * }
 * ```
 *
 * **Graph Coloring with Minimal Memory:**
 * ```typescript
 * // Compact graph coloring using bytes for color values
 * const nodeColors = HugeAtomicByteArray.of(nodeCount, BytePageCreators.constant(-1)); // -1 = uncolored
 *
 * async function efficientGraphColoring(graph: Graph): Promise<number> {
 *   const MAX_COLORS = 127; // Use positive byte range for colors
 *   let maxColorUsed = 0;
 *
 *   await Promise.all(workers.map(async (worker) => {
 *     for (const nodeId of worker.nodeRange) {
 *       // Skip if already colored
 *       if (nodeColors.get(nodeId) >= 0) continue;
 *
 *       // Find available color
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
 *           // Atomically assign color if still uncolored
 *           if (nodeColors.compareAndSet(nodeId, -1, color)) {
 *             maxColorUsed = Math.max(maxColorUsed, color);
 *             break;
 *           }
 *           // If CAS failed, another thread colored this node
 *           break;
 *         }
 *       }
 *     }
 *   }));
 *
 *   return maxColorUsed + 1; // Return number of colors used
 * }
 * ```
 *
 * **Compact Counters for Frequency Analysis:**
 * ```typescript
 * // Use bytes for small counters with overflow protection
 * const degreeCounters = HugeAtomicByteArray.of(nodeCount, BytePageCreators.zero());
 *
 * async function countDegreesWithSaturation(graph: Graph): Promise<Map<number, number>> {
 *   const MAX_DEGREE_COUNT = 127;
 *
 *   await Promise.all(workers.map(async (worker) => {
 *     for (const edge of worker.edgeRange) {
 *       // Increment with saturation at max value
 *       degreeCounters.update(edge.source, (current) =>
 *         current >= MAX_DEGREE_COUNT ? MAX_DEGREE_COUNT : current + 1
 *       );
 *       degreeCounters.update(edge.target, (current) =>
 *         current >= MAX_DEGREE_COUNT ? MAX_DEGREE_COUNT : current + 1
 *       );
 *     }
 *   }));
 *
 *   // Collect histogram
 *   const histogram = new Map<number, number>();
 *   for (let degree = 0; <= MAX_DEGREE_COUNT; degree++) {
 *     let count = 0;
 *     const cursor = degreeCounters.newCursor();
 *     try {
 *       while (cursor.next()) {
 *         const page = cursor.array;
 *         for (let i = 0; i < page.length; i++) {
 *           if (page[i] === degree) count++;
 *         }
 *       }
 *     } finally {
 *       cursor.close();
 *     }
 *
 *     if (count > 0) {
 *       histogram.set(degree, count);
 *     }
 *   }
 *
 *   return histogram;
 * }
 * ```
 *
 * **Multi-Bit Flag Management:**
 * ```typescript
 * // Use bytes to store multiple boolean flags per element
 * const nodeFlags = HugeAtomicByteArray.of(nodeCount, BytePageCreators.zero());
 *
 * // Flag bit positions
 * const FLAGS = {
 *   IS_BOUNDARY: 1 << 0,    // 0x01
 *   IS_CORE: 1 << 1,        // 0x02
 *   IS_OUTLIER: 1 << 2,     // 0x04
 *   IS_PROCESSED: 1 << 3,   // 0x08
 *   IS_MARKED: 1 << 4,      // 0x10
 *   // Up to 8 flags per byte
 * };
 *
 * function setNodeFlag(nodeId: number, flag: number): void {
 *   nodeFlags.update(nodeId, (current) => current | flag);
 * }
 *
 * function clearNodeFlag(nodeId: number, flag: number): void {
 *   nodeFlags.update(nodeId, (current) => current & ~flag);
 * }
 *
 * function hasNodeFlag(nodeId: number, flag: number): boolean {
 *   return (nodeFlags.get(nodeId) & flag) !== 0;
 * }
 *
 * function atomicSetFlagIfClear(nodeId: number, flag: number): boolean {
 *   let current = nodeFlags.get(nodeId);
 *   while ((current & flag) === 0) {
 *     const updated = current | flag;
 *     const witness = nodeFlags.compareAndExchange(nodeId, current, updated);
 *     if (witness === current) {
 *       return true; // Flag was set
 *     }
 *     current = witness;
 *   }
 *   return false; // Flag was already set
 * }
 * ```
 *
 * **Compact State Machines:**
 * ```typescript
 * // Implement complex state machines with byte-sized states
 * enum AlgorithmState {
 *   UNINITIALIZED = 0,
 *   INITIALIZING = 1,
 *   READY = 2,
 *   PROCESSING = 3,
 *   COMPUTING = 4,
 *   FINALIZING = 5,
 *   COMPLETED = 6,
 *   ERROR = -1  // Use negative values for error states
 * }
 *
 * const nodeStates = HugeAtomicByteArray.of(nodeCount, BytePageCreators.constant(AlgorithmState.UNINITIALIZED));
 *
 * function transitionNodeState(
 *   nodeId: number,
 *   fromState: AlgorithmState,
 *   toState: AlgorithmState
 * ): boolean {
 *   return nodeStates.compareAndSet(nodeId, fromState, toState);
 * }
 *
 * async function executeStateMachine(nodeId: number): Promise<void> {
 *   // Initialize
 *   if (!transitionNodeState(nodeId, AlgorithmState.UNINITIALIZED, AlgorithmState.INITIALIZING)) {
 *     return; // Another thread is handling this node
 *   }
 *
 *   try {
 *     // Initialization work
 *     await initializeNode(nodeId);
 *     transitionNodeState(nodeId, AlgorithmState.INITIALIZING, AlgorithmState.READY);
 *
 *     // Processing work
 *     transitionNodeState(nodeId, AlgorithmState.READY, AlgorithmState.PROCESSING);
 *     await processNode(nodeId);
 *
 *     // Computing work
 *     transitionNodeState(nodeId, AlgorithmState.PROCESSING, AlgorithmState.COMPUTING);
 *     await computeNodeResult(nodeId);
 *
 *     // Finalization
 *     transitionNodeState(nodeId, AlgorithmState.COMPUTING, AlgorithmState.FINALIZING);
 *     await finalizeNode(nodeId);
 *
 *     // Mark as completed
 *     nodeStates.set(nodeId, AlgorithmState.COMPLETED);
 *   } catch (error) {
 *     // Mark as error state
 *     nodeStates.set(nodeId, AlgorithmState.ERROR);
 *     throw error;
 *   }
 * }
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Cache-Line Optimization:**
 * ```typescript
 * // Optimize for cache-line efficiency with byte arrays
 * async function cacheOptimizedProcessing(
 *   array: HugeAtomicByteArray,
 *   processor: (index: number, value: number) => number
 * ): Promise<void> {
 *   const CACHE_LINE_SIZE = 64; // bytes
 *   const BYTES_PER_CACHE_LINE = CACHE_LINE_SIZE; // 64 bytes per cache line for byte arrays
 *
 *   const totalSize = array.size();
 *   const numBatches = Math.ceil(totalSize / BYTES_PER_CACHE_LINE);
 *
 *   await Promise.all(Array.from({ length: numBatches }, async (_, batchIndex) => {
 *     const startIndex = batchIndex * BYTES_PER_CACHE_LINE;
 *     const endIndex = Math.min(startIndex + BYTES_PER_CACHE_LINE, totalSize);
 *
 *     // Process a full cache line worth of bytes
 *     for (let i = startIndex; i < endIndex; i++) {
 *       array.update(i, (current) => processor(i, current));
 *     }
 *   }));
 * }
 * ```
 *
 * **Bit Manipulation Utilities:**
 * ```typescript
 * // Efficient bit manipulation operations on byte arrays
 * class ByteArrayBitOperations {
 *   constructor(private array: HugeAtomicByteArray) {}
 *
 *   // Set specific bit atomically
 *   setBit(index: number, bitPosition: number): void {
 *     console.assert(bitPosition >= 0 && bitPosition < 8, 'Bit position must be 0-7');
 *     const mask = 1 << bitPosition;
 *     this.array.update(index, (current) => current | mask);
 *   }
 *
 *   // Clear specific bit atomically
 *   clearBit(index: number, bitPosition: number): void {
 *     console.assert(bitPosition >= 0 && bitPosition < 8, 'Bit position must be 0-7');
 *     const mask = ~(1 << bitPosition);
 *     this.array.update(index, (current) => current & mask);
 *   }
 *
 *   // Toggle specific bit atomically
 *   toggleBit(index: number, bitPosition: number): boolean {
 *     console.assert(bitPosition >= 0 && bitPosition < 8, 'Bit position must be 0-7');
 *     const mask = 1 << bitPosition;
 *     let newValue: number;
 *     this.array.update(index, (current) => {
 *       newValue = current ^ mask;
 *       return newValue;
 *     });
 *     return (newValue! & mask) !== 0;
 *   }
 *
 *   // Test specific bit
 *   testBit(index: number, bitPosition: number): boolean {
 *     console.assert(bitPosition >= 0 && bitPosition < 8, 'Bit position must be 0-7');
 *     const mask = 1 << bitPosition;
 *     return (this.array.get(index) & mask) !== 0;
 *   }
 *
 *   // Count set bits in a range
 *   popcount(startIndex: number, endIndex: number): number {
 *     let count = 0;
 *     for (let i = startIndex; i < endIndex; i++) {
 *       const value = this.array.get(i);
 *       // Count bits using Brian Kernighan's algorithm
 *       let temp = value;
 *       while (temp) {
 *         count++;
 *         temp &= temp - 1; // Clear lowest set bit
 *       }
 *     }
 *     return count;
 *   }
 * }
 * ```
 *
 * **Memory Usage Analysis:**
 *
 * **Extreme Memory Efficiency:**
 * ```typescript
 * // Compare memory usage across different array types
 * const nodeCount = 1_000_000_000; // 1 billion nodes
 *
 * const byteArrayMemory = HugeAtomicByteArray.memoryEstimation(nodeCount);
 * const intArrayMemory = HugeAtomicIntArray.memoryEstimation(nodeCount);
 * const longArrayMemory = HugeAtomicLongArray.memoryEstimation(nodeCount);
 *
 * console.log(`Byte array memory: ${byteArrayMemory / (1024 * 1024)} MB`);
 * console.log(`Int array memory: ${intArrayMemory / (1024 * 1024)} MB`);
 * console.log(`Long array memory: ${longArrayMemory / (1024 * 1024)} MB`);
 *
 * console.log(`Byte vs Int savings: ${((intArrayMemory - byteArrayMemory) / intArrayMemory * 100).toFixed(1)}%`);
 * console.log(`Byte vs Long savings: ${((longArrayMemory - byteArrayMemory) / longArrayMemory * 100).toFixed(1)}%`);
 * // Typically shows ~75% savings vs int, ~87.5% savings vs long
 * ```
 *
 * **Integration with Streaming Algorithms:**
 *
 * **Streaming Bloom Filter Implementation:**
 * ```typescript
 * // Use byte arrays for compact bloom filter implementation
 * class StreamingBloomFilter {
 *   private bits: HugeAtomicByteArray;
 *   private hashFunctions: ((value: number) => number)[];
 *
 *   constructor(estimatedElements: number, falsePositiveRate: number) {
 *     const optimalBits = this.calculateOptimalBits(estimatedElements, falsePositiveRate);
 *     const numBytes = Math.ceil(optimalBits / 8);
 *     this.bits = HugeAtomicByteArray.of(numBytes, BytePageCreators.zero());
 *
 *     const optimalHashes = this.calculateOptimalHashes(estimatedElements, optimalBits);
 *     this.hashFunctions = this.createHashFunctions(optimalHashes);
 *   }
 *
 *   add(element: number): void {
 *     for (const hashFunc of this.hashFunctions) {
 *       const hash = hashFunc(element);
 *       const byteIndex = Math.floor(hash / 8);
 *       const bitIndex = hash % 8;
 *
 *       // Atomically set bit
 *       const mask = 1 << bitIndex;
 *       this.bits.update(byteIndex, (current) => current | mask);
 *     }
 *   }
 *
 *   mightContain(element: number): boolean {
 *     for (const hashFunc of this.hashFunctions) {
 *       const hash = hashFunc(element);
 *       const byteIndex = Math.floor(hash / 8);
 *       const bitIndex = hash % 8;
 *
 *       const mask = 1 << bitIndex;
 *       if ((this.bits.get(byteIndex) & mask) === 0) {
 *         return false; // Definitely not present
 *       }
 *     }
 *     return true; // Might be present
 *   }
 *
 *   private calculateOptimalBits(n: number, p: number): number {
 *     return Math.ceil(-n * Math.log(p) / (Math.log(2) ** 2));
 *   }
 *
 *   private calculateOptimalHashes(n: number, m: number): number {
 *     return Math.ceil((m / n) * Math.log(2));
 *   }
 *
 *   private createHashFunctions(count: number): ((value: number) => number)[] {
 *     // Implementation of multiple hash functions
 *     // ... hash function creation logic
 *     return [];
 *   }
 * }
 * ```
 */
export abstract class HugeAtomicByteArray<TStorage = any>
  implements HugeCursorSupport<number[]>
{
  // Common properties - generic storage type
  public _size?: number;
  public _page?: TStorage | null;
  public _pages?: TStorage[] | null;

  /**
   * Creates a new atomic byte array of the given size with the specified page creator.
   *
   * This is the **primary factory method** for creating HugeAtomicByteArray instances.
   * The page creator determines how pages are initialized and can implement various
   * strategies like zero-fill, constant values, or computed initialization.
   *
   * **Size Optimization:**
   * The implementation automatically chooses between single-page and multi-page
   * strategies based on the requested size to optimize for memory usage and performance.
   *
   * **Page Creator Strategies:**
   * - **Zero initialization**: All elements start at 0
   * - **Constant values**: All elements start with the same byte value
   * - **Bit patterns**: Initialize with specific bit patterns
   * - **Computed values**: Elements initialized based on their index
   *
   * @param size The number of elements in the array
   * @param pageCreator Strategy for initializing pages
   * @returns A new HugeAtomicByteArray instance
   */
  public static of(
    size: number,
    pageCreator: BytePageCreator
  ): HugeAtomicByteArray {
    return HugeAtomicByteArrayFactory.of(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicByteArray of the specified size.
   *
   * This method provides **accurate memory forecasting** for capacity planning and
   * resource allocation. The estimation includes both the array structure overhead
   * and the storage space for 8-bit byte elements.
   *
   * **Memory Components:**
   * - Array structure and page management overhead
   * - Storage for 8-bit byte elements (1 byte per element)
   * - Atomic operation metadata and synchronization overhead
   *
   * **Maximum Memory Efficiency:**
   * Byte arrays provide the most compact storage possible, using only 1 byte per
   * element compared to 4 bytes for ints or 8 bytes for longs.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    return HugeAtomicByteArrayFactory.memoryEstimation(size);
  }

  /**
   * Returns the default value used for uninitialized elements and copy operations.
   *
   * This method provides the **default byte value** (0) used when filling unused
   * space in copy operations or when elements haven't been explicitly initialized.
   *
   * @returns The default value (0) for byte elements
   */
  public defaultValue(): number {
    return 0;
  }

  /**
   * Returns the byte value at the given index.
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
   * **8-Bit Range:**
   * Values are guaranteed to be in the range [-128, 127] for signed 8-bit integers.
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
   * Addition operations follow standard 8-bit integer overflow semantics.
   * Values that exceed the 8-bit range will wrap around according to
   * two's complement arithmetic.
   *
   * **Common Usage Patterns:**
   * ```typescript
   * // Atomic increment with saturation
   * const oldValue = array.getAndAdd(index, 1);
   * if (oldValue === 127) {
   *   array.set(index, 127); // Prevent overflow
   * }
   *
   * // Atomic decrement with underflow protection
   * const oldValue = array.getAndAdd(index, -1);
   * if (oldValue === -128) {
   *   array.set(index, -128); // Prevent underflow
   * }
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
   * @param value The new value to set (must be valid 8-bit integer)
   * @returns The previous value that was replaced
   * @throws Error if index is out of bounds
   */
  public abstract getAndReplace(index: number, value: number): number;

  /**
   * Sets the byte value at the given index to the given value.
   *
   * This method provides **atomic write access** to array elements. The write
   * operation is guaranteed to be atomic and visible to all threads.
   *
   * **Memory Synchronization:**
   * The write includes proper memory barriers to ensure the new value is
   * immediately visible to other threads reading from the same index.
   *
   * **Value Range:**
   * The value should be a valid 8-bit signed integer in the range [-128, 127].
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
   * // Atomic bit flag setting
   * let currentFlags = array.get(index);
   * const newFlags = currentFlags | FLAG_MASK;
   * while (!array.compareAndSet(index, currentFlags, newFlags)) {
   *   currentFlags = array.get(index);
   *   newFlags = currentFlags | FLAG_MASK;
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
   * - **8-bit output**: Must return valid 8-bit integer values
   *
   * **Automatic Retry:**
   * If multiple threads attempt to update the same index simultaneously, the
   * implementation automatically retries the update until it succeeds.
   *
   * **Usage Examples:**
   * ```typescript
   * // Atomic bit flag operations
   * array.update(index, (current) => current | FLAG_MASK);     // Set flag
   * array.update(index, (current) => current & ~FLAG_MASK);    // Clear flag
   * array.update(index, (current) => current ^ FLAG_MASK);     // Toggle flag
   *
   * // Saturated increment (clamp at max value)
   * array.update(index, (current) => current >= 127 ? 127 : current + 1);
   *
   * // State machine transitions
   * array.update(index, (current) => computeNextState(current, event));
   * ```
   *
   * @param index The index to update
   * @param updateFunction A pure function that computes the new value
   * @throws Error if index is out of bounds
   */
  public abstract update(
    index: number,
    updateFunction: ByteToByteFunction
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
   * - Page storage arrays (Int8Array instances)
   * - Index management structures
   * - Atomic operation metadata
   * - Object overhead
   *
   * **Maximum Memory Efficiency:**
   * Byte arrays provide the most compact storage, using approximately 1/8th the
   * memory of equivalent long arrays and 1/4th that of int arrays.
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
   * The value should be a valid 8-bit signed integer in the range [-128, 127].
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
   * - Releases all page storage arrays (Int8Array instances)
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
  public abstract copyTo(dest: HugeAtomicByteArray, length: number): void;

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
 * Factory class for creating HugeAtomicByteArray instances.
 *
 * This factory handles the selection between different implementations based on
 * size requirements and provides memory estimation capabilities.
 */
export class HugeAtomicByteArrayFactory {

  /**
   * Creates a new HugeAtomicByteArray with the optimal implementation for the given size.
   *
   * @param size The number of elements in the array
   * @param pageCreator Strategy for initializing pages
   * @returns A new HugeAtomicByteArray instance
   */
  public static of(size: number, pageCreator: BytePageCreator): HugeAtomicByteArray {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return new SingleHugeAtomicByteArray(size, pageCreator);
    }
    return new PagedHugeAtomicByteArray(size, pageCreator);
  }

  /**
   * Estimates the memory required for a HugeAtomicByteArray of the specified size.
   *
   * @param size The desired array size in elements
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    const sizeOfInstance = size <= HugeArrays.MAX_ARRAY_LENGTH
      ? Estimate.sizeOfInstance(SingleHugeAtomicByteArray.name)
      : Estimate.sizeOfInstance(PagedHugeAtomicByteArray.name);

    const numPages = HugeArrays.numberOfPages(size);
    const memoryPerPage = Estimate.sizeOfByteArray(HugeArrays.PAGE_SIZE);
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    const lastPageMemory = Estimate.sizeOfByteArray(lastPageSize);

    return sizeOfInstance + Estimate.sizeOfObjectArray(numPages) +
           (numPages - 1) * memoryPerPage + lastPageMemory;
  }
}
// Add these implementations at the end of the file:

/**
 * Single-page implementation for smaller atomic byte arrays.
 */
class SingleHugeAtomicByteArray extends HugeAtomicByteArray<Int8Array> {
  public _size: number;
  public _storage: Int8Array;

  constructor(size: number, pageCreator: BytePageCreator) {
    super();
    this._size = size;
    this._storage = new Int8Array(size);

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

  public update(index: number, updateFunction: ByteToByteFunction): void {
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
    return Estimate.sizeOfByteArray(this._size);
  }

  public setAll(value: number): void {
    this._storage.fill(value);
  }

  public release(): number {
    const memoryFreed = Estimate.sizeOfByteArray(this._size);
    // Clear the storage reference
    (this._storage as any) = null;
    return memoryFreed;
  }

  public copyTo(dest: HugeAtomicByteArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeAtomicByteArray) {
      // Copy to another single array
      dest._storage.set(this._storage.subarray(0, length));
      // Fill remaining with default value
      if (length < dest._size) {
        dest._storage.fill(dest.defaultValue(), length);
      }
    } else if (dest instanceof PagedHugeAtomicByteArray) {
      // Copy to paged array
      let srcOffset = 0;
      let remaining = length;

      for (let pageIdx = 0; pageIdx < dest._pages.length && remaining > 0; pageIdx++) {
        const dstPage = dest._pages[pageIdx];
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
      for (let pageIdx = Math.ceil(length / HugeArrays.PAGE_SIZE); pageIdx < dest._pages.length; pageIdx++) {
        dest._pages[pageIdx].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    // Convert Int8Array to number[] for cursor compatibility
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
 * Multi-page implementation for larger atomic byte arrays.
 */
class PagedHugeAtomicByteArray extends HugeAtomicByteArray<Int8Array> {
  public _size: number;
  public _pages: Int8Array[];
  public _memoryUsed: number;

  constructor(size: number, pageCreator: BytePageCreator) {
    super();
    this._size = size;

    const numPages = HugeArrays.numberOfPages(size);
    this._pages = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfByteArray(HugeArrays.PAGE_SIZE);

    // Create array to hold all pages for bulk initialization
    const allPages: Int8Array[] = new Array(numPages);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      allPages[i] = new Int8Array(HugeArrays.PAGE_SIZE);
      memoryUsed += pageBytes;
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    allPages[numPages - 1] = new Int8Array(lastPageSize);
    memoryUsed += Estimate.sizeOfByteArray(lastPageSize);

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
    return this._pages[pageIndex][indexInPage];
  }

  public getAndAdd(index: number, delta: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const oldValue = this._pages[pageIndex][indexInPage];
    this._pages[pageIndex][indexInPage] = oldValue + delta;
    return oldValue;
  }

  public getAndReplace(index: number, value: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const oldValue = this._pages[pageIndex][indexInPage];
    this._pages[pageIndex][indexInPage] = value;
    return oldValue;
  }

  public set(index: number, value: number): void {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this._pages[pageIndex][indexInPage] = value;
  }

  public compareAndSet(index: number, expect: number, update: number): boolean {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    if (this._pages[pageIndex][indexInPage] === expect) {
      this._pages[pageIndex][indexInPage] = update;
      return true;
    }
    return false;
  }

  public compareAndExchange(index: number, expect: number, update: number): number {
    console.assert(index < this._size, `index = ${index} size = ${this._size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const current = this._pages[pageIndex][indexInPage];
    if (current === expect) {
      this._pages[pageIndex][indexInPage] = update;
    }
    return current;
  }

  public update(index: number, updateFunction: ByteToByteFunction): void {
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
    for (const page of this._pages) {
      page.fill(value);
    }
  }

  public release(): number {
    const memoryFreed = this._memoryUsed;
    // Clear all page references
    (this._pages as any) = null;
    return memoryFreed;
  }

  public copyTo(dest: HugeAtomicByteArray, length: number): void {
    length = Math.min(length, this._size, dest.size());

    if (dest instanceof SingleHugeAtomicByteArray) {
      // Copy to single array
      let destOffset = 0;
      let remaining = length;

      for (const page of this._pages) {
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
    } else if (dest instanceof PagedHugeAtomicByteArray) {
      // Copy to another paged array
      const pageLen = Math.min(this._pages.length, dest._pages.length);
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < pageLen && remaining > 0; i++) {
        const srcPage = this._pages[i];
        const dstPage = dest._pages[i];
        const toCopy = Math.min(remaining, srcPage.length, dstPage.length);

        dstPage.set(srcPage.subarray(0, toCopy));

        // Fill remaining portion of destination page
        if (toCopy < dstPage.length) {
          dstPage.fill(dest.defaultValue(), toCopy);
        }

        remaining -= toCopy;
      }

      // Fill any remaining destination pages with default value
      for (let i = Math.ceil(length / HugeArrays.PAGE_SIZE); i < dest._pages.length; i++) {
        dest._pages[i].fill(dest.defaultValue());
      }
    }
  }

  public newCursor(): HugeCursor<number[]> {
    // Convert Int8Array pages to number[][] for cursor compatibility
    const numberPages = this._pages.map(page => Array.from(page));
    const cursor = new PagedCursor<number[]>();
    cursor.setPages(numberPages, this._size);
    return cursor;
  }

  public initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]> {
    if (cursor instanceof PagedCursor) {
      const numberPages = this._pages.map(page => Array.from(page));
      cursor.setPages(numberPages, this._size);
    }
    return cursor;
  }
}
