import { NodeLabel } from "../NodeLabel";
import { RelationshipType } from "../RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { NodeIdParser } from "./NodeIdParser";
import { ConfigNodesValidations } from "./ConfigNodesValidations";

/**
 * Configuration for algorithms that can optionally use a target node
 */
@Configuration
export abstract class OptionalTargetNodeConfig {
  // Constants as static property
  static readonly TARGET_NODE_KEY = "targetNode";

  /**
   * Returns the target node ID if specified, or undefined if not
   */
  @Configuration.ConvertWith("OptionalTargetNodeConfig.parseTargetNode")
  targetNode(): number | undefined {
    return undefined;
  }

  /**
   * Parse user input into an optional target node ID
   */
  static parseTargetNode(input: any): number | undefined {
    if (input === null || input === undefined) {
      return undefined;
    }

    const node = NodeIdParser.parseToSingleNodeId(
      input,
      OptionalTargetNodeConfig.TARGET_NODE_KEY
    );
    ConfigNodesValidations.nodesNotNegative(
      [node],
      OptionalTargetNodeConfig.TARGET_NODE_KEY
    );
    return node;
  }

  /**
   * Validates that the target node exists in the graph if specified
   */
  @Configuration.GraphStoreValidationCheck
  validateTargetNode(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    const node = this.targetNode();

    if (node !== undefined) {
      ConfigNodesValidations.nodesExistInGraph(
        graphStore,
        selectedLabels,
        [node],
        OptionalTargetNodeConfig.TARGET_NODE_KEY
      );
    }
  }
}
