import { IdMap } from './IdMap';

/**
 * Extends the IdMap to support an additional
 * filtered id mapping layer.
 *
 * The mapping layers are called the following:
 * originalNodeId -- mappedNodeId (rootNodeId) -- filteredNodeId
 *
 * The first mapping layer (mappedNodeId) is also
 * referred to as rootNodeId.
 *
 * Note that functions like toOriginalNodeId() or toMappedNodeId()
 * will return the outermost or innermost mapped values respectively.
 */
export interface FilteredIdMap extends IdMap {
  /**
   * Maps a root mapped node id to a filtered mapped node id.
   * This is necessary for nested (filtered) id mappings.
   *
   * If this mapping is a nested mapping, this method
   * returns the mapped id corresponding to the mapped
   * id of the parent mapping.
   * For the root mapping this method returns the given
   * node id.
   *
   * @param rootNodeId The mapped node ID to convert
   * @returns The corresponding filtered node ID
   */
  toFilteredNodeId(rootNodeId: number): number;

  /**
   * Checks if the rootNodeId (mappedNodeId) is
   * present in the IdMap's mapping information.
   *
   * @param rootNodeId The mapped node ID to check
   * @returns True if the ID exists in the mapping
   */
  containsRootNodeId(rootNodeId: number): boolean;
}
