import { HugeCursor } from '@/collections/cursor/HugeCursor';
import { HugeCursorSupport, defaultInitCursor, defaultInitCursorFull } from '@/collections/cursor/HugeCursorSupport';

/**
 * Abstract base class for all HugeArray implementations in the graph data science system.
 *
 * This class provides the **foundational architecture** for handling arrays that exceed the
 * limitations of standard JavaScript arrays (2^32-1 elements). It establishes the common
 * interface and shared functionality for all array types while allowing specialized
 * implementations for different data types and storage strategies.
 *
 * **The Big Data Problem:**
 * Modern graph datasets routinely contain:
 * - **Social networks**: Billions of users, trillions of relationships
 * - **Knowledge graphs**: Hundreds of millions of entities with complex properties
 * - **Scientific datasets**: Massive simulation results, sensor data streams
 * - **Financial networks**: Transaction graphs with temporal properties
 *
 * Standard JavaScript arrays cannot handle datasets of this scale, requiring a more
 * sophisticated approach to memory management and data access.
 *
 * **HugeArray Solution Architecture:**
 *
 * **1. Paged Memory Management:**
 * ```
 * Logical Array: [0][1][2][3][4][5][6][7][8][9][10][11]...
 * Physical Pages: [0,1,2,3] [4,5,6,7] [8,9,10,11] ...
 *                 Page 0    Page 1    Page 2
 * ```
 *
 * **2. Type Hierarchy:**
 * ```
 * HugeArray<Array, Box, Self>
 *     ├── HugeLongArray        (Int32Array pages, number boxed)
 *     ├── HugeDoubleArray      (Float64Array pages, number boxed)
 *     ├── HugeObjectArray<T>   (T[] pages, T boxed)
 *     ├── HugeAtomicLongArray  (Int32Array pages with atomic operations)
 *     └── HugeSparseArray<T>   (Sparse storage with default values)
 * ```
 *
 * **3. Generic Type Parameters:**
 * - **Array**: The type of pages (Int32Array, Float64Array, T[], etc.)
 * - **Box**: The boxed element type (number for primitives, T for objects)
 * - **Self**: The concrete implementation type (enables fluent APIs)
 *
 * **Core Design Principles:**
 *
 * **Performance-First Architecture:**
 * - **Zero-copy access**: Direct page references without data copying
 * - **Cache-friendly layout**: Page sizes optimized for CPU cache lines
 * - **Minimal indirection**: Direct array access within pages
 * - **Batch operations**: Cursor-based iteration for bulk processing
 *
 * **Memory Efficiency:**
 * - **Lazy allocation**: Pages allocated only when needed
 * - **Explicit lifecycle**: Controlled allocation and deallocation
 * - **Shared pages**: Read-only sharing between array instances
 * - **Compact representation**: Minimal metadata overhead
 *
 * **Type Safety:**
 * - **Generic constraints**: Compile-time type checking for array operations
 * - **Boxed operations**: Safe access to individual elements
 * - **Cursor type safety**: Strongly typed iteration over pages
 *
 * **Apache Arrow Integration Readiness:**
 * The HugeArray architecture aligns perfectly with Apache Arrow's design:
 * - **Chunked arrays**: HugeArray pages map to Arrow chunks
 * - **Zero-copy**: Direct buffer access without serialization
 * - **Columnar layout**: Efficient for analytical workloads
 * - **Memory pools**: Explicit memory management for off-heap data
 *
 * **Usage Patterns:**
 *
 * **Graph Loading:**
 * ```typescript
 * // Load millions of node properties
 * const nodeAges = HugeLongArray.newArray(nodeCount);
 * nodeAges.boxedSetAll(nodeId => loadNodeAge(nodeId));
 *
 * // Process in parallel chunks
 * const cursor = nodeAges.newCursor();
 * nodeAges.initCursor(cursor, startId, endId);
 * while (cursor.next()) {
 *   processAgeChunk(cursor.array, cursor.offset, cursor.limit);
 * }
 * ```
 *
 * **Algorithm Results Storage:**
 * ```typescript
 * // Store PageRank results for huge graphs
 * const pageRankScores = HugeDoubleArray.newArray(nodeCount);
 * algorithm.computePageRank(graph, pageRankScores);
 *
 * // Export results efficiently
 * pageRankScores.copyTo(exportArray, nodeCount);
 * ```
 *
 * **Memory Management:**
 * ```typescript
 * // Explicit memory control for large-scale processing
 * const tempArray = HugeDoubleArray.newArray(HUGE_SIZE);
 * try {
 *   // Process data...
 *   processLargeDataset(tempArray);
 * } finally {
 *   const freedBytes = tempArray.release(); // Free memory immediately
 *   console.log(`Freed ${freedBytes} bytes`);
 * }
 * ```
 */
export abstract class HugeArray<Array, Box, Self extends HugeArray<Array, Box, Self>>
  implements HugeCursorSupport<Array> {

  /**
   * Copies the content of this array into the target array.
   *
   * This method provides **bulk data transfer** capability similar to JavaScript's
   * `Array.prototype.copyWithin()` or the native `memcpy()` function, but designed
   * to work efficiently across page boundaries in HugeArray structures.
   *
   * **Copy Semantics:**
   * - **Source**: This array instance (copy FROM)
   * - **Destination**: The `dest` parameter (copy TO)
   * - **Amount**: First `length` elements from source
   * - **Position**: Always starts at index 0 in both arrays
   *
   * **Behavioral Guarantees:**
   * The behavior is identical to `System.arraycopy(this, 0, dest, 0, length)`:
   * - **Element-by-element copy**: Each element copied individually
   * - **Type safety**: Source and destination must be same element type
   * - **Bounds checking**: Will throw if `length` exceeds either array size
   * - **Exception safety**: Partial copies may occur if bounds are exceeded
   *
   * **Performance Characteristics:**
   * - **Page-aware copying**: Optimized to copy entire pages when possible
   * - **Memory bandwidth**: Limited by memory subsystem, not CPU
   * - **Cache efficiency**: Sequential access patterns optimize cache usage
   * - **Parallel potential**: Large copies can be parallelized internally
   *
   * **Use Cases:**
   *
   * **Array Resizing:**
   * ```typescript
   * // Resize array by creating larger copy
   * const originalArray = HugeLongArray.newArray(1_000_000);
   * const expandedArray = HugeLongArray.newArray(2_000_000);
   * originalArray.copyTo(expandedArray, originalArray.size());
   * ```
   *
   * **Data Backup:**
   * ```typescript
   * // Create backup before risky operations
   * const backup = algorithmResults.copyOf(algorithmResults.size());
   * algorithmResults.copyTo(backup, algorithmResults.size());
   * // If algorithm fails, restore from backup
   * backup.copyTo(algorithmResults, backup.size());
   * ```
   *
   * **Array Migration:**
   * ```typescript
   * // Move data between different array implementations
   * const denseArray = HugeLongArray.newArray(size);
   * const sparseArray = HugeSparseArray.newArray(size);
   * denseArray.copyTo(sparseArray, size); // Convert dense → sparse
   * ```
   *
   * @param dest Target array to copy data into (must be same element type)
   * @param length Number of elements to copy from start of this array
   * @throws Error if `length` exceeds size of either source or destination array
   */
  public abstract copyTo(dest: Self, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * This method provides **array duplication and resizing** functionality similar to
   * JavaScript's `Array.from()` or Java's `Arrays.copyOf()`, but optimized for
   * HugeArray's paged architecture and massive scale requirements.
   *
   * **Copy Behavior:**
   * - **Smaller new length**: Truncates the array, discarding excess elements
   * - **Larger new length**: Extends the array, padding with default values
   * - **Same length**: Creates exact copy (useful for array isolation)
   * - **Zero length**: Creates empty array of same type
   *
   * **Default Value Handling:**
   * When `newLength > size()`, new elements are filled with type-appropriate defaults:
   * - **Numeric arrays**: Filled with `0` (or `0.0` for floating point)
   * - **Object arrays**: Filled with `null` references
   * - **Boolean arrays**: Filled with `false`
   *
   * **Memory Allocation Strategy:**
   * - **Page reuse**: Existing pages reused when possible to minimize allocation
   * - **Incremental allocation**: New pages allocated only for extended portion
   * - **Copy optimization**: Efficient page-level copying for bulk data transfer
   * - **Memory alignment**: New array uses same page size and alignment as original
   *
   * **Performance Characteristics:**
   * - **Linear copying time**: O(min(oldSize, newSize)) for data transfer
   * - **Constant setup time**: O(1) for array structure initialization
   * - **Memory proportional**: Memory usage proportional to `newLength`
   * - **Cache-friendly**: Sequential copy patterns optimize memory hierarchy
   *
   * **Common Usage Patterns:**
   *
   * **Dynamic Array Growth:**
   * ```typescript
   * // Grow array when capacity exceeded
   * if (requiredSize > currentArray.size()) {
   *   const newSize = Math.max(requiredSize, currentArray.size() * 2);
   *   currentArray = currentArray.copyOf(newSize);
   * }
   * ```
   *
   * **Array Truncation:**
   * ```typescript
   * // Remove invalid data from end of array
   * const validElements = findLastValidElement(dataArray);
   * const cleanedArray = dataArray.copyOf(validElements + 1);
   * ```
   *
   * **Immutable Operations:**
   * ```typescript
   * // Create modified copy without changing original
   * const modifiedArray = originalArray.copyOf(originalArray.size());
   * modifiedArray.boxedSetAll(index => transform(originalArray.boxedGet(index)));
   * ```
   *
   * **Algorithm Scratch Space:**
   * ```typescript
   * // Create working copy for destructive algorithms
   * const workingCopy = inputArray.copyOf(inputArray.size());
   * destructiveSort(workingCopy); // Original preserved
   * ```
   *
   * @param newLength The size of the new array (can be larger, smaller, or equal to current size)
   * @returns A new array instance with the specified length containing copied data
   * @throws Error if `newLength` is negative
   */
  public abstract copyOf(newLength: number): Self;

  /**
   * Returns the logical length of this array in elements.
   *
   * This provides the **fundamental size query** for the array, equivalent to the
   * `.length` property on standard JavaScript arrays. The size determines the valid
   * index range and iteration bounds for all array operations.
   *
   * **Size Semantics:**
   * - **Valid indices**: Range from `0` to `size() - 1` (inclusive)
   * - **Element count**: Total number of logically accessible elements
   * - **Iteration bound**: Upper limit for cursor and loop-based access
   * - **Memory correlation**: Generally proportional to allocated memory
   *
   * **Size vs Capacity:**
   * In HugeArray implementations:
   * - **Size**: Number of logically valid elements (this method)
   * - **Capacity**: Physical storage space available (may be larger)
   * - **Relationship**: `size() ≤ capacity` always holds true
   *
   * **Performance Guarantee:**
   * This must be an **O(1) operation**. Implementations should cache the size
   * rather than computing it by iterating through pages or counting elements.
   *
   * **Empty Array Behavior:**
   * - **Size zero**: `size() === 0` indicates an empty array
   * - **No valid indices**: Any index access will throw bounds exception
   * - **Empty iteration**: Cursors will immediately return `false` from `next()`
   *
   * @returns The total number of elements in this array
   */
  public abstract size(): number;

  /**
   * Returns the amount of memory used by this array instance in bytes.
   *
   * This method provides **memory footprint analysis** capability, essential for:
   * - **Memory budgeting**: Ensuring algorithms stay within available memory
   * - **Performance monitoring**: Tracking memory usage patterns over time
   * - **Resource optimization**: Identifying memory-heavy operations
   * - **Capacity planning**: Estimating memory needs for larger datasets
   *
   * **Memory Calculation Includes:**
   * - **Page storage**: All allocated page arrays (the bulk of memory usage)
   * - **Metadata overhead**: Array structure, page references, size tracking
   * - **Cursor support**: Memory for cursor creation and management
   * - **Type-specific overhead**: Additional memory for specialized implementations
   *
   * **Memory Calculation Excludes:**
   * - **Active cursors**: Memory used by live cursor instances
   * - **GC overhead**: Garbage collection metadata and tracking structures
   * - **JVM overhead**: Virtual machine memory management structures
   * - **Shared references**: Memory shared with other array instances
   *
   * **Precision Guarantees:**
   * - **Conservative estimate**: Should not underestimate actual memory usage
   * - **Consistent with release()**: Should match the value returned by `release()`
   * - **Immediate accuracy**: Reflects current memory state, not historical usage
   *
   * **Performance Considerations:**
   * - **Fast calculation**: Should be O(1) or O(pages) at most
   * - **No allocation**: Must not allocate memory during calculation
   * - **Thread-safe**: Can be called safely from multiple threads
   *
   * **Usage Examples:**
   *
   * **Memory Budget Management:**
   * ```typescript
   * const memoryLimit = 8 * 1024 * 1024 * 1024; // 8GB limit
   * const currentUsage = array1.sizeOf() + array2.sizeOf() + array3.sizeOf();
   * if (currentUsage + newArray.sizeOf() > memoryLimit) {
   *   throw new Error('Operation would exceed memory limit');
   * }
   * ```
   *
   * **Memory Monitoring:**
   * ```typescript
   * const initialMemory = array.sizeOf();
   * performBulkOperations(array);
   * const finalMemory = array.sizeOf();
   * console.log(`Memory change: ${finalMemory - initialMemory} bytes`);
   * ```
   *
   * **Resource Optimization:**
   * ```typescript
   * // Choose most memory-efficient array type
   * const denseMemory = denseArray.sizeOf();
   * const sparseMemory = sparseArray.sizeOf();
   * const optimal = denseMemory < sparseMemory ? denseArray : sparseArray;
   * ```
   *
   * @returns The memory footprint of this array in bytes
   */
  public abstract sizeOf(): number;

  /**
   * Destroys the array data and releases all associated memory for garbage collection.
   *
   * This method provides **explicit memory management** for large-scale data processing
   * where waiting for garbage collection is not acceptable. It immediately invalidates
   * the array and makes its memory available for reclamation.
   *
   * **Destruction Process:**
   * 1. **Nullify page references**: Clear all references to underlying page arrays
   * 2. **Reset metadata**: Clear size, capacity, and structural information
   * 3. **Invalidate state**: Mark array as unusable for future operations
   * 4. **Return memory total**: Calculate and return freed memory amount
   *
   * **Post-Release State:**
   * After calling `release()`, the array enters a **permanently invalid state**:
   * - **All methods throw**: Virtually every method will throw `Error`
   * - **No recovery**: Array cannot be restored to usable state
   * - **Memory freed**: Memory is available for garbage collection
   * - **References cleared**: No longer holds references to large data structures
   *
   * **Cursor Interaction:**
   * **Critical**: Active cursors may prevent immediate memory reclamation:
   * - **Live cursors**: May hold references to page arrays
   * - **Delayed collection**: Memory might not be freed until cursors are closed
   * - **Best practice**: Always close cursors before releasing arrays
   *
   * **Memory Reclamation Timing:**
   * - **Immediate**: References are cleared immediately
   * - **GC-dependent**: Actual memory reclamation depends on garbage collector
   * - **System-dependent**: OS memory return timing varies by platform
   * - **Pressure-sensitive**: More aggressive reclamation under memory pressure
   *
   * **Exception Safety:**
   * - **Idempotent**: Safe to call multiple times (subsequent calls return 0)
   * - **No partial state**: Either fully released or not released at all
   * - **Thread-safe**: Safe to call from multiple threads (first call wins)
   *
   * **Use Cases:**
   *
   * **Large-Scale Processing:**
   * ```typescript
   * // Process massive datasets with controlled memory usage
   * for (const dataFile of largeDataFiles) {
   *   const tempArray = HugeLongArray.newArray(HUGE_SIZE);
   *   try {
   *     loadDataFromFile(dataFile, tempArray);
   *     processData(tempArray);
   *   } finally {
   *     const freedBytes = tempArray.release();
   *     console.log(`Freed ${freedBytes} bytes`);
   *   }
   * }
   * ```
   *
   * **Memory-Sensitive Algorithms:**
   * ```typescript
   * // Algorithm that creates many temporary arrays
   * function complexAlgorithm(input: HugeArray) {
   *   const temp1 = input.copyOf(input.size());
   *   const temp2 = HugeDoubleArray.newArray(input.size());
   *
   *   try {
   *     // Complex processing...
   *     return computeResult(temp1, temp2);
   *   } finally {
   *     temp1.release(); // Free immediately
   *     temp2.release(); // Don't wait for GC
   *   }
   * }
   * ```
   *
   * **Resource Pool Management:**
   * ```typescript
   * // Pool of reusable arrays with explicit lifecycle
   * class ArrayPool {
   *   releaseArray(array: HugeArray) {
   *     const freedBytes = array.release();
   *     this.totalFreedMemory += freedBytes;
   *   }
   * }
   * ```
   *
   * @returns The amount of memory freed in bytes (0 for subsequent calls)
   * @throws Never throws - always succeeds even if already released
   */
  public abstract release(): number;

  /**
   * Returns the boxed value at the specified index.
   *
   * This method provides **safe, convenient access** to individual array elements
   * with automatic boxing of primitive values. It's designed for occasional access
   * rather than high-frequency iteration (use cursors for bulk operations).
   *
   * **Boxing Behavior:**
   * - **Primitive arrays**: Values are boxed into JavaScript objects/numbers
   * - **Object arrays**: Values returned directly without additional wrapping
   * - **Type safety**: Return type matches the generic `Box` parameter
   * - **Null handling**: Properly handles null values in object arrays
   *
   * **Performance Characteristics:**
   * - **Random access**: O(1) access time to any valid index
   * - **Page lookup**: Minimal overhead for page location and indexing
   * - **Boxing cost**: Small allocation cost for primitive boxing
   * - **Bounds checking**: Includes array bounds validation
   *
   * **Index Validation:**
   * - **Valid range**: Index must be in `[0, size())`
   * - **Bounds checking**: Throws exception for invalid indices
   * - **Negative indices**: Not supported (unlike some JavaScript patterns)
   * - **Beyond size**: Accessing `index >= size()` always throws
   *
   * **Usage Patterns:**
   *
   * **Sparse Access:**
   * ```typescript
   * // Access specific elements by computed indices
   * const nodeId = graph.getRandomNodeId();
   * const nodeAge = nodeAges.boxedGet(nodeId);
   * const nodeScore = scores.boxedGet(nodeId);
   * processNode(nodeId, nodeAge, nodeScore);
   * ```
   *
   * **Validation and Debugging:**
   * ```typescript
   * // Check specific values during debugging
   * console.log(`Node 0 age: ${nodeAges.boxedGet(0)}`);
   * console.log(`Max node age: ${nodeAges.boxedGet(nodeAges.size() - 1)}`);
   *
   * // Validate algorithm results
   * for (const criticalNodeId of criticalNodes) {
   *   const result = results.boxedGet(criticalNodeId);
   *   if (result < 0) {
   *     throw new Error(`Invalid result for node ${criticalNodeId}: ${result}`);
   *   }
   * }
   * ```
   *
   * **Conditional Processing:**
   * ```typescript
   * // Process elements based on values at specific indices
   * for (let i = 0; i < array.size(); i += 1000) { // Sample every 1000th element
   *   const sampleValue = array.boxedGet(i);
   *   if (sampleValue > threshold) {
   *     processHighValueRegion(array, i, Math.min(i + 1000, array.size()));
   *   }
   * }
   * ```
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The boxed value at the specified index
   * @throws Error if index < 0 or index >= size()
   */
  public abstract boxedGet(index: number): Box;

  /**
   * Sets the value at the specified index to the given boxed value.
   *
   * This method provides **safe, convenient modification** of individual array elements
   * with automatic unboxing of values. Like `boxedGet()`, it's designed for occasional
   * updates rather than bulk operations (use cursors for efficient bulk updates).
   *
   * **Unboxing Behavior:**
   * - **Primitive arrays**: JavaScript numbers unboxed to appropriate primitive type
   * - **Object arrays**: Values stored directly with type checking
   * - **Type validation**: Ensures value type matches array element type
   * - **Null handling**: Properly handles null assignments in object arrays
   *
   * **Performance Characteristics:**
   * - **Random access**: O(1) update time to any valid index
   * - **Page lookup**: Minimal overhead for page location and indexing
   * - **Unboxing cost**: Small overhead for primitive unboxing
   * - **Bounds checking**: Includes array bounds validation
   *
   * **Type Safety:**
   * - **Compile-time checking**: TypeScript ensures value type compatibility
   * - **Runtime validation**: Additional checks for type safety at runtime
   * - **Null safety**: Appropriate handling of null values based on array type
   * - **Range validation**: Ensures numeric values fit in primitive type ranges
   *
   * **Thread Safety:**
   * - **Not thread-safe**: Concurrent writes to same index have undefined behavior
   * - **Page isolation**: Writes to different pages are generally safe
   * - **Atomic operations**: Use `HugeAtomicLongArray` for thread-safe operations
   *
   * **Usage Patterns:**
   *
   * **Sparse Updates:**
   * ```typescript
   * // Update specific elements based on computation
   * for (const nodeId of modifiedNodes) {
   *   const newValue = computeNewValue(nodeId);
   *   nodeProperties.boxedSet(nodeId, newValue);
   * }
   * ```
   *
   * **Initialization Patterns:**
   * ```typescript
   * // Initialize array with computed values
   * const results = HugeDoubleArray.newArray(nodeCount);
   * for (let i = 0; i < nodeCount; i++) {
   *   results.boxedSet(i, computeInitialValue(i));
   * }
   * ```
   *
   * **Conditional Updates:**
   * ```typescript
   * // Update elements that meet certain criteria
   * for (let i = 0; i < array.size(); i++) {
   *   const currentValue = array.boxedGet(i);
   *   if (shouldUpdate(currentValue)) {
   *     array.boxedSet(i, updateValue(currentValue));
   *   }
   * }
   * ```
   *
   * **Error Correction:**
   * ```typescript
   * // Fix known bad values in dataset
   * const invalidIndices = findInvalidValues(dataArray);
   * for (const index of invalidIndices) {
   *   const correctedValue = correctValue(dataArray.boxedGet(index));
   *   dataArray.boxedSet(index, correctedValue);
   * }
   * ```
   *
   * @param index The index where to store the value (must be in [0, size()))
   * @param value The boxed value to store at the specified index
   * @throws Error if index < 0 or index >= size()
   * @throws Error if value type is incompatible with array element type
   */
  public abstract boxedSet(index: number, value: Box): void;

  /**
   * Sets all elements using the provided generator function to compute each element.
   *
   * This method provides **bulk initialization** of array elements using a function
   * that computes each value based on its index. It's the most efficient way to
   * populate large arrays with computed values.
   *
   * **Generator Function Contract:**
   * - **Input**: The index of the element to compute (0 to size()-1)
   * - **Output**: The boxed value to store at that index
   * - **Purity**: Should be a pure function (same input → same output)
   * - **Performance**: Called exactly once per array element
   *
   * **Execution Characteristics:**
   * - **Sequential processing**: Elements computed in index order (0, 1, 2, ...)
   * - **Page-aware optimization**: May process entire pages at once for efficiency
   * - **Memory efficient**: Processes one page at a time to minimize memory pressure
   * - **Exception safety**: Partial completion if generator throws exception
   *
   * **Performance Benefits:**
   * - **Optimal access pattern**: Sequential writes optimize cache usage
   * - **Minimal overhead**: Direct writing to pages without individual bounds checks
   * - **Batch processing**: Page-level operations reduce per-element overhead
   * - **Memory locality**: Excellent cache performance for large arrays
   *
   * **Common Use Cases:**
   *
   * **Mathematical Sequences:**
   * ```typescript
   * // Initialize array with mathematical sequence
   * const fibonacci = HugeLongArray.newArray(1000000);
   * fibonacci.boxedSetAll(index => computeFibonacci(index));
   *
   * const primes = HugeLongArray.newArray(100000);
   * primes.boxedSetAll(index => getNthPrime(index));
   * ```
   *
   * **Graph Property Initialization:**
   * ```typescript
   * // Initialize node properties from external data source
   * const nodeAges = HugeLongArray.newArray(nodeCount);
   * nodeAges.boxedSetAll(nodeId => loadNodeAgeFromDatabase(nodeId));
   *
   * const nodeScores = HugeDoubleArray.newArray(nodeCount);
   * nodeScores.boxedSetAll(nodeId => computeInitialScore(nodeId));
   * ```
   *
   * **Algorithm Initialization:**
   * ```typescript
   * // Initialize algorithm working arrays
   * const distances = HugeDoubleArray.newArray(nodeCount);
   * distances.boxedSetAll(nodeId => nodeId === startNode ? 0.0 : Number.POSITIVE_INFINITY);
   *
   * const visited = HugeLongArray.newArray(nodeCount);
   * visited.boxedSetAll(nodeId => 0); // All nodes initially unvisited
   * ```
   *
   * **Data Transformation:**
   * ```typescript
   * // Transform data from another array
   * const originalData = loadOriginalArray();
   * const transformedData = HugeDoubleArray.newArray(originalData.size());
   * transformedData.boxedSetAll(index =>
   *   transform(originalData.boxedGet(index))
   * );
   * ```
   *
   * **Index-Based Patterns:**
   * ```typescript
   * // Create arrays with index-based patterns
   * const indexArray = HugeLongArray.newArray(size);
   * indexArray.boxedSetAll(index => index); // [0, 1, 2, 3, ...]
   *
   * const evenNumbers = HugeLongArray.newArray(size);
   * evenNumbers.boxedSetAll(index => index * 2); // [0, 2, 4, 6, ...]
   * ```
   *
   * @param gen Generator function that computes the value for each index
   */
  public abstract boxedSetAll(gen: (index: number) => Box): void;

  /**
   * Assigns the specified value to each element in the array.
   *
   * This method provides **efficient bulk assignment** of the same value to all
   * array elements. It's the fastest way to initialize or reset large arrays
   * to a uniform value.
   *
   * **Fill Behavior:**
   * - **Uniform assignment**: Every element set to exactly the same value
   * - **Type preservation**: Value type must match array element type
   * - **Null handling**: Properly handles null values in object arrays
   * - **Reference sharing**: Object arrays share references (not deep copies)
   *
   * **Performance Characteristics:**
   * - **Linear time**: O(n) where n is array size
   * - **Optimal memory pattern**: Sequential writes optimize cache usage
   * - **Page-level optimization**: May use efficient page-level fill operations
   * - **Minimal allocation**: Reuses provided value, no additional allocations
   *
   * **Memory Considerations:**
   * For object arrays, all elements will reference the same object instance:
   * - **Shared references**: Modifications to the object affect all elements
   * - **Memory efficiency**: Only one object allocated regardless of array size
   * - **Mutation safety**: Use immutable objects or create copies if needed
   *
   * **Common Use Cases:**
   *
   * **Array Initialization:**
   * ```typescript
   * // Initialize with default values
   * const scores = HugeDoubleArray.newArray(nodeCount);
   * scores.boxedFill(0.0); // All scores start at zero
   *
   * const flags = HugeLongArray.newArray(nodeCount);
   * flags.boxedFill(0); // All flags initially false/unset
   * ```
   *
   * **Array Reset:**
   * ```typescript
   * // Reset working arrays between algorithm runs
   * visitedNodes.boxedFill(0); // Mark all nodes as unvisited
   * distances.boxedFill(Number.POSITIVE_INFINITY); // Reset distances
   * predecessors.boxedFill(-1); // Clear predecessor information
   * ```
   *
   * **Sentinel Value Assignment:**
   * ```typescript
   * // Fill with sentinel values for algorithm initialization
   * const nodeIds = HugeLongArray.newArray(edgeCount);
   * nodeIds.boxedFill(-1); // Use -1 to indicate uninitialized edges
   *
   * const weights = HugeDoubleArray.newArray(edgeCount);
   * weights.boxedFill(Number.NaN); // Use NaN to indicate missing weights
   * ```
   *
   * **Default State Establishment:**
   * ```typescript
   * // Set up arrays with appropriate default states
   * const nodeStates = HugeObjectArray.newArray<NodeState>(nodeCount);
   * nodeStates.boxedFill(NodeState.INACTIVE); // All nodes start inactive
   *
   * const priorities = HugeDoubleArray.newArray(taskCount);
   * priorities.boxedFill(1.0); // All tasks have normal priority initially
   * ```
   *
   * **Performance Testing:**
   * ```typescript
   * // Quickly create arrays with known values for testing
   * const testData = HugeLongArray.newArray(LARGE_SIZE);
   * testData.boxedFill(42); // Every element has value 42
   *
   * // Verify algorithm correctness
   * runAlgorithm(testData);
   * assertEqual(testData.boxedGet(randomIndex), expectedResult);
   * ```
   *
   * @param value The value to assign to every element in the array
   */
  public abstract boxedFill(value: Box): void;

  /**
   * Returns the contents of this array as a flat primitive array.
   *
   * This method provides **interoperability** with standard JavaScript arrays and
   * external libraries that expect traditional array structures. It flattens the
   * paged HugeArray structure into a single contiguous array.
   *
   * **Return Value Characteristics:**
   * - **Flat structure**: Single array containing all elements in order
   * - **Type preservation**: Array type matches underlying page type
   * - **Potential sharing**: Returned array might share memory with HugeArray
   * - **Complete data**: Contains all elements from index 0 to size()-1
   *
   * **Memory Sharing Warning:**
   * The returned array might be **shared** with the HugeArray's internal storage:
   * - **Modifications visible**: Changes to returned array may affect HugeArray
   * - **Bidirectional**: Changes to HugeArray may affect returned array
   * - **Implementation dependent**: Sharing behavior varies by implementation
   * - **Defensive copying**: Create copy if isolation is required
   *
   * **Size Limitations:**
   * JavaScript arrays are limited to 2^32-1 elements:
   * - **Large arrays**: Will throw `Error` if array exceeds JavaScript limits
   * - **Memory requirements**: Requires contiguous memory for entire array
   * - **Performance impact**: Very large arrays may cause memory pressure
   *
   * **Performance Considerations:**
   * - **Copy cost**: May require copying all data (depends on implementation)
   * - **Memory spike**: Temporarily doubles memory usage during copy
   * - **Allocation size**: Large contiguous allocation may fail
   * - **GC pressure**: Large array creation puts pressure on garbage collector
   *
   * **Use Cases:**
   *
   * **Library Interoperability:**
   * ```typescript
   * // Pass data to external library expecting standard arrays
   * const hugeResults = algorithm.computeResults();
   * const standardArray = hugeResults.toArray();
   * externalLibrary.processData(standardArray);
   * ```
   *
   * **Data Export:**
   * ```typescript
   * // Export data for external consumption
   * const nodeProperties = graph.getNodeProperties();
   * const exportData = nodeProperties.toArray();
   * saveToFile(exportData, 'node_properties.json');
   * ```
   *
   * **Algorithm Integration:**
   * ```typescript
   * // Use with algorithms that expect standard arrays
   * const distances = dijkstra.computeDistances();
   * const distanceArray = distances.toArray();
   * const sorted = distanceArray.sort((a, b) => a - b);
   * ```
   *
   * **Testing and Debugging:**
   * ```typescript
   * // Convert to standard array for easier debugging
   * const testResults = smallTestArray.toArray();
   * console.log('Test results:', testResults);
   * assertEqual(testResults[0], expectedFirstValue);
   * ```
   *
   * **Memory-Safe Usage:**
   * ```typescript
   * // Create defensive copy to avoid sharing issues
   * const originalArray = hugeArray.toArray();
   * const safeCopy = originalArray.slice(); // Independent copy
   * modifyArray(safeCopy); // Won't affect hugeArray
   * ```
   *
   * @returns A flat array containing all elements from this HugeArray
   * @throws Error if the array size exceeds JavaScript array limits
   */
  public abstract toArray(): Array;

  /**
   * Copies data from a standard array into a specific slice of this HugeArray.
   *
   * This method provides **efficient bulk loading** from standard JavaScript arrays
   * into specific regions of HugeArrays. It's essential for incremental data loading
   * and integrating data from external sources.
   *
   * **Copy Operation:**
   * - **Source**: Standard JavaScript array (any compatible type)
   * - **Destination**: This HugeArray, from `sliceStart` to `sliceEnd`
   * - **Direction**: Standard array → HugeArray (input to huge storage)
   * - **Bounds**: Respects both source array length and destination slice bounds
   *
   * **Slice Semantics:**
   * - **Range**: Half-open interval `[sliceStart, sliceEnd)`
   * - **Target size**: Maximum `sliceEnd - sliceStart` elements copied
   * - **Source limitation**: Limited by source array length
   * - **Actual count**: Returns number of elements actually copied
   *
   * **Copying Behavior:**
   * - **Sequential copying**: Elements copied in order from source[0], source[1], ...
   * - **Destination mapping**: Copied to slice[sliceStart], slice[sliceStart+1], ...
   * - **Early termination**: Stops when source exhausted OR slice filled
   * - **Page-aware optimization**: Efficient copying across page boundaries
   *
   * **Performance Characteristics:**
   * - **Linear time**: O(min(sourceLength, sliceSize)) copying time
   * - **Page optimization**: Bulk copying within pages when possible
   * - **Memory efficient**: Minimal intermediate allocations
   * - **Cache friendly**: Sequential access patterns optimize performance
   *
   * **Return Value:**
   * Returns the **actual number of elements copied**, which may be less than
   * expected if:
   * - Source array is shorter than available slice space
   * - Slice range is smaller than source array
   * - Early termination due to bounds or other constraints
   *
   * **Use Cases:**
   *
   * **Incremental Data Loading:**
   * ```typescript
   * // Load data in chunks from external source
   * const hugeArray = HugeLongArray.newArray(TOTAL_SIZE);
   * let position = 0;
   *
   * for (const dataChunk of dataSource) {
   *   const copied = hugeArray.copyFromArrayIntoSlice(
   *     dataChunk,
   *     position,
   *     position + dataChunk.length
   *   );
   *   position += copied;
   * }
   * ```
   *
   * **Parallel Data Loading:**
   * ```typescript
   * // Load different sections from different sources
   * const nodeProperties = HugeLongArray.newArray(nodeCount);
   *
   * const personalData = loadPersonalData();
   * const professionalData = loadProfessionalData();
   *
   * const personalCount = nodeProperties.copyFromArrayIntoSlice(
   *   personalData, 0, personalData.length
   * );
   * const professionalCount = nodeProperties.copyFromArrayIntoSlice(
   *   professionalData, personalCount, personalCount + professionalData.length
   * );
   * ```
   *
   * **Data Patching:**
   * ```typescript
   * // Update specific regions with corrected data
   * const corrections = loadCorrectionData();
   * const startIndex = findCorruptedRegionStart();
   * const endIndex = startIndex + corrections.length;
   *
   * const patchedCount = dataArray.copyFromArrayIntoSlice(
   *   corrections, startIndex, endIndex
   * );
   * console.log(`Patched ${patchedCount} elements`);
   * ```
   *
   * **Algorithm Result Integration:**
   * ```typescript
   * // Integrate results from external algorithm
   * const externalResults = externalAlgorithm.compute(inputData);
   * const resultArray = HugeDoubleArray.newArray(nodeCount);
   *
   * const integratedCount = resultArray.copyFromArrayIntoSlice(
   *   externalResults, 0, externalResults.length
   * );
   *
   * if (integratedCount < externalResults.length) {
   *   console.warn(`Only integrated ${integratedCount} of ${externalResults.length} results`);
   * }
   * ```
   *
   * @param source Standard array containing source data to copy
   * @param sliceStart Starting index in this HugeArray (inclusive)
   * @param sliceEnd Ending index in this HugeArray (exclusive)
   * @returns Number of elements actually copied from source to slice
   */
  public copyFromArrayIntoSlice(source: Array, sliceStart: number, sliceEnd: number): number {
    let sourceIndex = 0;

    try {
      const cursor = this.initCursor(this.newCursor(), sliceStart, sliceEnd);

      try {
        const sourceLength = this.getArrayLength(source);

        while (cursor.next() && sourceIndex < sourceLength) {
          const copyLength = Math.min(
            cursor.limit - cursor.offset, // Available space in cursor buffer
            sourceLength - sourceIndex    // Remaining elements in source
          );

          // Copy data from source to cursor's current page
          this.arrayCopy(source, sourceIndex, cursor.array!, cursor.offset, copyLength);
          sourceIndex += copyLength;
        }
      } finally {
        cursor.close();
      }
    } catch (error) {
      // If cursor creation/initialization fails, return elements copied so far
      console.warn('Error in copyFromArrayIntoSlice:', error);
    }

    return sourceIndex;
  }

  /**
   * Returns a string representation of this array.
   *
   * This method provides **debugging and inspection** capability for HugeArrays,
   * formatting the contents in a readable way similar to standard JavaScript
   * array toString() behavior.
   *
   * **Format Structure:**
   * - **Empty arrays**: Returns `"[]"`
   * - **Non-empty arrays**: Returns `"[element1, element2, element3, ...]"`
   * - **Element separation**: Elements separated by `", "` (comma + space)
   * - **Bracket enclosure**: Square brackets indicate array boundaries
   *
   * **Implementation Strategy:**
   * - **Cursor iteration**: Uses HugeCursor for efficient traversal
   * - **Page-by-page processing**: Processes data one page at a time
   * - **String building**: Accumulates string representation incrementally
   * - **Memory efficient**: Doesn't convert entire array to standard array first
   *
   * **Performance Warnings:**
   * - **Large arrays**: Can be extremely slow and memory-intensive for huge arrays
   * - **String allocation**: May require large string allocations
   * - **Not recommended**: Generally not suitable for production use with large data
   * - **Debugging only**: Primarily intended for small arrays and debugging
   *
   * **Memory Considerations:**
   * - **String size**: Output string size proportional to array size
   * - **Intermediate buffers**: StringBuilder may require significant memory
   * - **GC pressure**: Large string creation puts pressure on garbage collector
   *
   * @returns String representation of array contents in format "[elem1, elem2, ...]"
   */
  public toString(): string {
    if (this.size() === 0) {
      return '[]';
    }

    const sb: string[] = [];
    sb.push('[');

    try {
      const cursor = this.initCursor(this.newCursor());

      try {
        while (cursor.next()) {
          const array = cursor.array!;

          for (let i = cursor.offset; i < cursor.limit; ++i) {
            sb.push(String(this.getArrayElement(array, i)));
            sb.push(', ');
          }
        }
      } finally {
        cursor.close();
      }
    } catch (error) {
      sb.push('Error: ', (error as Error).message);
    }

    // Remove trailing comma and space, add closing bracket
    if (sb.length > 1) {
      sb.pop(); // Remove last ', '
      sb[sb.length - 1] = sb[sb.length - 1].slice(0, -1); // Remove comma from last element
    }
    sb.push(']');

    return sb.join('');
  }

  // Implementation of HugeCursorSupport interface
  public abstract newCursor(): HugeCursor<Array>;

  public initCursor(cursor: HugeCursor<Array>): HugeCursor<Array>;
  public initCursor(cursor: HugeCursor<Array>, start: number, end: number): HugeCursor<Array>;
  public initCursor(cursor: HugeCursor<Array>, start?: number, end?: number): HugeCursor<Array> {
    if (start !== undefined && end !== undefined) {
      return defaultInitCursor(this, cursor, start, end);
    } else {
      return defaultInitCursorFull(cursor);
    }
  }

  /**
   * Internal helper method to dump array contents to a standard JavaScript array.
   *
   * This is the **implementation backbone** for the `toArray()` method, handling
   * the complex logic of flattening paged data into a contiguous array structure.
   *
   * **Size Validation:**
   * Ensures the array size fits within JavaScript array limitations:
   * - **32-bit limit**: JavaScript arrays limited to 2^32-1 elements
   * - **Integer overflow**: Checks for size values that exceed integer range
   * - **Memory feasibility**: Large arrays may not fit in available memory
   *
   * **Copying Strategy:**
   * - **Page-by-page**: Iterates through pages using cursor for efficiency
   * - **Bulk copying**: Uses `arrayCopy()` for efficient data transfer
   * - **Position tracking**: Maintains position in destination array
   * - **Bounds safety**: Ensures no buffer overruns during copying
   *
   * @param componentClass The class representing the array component type
   * @returns A new standard array containing all elements from this HugeArray
   * @throws Error if array size exceeds JavaScript array limits
   */
  protected dumpToArray(componentClass: new (length: number) => Array): Array {
    const fullSize = this.size();

    // Check if size fits in JavaScript array limits
    if (fullSize !== Math.floor(fullSize) || fullSize < 0 || fullSize > 0x7FFFFFFF) {
      throw new Error(`Array with ${fullSize} elements does not fit into a JavaScript array`);
    }

    const size = Math.floor(fullSize);
    const result = new componentClass(size);
    let pos = 0;

    try {
      const cursor = this.initCursor(this.newCursor());

      try {
        while (cursor.next()) {
          const array = cursor.array!;
          const length = cursor.limit - cursor.offset;

          // Copy page data to result array
          this.arrayCopy(array, cursor.offset, result, pos, length);
          pos += length;
        }
      } finally {
        cursor.close();
      }
    } catch (error) {
      throw new Error(`Failed to dump array: ${(error as Error).message}`);
    }

    return result;
  }

  // Helper methods for type-safe array operations
  protected abstract getArrayLength(array: Array): number;
  protected abstract getArrayElement(array: Array, index: number): Box;
  protected abstract arrayCopy(source: Array, sourceIndex: number, dest: Array, destIndex: number, length: number): void;
}
