import { NodeLabel } from "@/NodeLabel";
import { GraphStore } from "@/api/GraphStore";
import { IdMap } from "@/api/IdMap";
import { formatWithLocale } from "@/utils/StringFormatting";
import { join } from "@/utils/StringJoining";

/**
 * Utility class for validating node configurations
 */
export class ConfigNodesValidations {
  // Private constructor to prevent instantiation
  private constructor() {}

  /**
   * When parsing nodes in a config we can validate the node ids are non-negative.
   * @param nodes collection of nodes to validate
   * @param parameterKey the parameter key under which the user submitted these nodes
   */
  public static nodesNotNegative(nodes: number[], parameterKey: string): void {
    const negativeNodes = nodes.filter((n) => n < 0n);
    if (negativeNodes.length === 0) return;

    throw new Error(
      formatWithLocale(
        "Negative node ids are not supported for the field `%s`. Negative node ids: %s",
        parameterKey,
        negativeNodes
      )
    );
  }

  /**
   * Once we have a graph store and the filter labels we can validate that the nodes exist in the graph.
   * @param graphStore
   * @param filteredNodeLabels
   * @param nodes collection of nodes to validate
   * @param parameterKey the parameter key under which the user submitted these nodes
   */
  public static nodesExistInGraph(
    graphStore: GraphStore,
    filteredNodeLabels: Set<NodeLabel>,
    nodes: number[],
    parameterKey: string
  ): void {
    const missingNodes = nodes
      .filter((targetNode) =>
        this.labelFilteredGraphNotContainsNode(
          filteredNodeLabels,
          graphStore.nodes(),
          targetNode
        )
      )
      .map(String);

    if (missingNodes.length > 0) {
      throw new Error(
        formatWithLocale(
          "%s nodes do not exist in the in-memory graph%s: %s",
          parameterKey,
          this.nodeLabelFilterDescription(filteredNodeLabels, graphStore),
          missingNodes
        )
      );
    }
  }

  /**
   * Validates that a node property exists in the graph store
   */
  public static validateNodePropertyExists(
    graphStore: GraphStore,
    nodeLabels: Set<NodeLabel>,
    configKey: string,
    propertyName: string
  ): void {
    if (graphStore.hasNodeProperty(nodeLabels, propertyName)) return;

    throw new Error(
      formatWithLocale(
        "%s `%s` not found in graph with node properties: %s",
        configKey,
        propertyName,
        [...graphStore.nodePropertyKeys()].sort()
      )
    );
  }

  /**
   * Checks if a node with the given Neo4j ID does not exist in the graph with the specified labels
   */
  private static labelFilteredGraphNotContainsNode(
    filteredNodeLabels: Set<NodeLabel>,
    idMap: IdMap,
    neoNodeId: number
  ): boolean {
    const internalNodeId = idMap.safeToMappedNodeId(neoNodeId);

    if (internalNodeId === IdMap.NOT_FOUND) {
      return true;
    }

    // Get the node labels and check if any match our filtered labels
    const nodeLabels = idMap.nodeLabels(internalNodeId);
    for (const label of nodeLabels) {
      // Check if this label is in our filtered set
      if (this.setContains(filteredNodeLabels, label)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates a description string for the node label filter
   */
  private static nodeLabelFilterDescription(
    filteredNodeLabels: Set<NodeLabel>,
    graphStore: GraphStore
  ): string {
    const graphNodeLabels = graphStore.nodeLabels();

    // Check if all filtered labels exist in the graph
    let allLabelsExist = true;
    for (const label of filteredNodeLabels) {
      if (!this.collectionContains(graphNodeLabels, label)) {
        allLabelsExist = false;
        break;
      }
    }

    return allLabelsExist
      ? ""
      : " for the labels " +
          join([...filteredNodeLabels].map((label) => label.name));
  }

  /**
   * Helper method to check if a Set contains an element
   * using proper object equality checking
   */
  private static setContains<T extends object>(set: Set<T>, item: T): boolean {
    // If we're comparing by reference (like for objects), we need to iterate
    if (typeof item === "object" && item !== null) {
      // For NodeLabel objects, compare by name
      if ("name" in item && typeof (item as any).name === "string") {
        const searchName = (item as any).name;
        for (const element of set) {
          if ("name" in element && (element as any).name === searchName) {
            return true;
          }
        }
        return false;
      }

      // Default object comparison by iterating
      for (const element of set) {
        if (element === item) {
          return true;
        }
      }
      return false;
    }

    // For primitives, use the built-in has method
    return set.has(item);
  }

  /**
   * Helper method to check if a collection contains an element
   * Works with both Arrays and Sets
   */
  private static collectionContains<T extends object>(
    collection: T[] | Set<T>,
    item: T
  ): boolean {
    if (Array.isArray(collection)) {
      // For arrays, we can use includes for primitives
      if (typeof item !== "object" || item === null) {
        return collection.includes(item);
      }

      // For objects, we need to check equality manually
      if ("name" in item && typeof (item as any).name === "string") {
        const searchName = (item as any).name;
        return collection.some(
          (element) => "name" in element && (element as any).name === searchName
        );
      }

      return collection.includes(item);
    }

    // For Sets, use our setContains helper
    return this.setContains(collection, item);
  }
}
