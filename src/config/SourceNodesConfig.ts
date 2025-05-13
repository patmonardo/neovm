import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { ConfigNodesValidations } from "./ConfigNodesValidations";
import { NodeIdParser } from "./NodeIdParser";

/**
 * Configuration for algorithms that use multiple source nodes
 */
@Configuration
export abstract class SourceNodesConfig {
  // Constants as static property
  static readonly SOURCE_NODES_KEY = "sourceNodes";

  /**
   * Returns the list of source node IDs for this configuration
   */
  @Configuration.ConvertWith("SourceNodesConfig.parseSourceNodes")
  sourceNodes(): number[] {
    return [];
  }

  /**
   * Parse input into a list of source node IDs
   */
  static parseSourceNodes(input: any): number[] {
    const nodes = NodeIdParser.parseToListOfNodeIds(
      input,
      SourceNodesConfig.SOURCE_NODES_KEY
    );
    ConfigNodesValidations.nodesNotNegative(
      nodes,
      SourceNodesConfig.SOURCE_NODES_KEY
    );
    return nodes;
  }

  /**
   * Validates that the source nodes exist in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateSourceLabels(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    ConfigNodesValidations.nodesExistInGraph(
      graphStore,
      selectedLabels,
      this.sourceNodes(),
      SourceNodesConfig.SOURCE_NODES_KEY
    );
  }
}
