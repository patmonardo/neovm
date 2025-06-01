/**
 * Utility class for handling common loading exceptions.
 * This class is not meant to be instantiated.
 */
export class LoadingExceptions {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Validates that the target node of a relationship is loaded.
   * @param mappedId The mapped ID of the node. -1 indicates not loaded.
   * @param neoId The original Neo4j ID of the node.
   * @throws Error if the node is not loaded.
   */
  public static validateTargetNodeIsLoaded(mappedId: number, neoId: number): void {
    LoadingExceptions.validateNodeIsLoaded(mappedId, neoId, "target");
  }

  /**
   * Validates that the source node of a relationship is loaded.
   * @param mappedId The mapped ID of the node. -1 indicates not loaded.
   * @param neoId The original Neo4j ID of the node.
   * @throws Error if the node is not loaded.
   */
  public static validateSourceNodeIsLoaded(mappedId: number, neoId: number): void {
    LoadingExceptions.validateNodeIsLoaded(mappedId, neoId, "source");
  }

  /**
   * Checks if the given node ID is positive.
   * GDS has the general assumption of non-negative original node ids.
   * @param nodeId The node ID to check.
   * @throws Error if the node ID is negative.
   */
  public static checkPositiveId(nodeId: number): void {
    if (nodeId < 0n) { // Use BigInt literal for comparison
      throw new Error(
        `GDS expects node ids to be positive. But got a negative id of \`${nodeId}\`.`
      );
    }
  }

  /**
   * Validates that a node involved in a relationship is loaded.
   * @param mappedId The mapped ID of the node. -1 indicates not loaded.
   * @param neoId The original Neo4j ID of the node.
   * @param side A string indicating whether it's the "source" or "target" node.
   * @throws Error if the node is not loaded.
   */
  private static validateNodeIsLoaded(mappedId: number, neoId: number, side: string): void {
    if (mappedId === -1) { // Use BigInt literal for comparison
      throw new Error(
        `Failed to load a relationship because its ${side}-node with id ${neoId} is not part of the node query or projection. ` +
        `To ignore the relationship, set the configuration parameter \`validateRelationships\` to false.`
      );
    }
  }
}
