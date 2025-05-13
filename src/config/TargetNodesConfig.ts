import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { NodeIdParser } from "./NodeIdParser";
import { ConfigNodesValidations } from "./ConfigNodesValidations";

/**
 * Configuration for algorithms that use multiple target nodes
 */
@Configuration
export abstract class TargetNodesConfig {
  // Constants as static property
  static readonly TARGET_NODES_KEY = "targetNodes";

  /**
   * Returns the list of target node IDs for this configuration
   */
  @Configuration.ConvertWith("TargetNodesConfig.parseTargetNodes")
  targetNodes(): number[] {
    return [];
  }

  /**
   * Whether this configuration has target nodes specified
   */
  @Configuration.Ignore
  hasTargetNodes(): boolean {
    return this.targetNodes().length > 0;
  }

  /**
   * Parse input into a list of target node IDs
   */
  static parseTargetNodes(input: any): number[] {
    const nodes = NodeIdParser.parseToListOfNodeIds(
      input,
      TargetNodesConfig.TARGET_NODES_KEY
    );
    ConfigNodesValidations.nodesNotNegative(
      nodes,
      TargetNodesConfig.TARGET_NODES_KEY
    );
    return nodes;
  }

  /**
   * Validates that the target nodes exist in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateTargetNodes(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    ConfigNodesValidations.nodesExistInGraph(
      graphStore,
      selectedLabels,
      this.targetNodes(),
      TargetNodesConfig.TARGET_NODES_KEY
    );
  }
}
