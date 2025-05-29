/**
 * # IndirectComparator - Foundation for Zero-Copy Sorting Algorithms
 *
 * ## Overview
 *
 * **IndirectComparator** defines the contract for **indirect sorting operations** where
 * comparisons are performed on **indices** rather than actual data elements. This enables
 * **zero-copy sorting algorithms** that rearrange index arrays while leaving the original
 * data structures completely untouched.
 *
 * ## The Indirect Sorting Paradigm
 *
 * **Traditional sorting** operates directly on data elements:
 * ```typescript
 * // Traditional: Moves actual data elements
 * const data = [30, 10, 20];
 * data.sort(); // Result: [10, 20, 30] - data elements moved
 * ```
 *
 * **Indirect sorting** operates on indices that point to data elements:
 * ```typescript
 * // Indirect: Moves only indices, data stays put
 * const data = [30, 10, 20];           // Original data never changes
 * const indices = [0, 1, 2];           // Index array to be sorted
 * indices.sort(comparator.compare);     // Result: [1, 2, 0] - indices rearranged
 * // Access sorted data: indices.map(i => data[i]) → [10, 20, 30]
 * ```
 *
 * ## Graph Analytics Applications
 *
 * **Critical for high-performance graph processing:**
 *
 * ### **Node Ranking Without Data Movement:**
 * ```typescript
 * // Sort million-node graph by PageRank scores
 * const nodeIds = [...];        // 1M node IDs (never moved)
 * const pageRankScores = [...]; // 1M PageRank scores (comparison data)
 * const adjacencyLists = [...]; // 1M adjacency lists (stay synchronized)
 *
 * // Indirect sort creates ranking without disrupting graph structure
 * const ranking = Array.from({length: nodeIds.length}, (_, i) => i);
 * ranking.sort((a, b) => pageRankComparator.compare(a, b));
 * ```
 *
 * ### **Temporal Graph Processing:**
 * ```typescript
 * // Sort edges by timestamp while preserving all edge metadata
 * const edgeTimestamps = [...];  // Comparison data
 * const edgeSources = [...];     // Parallel data (stays synchronized)
 * const edgeTargets = [...];     // Parallel data (stays synchronized)
 * const edgeWeights = [...];     // Parallel data (stays synchronized)
 * const edgeLabels = [...];      // Parallel data (stays synchronized)
 *
 * // Single sort operation orders ALL arrays consistently
 * ```
 *
 * ### **Memory-Intensive Graph Analytics:**
 * ```typescript
 * // Community detection with large node feature vectors
 * const nodeFeatureVectors = [...]; // Each node: 1000+ dimensional vector
 * const communitySizes = [...];      // Simple numeric comparison data
 *
 * // Sort by community size without moving massive feature vectors
 * ```
 *
 * ## Performance Characteristics
 *
 * ### **Memory Efficiency:**
 * - **Zero data copying** - original arrays never duplicated
 * - **Minimal memory overhead** - only index arrays allocated
 * - **Cache-friendly access** - index arrays are compact and sequential
 * - **Memory bandwidth conservation** - avoids moving large data structures
 *
 * ### **Computational Efficiency:**
 * - **O(n log n) comparisons** - same as direct sorting
 * - **O(1) data access** - constant time to retrieve comparison values
 * - **Reduced memory allocations** - no temporary storage for data elements
 * - **Better branch prediction** - predictable memory access patterns
 *
 * ## Mathematical Foundation
 *
 * The interface enforces **total ordering** requirements for sorting correctness:
 *
 * ### **Reflexivity:**
 * ```typescript
 * compare(i, i) === 0  // An index always equals itself
 * ```
 *
 * ### **Antisymmetry:**
 * ```typescript
 * if (compare(i, j) < 0) then compare(j, i) > 0
 * if (compare(i, j) > 0) then compare(j, i) < 0
 * if (compare(i, j) === 0) then compare(j, i) === 0
 * ```
 *
 * ### **Transitivity:**
 * ```typescript
 * if (compare(i, j) < 0) && (compare(j, k) < 0) then compare(i, k) < 0
 * ```
 *
 * ### **Totality:**
 * ```typescript
 * // For any valid indices i, j, exactly one condition holds:
 * compare(i, j) < 0  ||  compare(i, j) > 0  ||  compare(i, j) === 0
 * ```
 *
 * ## Algorithm Integration
 *
 * **Seamlessly integrates with standard sorting algorithms:**
 *
 * ### **JavaScript Array.sort():**
 * ```typescript
 * const indices = [0, 1, 2, 3, 4];
 * indices.sort((a, b) => comparator.compare(a, b));
 * ```
 *
 * ### **Custom Quicksort Implementation:**
 * ```typescript
 * function quicksortIndirect(indices: number[], comparator: IndirectComparator,
 *                           low: number, high: number): void {
 *   if (low < high) {
 *     const pivot = partitionIndirect(indices, comparator, low, high);
 *     quicksortIndirect(indices, comparator, low, pivot - 1);
 *     quicksortIndirect(indices, comparator, pivot + 1, high);
 *   }
 * }
 * ```
 *
 * ### **Priority Queue Operations:**
 * ```typescript
 * class IndirectPriorityQueue {
 *   constructor(private comparator: IndirectComparator) {}
 *
 *   enqueue(index: number): void {
 *     this.heap.push(index);
 *     this.bubbleUp(this.heap.length - 1);
 *   }
 *
 *   private bubbleUp(pos: number): void {
 *     const parent = Math.floor((pos - 1) / 2);
 *     if (parent >= 0 && this.comparator.compare(this.heap[pos], this.heap[parent]) < 0) {
 *       // ... heap operations using indirect comparison
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Basic indirect sorting implementation
 * class SimpleIndirectComparator implements IndirectComparator {
 *   constructor(private values: number[]) {}
 *
 *   compare(indexA: number, indexB: number): number {
 *     const a = this.values[indexA];
 *     const b = this.values[indexB];
 *     return a < b ? -1 : (a > b ? 1 : 0);
 *   }
 * }
 *
 * // Usage with graph node degrees
 * const nodeDegrees = [5, 2, 8, 1, 6];
 * const comparator = new SimpleIndirectComparator(nodeDegrees);
 * const indices = [0, 1, 2, 3, 4];
 *
 * indices.sort((a, b) => comparator.compare(a, b));
 * console.log(indices); // [3, 1, 0, 4, 2] - nodes sorted by ascending degree
 * console.log(indices.map(i => nodeDegrees[i])); // [1, 2, 5, 6, 8] - sorted degrees
 * ```
 *
 * @example
 * ```typescript
 * // Advanced: Multi-criteria indirect comparator
 * class NodeRankingComparator implements IndirectComparator {
 *   constructor(
 *     private pageRankScores: number[],
 *     private nodeDegrees: number[],
 *     private communityIds: number[]
 *   ) {}
 *
 *   compare(indexA: number, indexB: number): number {
 *     // Primary sort: Community ID
 *     const communityDiff = this.communityIds[indexA] - this.communityIds[indexB];
 *     if (communityDiff !== 0) return communityDiff;
 *
 *     // Secondary sort: PageRank score (descending)
 *     const pageRankDiff = this.pageRankScores[indexB] - this.pageRankScores[indexA];
 *     if (Math.abs(pageRankDiff) > 1e-10) return pageRankDiff < 0 ? -1 : 1;
 *
 *     // Tertiary sort: Node degree (descending)
 *     return this.nodeDegrees[indexB] - this.nodeDegrees[indexA];
 *   }
 * }
 *
 * // Creates sophisticated node ranking without moving any graph data
 * ```
 *
 * @example
 * ```typescript
 * // Integration with graph algorithms: Kruskal's MST
 * class EdgeWeightComparator implements IndirectComparator {
 *   constructor(private edgeWeights: number[]) {}
 *
 *   compare(edgeIndexA: number, edgeIndexB: number): number {
 *     const weightA = this.edgeWeights[edgeIndexA];
 *     const weightB = this.edgeWeights[edgeIndexB];
 *     return weightA < weightB ? -1 : (weightA > weightB ? 1 : 0);
 *   }
 * }
 *
 * function kruskalMST(edgeWeights: number[], edgeSources: number[],
 *                     edgeTargets: number[], nodeCount: number): number[] {
 *   const comparator = new EdgeWeightComparator(edgeWeights);
 *   const edgeIndices = Array.from({length: edgeWeights.length}, (_, i) => i);
 *
 *   // Sort edges by weight without moving edge data
 *   edgeIndices.sort((a, b) => comparator.compare(a, b));
 *
 *   const mstEdges: number[] = [];
 *   const unionFind = new UnionFind(nodeCount);
 *
 *   // Process edges in weight order using sorted indices
 *   for (const edgeIndex of edgeIndices) {
 *     const source = edgeSources[edgeIndex];
 *     const target = edgeTargets[edgeIndex];
 *
 *     if (unionFind.union(source, target)) {
 *       mstEdges.push(edgeIndex);
 *     }
 *   }
 *
 *   return mstEdges;
 * }
 * ```
 */
export interface IndirectComparator {
  /**
   * ## Compares two elements by their indices in the underlying data structure.
   *
   * **Core comparison method for indirect sorting operations.**
   *
   * This method defines the **ordering relationship** between elements at the specified
   * indices without accessing or moving the actual data. The comparison result follows
   * standard **three-way comparison semantics** compatible with all sorting algorithms.
   *
   * ### Return Value Semantics:
   * - **Negative value** (`< 0`): Element at `indexA` should come **before** element at `indexB`
   * - **Zero** (`=== 0`): Elements at `indexA` and `indexB` are **equivalent** in sort order
   * - **Positive value** (`> 0`): Element at `indexA` should come **after** element at `indexB`
   *
   * ### Performance Requirements:
   * - **O(1) time complexity** - constant time comparison operation
   * - **Deterministic behavior** - same inputs always produce same output
   * - **Thread-safe access** - safe for concurrent read operations
   * - **Bounds checking** - validate indices to prevent array access errors
   *
   * ### Mathematical Properties:
   * Implementations **must satisfy** total ordering requirements:
   *
   * #### **Reflexivity:**
   * ```typescript
   * compare(i, i) === 0  // Any index equals itself
   * ```
   *
   * #### **Antisymmetry:**
   * ```typescript
   * if (compare(i, j) < 0) then compare(j, i) > 0
   * if (compare(i, j) > 0) then compare(j, i) < 0
   * if (compare(i, j) === 0) then compare(j, i) === 0
   * ```
   *
   * #### **Transitivity:**
   * ```typescript
   * if (compare(i, j) < 0) && (compare(j, k) < 0) then compare(i, k) < 0
   * if (compare(i, j) > 0) && (compare(j, k) > 0) then compare(i, k) > 0
   * ```
   *
   * ### Error Handling:
   * Implementations should validate index bounds and throw appropriate exceptions:
   * - **RangeError**: For out-of-bounds indices
   * - **TypeError**: For invalid index types (non-integers, NaN, etc.)
   *
   * @param indexA **First index** to compare (must be valid for underlying data)
   * @param indexB **Second index** to compare (must be valid for underlying data)
   * @returns **Comparison result** following three-way comparison semantics
   *
   * @throws {RangeError} If either index is out of bounds
   * @throws {TypeError} If either index is not a valid integer
   *
   * @example
   * ```typescript
   * // Basic numeric comparison by index
   * class NumericComparator implements IndirectComparator {
   *   constructor(private data: number[]) {}
   *
   *   compare(indexA: number, indexB: number): number {
   *     const a = this.data[indexA];
   *     const b = this.data[indexB];
   *     return a < b ? -1 : (a > b ? 1 : 0);
   *   }
   * }
   *
   * const scores = [85, 92, 78, 96, 88];
   * const comparator = new NumericComparator(scores);
   *
   * console.log(comparator.compare(0, 1)); // -1 (85 < 92)
   * console.log(comparator.compare(3, 1)); //  1 (96 > 92)
   * console.log(comparator.compare(2, 2)); //  0 (78 === 78)
   * ```
   *
   * @example
   * ```typescript
   * // String comparison by index for lexicographic sorting
   * class LexicographicComparator implements IndirectComparator {
   *   constructor(private labels: string[]) {}
   *
   *   compare(indexA: number, indexB: number): number {
   *     const a = this.labels[indexA];
   *     const b = this.labels[indexB];
   *     return a.localeCompare(b);
   *   }
   * }
   *
   * const nodeLabels = ['Charlie', 'Alice', 'Bob', 'David'];
   * const lexComparator = new LexicographicComparator(nodeLabels);
   * const indices = [0, 1, 2, 3];
   *
   * indices.sort((a, b) => lexComparator.compare(a, b));
   * console.log(indices); // [1, 2, 0, 3] - Alice, Bob, Charlie, David
   * ```
   *
   * @example
   * ```typescript
   * // Complex multi-field comparison for graph node ranking
   * class NodeRankComparator implements IndirectComparator {
   *   constructor(
   *     private pageRankScores: number[],
   *     private betweennessCentrality: number[],
   *     private clusteringCoefficient: number[]
   *   ) {}
   *
   *   compare(indexA: number, indexB: number): number {
   *     // Primary criterion: PageRank (descending - higher is better)
   *     const pageRankDiff = this.pageRankScores[indexB] - this.pageRankScores[indexA];
   *     if (Math.abs(pageRankDiff) > 1e-10) {
   *       return pageRankDiff < 0 ? -1 : 1;
   *     }
   *
   *     // Secondary criterion: Betweenness centrality (descending)
   *     const betweennessDiff = this.betweennessCentrality[indexB] - this.betweennessCentrality[indexA];
   *     if (Math.abs(betweennessDiff) > 1e-10) {
   *       return betweennessDiff < 0 ? -1 : 1;
   *     }
   *
   *     // Tertiary criterion: Clustering coefficient (ascending - more structured first)
   *     const clusteringDiff = this.clusteringCoefficient[indexA] - this.clusteringCoefficient[indexB];
   *     return Math.abs(clusteringDiff) <= 1e-10 ? 0 : (clusteringDiff < 0 ? -1 : 1);
   *   }
   * }
   *
   * // Enables sophisticated node ranking without moving any graph data
   * const ranking = Array.from({length: nodeCount}, (_, i) => i);
   * ranking.sort((a, b) => nodeComparator.compare(a, b));
   * ```
   */
  compare(indexA: number, indexB: number): number;
}
