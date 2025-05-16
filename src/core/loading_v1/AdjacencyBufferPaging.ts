/**
 * Defines the contract for mapping a global source node ID to a page ID
 * and a local ID within that page, and for reconstructing the global
 * source node ID from its local ID and page ID.
 *
 * This is used by AdjacencyBuffer to distribute and manage node adjacencies
 * across different pages or chunks.
 */
export interface AdjacencyBufferPaging {
  /**
   * Calculates the page ID for a given global source node ID.
   * @param source The global source node ID (long in Java).
   * @returns The page ID (int in Java) for this source node.
   */
  pageId(source: number): number;

  /**
   * Calculates the local ID within a page for a given global source node ID.
   * @param source The global source node ID (long in Java).
   * @returns The local ID (long in Java) for this source node within its page.
   */
  localId(source: number): number;

  /**
   * Reconstructs the global source node ID from its local ID and page ID.
   * @param localId The local ID (long in Java) of the node within its page.
   * @param pageId The page ID (int in Java) where the node resides.
   * @returns The global source node ID (long in Java).
   */
  sourceNodeId(localId: number, pageId: number): number;
}
