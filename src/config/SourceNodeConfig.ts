import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { ConfigNodesValidations } from "./ConfigNodesValidations";
import { NodeIdParser } from "./NodeIdParser";

/**
 * Configuration for algorithms that use a source node
 */
@Configuration
export abstract class SourceNodeConfig {
  // Constants as static properties
  static readonly SOURCE_NODE_KEY = "sourceNode";

  /**
   * Returns the source node ID for this configuration
   */
  @Configuration.ConvertWith("SourceNodeConfig.parseSourceNode")
  sourceNode(): number {
    return 0n;
  }

  /**
   * Parse input into a source node ID
   */
  static parseSourceNode(input: any): number {
    const node = NodeIdParser.parseToSingleNodeId(
      input,
      SourceNodeConfig.SOURCE_NODE_KEY
    );
    ConfigNodesValidations.nodesNotNegative(
      [node],
      SourceNodeConfig.SOURCE_NODE_KEY
    );
    return node;
  }

  /**
   * Validates that the source node exists in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateSourceNode(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    ConfigNodesValidations.nodesExistInGraph(
      graphStore,
      selectedLabels,
      [this.sourceNode()],
      SourceNodeConfig.SOURCE_NODE_KEY
    );
  }
}
