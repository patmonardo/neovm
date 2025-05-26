/**
 * High-performance radix sort implementation for sorting arrays of 64-bit integers
 * along with associated data arrays.
 *
 * This implementation uses an 8-bit radix (256 buckets) and processes data in pairs
 * for memory efficiency. It's specifically optimized for graph data structures where
 * you need to sort large arrays of node/edge IDs while maintaining associated metadata.
 *
 * **Key Features:**
 * - **Multi-array sorting**: Sorts primary long array while maintaining order of associated arrays
 * - **In-place optimization**: Uses provided buffers to minimize memory allocation
 * - **Pair processing**: Processes data in pairs for better cache locality
 * - **Early termination**: Stops when no more significant bits need processing
 * - **Generic support**: Type-safe handling of associated object arrays
 *
 * **Performance Characteristics:**
 * - Time complexity: O(k * n) where k is number of passes (typically 8 for 64-bit integers)
 * - Space complexity: O(n) for temporary buffers
 * - Cache-friendly: Pair processing improves memory access patterns
 * - Stable sort: Maintains relative order of equal elements
 *
 * **Typical Usage in Graph Algorithms:**
 * ```typescript
 * // Sort edge list by source node while maintaining target and weight arrays
 * const sources = new BigUint64Array([3n, 1n, 4n, 1n, 5n]);
 * const targets = new BigUint64Array([2n, 4n, 1n, 5n, 9n]);
 * const weights = [0.5, 0.8, 0.3, 0.9, 0.1];
 *
 * const histogram = RadixSort.newHistogram(sources.length);
 * const sourcesCopy = RadixSort.newCopy(sources);
 * const targetsCopy = RadixSort.newCopy(targets);
 * const weightsCopy = RadixSort.newCopy(weights);
 *
 * RadixSort.radixSort(
 *   sources, sourcesCopy,
 *   targets, targetsCopy,
 *   weights, weightsCopy,
 *   histogram,
 *   sources.length
 * );
 * // Now all arrays are sorted by sources: [1,1,3,4,5] with corresponding targets and weights
 * ```
 */
export class RadixSort {
  /**
   * Number of bits processed in each radix sort pass.
   * Using 8 bits means 256 possible values per digit, providing good balance
   * between number of passes and memory usage for histogram.
   */
  private static readonly RADIX = 8;

  /**
   * Size of histogram array needed for counting sort in each pass.
   * 2^8 = 256 buckets for 8-bit radix.
   */
  private static readonly HIST_SIZE = 1 << RadixSort.RADIX;

  /**
   * Creates a new histogram array for use in radix sort operations.
   *
   * The histogram is used for counting occurrences of each radix digit
   * and computing prefix sums for the counting sort step. Size is chosen
   * to be at least HIST_SIZE + 1 to accommodate the counting algorithm.
   *
   * **Why length parameter:**
   * In some cases, a larger histogram may be beneficial for performance
   * or to reuse the same histogram across multiple sort operations.
   *
   * @param length Minimum length of histogram (will be at least HIST_SIZE + 1)
   * @returns New histogram array filled with zeros
   */
  public static newHistogram(length: number): Int32Array {
    return new Int32Array(Math.max(length, 1 + RadixSort.HIST_SIZE));
  }

  /**
   * Creates a copy array with same length as the input long array.
   *
   * This copy is used as a temporary buffer during the radix sort process.
   * Using BigUint64Array ensures we can handle the full range of 64-bit integers
   * that might represent node IDs in very large graphs.
   *
   * @param data Source array to copy length from
   * @returns New BigUint64Array with same length as input
   */
  public static newCopy(data: BigUint64Array): BigUint64Array {
    return new BigUint64Array(data.length);
  }

  /**
   * Creates a copy array with same length as the input generic array.
   *
   * This provides type-safe copying for associated data arrays of any type.
   * The generic constraint ensures compile-time type safety while maintaining
   * the ability to work with any object type.
   *
   * @param data Source array to copy length from
   * @returns New array with same type and length as input
   */
  public static newCopy<T>(data: T[]): T[] {
    return new Array<T>(data.length);
  }

  /**
   * Sorts multiple arrays simultaneously using radix sort on the primary data array.
   *
   * This is the main entry point for radix sort operations. It sorts the primary
   * `data` array while maintaining the corresponding order in two associated arrays.
   * This is essential for graph operations where you need to sort edges by source
   * while keeping target nodes and edge properties aligned.
   *
   * **Data Processing Pattern:**
   * The algorithm processes data in pairs (i, i+1) for better cache locality:
   * - `data[i]` and `data[i+1]` form a pair of values to sort
   * - `additionalData1[i/2]` contains associated data for this pair
   * - `additionalData2[i/2]` contains another piece of associated data
   *
   * **Buffer Management:**
   * All `*Copy` arrays must be pre-allocated with sufficient size. The algorithm
   * uses these as temporary storage during the sorting process, avoiding repeated
   * memory allocation which would hurt performance.
   *
   * **Example - Sorting Edges by Source:**
   * ```typescript
   * // Edge list: (source, target) pairs with weights
   * const edges = new BigUint64Array([3n, 2n, 1n, 4n, 4n, 1n]); // pairs: (3,2), (1,4), (4,1)
   * const nodeData = new BigUint64Array([10n, 20n, 30n]); // data for nodes
   * const weights = [0.5, 0.8, 0.3]; // edge weights
   *
   * RadixSort.radixSort(edges, edgesCopy, nodeData, nodesCopy, weights, weightsCopy, hist, 6);
   * // Result: edges = [1n, 4n, 3n, 2n, 4n, 1n] (sorted by first element of each pair)
   * ```
   *
   * @param data Primary array to sort (must have even length for pair processing)
   * @param dataCopy Temporary buffer for data array (same length as data)
   * @param additionalData1 First associated array to maintain order (length = data.length / 2)
   * @param additionalCopy1 Temporary buffer for additionalData1
   * @param additionalData2 Second associated array to maintain order (length = data.length / 2)
   * @param additionalCopy2 Temporary buffer for additionalData2
   * @param histogram Counting histogram (use newHistogram() to create)
   * @param length Number of elements to sort (must be ≤ array lengths and even)
   */
  public static radixSort<T>(
    data: BigUint64Array,
    dataCopy: BigUint64Array,
    additionalData1: BigUint64Array,
    additionalCopy1: BigUint64Array,
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: Int32Array,
    length: number
  ): void {
    RadixSort.radixSortInternal(
      data,
      dataCopy,
      additionalData1,
      additionalCopy1,
      additionalData2,
      additionalCopy2,
      histogram,
      length,
      0 // Start with shift = 0 (least significant bits)
    );
  }

  /**
   * Internal recursive implementation of radix sort.
   *
   * This method implements the core radix sort algorithm, processing one radix
   * digit at a time from least significant to most significant bits. Each pass
   * through this method sorts the data by one 8-bit digit.
   *
   * **Algorithm Steps for Each Pass:**
   * 1. **Histogram Creation**: Count occurrences of each radix digit
   * 2. **Early Termination Check**: Stop if all remaining bits are zero
   * 3. **Prefix Sum Calculation**: Convert counts to starting positions
   * 4. **Data Redistribution**: Place elements in sorted order for current digit
   * 5. **Array Copying**: Copy sorted data back to original arrays
   * 6. **Recursion**: Process next radix digit (higher 8 bits)
   *
   * **Bit Manipulation Details:**
   * - `loMask = 0xFFL << shift`: Extracts current 8-bit digit
   * - `hiMask = -(0x100L << shift)`: Identifies bits higher than current digit
   * - `hiBits`: Tracks whether any higher-order bits are set
   *
   * **Performance Optimizations:**
   * - **Pair processing**: Processes data[i] and data[i+1] together
   * - **Early termination**: Stops when no significant bits remain
   * - **Cache locality**: Sequential access patterns for better memory performance
   * - **Minimal branching**: Reduces CPU pipeline stalls
   *
   * **Memory Layout:**
   * ```
   * data:            [pair0_a, pair0_b, pair1_a, pair1_b, ...]
   * additionalData1: [pair0_data,       pair1_data,       ...]
   * additionalData2: [pair0_obj,        pair1_obj,        ...]
   * ```
   *
   * @param data Primary array being sorted
   * @param dataCopy Temporary buffer for primary array
   * @param additionalData1 First associated array
   * @param additionalCopy1 Temporary buffer for first associated array
   * @param additionalData2 Second associated array
   * @param additionalCopy2 Temporary buffer for second associated array
   * @param histogram Counting array for current radix digit
   * @param length Number of elements to process
   * @param shift Number of bits to shift right to get current radix digit
   */
  private static radixSortInternal<T>(
    data: BigUint64Array,
    dataCopy: BigUint64Array,
    additionalData1: BigUint64Array,
    additionalCopy1: BigUint64Array,
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: Int32Array,
    length: number,
    shift: number
  ): void {
    // Calculate working lengths to prevent out-of-bounds access
    const hlen = Math.min(RadixSort.HIST_SIZE, histogram.length - 1);
    const dlen = Math.min(length, Math.min(data.length, dataCopy.length));

    // Bit masks for extracting radix digits and detecting higher-order bits
    const loMask = BigInt(0xFF) << BigInt(shift); // Extract current 8-bit digit
    const hiMask = -(BigInt(0x100) << BigInt(shift)); // Detect higher-order bits

    let hiBits = 0n; // Tracks if any higher-order bits are set
    let maxHistIndex = 0; // Tracks maximum radix digit found
    let histIndex: number;
    let out: number;

    // Continue processing while there are bits left to sort
    while (shift < 64) { // 64 bits in BigInt
      // Step 1: Initialize histogram and scanning variables
      histogram.fill(0, 0, 1 + hlen);
      maxHistIndex = 0;
      hiBits = 0n;

      // Step 2: Build histogram by counting occurrences of each radix digit
      // Process pairs: (data[i], data[i+1]) for better cache locality
      for (let i = 0; i < dlen; i += 2) {
        // Check if higher-order bits are set (for early termination)
        hiBits |= data[i] & hiMask;

        // Extract current radix digit from first element of pair
        histIndex = Number((data[i] & loMask) >> BigInt(shift));
        maxHistIndex |= histIndex; // Track maximum digit found

        // Count this pair (increment by 2 since we process pairs)
        histogram[1 + histIndex] += 2;
      }

      // Step 3: Early termination optimization
      // If no higher-order bits are set and all digits are 0, we're done
      if (hiBits === 0n && maxHistIndex === 0) {
        return;
      }

      // Step 4: Sort by current digit if we found non-zero digits
      if (maxHistIndex !== 0) {
        // Convert histogram counts to starting positions (prefix sum)
        for (let i = 0; i < hlen; ++i) {
          histogram[i + 1] += histogram[i];
        }

        // Step 5: Redistribute elements based on current radix digit
        for (let i = 0; i < dlen; i += 2) {
          // Find output position for this pair based on radix digit
          histIndex = Number((data[i] & loMask) >> BigInt(shift));
          out = (histogram[histIndex] += 2); // Get position and increment

          // Place pair in sorted order
          dataCopy[out - 2] = data[i];
          dataCopy[out - 1] = data[i + 1];

          // Maintain order in associated arrays
          const pairIndex = Math.floor((out - 2) / 2);
          additionalCopy1[pairIndex] = additionalData1[Math.floor(i / 2)];
          additionalCopy2[pairIndex] = additionalData2[Math.floor(i / 2)];
        }

        // Step 6: Copy sorted data back to original arrays
        data.set(dataCopy.subarray(0, dlen));
        additionalData1.set(additionalCopy1.subarray(0, Math.floor(dlen / 2)));
        for (let i = 0; i < Math.floor(dlen / 2); i++) {
          additionalData2[i] = additionalCopy2[i];
        }
      }

      // Step 7: Move to next radix digit (8 bits higher)
      shift += RadixSort.RADIX;
      // Note: loMask and hiMask are recalculated in next iteration
    }
  }

  /**
   * Alternative radix sort that sorts by the second element of each pair first.
   *
   * This variant is useful when you need to sort edges by target node rather than
   * source node. It first sorts by `data[i+1]` (second element of each pair) using
   * a single pass, then continues with normal radix sort on `data[i]`.
   *
   * **Use Case Example:**
   * ```typescript
   * // Sort edges by target node first, then by source node
   * const edges = new BigUint64Array([1n, 3n, 2n, 3n, 1n, 2n]); // (1,3), (2,3), (1,2)
   * RadixSort.radixSort2(edges, copy, data1, copy1, data2, copy2, hist, 6);
   * // Result prioritizes target node ordering: (1,2), (2,3), (1,3)
   * ```
   *
   * **Algorithm:**
   * 1. Perform one pass of counting sort on second element of pairs (data[i+1])
   * 2. Continue with normal radix sort starting from next radix digit
   *
   * @param data Primary array to sort (even length required)
   * @param dataCopy Temporary buffer for data array
   * @param additionalData1 First associated array to maintain order
   * @param additionalCopy1 Temporary buffer for additionalData1
   * @param additionalData2 Second associated array to maintain order
   * @param additionalCopy2 Temporary buffer for additionalData2
   * @param histogram Counting histogram
   * @param length Number of elements to sort (even number required)
   */
  public static radixSort2<T>(
    data: BigUint64Array,
    dataCopy: BigUint64Array,
    additionalData1: BigUint64Array,
    additionalCopy1: BigUint64Array,
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: Int32Array,
    length: number
  ): void {
    RadixSort.radixSort2Internal(
      data,
      dataCopy,
      additionalData1,
      additionalCopy1,
      additionalData2,
      additionalCopy2,
      histogram,
      length,
      0 // Start with shift = 0 (least significant bits)
    );
  }

  /**
   * Internal implementation of radixSort2.
   *
   * This performs a single counting sort pass on the second element of each pair
   * (data[i+1]), then delegates to the normal radix sort for remaining digits.
   *
   * **Why Sort Second Element First:**
   * In graph algorithms, you might want to process edges grouped by target node
   * rather than source node. This provides that capability efficiently.
   *
   * **Single Pass Algorithm:**
   * 1. **Histogram building**: Count occurrences of each radix digit in data[i+1]
   * 2. **Prefix sum**: Convert counts to starting positions
   * 3. **Redistribution**: Place pairs in order based on data[i+1] digit
   * 4. **Continuation**: Use normal radix sort for remaining digits
   *
   * @param data Primary array being sorted
   * @param dataCopy Temporary buffer for primary array
   * @param additionalData1 First associated array
   * @param additionalCopy1 Temporary buffer for first associated array
   * @param additionalData2 Second associated array
   * @param additionalCopy2 Temporary buffer for second associated array
   * @param histogram Counting array for radix digits
   * @param length Number of elements to process
   * @param shift Number of bits to shift for current radix digit
   */
  private static radixSort2Internal<T>(
    data: BigUint64Array,
    dataCopy: BigUint64Array,
    additionalData1: BigUint64Array,
    additionalCopy1: BigUint64Array,
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: Int32Array,
    length: number,
    shift: number
  ): void {
    const hlen = Math.min(RadixSort.HIST_SIZE, histogram.length - 1);
    const dlen = Math.min(length, Math.min(data.length, dataCopy.length));

    // Initialize histogram for counting
    histogram.fill(0, 0, hlen);

    // Build histogram by counting radix digits in second element of each pair
    const loMask = BigInt(0xFF) << BigInt(shift);
    for (let i = 0; i < dlen; i += 2) {
      // Extract radix digit from data[i+1] (second element of pair)
      const histIndex = Number((data[i + 1] & loMask) >> BigInt(shift));
      histogram[1 + histIndex] += 2;
    }

    // Convert counts to starting positions (prefix sum)
    for (let i = 0; i < hlen; ++i) {
      histogram[i + 1] += histogram[i];
    }

    // Redistribute pairs based on second element's radix digit
    let out: number;
    for (let i = 0; i < dlen; i += 2) {
      const histIndex = Number((data[i + 1] & loMask) >> BigInt(shift));
      out = (histogram[histIndex] += 2);

      // Note: Swap order - data[i+1] goes first, data[i] second
      dataCopy[out - 2] = data[i + 1];
      dataCopy[out - 1] = data[i];

      // Maintain associated data order
      const pairIndex = Math.floor((out - 2) / 2);
      additionalCopy1[pairIndex] = additionalData1[Math.floor(i / 2)];
      additionalCopy2[pairIndex] = additionalData2[Math.floor(i / 2)];
    }

    // Copy results back to original arrays
    data.set(dataCopy.subarray(0, dlen));
    additionalData1.set(additionalCopy1.subarray(0, Math.floor(dlen / 2)));
    for (let i = 0; i < Math.floor(dlen / 2); i++) {
      additionalData2[i] = additionalCopy2[i];
    }

    // Continue with normal radix sort for remaining digits
    RadixSort.radixSortInternal(
      data,
      dataCopy,
      additionalData1,
      additionalCopy1,
      additionalData2,
      additionalCopy2,
      histogram,
      length,
      shift + RadixSort.RADIX
    );
  }

  /**
   * Private constructor to prevent instantiation.
   * This is a utility class with only static methods.
   */
  private constructor() {}
}
