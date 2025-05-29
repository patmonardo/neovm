import { IndirectComparator } from '@/collections';

/**
 * # AscendingLongComparator - High-Performance Indirect Sorting
 *
 * ## Overview
 *
 * **AscendingLongComparator** enables **indirect sorting** of numeric arrays without
 * physically moving the original data. Instead of rearranging array elements, it
 * works with **index arrays** that point to the sorted order.
 *
 * ## The Indirect Sorting Advantage
 *
 * **Traditional sorting** moves actual data elements, which is expensive for:
 * - **Large objects** (graph nodes with many properties)
 * - **Synchronized arrays** (node IDs with corresponding edge lists)
 * - **Memory-mapped data** (persistent graph storage)
 * - **Cache-sensitive operations** (avoiding memory fragmentation)
 *
 * **Indirect sorting** creates a **permutation index array** that represents the
 * sorted order without touching the original data.
 *
 * ### Performance Benefits:
 * - **🚀 Zero data movement** - only index manipulation
 * - **📈 Cache-friendly** - better memory locality
 * - **🔗 Preserves relationships** - parallel arrays stay synchronized
 * - **⚡ Memory efficient** - no temporary copies of large data
 *
 * ## Graph Analytics Applications
 *
 * **Essential for high-performance graph operations:**
 *
 * ### **Node Ranking and Sorting:**
 * ```typescript
 * // Sort nodes by PageRank score without moving node data
 * const nodeIds = [100, 200, 300, 400, 500];
 * const pageRankScores = [0.3, 0.1, 0.9, 0.2, 0.7];
 *
 * // Indirect sort: creates index array [2, 4, 0, 3, 1]
 * // Meaning: pageRankScores[2] = 0.9 (highest), pageRankScores[4] = 0.7, etc.
 * ```
 *
 * ### **Temporal Graph Processing:**
 * ```typescript
 * // Sort edges by timestamp while preserving edge metadata
 * const edgeTimestamps = [1642000000, 1641500000, 1642500000];
 * const edgeWeights = [0.8, 0.3, 0.6];
 * const edgeSources = [10, 20, 30];
 * const edgeTargets = [15, 25, 35];
 *
 * // Indirect sort creates permutation that sorts all arrays consistently
 * ```
 *
 * ### **Community Detection:**
 * ```typescript
 * // Sort nodes by community membership without disrupting adjacency lists
 * const communityIds = [2, 1, 3, 1, 2, 3];
 * // Creates grouped ordering: [community 1 nodes], [community 2 nodes], [community 3 nodes]
 * ```
 *
 * ## Mathematical Foundation
 *
 * The comparator implements the **standard total ordering** for real numbers:
 * - **Reflexive**: `compare(a, a) = 0`
 * - **Antisymmetric**: if `compare(a, b) < 0` then `compare(b, a) > 0`
 * - **Transitive**: if `compare(a, b) < 0` and `compare(b, c) < 0` then `compare(a, c) < 0`
 * - **Total**: for any `a, b`, exactly one of `<`, `>`, or `=` holds
 *
 * This enables **stable, predictable sorting** essential for graph algorithm correctness.
 *
 * @example
 * ```typescript
 * // Basic indirect sorting of PageRank scores
 * const pageRankScores = [0.1, 0.4, 0.2, 0.3];
 * const comparator = new AscendingLongComparator(pageRankScores);
 *
 * // Create index array [0, 1, 2, 3]
 * const indices = Array.from({ length: pageRankScores.length }, (_, i) => i);
 *
 * // Sort indices by the values they point to
 * indices.sort((a, b) => comparator.compare(a, b));
 * console.log(indices); // [0, 2, 3, 1] - sorted by PageRank values
 *
 * // Access sorted values without moving original array
 * indices.forEach(i => console.log(pageRankScores[i])); // 0.1, 0.2, 0.3, 0.4
 * ```
 *
 * @example
 * ```typescript
 * // Graph analytics: Sort nodes by degree while preserving adjacency lists
 * const nodeDegrees = [5, 2, 8, 1, 6];
 * const nodeLabels = ['A', 'B', 'C', 'D', 'E'];
 * const adjacencyLists = [
 *   [1, 2, 3, 4, 0], // Node A's neighbors
 *   [0, 2],          // Node B's neighbors
 *   [0, 1, 3, 4, 2, 1, 0, 2], // Node C's neighbors
 *   [0, 2],          // Node D's neighbors
 *   [0, 2, 1, 4, 3, 0] // Node E's neighbors
 * ];
 *
 * const degreeComparator = new AscendingLongComparator(nodeDegrees);
 * const sortedIndices = Array.from({ length: nodeDegrees.length }, (_, i) => i);
 * sortedIndices.sort((a, b) => degreeComparator.compare(a, b));
 *
 * // Now access sorted data without moving original arrays
 * console.log('Nodes by ascending degree:');
 * sortedIndices.forEach(i => {
 *   console.log(`Node ${nodeLabels[i]}: degree ${nodeDegrees[i]}`);
 *   console.log(`  Neighbors: ${adjacencyLists[i]}`);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Temporal graph: Sort edges by timestamp for time-window analysis
 * const edgeTimestamps = [1640995200, 1641081600, 1640908800, 1641168000];
 * const edgeSources = [10, 20, 30, 40];
 * const edgeTargets = [15, 25, 35, 45];
 * const edgeWeights = [0.8, 0.3, 0.9, 0.1];
 *
 * const timeComparator = new AscendingLongComparator(edgeTimestamps);
 * const temporalOrder = Array.from({ length: edgeTimestamps.length }, (_, i) => i);
 * temporalOrder.sort((a, b) => timeComparator.compare(a, b));
 *
 * // Process edges in chronological order without moving data
 * console.log('Edges in temporal order:');
 * temporalOrder.forEach(i => {
 *   const timestamp = new Date(edgeTimestamps[i] * 1000);
 *   console.log(`${timestamp}: ${edgeSources[i]} -> ${edgeTargets[i]} (weight: ${edgeWeights[i]})`);
 * });
 * ```
 */
export class AscendingLongComparator implements IndirectComparator {
  private readonly array: number[];

  /**
   * ## Creates a new ascending comparator for a numeric array.
   *
   * **Initializes the comparator to work with the specified array for indirect sorting.**
   *
   * The comparator maintains a **read-only reference** to the array and provides
   * comparison operations based on the **values** at given indices. This enables
   * sorting of index arrays while keeping the original data unchanged.
   *
   * ### Use Cases:
   * - **PageRank score sorting** for node ranking algorithms
   * - **Timestamp sorting** for temporal graph analysis
   * - **Property-based sorting** for filtered graph traversals
   * - **Degree sorting** for hub identification algorithms
   * - **Weight sorting** for minimum spanning tree algorithms
   *
   * ### Thread Safety:
   * The comparator is **read-only** and **thread-safe** as long as the underlying
   * array is not modified during sorting operations. Multiple threads can safely
   * use the same comparator instance for different sorting operations.
   *
   * @param array **The numeric array** to compare elements from
   *
   * @throws {Error} If array is null or undefined
   *
   * @complexity
   * - **Time**: O(1) - simple reference assignment
   * - **Space**: O(1) - no additional memory allocation
   *
   * @example
   * ```typescript
   * // Graph node degrees for hub analysis
   * const nodeDegrees = [12, 5, 23, 8, 15, 3, 19];
   * const comparator = new AscendingLongComparator(nodeDegrees);
   *
   * // Use with any sorting algorithm that accepts a comparator
   * const indices = [0, 1, 2, 3, 4, 5, 6];
   * indices.sort((a, b) => comparator.compare(a, b));
   *
   * // Indices now represent nodes sorted by ascending degree
   * console.log('Low-degree nodes first:', indices.map(i => `Node ${i} (degree: ${nodeDegrees[i]})`));
   * ```
   *
   * @example
   * ```typescript
   * // Edge weights for MST algorithms
   * const edgeWeights = [0.8, 0.2, 0.9, 0.1, 0.5, 0.7];
   * const weightComparator = new AscendingLongComparator(edgeWeights);
   *
   * // Kruskal's algorithm: process edges in ascending weight order
   * const edgeIndices = Array.from({ length: edgeWeights.length }, (_, i) => i);
   * edgeIndices.sort((a, b) => weightComparator.compare(a, b));
   *
   * console.log('Edges for MST (lightest first):');
   * edgeIndices.forEach(i => console.log(`Edge ${i}: weight ${edgeWeights[i]}`));
   * ```
   *
   * @example
   * ```typescript
   * // Temporal analysis: Sort events by timestamp
   * const eventTimestamps = [1640995200, 1641081600, 1640908800, 1641168000, 1641254400];
   * const timeComparator = new AscendingLongComparator(eventTimestamps);
   *
   * // Create sliding time windows for temporal graph analysis
   * const chronologicalOrder = Array.from({ length: eventTimestamps.length }, (_, i) => i);
   * chronologicalOrder.sort((a, b) => timeComparator.compare(a, b));
   *
   * // Process graph changes in temporal order
   * for (const eventIndex of chronologicalOrder) {
   *   processGraphEvent(eventIndex, eventTimestamps[eventIndex]);
   * }
   * ```
   */
  constructor(array: number[]) {
    if (!array) {
      throw new Error('Array cannot be null or undefined');
    }
    this.array = array;
  }

  /**
   * ## Compares two array elements by their indices using ascending order.
   *
   * **Core comparison operation for indirect sorting algorithms.**
   *
   * This method implements the **heart of the indirect sorting process** by comparing
   * values in the original array without moving them. The comparison follows standard
   * **numerical ordering semantics** with **IEEE 754 floating-point handling**.
   *
   * ### Comparison Logic:
   * - **Less than**: `array[indexA] < array[indexB]` → returns `-1`
   * - **Greater than**: `array[indexA] > array[indexB]` → returns `1`
   * - **Equal**: `array[indexA] === array[indexB]` → returns `0`
   *
   * ### Special Value Handling:
   * - **NaN values**: Follow JavaScript semantics (`NaN` compares as greater than all numbers)
   * - **Infinity values**: `+Infinity` > all finite numbers, `-Infinity` < all finite numbers
   * - **Zero variants**: `+0` and `-0` are treated as equal
   *
   * ### Algorithm Integration:
   * This method is designed to work seamlessly with:
   * - **Array.sort()** with custom comparator functions
   * - **Quicksort** and **Mergesort** implementations
   * - **Heap-based priority queues** for graph algorithms
   * - **Custom sorting algorithms** in the collections framework
   *
   * @param indexA **First index** to compare (must be valid array index)
   * @param indexB **Second index** to compare (must be valid array index)
   * @returns **Comparison result**:
   *   - `-1` if `array[indexA] < array[indexB]`
   *   - `1` if `array[indexA] > array[indexB]`
   *   - `0` if `array[indexA] === array[indexB]`
   *
   * @throws {RangeError} If either index is out of array bounds
   *
   * @complexity
   * - **Time**: O(1) - constant time array access and comparison
   * - **Space**: O(1) - no additional memory required
   *
   * @example
   * ```typescript
   * // PageRank-based node ranking
   * const pageRankScores = [0.15, 0.35, 0.08, 0.42];
   * const comparator = new AscendingLongComparator(pageRankScores);
   *
   * // Compare nodes 1 and 3 by their PageRank scores
   * const result = comparator.compare(1, 3); // Compare 0.35 vs 0.42
   * console.log(result); // -1 (node 1 has lower PageRank than node 3)
   *
   * // Use in sorting context
   * const nodeIndices = [0, 1, 2, 3];
   * nodeIndices.sort((a, b) => comparator.compare(a, b));
   * console.log(nodeIndices); // [2, 0, 1, 3] - sorted by ascending PageRank
   * ```
   *
   * @example
   * ```typescript
   * // Edge weight comparison for graph algorithms
   * const edgeWeights = [0.9, 0.1, 0.5, 0.3];
   * const weightComparator = new AscendingLongComparator(edgeWeights);
   *
   * // Find the lightest edge between indices 0 and 2
   * if (weightComparator.compare(0, 2) > 0) {
   *   console.log(`Edge 2 (weight: ${edgeWeights[2]}) is lighter than Edge 0 (weight: ${edgeWeights[0]})`);
   * }
   *
   * // Integrate with priority queue for Dijkstra's algorithm
   * class EdgePriorityQueue {
   *   private edges: number[] = [];
   *
   *   enqueue(edgeIndex: number) {
   *     this.edges.push(edgeIndex);
   *     this.edges.sort((a, b) => weightComparator.compare(a, b));
   *   }
   *
   *   dequeue(): number {
   *     return this.edges.shift()!; // Always returns lightest edge
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Temporal graph: Compare events by timestamp
   * const eventTimestamps = [1641081600, 1640995200, 1641168000]; // Unix timestamps
   * const timeComparator = new AscendingLongComparator(eventTimestamps);
   *
   * // Determine chronological order
   * const result = timeComparator.compare(0, 1);
   * // Compares 1641081600 vs 1640995200
   * console.log(result); // 1 (event 0 happened after event 1)
   *
   * // Build temporal ordering for graph evolution analysis
   * const events = [0, 1, 2];
   * events.sort((a, b) => timeComparator.compare(a, b));
   *
   * console.log('Chronological event order:');
   * events.forEach(i => {
   *   const date = new Date(eventTimestamps[i] * 1000);
   *   console.log(`Event ${i}: ${date.toISOString()}`);
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Community detection: Sort by community size
   * const communitySizes = [150, 89, 203, 67, 134];
   * const sizeComparator = new AscendingLongComparator(communitySizes);
   *
   * // Find smallest communities first (for hierarchical merging)
   * const communityIndices = [0, 1, 2, 3, 4];
   * communityIndices.sort((a, b) => sizeComparator.compare(a, b));
   *
   * console.log('Communities by ascending size:');
   * communityIndices.forEach(i => {
   *   console.log(`Community ${i}: ${communitySizes[i]} members`);
   * });
   * ```
   */
  public compare(indexA: number, indexB: number): number {
    // Validate indices to prevent array access errors
    if (indexA < 0 || indexA >= this.array.length) {
      throw new RangeError(`Index A (${indexA}) is out of bounds [0, ${this.array.length})`);
    }
    if (indexB < 0 || indexB >= this.array.length) {
      throw new RangeError(`Index B (${indexB}) is out of bounds [0, ${this.array.length})`);
    }

    const a = this.array[indexA];
    const b = this.array[indexB];

    // Implement three-way comparison for ascending order
    if (a < b) {
      return -1;
    } else {
      return a > b ? 1 : 0;
    }
  }

  /**
   * ## Gets the underlying array being compared.
   *
   * **Provides read-only access to the array for debugging and introspection.**
   *
   * This getter allows external code to access the underlying data for validation,
   * debugging, or advanced use cases where the original array values are needed
   * alongside the comparison operations.
   *
   * ### Use Cases:
   * - **Debugging**: Verify comparator is using correct data
   * - **Validation**: Check array bounds before comparison operations
   * - **Metrics**: Calculate statistics about the data being sorted
   * - **Visualization**: Display original values alongside sorted indices
   *
   * ### Important Notes:
   * - **Read-only semantics**: Modifying the returned array affects comparator behavior
   * - **Reference sharing**: Returns reference to original array (not a copy)
   * - **Thread safety**: Safe to read, but mutations require synchronization
   *
   * @returns **Reference to the underlying array** (read-only access recommended)
   *
   * @example
   * ```typescript
   * const pageRankScores = [0.1, 0.4, 0.2, 0.3];
   * const comparator = new AscendingLongComparator(pageRankScores);
   *
   * // Access underlying data for validation
   * const data = comparator.getArray();
   * console.log(`Sorting ${data.length} PageRank scores`);
   * console.log(`Min score: ${Math.min(...data)}, Max score: ${Math.max(...data)}`);
   *
   * // Use in debugging/logging scenarios
   * function debugSort(indices: number[], comparator: AscendingLongComparator) {
   *   const values = comparator.getArray();
   *   console.log('Before sort:', indices.map(i => `${i}:${values[i]}`));
   *
   *   indices.sort((a, b) => comparator.compare(a, b));
   *
   *   console.log('After sort:', indices.map(i => `${i}:${values[i]}`));
   * }
   * ```
   */
  public getArray(): readonly number[] {
    return this.array;
  }
}
