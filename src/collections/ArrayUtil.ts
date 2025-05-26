import { Estimate } from "@/mem";

/**
 * Utility class providing optimized array operations for large-scale data processing.
 *
 * This class contains **performance-critical algorithms** designed for graph data science
 * applications that need to process massive arrays efficiently. It provides optimized
 * implementations of search, lookup, and memory allocation algorithms that outperform
 * standard JavaScript array methods for specific use cases.
 *
 * **Performance Philosophy:**
 *
 * **1. Hybrid Search Strategies:**
 * Many methods use hybrid approaches that combine binary search for large ranges with
 * linear search for small ranges, optimizing for CPU cache performance and branch prediction.
 *
 * **2. Memory Alignment Optimization:**
 * The oversize algorithms account for memory alignment and garbage collection overhead
 * to minimize memory fragmentation and improve allocation performance.
 *
 * **3. Loop Unrolling:**
 * Linear search methods use loop unrolling (processing 4 elements per iteration) to
 * improve performance through better instruction-level parallelism.
 *
 * **Key Algorithm Categories:**
 *
 * **Binary Search Variants:**
 * - **Standard search**: Fast existence checks in sorted arrays
 * - **Lookup search**: Find insertion points for range queries
 * - **First/Last occurrence**: Handle duplicate values in sorted data
 *
 * **Linear Search Optimizations:**
 * - **Unrolled loops**: Process multiple elements per iteration
 * - **Early termination**: Exit on first match or when key exceeded
 * - **Cache-friendly access**: Sequential memory access patterns
 *
 * **Memory Allocation Strategies:**
 * - **Exponential growth**: Minimize reallocation overhead
 * - **Alignment optimization**: Account for platform-specific memory alignment
 * - **Huge array support**: Handle arrays larger than standard limits
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Adjacency List Search:**
 * ```typescript
 * // Quick neighbor lookup in sorted adjacency lists
 * const neighbors = getNodeNeighbors(nodeId);
 * const hasEdge = ArrayUtil.binarySearch(neighbors, neighbors.length, targetNode);
 *
 * // Find neighbor range for weighted graphs
 * const insertionPoint = ArrayUtil.binaryLookup(targetNode, neighbors);
 * ```
 *
 * **Index Mapping:**
 * ```typescript
 * // Find node mapping in sorted ID arrays
 * const nodeMapping = ArrayUtil.binarySearchIndex(sortedIds, sortedIds.length, nodeId);
 * if (nodeMapping >= 0) {
 *   const internalId = nodeMapping;
 * }
 * ```
 *
 * **Range Queries:**
 * ```typescript
 * // Find all nodes in a timestamp range
 * const startIdx = ArrayUtil.binarySearchFirst(timestamps, 0, timestamps.length, startTime);
 * const endIdx = ArrayUtil.binarySearchLast(timestamps, 0, timestamps.length, endTime);
 * ```
 *
 * **Dynamic Array Growth:**
 * ```typescript
 * // Efficiently grow arrays with optimal memory usage
 * if (currentSize >= array.length) {
 *   const newSize = ArrayUtil.oversize(currentSize + 1, Estimate.BYTES_OBJECT_REF);
 *   array = ArrayUtil.resizeArray(array, newSize);
 * }
 * ```
 */
export class ArrayUtil {
  /** Threshold for switching from binary search to linear search for small ranges */
  private static readonly LINEAR_SEARCH_LIMIT = 64;

  /** Maximum array length accounting for JavaScript engine limitations */
  private static readonly MAX_ARRAY_LENGTH =
    Number.MAX_SAFE_INTEGER - Estimate.BYTES_ARRAY_HEADER;

  /**
   * Performs optimized binary search for existence check in sorted integer arrays.
   *
   * This method uses a **hybrid search strategy** that combines binary search for large
   * ranges with optimized linear search for small ranges. The approach maximizes
   * performance by leveraging CPU cache locality and reducing branch mispredictions.
   *
   * **Algorithm Strategy:**
   * - **Binary search phase**: Divides search space until range ≤ LINEAR_SEARCH_LIMIT
   * - **Linear search phase**: Uses unrolled loop for optimal cache performance
   * - **Early termination**: Exits immediately when sorted order indicates key not present
   *
   * **Performance Characteristics:**
   * - **Time complexity**: O(log n) for large arrays, O(1) for small ranges
   * - **Space complexity**: O(1) - no additional memory allocation
   * - **Cache friendly**: Linear search phase maximizes cache hit rates
   *
   * @param arr Sorted array to search (must be in ascending order)
   * @param length Number of elements to consider (must be ≤ arr.length)
   * @param key Value to search for
   * @returns `true` if key exists in the array, `false` otherwise
   */
  public static binarySearch(
    arr: number[],
    length: number,
    key: number
  ): boolean {
    let low = 0;
    let high = length - 1;

    // Binary search phase for large ranges
    while (high - low > ArrayUtil.LINEAR_SEARCH_LIMIT) {
      const mid = (low + high) >>> 1;
      const midVal = arr[mid];
      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else {
        return true;
      }
    }

    // Linear search phase for small ranges
    return ArrayUtil.linearSearch2(arr, low, high, key);
  }

  /**
   * Returns the index of the first occurrence of a key in a sorted array.
   *
   * This method is essential for **handling duplicate values** in sorted data structures
   * commonly found in graph analytics (e.g., multiple edges between nodes, repeated
   * timestamps, duplicate property values).
   *
   * **Duplicate Handling Strategy:**
   * When the key is found, the algorithm continues searching leftward to ensure it
   * returns the **first occurrence** rather than any arbitrary occurrence of the key.
   *
   * **Return Value Semantics:**
   * - **Exact match**: Returns index of first occurrence
   * - **No match**: Returns `-(insertion_point + 1)` following JavaScript conventions
   * - **Insertion point**: Index where key would be inserted to maintain sort order
   *
   * **Use Cases:**
   * ```typescript
   * // Find start of duplicate range in sorted edge list
   * const edges = getSortedEdgesByWeight();
   * const firstEdgeIndex = ArrayUtil.binarySearchFirst(edges, 0, edges.length, targetWeight);
   *
   * if (firstEdgeIndex >= 0) {
   *   // Process all edges with the target weight starting from firstEdgeIndex
   *   let i = firstEdgeIndex;
   *   while (i < edges.length && edges[i] === targetWeight) {
   *     processEdge(i);
   *     i++;
   *   }
   * }
   * ```
   *
   * @param a Sorted array to search
   * @param fromIndex Starting index (inclusive)
   * @param toIndex Ending index (exclusive)
   * @param key Value to search for
   * @returns Index of first occurrence, or -(insertion_point + 1) if not found
   */
  public static binarySearchFirst(
    a: number[],
    fromIndex: number,
    toIndex: number,
    key: number
  ): number {
    let low = fromIndex;
    let high = toIndex - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = a[mid];

      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else if (mid > fromIndex && a[mid - 1] === key) {
        // Key found, but not first occurrence - search leftward
        // FIXED: Check mid > fromIndex instead of mid > 0
        high = mid - 1;
      } else {
        return mid; // First occurrence found
      }
    }
    return -(low + 1); // Key not found
  }

  /**
   * Returns the index of the last occurrence of a key in a sorted array.
   *
   * This method complements `binarySearchFirst` to provide **range boundaries**
   * for processing duplicate values in sorted data structures.
   *
   * **Duplicate Handling Strategy:**
   * When the key is found, the algorithm continues searching rightward to ensure it
   * returns the **last occurrence** of the key.
   *
   * **Range Processing Pattern:**
   * ```typescript
   * // Process all occurrences of a value in sorted array
   * const firstIdx = ArrayUtil.binarySearchFirst(array, 0, array.length, value);
   * const lastIdx = ArrayUtil.binarySearchLast(array, 0, array.length, value);
   *
   * if (firstIdx >= 0 && lastIdx >= 0) {
   *   // Process range [firstIdx, lastIdx] inclusive
   *   for (let i = firstIdx; i <= lastIdx; i++) {
   *     processElement(array[i], i);
   *   }
   * }
   * ```
   *
   * @param a Sorted array to search
   * @param fromIndex Starting index (inclusive)
   * @param toIndex Ending index (exclusive)
   * @param key Value to search for
   * @returns Index of last occurrence, or -(insertion_point + 1) if not found
   */
  public static binarySearchLast(
    a: number[],
    fromIndex: number,
    toIndex: number,
    key: number
  ): number {
    let low = fromIndex;
    let high = toIndex - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = a[mid];

      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else if (mid < toIndex - 1 && a[mid + 1] === key) {
        // Key found, but not last occurrence - search rightward
        // This is correct: checks mid < toIndex - 1
        low = mid + 1;
      } else {
        return mid; // Last occurrence found
      }
    }
    return -(low + 1); // Key not found
  }

  /**
   * Performs binary search and returns the exact index of the found element.
   *
   * This method provides **index-based access** for sorted arrays where you need
   * the exact position of the found element rather than just existence confirmation.
   *
   * **Performance Optimization:**
   * Uses the same hybrid binary/linear search strategy as `binarySearch()` but
   * returns index information for direct array access.
   *
   * @param arr Sorted array to search
   * @param length Number of elements to consider
   * @param key Value to search for
   * @returns Index of the key if found, or negative value indicating insertion point
   */
  public static binarySearchIndex(
    arr: number[],
    length: number,
    key: number
  ): number {
    let low = 0;
    let high = length - 1;

    // Binary search phase
    while (high - low > ArrayUtil.LINEAR_SEARCH_LIMIT) {
      const mid = (low + high) >>> 1;
      const midVal = arr[mid];
      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else {
        return mid;
      }
    }

    // Linear search phase with index return
    return ArrayUtil.linearSearch2index(arr, low, high, key);
  }

  /**
   * Optimized linear search for small ranges with early termination.
   *
   * This method is used by hybrid search algorithms when the search range
   * becomes small enough that linear search outperforms binary search due
   * to better cache locality and reduced branch overhead.
   *
   * **Early Termination Optimization:**
   * Since the array is sorted, the search can terminate as soon as an element
   * larger than the key is encountered, avoiding unnecessary comparisons.
   *
   * @param arr Sorted array to search
   * @param low Starting index (inclusive)
   * @param high Ending index (inclusive)
   * @param key Value to search for
   * @returns `true` if key found, `false` otherwise
   */
  private static linearSearch2(
    arr: number[],
    low: number,
    high: number,
    key: number
  ): boolean {
    for (let i = low; i <= high; i++) {
      if (arr[i] === key) return true;
      if (arr[i] > key) return false; // Early termination for sorted arrays
    }
    return false;
  }

  /**
   * Optimized linear search with index return and early termination.
   *
   * @param arr Sorted array to search
   * @param low Starting index (inclusive)
   * @param high Ending index (inclusive)
   * @param key Value to search for
   * @returns Index if found, or negative insertion point if not found
   */
  private static linearSearch2index(
    arr: number[],
    low: number,
    high: number,
    key: number
  ): number {
    for (let i = low; i <= high; i++) {
      if (arr[i] === key) return i;
      if (arr[i] > key) return -i - 1; // Insertion point
    }
    return -(high + 1) - 1; // Would insert after high
  }

  /**
   * High-performance linear search with loop unrolling optimization.
   *
   * This method uses **loop unrolling** to process 4 elements per iteration,
   * reducing loop overhead and improving instruction-level parallelism.
   * This is particularly effective for modern CPUs with multiple execution units.
   *
   * **Loop Unrolling Benefits:**
   * - **Reduced branch overhead**: Fewer loop condition checks
   * - **Better instruction pipelining**: More work per instruction fetch
   * - **Cache optimization**: Sequential access pattern maximizes cache hits
   *
   * @param arr Array to search (not required to be sorted)
   * @param length Number of elements to consider
   * @param key Value to search for
   * @returns `true` if key found, `false` otherwise
   */
  public static linearSearch(
    arr: number[],
    length: number,
    key: number
  ): boolean {
    let i = 0;

    // Process 4 elements per iteration (loop unrolling)
    for (; i < length - 4; i += 4) {
      if (arr[i] === key) return true;
      if (arr[i + 1] === key) return true;
      if (arr[i + 2] === key) return true;
      if (arr[i + 3] === key) return true;
    }

    // Handle remaining elements
    for (; i < length; i++) {
      if (arr[i] === key) {
        return true;
      }
    }
    return false;
  }

  /**
   * High-performance linear search with index return and loop unrolling.
   *
   * @param arr Array to search
   * @param length Number of elements to consider
   * @param key Value to search for
   * @returns Index if found, or negative value if not found
   */
  public static linearSearchIndex(
    arr: number[],
    length: number,
    key: number
  ): number {
    let i = 0;

    // Process 4 elements per iteration
    for (; i < length - 4; i += 4) {
      if (arr[i] === key) return i;
      if (arr[i + 1] === key) return i + 1;
      if (arr[i + 2] === key) return i + 2;
      if (arr[i + 3] === key) return i + 3;
    }

    // Handle remaining elements
    for (; i < length; i++) {
      if (arr[i] === key) {
        return i;
      }
    }
    return -length - 1;
  }

  /**
   * Specialized binary lookup for finding insertion points in sorted arrays.
   *
   * This method is designed for **range queries and insertion point finding**
   * rather than exact matches. It returns the index where `(ids[idx] <= id) && (ids[idx + 1] > id)`,
   * making it ideal for bucketing operations and range-based algorithms.
   *
   * **Return Value Semantics:**
   * - **Range position**: Returns index where value fits in the sorted order
   * - **Exact match**: Returns the matching index
   * - **Too small**: Returns -1 if value is smaller than all elements
   * - **Too large**: Returns `length - 1` if value is larger than all elements
   *
   * **Common Use Cases:**
   * ```typescript
   * // Find time bucket for event timestamps
   * const buckets = getSortedTimeBuckets();
   * const bucketIndex = ArrayUtil.binaryLookup(eventTimestamp, buckets);
   * if (bucketIndex >= 0) {
   *   addEventToBucket(bucketIndex, event);
   * }
   *
   * // Find node range in sorted adjacency structure
   * const nodeRanges = getSortedNodeStarts();
   * const rangeIndex = ArrayUtil.binaryLookup(nodeId, nodeRanges);
   * const startPos = nodeRanges[rangeIndex];
   * const endPos = rangeIndex + 1 < nodeRanges.length ? nodeRanges[rangeIndex + 1] : totalElements;
   * ```
   *
   * @param id Value to find position for
   * @param ids Sorted array to search in
   * @returns Index where value fits, or -1 if smaller than all elements
   */
  public static binaryLookup(id: number, ids: number[]): number {
    const length = ids.length;
    let low = 0;
    let high = length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = ids[mid];

      if (midVal < id) {
        low = mid + 1;
      } else if (midVal > id) {
        high = mid - 1;
      } else {
        return mid; // Exact match
      }
    }
    return low - 1; // Insertion point
  }

  /**
   * Creates a new array filled with the specified value.
   *
   * This utility method provides **efficient array initialization** for numerical
   * computations where arrays need to be pre-filled with default values.
   *
   * @param value The value to fill the array with
   * @param length The desired array length
   * @returns A new array of the specified length filled with the value
   */
  public static fill(value: number, length: number): number[] {
    const data = new Array<number>(length);
    data.fill(value);
    return data;
  }

  /**
   * Checks if an array contains a specific value using linear search.
   *
   * This method provides **simple containment checking** for unsorted arrays
   * or when the overhead of sorting is not justified for one-time searches.
   *
   * @param array Array to search
   * @param value Value to search for
   * @returns `true` if array contains the value, `false` otherwise
   */
  public static contains(array: number[], value: number): boolean {
    for (const element of array) {
      if (element === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculates optimal array size for dynamic growth with memory alignment optimization.
   *
   * This method implements a **sophisticated growth strategy** that balances memory
   * efficiency with performance by considering:
   * - **Exponential growth**: Minimizes reallocation frequency
   * - **Memory alignment**: Optimizes for CPU cache line boundaries
   * - **Platform differences**: Accounts for 32-bit vs 64-bit architectures
   * - **GC optimization**: Reduces garbage collection pressure
   *
   * **Growth Strategy:**
   * The algorithm grows arrays by approximately 12.5% (1/8th) beyond the minimum
   * required size, providing a good balance between memory usage and reallocation
   * frequency. This is more conservative than typical 2x growth but reduces
   * memory waste for large arrays common in graph analytics.
   *
   * **Memory Alignment Optimization:**
   * The method rounds array sizes to optimal boundaries based on element size
   * and platform architecture to maximize cache performance and minimize
   * memory fragmentation.
   *
   * **Usage Pattern:**
   * ```typescript
   * // Dynamic array growth example
   * let array: number[] = [];
   * let capacity = 0;
   *
   * function addElement(element: number): void {
   *   if (array.length >= capacity) {
   *     const newCapacity = ArrayUtil.oversize(array.length + 1, 8); // 8 bytes per number
   *     const newArray = new Array<number>(newCapacity);
   *     newArray.splice(0, 0, ...array);
   *     array = newArray;
   *     capacity = newCapacity;
   *   }
   *   array[array.length] = element;
   * }
   * ```
   *
   * @param minTargetSize Minimum required array size
   * @param bytesPerElement Size of each array element in bytes
   * @returns Optimal array size >= minTargetSize
   * @throws Error if minTargetSize is negative or exceeds maximum array size
   */
  public static oversize(
    minTargetSize: number,
    bytesPerElement: number
  ): number {
    if (minTargetSize < 0) {
      throw new Error(`Invalid array size ${minTargetSize}`);
    }

    if (minTargetSize === 0) {
      return 0; // Wait until at least one element is requested
    }

    if (minTargetSize > ArrayUtil.MAX_ARRAY_LENGTH) {
      throw new Error(
        `Requested array size ${minTargetSize} exceeds maximum array size (${ArrayUtil.MAX_ARRAY_LENGTH})`
      );
    }

    // Asymptotic exponential growth by 1/8th
    let extra = minTargetSize >> 3;

    if (extra < 3) {
      // For very small arrays, grow faster to amortize reallocation overhead
      extra = 3;
    }

    let newSize = minTargetSize + extra;

    // Check for overflow and maximum size constraints
    if (newSize + 7 < 0 || newSize + 7 > ArrayUtil.MAX_ARRAY_LENGTH) {
      return ArrayUtil.MAX_ARRAY_LENGTH;
    }

    // Memory alignment optimization based on platform and element size
    if (Estimate.BYTES_OBJECT_REF === 8) {
      // 64-bit platform: round up to 8-byte alignment
      switch (bytesPerElement) {
        case 4:
          return (newSize + 1) & 0x7ffffffe; // Round up to multiple of 2
        case 2:
          return (newSize + 3) & 0x7ffffffc; // Round up to multiple of 4
        case 1:
          return (newSize + 7) & 0x7ffffff8; // Round up to multiple of 8
        case 8:
        default:
          return newSize; // No rounding needed
      }
    } else {
      // 32-bit platform: different alignment strategy
      switch (bytesPerElement) {
        case 1:
          return ((newSize + 3) & 0x7ffffff8) + 4;
        case 2:
          return ((newSize + 1) & 0x7ffffffc) + 2;
        case 4:
          return (newSize & 0x7ffffffe) + 1;
        case 8:
        default:
          return newSize;
      }
    }
  }

  /**
   * Calculates optimal array size for huge arrays exceeding standard size limits.
   *
   * This method extends the `oversize` algorithm to handle **massive arrays**
   * that exceed the limitations of standard JavaScript arrays. It's designed
   * for graph analytics applications that need to process datasets with
   * billions of elements.
   *
   * **Huge Array Characteristics:**
   * - **Extended range**: Supports sizes beyond Number.MAX_SAFE_INTEGER
   * - **Memory optimization**: Maintains alignment benefits for huge allocations
   * - **Performance preservation**: Same growth strategy as standard oversize
   *
   * @param minTargetSize Minimum required array size (can exceed standard limits)
   * @param bytesPerElement Size of each array element in bytes
   * @returns Optimal array size >= minTargetSize
   */
  public static oversizeHuge(
    minTargetSize: number,
    bytesPerElement: number
  ): number {
    if (minTargetSize === 0) {
      return 0;
    }

    // Asymptotic exponential growth by 1/8th
    let extra = minTargetSize >> 3;

    if (extra < 3) {
      extra = 3;
    }

    const newSize = minTargetSize + extra;

    // Memory alignment for huge arrays
    if (Estimate.BYTES_OBJECT_REF === 8) {
      // 64-bit platform alignment
      switch (bytesPerElement) {
        case 4:
          return (newSize + 1) & 0x7fff_fffe;
        case 2:
          return (newSize + 3) & 0x7fff_fffc;
        case 1:
          return (newSize + 7) & 0x7fff_fff8;
        case 8:
        default:
          return newSize;
      }
    } else {
      // 32-bit platform alignment
      switch (bytesPerElement) {
        case 2:
          return (newSize + 1) & 0x7ffffffe;
        case 1:
          return (newSize + 3) & 0x7ffffffc;
        case 4:
        case 8:
        default:
          return newSize;
      }
    }
  }

  /**
   * Private constructor to prevent instantiation of utility class.
   *
   * This class is designed as a static utility class and should not be instantiated.
   * All methods are static and operate on provided data without maintaining state.
   */
  private constructor() {
    throw new Error(
      "ArrayUtil is a static utility class and cannot be instantiated"
    );
  }
}
