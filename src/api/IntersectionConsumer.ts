
export interface IntersectionConsumer {
  /**
   * Accepts a single intersection of three nodes.
   *
   * @param nodeA The first node ID
   * @param nodeB The second node ID
   * @param nodeC The third node ID
   */
  accept(nodeA: number, nodeB: number, nodeC: number): void;
}

