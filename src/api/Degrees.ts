/**
 * The Degrees interface is intended to return the degree of a given node.
 */
export interface Degrees {
  /**
   * Returns the number of relationships connected to that node.
   * For undirected graphs, this includes outgoing and incoming
   * relationships. For directed graphs, this is the number of
   * outgoing edges.
   *
   * @param nodeId The node ID to get degree for
   * @returns The degree of the node
   */
  degree(nodeId: number): number;

  /**
   * Returns the number of relationships connected to that node.
   * For directed graphs, this is the number of incoming edges.
   * For undirected graphs, the behaviour of this method is undefined.
   *
   * Note, that this is an optional feature, and it is up to the implementation
   * if this is actually supported. Check `Graph.characteristics()`
   * before calling this method to verify that the graph is inverse indexed.
   *
   * @param nodeId The node ID to get incoming degree for
   * @returns The incoming degree of the node
   */
  degreeInverse(nodeId: number): number;

  /**
   * Much slower than just degree() because it may have to look up all relationships.
   *
   * This is not thread-safe, so if this is called concurrently please use
   * `RelationshipIterator.concurrentCopy()`.
   *
   * @see Graph.isMultiGraph
   * @param nodeId The node ID to get degree for
   * @returns The degree of the node without counting parallel relationships
   */
  degreeWithoutParallelRelationships(nodeId: number): number;
}
