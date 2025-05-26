import { HugeCursor } from './HugeCursor';

/**
 * Interface defining cursor support capabilities for HugeArray implementations.
 *
 * This interface establishes the **contract** that all HugeArray variants must implement
 * to provide cursor-based iteration. It serves as the **bridge between array storage and
 * cursor iteration**, defining how cursors are created, initialized, and configured for
 * different iteration scenarios.
 *
 * **Design Philosophy:**
 * - **Unified iteration model**: All HugeArray types provide consistent cursor access
 * - **Lazy initialization**: Cursors are created in invalid state, positioned on demand
 * - **Range flexibility**: Support both full array and range-based iteration
 * - **Resource efficiency**: Cursor reuse patterns to minimize allocation overhead
 * - **Fail-fast validation**: Early parameter validation to catch errors quickly
 *
 * **Cursor Lifecycle Management:**
 * ```
 * Create → Initialize → Position → Iterate → Close
 *    ↓         ↓          ↓         ↓        ↓
 * newCursor  initCursor  next()   process  close()
 * (invalid)  (invalid)  (valid)   (valid)  (invalid)
 * ```
 *
 * **Implementation Strategy:**
 * This interface is implemented by all HugeArray variants:
 * - `HugeLongArray`: Provides cursors over `Int32Array` pages
 * - `HugeDoubleArray`: Provides cursors over `Float64Array` pages
 * - `HugeObjectArray<T>`: Provides cursors over `T[]` pages
 * - `HugeAtomicLongArray`: Provides cursors with atomic access semantics
 *
 * **Performance Characteristics:**
 * - **Cursor creation**: O(1) - minimal object allocation
 * - **Range initialization**: O(1) - simple arithmetic for page calculations
 * - **Parameter validation**: O(1) - basic bounds checking
 * - **Memory overhead**: Minimal - just cursor state objects
 *
 * **Thread Safety:**
 * - **Array access**: Multiple cursors can safely read the same array
 * - **Cursor isolation**: Each cursor maintains independent state
 * - **Range safety**: Concurrent range iterations don't interfere
 * - **No shared state**: No mutable shared state between cursors
 *
 * **Integration with Graph Algorithms:**
 * Most graph algorithms follow this pattern:
 * ```typescript
 * // Algorithm processes node properties
 * const cursor = nodeProperties.newCursor();
 * try {
 *   array.initCursor(cursor);
 *   while (cursor.next()) {
 *     for (let i = cursor.offset; i < cursor.limit; i++) {
 *       const value = cursor.array![i];
 *       // Process value in algorithm...
 *     }
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 */
export interface HugeCursorSupport<Array> {
  /**
   * Returns the logical length of this array in elements.
   *
   * This represents the **total number of elements** across all pages in the HugeArray,
   * providing the same semantic meaning as `array.length` for standard JavaScript arrays.
   * The size determines the valid index range: `[0, size())`.
   *
   * **Size vs Capacity:**
   * - **Size**: Number of logically valid elements (what this method returns)
   * - **Capacity**: Physical storage space available (may be larger than size)
   * - **In most HugeArrays**: Size equals capacity for fully populated arrays
   *
   * **Index Range Implications:**
   * - **Valid indices**: `0` to `size() - 1` (inclusive)
   * - **Invalid access**: Any index ≥ `size()` is out of bounds
   * - **Empty array**: `size() === 0` means no valid indices exist
   *
   * **Performance Note:**
   * This should be an O(1) operation. HugeArray implementations typically cache
   * the size rather than computing it by summing page lengths.
   *
   * **Usage in Algorithms:**
   * ```typescript
   * // Determine iteration bounds
   * const totalElements = array.size();
   * const elementsPerThread = Math.ceil(totalElements / threadCount);
   *
   * // Validate access patterns
   * if (requestedIndex >= array.size()) {
   *   throw new Error('Index out of bounds');
   * }
   * ```
   *
   * @returns The total number of elements in this array
   */
  size(): number;

  /**
   * Creates a new cursor for iterating over this array.
   *
   * **Critical State Warning:**
   * The returned cursor is in an **invalid, unpositioned state**. You MUST call
   * either `initCursor()` to configure it and then `next()` to position it before
   * accessing any data fields (`array`, `offset`, `limit`, etc.).
   *
   * **Resource Management:**
   * Each call creates a new cursor instance. For performance-critical code that
   * iterates frequently, consider reusing cursors via the `initCursor()` methods
   * rather than creating new ones repeatedly.
   *
   * **Empty Array Behavior:**
   * Creating a cursor for an empty array (where `size() === 0`) has **undefined behavior**
   * and may result in exceptions when used. Always check `size() > 0` before creating
   * cursors if there's any possibility the array might be empty.
   *
   * **Implementation Requirements:**
   * Implementations should:
   * - Create cursor with minimal overhead (avoid expensive initialization)
   * - Leave cursor in clearly invalid state to catch misuse early
   * - Return cursor suitable for the specific array type (pages of correct type)
   *
   * **Typical Usage Pattern:**
   * ```typescript
   * // Create and immediately initialize
   * const cursor = array.newCursor();
   * try {
   *   array.initCursor(cursor); // Configure for full array
   *   while (cursor.next()) {   // Position to valid data
   *     // Process cursor.array[cursor.offset : cursor.limit]
   *   }
   * } finally {
   *   cursor.close(); // Essential for resource cleanup
   * }
   * ```
   *
   * @returns A new, uninitialized cursor for this array
   * @throws Error For empty arrays (undefined behavior)
   */
  newCursor(): HugeCursor<Array>;

  /**
   * Initializes the provided cursor to iterate over the complete array.
   *
   * This is the **default initialization method** that configures the cursor to
   * visit every element in the array from index 0 to `size() - 1`. After calling
   * this method, you must still call `cursor.next()` to position the cursor to
   * the first valid page of data.
   *
   * **Cursor State After Initialization:**
   * - **Range configured**: Set to iterate from 0 to `size()`
   * - **Still unpositioned**: Must call `next()` to access data
   * - **Ready for iteration**: All internal state properly configured
   * - **Previous state cleared**: Any previous range settings are overwritten
   *
   * **Reference Identity:**
   * This method returns the **exact same cursor instance** that was passed in
   * (reference equality: `initCursor(cursor) === cursor`). This enables method
   * chaining and confirms that the operation modifies the existing cursor rather
   * than creating a new one.
   *
   * **Performance Characteristics:**
   * - **O(1) operation**: Simple range configuration with no data processing
   * - **No allocation**: Reuses existing cursor, no new objects created
   * - **Cache-friendly**: Sets up iteration for optimal memory access patterns
   *
   * **Empty Array Behavior:**
   * Initializing a cursor for an empty array has **undefined behavior**. Some
   * implementations may throw exceptions, others may return a cursor that
   * immediately returns `false` from `next()`.
   *
   * **Method Chaining Example:**
   * ```typescript
   * // Fluent API usage
   * const hasData = array.newCursor()
   *   |> array.initCursor(#)  // Configure for full iteration
   *   |> #.next();            // Position to first page
   *
   * // Traditional usage
   * const cursor = array.newCursor();
   * array.initCursor(cursor);
   * const hasData = cursor.next();
   * ```
   *
   * @param cursor The cursor to initialize (will be modified in place)
   * @returns The same cursor instance, now configured for full array iteration
   * @throws Error For empty arrays (undefined behavior)
   */
  initCursor(cursor: HugeCursor<Array>): HugeCursor<Array>;

  /**
   * Initializes the provided cursor to iterate over a specific range within the array.
   *
   * This enables **range-based iteration** for algorithms that only need to process
   * a subset of the array data. This is essential for:
   * - **Parallel processing**: Each thread processes a disjoint range
   * - **Chunked algorithms**: Process large arrays in memory-manageable pieces
   * - **Incremental processing**: Handle data in stages or batches
   * - **Performance optimization**: Skip ranges known to be empty or irrelevant
   *
   * **Range Semantics:**
   * Uses **half-open interval notation** `[start, end)`:
   * - `start`: First index to include (inclusive)
   * - `end`: First index to exclude (exclusive)
   * - **Element count**: `end - start`
   * - **Empty range**: When `start === end`
   *
   * **Parameter Validation:**
   * The method performs comprehensive bounds checking:
   * - `start` must be in range `[0, size()]`
   * - `end` must be in range `[start, size()]`
   * - Both parameters must be non-negative
   * - `end` cannot be less than `start`
   *
   * **Edge Cases:**
   * ```typescript
   * // Valid edge cases
   * initCursor(cursor, 0, 0);           // Empty range at start
   * initCursor(cursor, size(), size()); // Empty range at end
   * initCursor(cursor, 0, size());      // Full array (same as initCursor(cursor))
   * initCursor(cursor, 10, 10);         // Empty range in middle
   *
   * // Invalid cases (will throw)
   * initCursor(cursor, -1, 10);         // Negative start
   * initCursor(cursor, 0, size() + 1);  // End beyond array
   * initCursor(cursor, 10, 5);          // End before start
   * ```
   *
   * **Parallel Processing Example:**
   * ```typescript
   * // Divide array among multiple threads
   * const totalSize = array.size();
   * const threadsCount = 4;
   * const chunkSize = Math.ceil(totalSize / threadsCount);
   *
   * for (let t = 0; t < threadsCount; t++) {
   *   const start = t * chunkSize;
   *   const end = Math.min(start + chunkSize, totalSize);
   *
   *   // Each thread gets its own cursor and range
   *   const cursor = array.newCursor();
   *   array.initCursor(cursor, start, end);
   *
   *   processRangeInThread(cursor, t);
   * }
   * ```
   *
   * **Memory-Conscious Processing:**
   * ```typescript
   * // Process huge array in manageable chunks
   * const CHUNK_SIZE = 1_000_000; // 1M elements per chunk
   * const cursor = array.newCursor();
   *
   * for (let start = 0; start < array.size(); start += CHUNK_SIZE) {
   *   const end = Math.min(start + CHUNK_SIZE, array.size());
   *
   *   array.initCursor(cursor, start, end);
   *   while (cursor.next()) {
   *     // Process this chunk
   *     processChunk(cursor);
   *   }
   *
   *   // Optionally trigger GC between chunks
   *   if (start % (10 * CHUNK_SIZE) === 0) {
   *     performGarbageCollection();
   *   }
   * }
   * ```
   *
   * **Performance Impact:**
   * Range iteration can provide significant performance benefits:
   * - **Reduced I/O**: Skip pages outside the range entirely
   * - **Better cache usage**: Work on smaller, cache-friendly data sets
   * - **Parallel scaling**: Linear speedup with number of threads
   * - **Memory pressure**: Smaller working sets reduce GC pressure
   *
   * @param cursor The cursor to initialize (will be modified in place)
   * @param start First index to include in iteration (inclusive)
   * @param end First index to exclude from iteration (exclusive)
   * @returns The same cursor instance, now configured for range iteration
   * @throws Error if start < 0 or start > size()
   * @throws Error if end < start or end > size()
   * @throws Error for empty arrays (undefined behavior)
   */
  initCursor(cursor: HugeCursor<Array>, start: number, end: number): HugeCursor<Array>;
}

/**
 * Default implementation of range-based cursor initialization with validation.
 *
 * This provides a **reference implementation** that HugeArray classes can use
 * directly or as a template for their own validation logic. It demonstrates
 * the complete parameter validation and error handling expected by the interface.
 *
 * **Validation Strategy:**
 * 1. **Start bounds**: Ensure start is within `[0, size()]`
 * 2. **End bounds**: Ensure end is within `[start, size()]`
 * 3. **Ordering**: Ensure `start ≤ end` (allow empty ranges)
 * 4. **Delegate**: Call cursor's `setRange(start, end)` method
 * 5. **Return**: Return same cursor instance for method chaining
 *
 * **Error Messages:**
 * Provides descriptive error messages that include:
 * - Expected range bounds
 * - Actual invalid value provided
 * - Context about which parameter failed validation
 *
 * @param support The HugeCursorSupport instance (for size() access)
 * @param cursor The cursor to initialize
 * @param start Starting index (inclusive)
 * @param end Ending index (exclusive)
 * @returns The initialized cursor
 * @throws Error with descriptive message for invalid parameters
 */
export function defaultInitCursor<Array>(
  support: HugeCursorSupport<Array>,
  cursor: HugeCursor<Array>,
  start: number,
  end: number
): HugeCursor<Array> {
  const size = support.size();

  if (start < 0 || start > size) {
    throw new Error(`start expected to be in [0 : ${size}] but got ${start}`);
  }

  if (end < start || end > size) {
    throw new Error(`end expected to be in [${start} : ${size}] but got ${end}`);
  }

  cursor.setRange(start, end);
  return cursor;
}

/**
 * Default implementation of full-array cursor initialization.
 *
 * Simple wrapper that calls the cursor's `setRange()` method with no parameters,
 * configuring it for complete array iteration.
 *
 * @param cursor The cursor to initialize
 * @returns The initialized cursor
 */
export function defaultInitCursorFull<Array>(
  cursor: HugeCursor<Array>
): HugeCursor<Array> {
  cursor.setRange();
  return cursor;
}
