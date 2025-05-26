/**
 * A multiset (bag) data structure for efficiently counting occurrences of long integers.
 *
 * This class provides **high-performance counting operations** for large integer values
 * commonly found in graph analytics, such as node IDs, edge counts, degree distributions,
 * and frequency analysis. It's built on top of a hash map to provide O(1) average-case
 * performance for add and count operations.
 *
 * **Design Philosophy:**
 *
 * **1. Multiset Semantics:**
 * Unlike a regular set that stores unique elements, a multiset allows duplicate elements
 * and maintains a count of how many times each element has been added. This is essential
 * for statistical analysis and frequency counting in graph algorithms.
 *
 * **2. Integer Optimization:**
 * Specifically optimized for JavaScript's number type (64-bit floating point) when used
 * as integers, providing efficient storage and lookup for large integer values up to
 * Number.MAX_SAFE_INTEGER (2^53 - 1).
 *
 * **3. Memory Efficiency:**
 * Uses a single hash map to store value-count pairs rather than maintaining multiple
 * copies of the same value, significantly reducing memory overhead for datasets with
 * high duplication rates.
 *
 * **Key Characteristics:**
 *
 * **Performance Profile:**
 * - **Add operations**: O(1) average case, O(n) worst case
 * - **Count queries**: O(1) average case, O(n) worst case
 * - **Key enumeration**: O(k) where k is number of unique keys
 * - **Sum calculation**: O(k) where k is number of unique keys
 * - **Memory usage**: O(k) where k is number of unique keys
 *
 * **Hash Map Foundation:**
 * Built on JavaScript's native Map data structure which provides:
 * - Excellent hash distribution for numeric keys
 * - Automatic resizing and load factor management
 * - Memory-efficient storage for sparse integer ranges
 * - Consistent performance across different integer distributions
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Degree Distribution Analysis:**
 * ```typescript
 * // Count node degrees in a graph
 * const degreeDistribution = new LongMultiSet();
 *
 * for (const nodeId of graph.nodes()) {
 *   const degree = graph.degree(nodeId);
 *   degreeDistribution.add(degree);
 * }
 *
 * // Analyze distribution
 * const uniqueDegrees = degreeDistribution.keys();
 * const maxDegree = Math.max(...uniqueDegrees);
 * const totalNodes = degreeDistribution.sum();
 *
 * console.log(`Degree distribution:`);
 * for (const degree of uniqueDegrees.sort((a, b) => a - b)) {
 *   const count = degreeDistribution.count(degree);
 *   const percentage = (count / totalNodes) * 100;
 *   console.log(`Degree ${degree}: ${count} nodes (${percentage.toFixed(2)}%)`);
 * }
 * ```
 *
 * **Community Size Counting:**
 * ```typescript
 * // Count sizes of detected communities
 * const communitySizes = new LongMultiSet();
 *
 * for (const nodeId of graph.nodes()) {
 *   const communityId = communityAssignment.get(nodeId);
 *   communitySizes.add(communityId);
 * }
 *
 * // Find largest communities
 * const communities = communitySizes.keys()
 *   .map(id => ({ id, size: communitySizes.count(id) }))
 *   .sort((a, b) => b.size - a.size);
 *
 * console.log(`Top 10 largest communities:`);
 * communities.slice(0, 10).forEach((community, rank) => {
 *   console.log(`${rank + 1}. Community ${community.id}: ${community.size} members`);
 * });
 * ```
 *
 * **Edge Weight Frequency Analysis:**
 * ```typescript
 * // Analyze distribution of edge weights
 * const weightDistribution = new LongMultiSet();
 *
 * for (const edge of graph.edges()) {
 *   // Convert weights to integer buckets for analysis
 *   const weightBucket = Math.floor(edge.weight * 100); // 2 decimal places
 *   weightDistribution.add(weightBucket);
 * }
 *
 * // Statistical analysis
 * const weights = weightDistribution.keys();
 * const totalEdges = weightDistribution.sum();
 * const meanWeight = weights.reduce((sum, w) => sum + w * weightDistribution.count(w), 0) / totalEdges / 100;
 * ```
 *
 * **Algorithm Convergence Tracking:**
 * ```typescript
 * // Track PageRank score convergence by magnitude
 * const convergenceBuckets = new LongMultiSet();
 *
 * for (const nodeId of graph.nodes()) {
 *   const scoreDiff = Math.abs(newScores[nodeId] - oldScores[nodeId]);
 *   const bucket = Math.floor(Math.log10(scoreDiff + 1e-10) * 10); // Log scale buckets
 *   convergenceBuckets.add(bucket);
 * }
 *
 * // Check convergence criteria
 * const totalNodes = convergenceBuckets.sum();
 * const highDiffCount = convergenceBuckets.keys()
 *   .filter(bucket => bucket > -30) // Differences > 1e-3
 *   .reduce((sum, bucket) => sum + convergenceBuckets.count(bucket), 0);
 *
 * const convergenceRatio = 1 - (highDiffCount / totalNodes);
 * const hasConverged = convergenceRatio > 0.99;
 * ```
 *
 * **Memory-Efficient Histogram Generation:**
 * ```typescript
 * // Generate histograms for large datasets without storing individual values
 * const histogram = new LongMultiSet();
 *
 * // Process streaming data
 * for await (const batch of streamingData) {
 *   for (const value of batch) {
 *     const bucket = Math.floor(value / bucketSize);
 *     histogram.add(bucket);
 *   }
 * }
 *
 * // Export histogram for visualization
 * const histogramData = histogram.keys().map(bucket => ({
 *   bucketStart: bucket * bucketSize,
 *   bucketEnd: (bucket + 1) * bucketSize,
 *   count: histogram.count(bucket),
 *   frequency: histogram.count(bucket) / histogram.sum()
 * }));
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Batch Addition:**
 * ```typescript
 * // Efficient batch processing
 * const multiset = new LongMultiSet();
 *
 * // Instead of many single adds
 * // for (const value of values) multiset.add(value);
 *
 * // Use batch counting for better performance
 * const counts = new Map<number, number>();
 * for (const value of values) {
 *   counts.set(value, (counts.get(value) || 0) + 1);
 * }
 *
 * for (const [value, count] of counts) {
 *   multiset.add(value, count);
 * }
 * ```
 *
 * **Memory-Conscious Processing:**
 * ```typescript
 * // Process large datasets with controlled memory usage
 * function processLargeDataset(dataSource: Iterable<number>): Map<number, number> {
 *   const multiset = new LongMultiSet();
 *
 *   for (const value of dataSource) {
 *     multiset.add(value);
 *
 *     // Periodic cleanup for very large datasets
 *     if (multiset.size() > 1_000_000) {
 *       // Process and clear low-frequency items
 *       const keysToRemove = multiset.keys().filter(k => multiset.count(k) === 1);
 *       if (keysToRemove.length > 100_000) {
 *         // Export or process these items and remove from multiset
 *         processLowFrequencyItems(keysToRemove, multiset);
 *       }
 *     }
 *   }
 *
 *   return new Map(multiset.keys().map(k => [k, multiset.count(k)]));
 * }
 * ```
 *
 * **Integration with Analytics Pipelines:**
 *
 * **Stream Processing:**
 * ```typescript
 * // Integrate with streaming analytics
 * class StreamingFrequencyAnalyzer {
 *   private multiset = new LongMultiSet();
 *   private windowSize: number;
 *   private valueQueue: number[] = [];
 *
 *   constructor(windowSize: number) {
 *     this.windowSize = windowSize;
 *   }
 *
 *   addValue(value: number): void {
 *     // Add new value
 *     this.multiset.add(value);
 *     this.valueQueue.push(value);
 *
 *     // Remove old value if window is full
 *     if (this.valueQueue.length > this.windowSize) {
 *       const oldValue = this.valueQueue.shift()!;
 *       this.multiset.add(oldValue, -1);
 *
 *       // Clean up zero counts
 *       if (this.multiset.count(oldValue) === 0) {
 *         this.multiset.remove(oldValue);
 *       }
 *     }
 *   }
 *
 *   getCurrentDistribution(): Map<number, number> {
 *     return new Map(this.multiset.keys().map(k => [k, this.multiset.count(k)]));
 *   }
 * }
 * ```
 *
 * **Statistical Analysis Ready:**
 * The multiset provides all necessary operations for statistical analysis:
 * - **Mean calculation**: Sum weighted values divided by total count
 * - **Mode detection**: Key(s) with maximum count
 * - **Percentile calculation**: Ordered key enumeration with cumulative counts
 * - **Entropy calculation**: Frequency-based information entropy
 * - **Distribution comparison**: Chi-square tests and KL divergence
 */
export class LongMultiSet {
  private readonly map: Map<number, number>;

  /**
   * Creates a new empty multiset.
   *
   * The multiset is initialized with an empty hash map optimized for integer keys.
   * The underlying Map will automatically resize as elements are added.
   */
  constructor() {
    this.map = new Map<number, number>();
  }

  /**
   * Adds occurrences of the specified value to the multiset.
   *
   * @param value The integer value to add to the multiset
   * @returns The new total count of the value after addition
   */
  public add(value: number): number;

  /**
   * Adds multiple occurrences of the specified value to the multiset.
   *
   * @param key The integer value to add to the multiset
   * @param count The number of occurrences to add (can be negative)
   * @returns The new total count of the key after addition
   */
  public add(key: number, count: number): number;

  /**
   * Implementation for both overloads
   */
  public add(keyOrValue: number, count?: number): number {
    if (count === undefined) {
      // Single-argument version: add(value)
      const currentCount = this.map.get(keyOrValue) || 0;
      const newCount = currentCount + 1;
      this.map.set(keyOrValue, newCount);
      return newCount;
    } else {
      // Two-argument version: add(key, count)
      const currentCount = this.map.get(keyOrValue) || 0;
      const newCount = currentCount + count;
      this.map.set(keyOrValue, newCount);
      return newCount;
    }
  }

  /**
   * Returns the number of occurrences of the specified value in the multiset.
   *
   * This method provides **O(1) lookup** for the count of any value in the multiset.
   * If the value has never been added to the multiset, it returns 0.
   *
   * **Null-Safe Behavior:**
   * Returns 0 for values that haven't been added rather than throwing an error,
   * making it safe to query arbitrary values without prior existence checks.
   *
   * **Usage Examples:**
   * ```typescript
   * const multiset = new LongMultiSet();
   * multiset.add(42, 5);
   *
   * console.log(multiset.count(42));    // Output: 5
   * console.log(multiset.count(100));   // Output: 0 (never added)
   *
   * // Safe conditional processing
   * if (multiset.count(nodeId) > 0) {
   *   processKnownNode(nodeId, multiset.count(nodeId));
   * }
   *
   * // Frequency-based filtering
   * const frequentValues = multiset.keys().filter(value =>
   *   multiset.count(value) >= MIN_FREQUENCY
   * );
   * ```
   *
   * @param value The value to query
   * @returns The number of times the value has been added to the multiset
   */
  public count(value: number): number {
    return this.map.get(value) || 0;
  }

  /**
   * Returns an array of all unique values (keys) in the multiset.
   *
   * This method provides **access to the distinct elements** that have been added
   * to the multiset, regardless of their frequency. The returned array contains
   * each unique value exactly once.
   *
   * **Order Characteristics:**
   * The order of keys in the returned array follows JavaScript's Map iteration order,
   * which preserves insertion order. Keys are returned in the order they were first
   * added to the multiset.
   *
   * **Performance Notes:**
   * - **Time complexity**: O(k) where k is the number of unique keys
   * - **Space complexity**: O(k) for the returned array
   * - **Snapshot semantics**: Returns a snapshot; modifications don't affect the array
   *
   * **Usage Examples:**
   * ```typescript
   * const multiset = new LongMultiSet();
   * multiset.add(10, 3);
   * multiset.add(20, 1);
   * multiset.add(10, 2);  // 10 now has count 5
   *
   * const keys = multiset.keys();
   * console.log(keys);  // [10, 20] - each unique value once
   *
   * // Processing all unique values
   * for (const key of multiset.keys()) {
   *   const frequency = multiset.count(key);
   *   console.log(`Value ${key} appears ${frequency} times`);
   * }
   *
   * // Statistical analysis
   * const sortedKeys = multiset.keys().sort((a, b) => a - b);
   * const mostFrequent = multiset.keys()
   *   .reduce((max, key) => multiset.count(key) > multiset.count(max) ? key : max);
   * ```
   *
   * @returns Array containing all unique values in the multiset
   */
  public keys(): number[] {
    return Array.from(this.map.keys());
  }

  /**
   * Returns the number of unique values in the multiset.
   *
   * This method returns the **cardinality of the underlying set** - the number
   * of distinct values that have been added, regardless of their frequency.
   *
   * **Distinct vs. Total Count:**
   * - `size()`: Number of unique values (cardinality)
   * - `sum()`: Total number of all occurrences (frequency sum)
   *
   * **Usage Examples:**
   * ```typescript
   * const multiset = new LongMultiSet();
   * multiset.add(10, 3);
   * multiset.add(20, 1);
   * multiset.add(30, 2);
   *
   * console.log(multiset.size());  // Output: 3 (unique values: 10, 20, 30)
   * console.log(multiset.sum());   // Output: 6 (total occurrences: 3+1+2)
   *
   * // Diversity analysis
   * const uniqueNodeCount = degreeDistribution.size();
   * const totalNodes = degreeDistribution.sum();
   * const diversity = uniqueNodeCount / totalNodes; // Closer to 1 = more diverse
   * ```
   *
   * @returns The number of unique values in the multiset
   */
  public size(): number {
    return this.map.size;
  }

  /**
   * Returns the sum of all counts in the multiset.
   *
   * This method calculates the **total number of occurrences** across all values
   * in the multiset. It's equivalent to the sum of all individual counts.
   *
   * **Statistical Significance:**
   * The sum represents the total sample size for statistical analysis and is
   * essential for calculating frequencies, percentages, and probability distributions.
   *
   * **Performance:**
   * - **Time complexity**: O(k) where k is the number of unique keys
   * - **Space complexity**: O(1) - computed on demand
   * - **Caching potential**: Could be optimized with caching for frequent queries
   *
   * **Usage Examples:**
   * ```typescript
   * const multiset = new LongMultiSet();
   * multiset.add(1, 10);
   * multiset.add(2, 20);
   * multiset.add(3, 30);
   *
   * const total = multiset.sum();  // Returns 60 (10+20+30)
   *
   * // Probability calculation
   * const probability = multiset.count(value) / multiset.sum();
   *
   * // Percentage distribution
   * for (const key of multiset.keys()) {
   *   const percentage = (multiset.count(key) / multiset.sum()) * 100;
   *   console.log(`${key}: ${percentage.toFixed(2)}%`);
   * }
   *
   * // Sample size validation
   * if (multiset.sum() >= MIN_SAMPLE_SIZE) {
   *   performStatisticalAnalysis(multiset);
   * }
   * ```
   *
   * @returns The sum of all occurrence counts in the multiset
   */
  public sum(): number {
    let total = 0;
    for (const count of this.map.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Removes a value from the multiset entirely.
   *
   * This is a utility method for completely removing a value and its count
   * from the multiset. Useful for cleanup operations or sliding window algorithms.
   *
   * @param value The value to remove completely
   * @returns `true` if the value was present and removed, `false` if it wasn't present
   * @internal This method is used internally and may be exposed publicly if needed
   */
  public remove(value: number): boolean {
    return this.map.delete(value);
  }

  /**
   * Returns an iterator over all [value, count] pairs in the multiset.
   *
   * This method provides **efficient iteration** over the multiset contents
   * without requiring separate calls to `keys()` and `count()`.
   *
   * @returns Iterator over [value, count] pairs
   */
  public *entries(): IterableIterator<[number, number]> {
    for (const [value, count] of this.map) {
      yield [value, count];
    }
  }

  /**
   * Clears all values from the multiset.
   *
   * Removes all values and their counts, returning the multiset to an empty state.
   * Useful for resetting the multiset for reuse or cleanup operations.
   */
  public clear(): void {
    this.map.clear();
  }

  /**
   * Creates a string representation of the multiset for debugging.
   *
   * @returns A string showing all values and their counts
   */
  public toString(): string {
    const entries = Array.from(this.entries())
      .map(([value, count]) => `${value}:${count}`)
      .join(", ");
    return `LongMultiSet{${entries}}`;
  }
}
