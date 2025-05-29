/**
 * Disjoint Set Structure (Union-Find) interface for tracking partitioned elements.
 *
 * Essential for graph algorithms requiring connected component analysis:
 * - Union-Find operations for efficient set merging
 * - Path compression and union by rank optimizations
 * - Connected component detection in large graphs
 * - Clustering and community detection algorithms
 * - Cycle detection in undirected graphs
 *
 * Performance characteristics:
 * - Union operation: Nearly O(1) amortized with optimizations
 * - Find operation: Nearly O(1) amortized with path compression
 * - Space complexity: O(n) for n elements
 * - Excellent cache locality with proper implementation
 * - Supports billions of elements efficiently
 *
 * Algorithm optimizations:
 * - Path compression: flattens tree structure during find
 * - Union by rank/size: keeps trees balanced
 * - Inverse Ackermann function complexity: α(n) ≈ constant
 * - Memory-efficient representation with huge arrays
 * - Batch processing for high-throughput scenarios
 *
 * Use Cases:
 * - Connected components in undirected graphs
 * - Community detection and clustering
 * - Minimum spanning tree algorithms (Kruskal's)
 * - Image segmentation and blob detection
 * - Network connectivity analysis
 * - Social network cluster analysis
 *
 * @module DisjointSetStruct
 */

import { LongNodePropertyValues } from '@/api/properties/nodes';

export interface DisjointSetStruct {
  /**
   * Joins the set containing p with the set containing q.
   *
   * After this operation, setIdOf(p) === setIdOf(q).
   *
   * @param p Element from first set
   * @param q Element from second set
   *
   * Performance: Nearly O(1) amortized with union by rank
   *
   * @example
   * ```typescript
   * const dss = new HugeDisjointSetStruct(1000000);
   *
   * // Connect nodes in a graph component
   * dss.union(1, 2);  // Connect nodes 1 and 2
   * dss.union(2, 3);  // Connect node 3 to the component
   * dss.union(5, 6);  // Create separate component
   *
   * console.log(dss.sameSet(1, 3)); // true - connected through node 2
   * console.log(dss.sameSet(1, 5)); // false - different components
   * ```
   */
  union(p: number, q: number): void;

  /**
   * Finds the set identifier for the given element.
   *
   * Elements in the same set will return the same set ID.
   * The set ID is typically the root element of the set's tree.
   *
   * @param nodeId Element to find the set for
   * @returns Set identifier (root of the tree)
   *
   * Performance: Nearly O(1) amortized with path compression
   *
   * @example
   * ```typescript
   * const dss = new HugeDisjointSetStruct(1000000);
   *
   * // Initially, each element is its own set
   * console.log(dss.setIdOf(100)); // 100
   * console.log(dss.setIdOf(200)); // 200
   *
   * // After union, both elements have the same set ID
   * dss.union(100, 200);
   * const setId = dss.setIdOf(100);
   * console.log(dss.setIdOf(200) === setId); // true
   * ```
   */
  setIdOf(nodeId: number): number;

  /**
   * Checks if two elements belong to the same set.
   *
   * This is equivalent to setIdOf(p) === setIdOf(q) but may be
   * optimized to avoid redundant path compression operations.
   *
   * @param p First element
   * @param q Second element
   * @returns true if both elements are in the same set
   *
   * Note: Primarily intended for testing and validation
   *
   * @example
   * ```typescript
   * const dss = new HugeDisjointSetStruct(1000000);
   *
   * // Test connectivity in graph processing
   * function processEdge(source: number, target: number) {
   *   if (!dss.sameSet(source, target)) {
   *     dss.union(source, target);
   *     console.log(`Connected components ${source} and ${target}`);
   *   }
   * }
   * ```
   */
  sameSet(p: number, q: number): boolean;

  /**
   * Returns the total number of elements in the data structure.
   *
   * @returns Total element count
   *
   * @example
   * ```typescript
   * const dss = new HugeDisjointSetStruct(1000000);
   * console.log(dss.size()); // 1000000
   *
   * // Size doesn't change with union operations
   * dss.union(1, 2);
   * console.log(dss.size()); // Still 1000000
   * ```
   */
  size(): number;

  /**
   * Wraps the DisjointSetStruct as node properties for graph algorithms.
   *
   * This allows the union-find structure to be used directly as
   * node property values, where each node's property is its set ID.
   *
   * @returns LongNodePropertyValues interface for graph integration
   *
   * @example
   * ```typescript
   * const dss = new HugeDisjointSetStruct(1000000);
   *
   * // Process graph to find connected components
   * edges.forEach(edge => {
   *   dss.union(edge.source, edge.target);
   * });
   *
   * // Use as node properties
   * const componentProperties = dss.asNodeProperties();
   *
   * // Each node's component ID
   * for (let nodeId = 0; nodeId < 1000000; nodeId++) {
   *   const componentId = componentProperties.longValue(nodeId);
   *   console.log(`Node ${nodeId} is in component ${componentId}`);
   * }
   * ```
   */
  asNodeProperties(): LongNodePropertyValues;
}

/**
 * Node property values wrapper for disjoint set structures.
 */
class DisjointSetNodeProperties implements Partial<LongNodePropertyValues> {
  constructor(private readonly disjointSet: DisjointSetStruct) {}

  /**
   * Returns the set ID (component ID) for the given node.
   */
  longValue(nodeId: number): number {
    return this.disjointSet.setIdOf(nodeId);
  }

  /**
   * Returns the total number of nodes.
   */
  nodeCount(): number {
    return this.disjointSet.size();
  }
}

// Default implementation of asNodeProperties for the interface
export function createNodeProperties(disjointSet: DisjointSetStruct): Partial<LongNodePropertyValues> {
  return new DisjointSetNodeProperties(disjointSet);
}
