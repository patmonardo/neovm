/**
 * This interface exposes the relevant parts of IdMap used
 * for relationship loading. It helps implementations that are only used for relationship
 * loading to avoid implementing unnecessary methods.
 */
export interface PartialIdMap {
  /**
   * Maps an original node id to a mapped node id.
   * In case of nested id maps, the mapped node id
   * is always in the space of the innermost mapping.
   *
   * @param originalNodeId must be smaller or equal to the id returned by IdMap.highestOriginalId
   * @returns The mapped node ID or NOT_FOUND if not found
   */
  toMappedNodeId(originalNodeId: number): number;

  /**
   * Number of mapped node ids in the root mapping.
   * This is necessary for nested (filtered) id mappings.
   *
   * @returns The number of nodes in the root mapping, or undefined if not known/applicable
   */
  rootNodeCount(): number | undefined;
}

/**
 * Namespace containing constants and utilities for PartialIdMap.
 */
export namespace PartialIdMap {
  /**
   * Default implementation that doesn't map any IDs.
   */
  export const EMPTY: PartialIdMap = {
    toMappedNodeId(_originalNodeId: number): number {
      return -1n; // NOT_FOUND
    },

    rootNodeCount(): number | undefined {
      return undefined;
    }
  };
}
