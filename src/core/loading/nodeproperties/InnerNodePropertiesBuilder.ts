import { PartialIdMap } from '@/api/IdMap';
import { NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { GdsValue } from '@/values/GdsValue';

/**
 * Interface defining the contract for builders that create node property values.
 */
export interface InnerNodePropertiesBuilder {
  /**
   * Sets a property value for a node with the given Neo4j node ID.
   *
   * @param neoNodeId The original Neo4j node ID
   * @param value The property value to set
   */
  setValue(neoNodeId: number, value: GdsValue): void;

  /**
   * Builds the underlying node properties and performs a remapping
   * to the internal id space using the given id map.
   *
   * @param size The number of nodes in the graph
   * @param idMap The ID mapping from original to internal IDs
   * @param highestOriginalId The highest original node ID encountered
   * @return The built node property values
   */
  build(size: number, idMap: PartialIdMap, highestOriginalId: number): NodePropertyValues;
}
