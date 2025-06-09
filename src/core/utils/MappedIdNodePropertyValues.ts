import { IdMap } from '@/api';
import { LongNodePropertyValues } from '@/api/properties';

/**
 * A node property values implementation where the property value
 * is the same as the node's internal ID.
 */
export class MappedIdNodePropertyValues implements LongNodePropertyValues {
  private readonly _nodeCount: number;

  /**
   * Creates a new mapped ID node property values.
   *
   * @param idMap ID map to get the node count from
   */
  constructor(idMap: IdMap);

  /**
   * Creates a new mapped ID node property values.
   *
   * @param nodeCount The number of nodes
   */
  constructor(nodeCount: number);

  /**
   * Constructor implementation.
   *
   * @param idMapOrNodeCount ID map or node count
   */
  constructor(idMapOrNodeCount: IdMap | number) {
    if (typeof idMapOrNodeCount === 'number') {
      this._nodeCount = idMapOrNodeCount;
    } else {
      this._nodeCount = idMapOrNodeCount.nodeCount();
    }
  }

  /**
   * Returns the node ID as the property value.
   *
   * @param nodeId The node ID
   * @returns The node ID itself
   */
  public longValue(nodeId: number): number {
    return nodeId;
  }

  /**
   * Returns an empty optional since there's no defined maximum value.
   *
   * @returns An empty optional
   */
  public getMaxLongPropertyValue(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * Returns the number of nodes.
   *
   * @returns Node count
   */
  public nodeCount(): number {
    return this._nodeCount;
  }
}
