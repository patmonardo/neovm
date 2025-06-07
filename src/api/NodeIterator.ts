import { NodeLabel } from '@/projection';
import { PrimitiveIterator } from '@/collections';

/**
 * Iterate over each node Id until either
 * all nodes have been consumed or the consumer
 * decides to stop the iteration.
 */
export interface NodeIterator {
  /**
   * Iterate over each nodeId.
   * The iteration continues until all nodes are visited or the consumer returns false.
   *
   * @param consumer Function called for each node ID; return false to stop iteration
   */
  forEachNode(consumer: (nodeId: number) => boolean): void;

  /**
   * Returns an iterator over all nodes.
   *
   * @returns Iterator over node IDs
   */
  nodeIterator(): PrimitiveIterator.OfLong;

  /**
   * Returns an iterator over nodes with the specified labels.
   *
   * @param labels Set of node labels to filter by
   * @returns Iterator over filtered node IDs
   */
  nodeIterator(labels: Array<NodeLabel>): PrimitiveIterator.OfLong;
}

