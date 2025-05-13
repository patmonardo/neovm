import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { ConfigNodesValidations } from "./ConfigNodesValidations";
import { NodeIdParser } from "./NodeIdParser";

/**
 * Configuration for algorithms that use a target node
 */
@Configuration
export abstract class TargetNodeConfig {
  // Constants as static property
  static readonly TARGET_NODE_KEY = "targetNode";

  /**
   * Returns the target node ID for this configuration
   */
  @Configuration.ConvertWith("TargetNodeConfig.parseTargetNode")
  targetNode(): number {
    return 0n;
  }

  /**
   * Parse input into a target node ID
   */
  static parseTargetNode(input: any): number {
    const node = NodeIdParser.parseToSingleNodeId(
      input,
      TargetNodeConfig.TARGET_NODE_KEY
    );
    ConfigNodesValidations.nodesNotNegative(
      [node],
      TargetNodeConfig.TARGET_NODE_KEY
    );
    return node;
  }

  /**
   * Validates that the target node exists in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateTargetNode(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    ConfigNodesValidations.nodesExistInGraph(
      graphStore,
      selectedLabels,
      [this.targetNode()],
      TargetNodeConfig.TARGET_NODE_KEY
    );
  }
}
