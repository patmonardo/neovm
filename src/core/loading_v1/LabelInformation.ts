import { NodeLabel } from "@/NodeLabel";
import { IdMap } from "@/api/IdMap";
import { BitSet } from "@/collections/BitSet"; // We'll need a BitSet implementation
import { OfLong } from "@/api/OfLong";

/**
 * Information about node labels in a graph.
 */
export interface LabelInformation {
  /**
   * Checks if this label information is empty.
   */
  isEmpty(): boolean;

  /**
   * Process each label and its BitSet through a consumer.
   *
   * @param consumer The consumer to process each label with
   */
  forEach(consumer: LabelInformation.LabelInformationConsumer): void;

  /**
   * Creates a filtered view of this label information.
   *
   * @param nodeLabels The labels to include
   * @returns Filtered label information
   */
  filter(nodeLabels: Iterable<NodeLabel>): LabelInformation;

  /**
   * Creates a union BitSet for specified node labels.
   *
   * @param nodeLabels The labels to union
   * @param nodeCount The total number of nodes
   * @returns A BitSet with all nodes that have any of the specified labels
   */
  unionBitSet(nodeLabels: Iterable<NodeLabel>, nodeCount: number): BitSet;

  /**
   * Returns the number of nodes with the specified label.
   *
   * @param nodeLabel The node label
   * @returns Number of nodes with the label
   */
  nodeCountForLabel(nodeLabel: NodeLabel): number;

  /**
   * Checks if a node has a specific label.
   *
   * @param nodeId The node ID
   * @param nodeLabel The node label
   * @returns True if the node has the label
   */
  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean;

  /**
   * Returns all available node labels.
   *
   * @returns Set of all node labels
   */
  availableNodeLabels(): Set<NodeLabel>;

  /**
   * Returns all labels for a specific node.
   *
   * @param nodeId The node ID
   * @returns List of labels for the node
   */
  nodeLabelsForNodeId(nodeId: number): NodeLabel[];

  /**
   * Process each label of a node through a consumer.
   *
   * @param nodeId The node ID
   * @param consumer The consumer to process each label
   */
  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void;

  /**
   * Validates that the given node labels exist.
   *
   * @param nodeLabels The labels to validate
   * @throws Error if any label doesn't exist
   */
  validateNodeLabelFilter(nodeLabels: Iterable<NodeLabel>): void;

  /**
   * Returns an iterator over nodes with the specified labels.
   *
   * @param labels The labels to filter by
   * @param nodeCount The total number of nodes
   * @returns Iterator over node IDs
   */
  nodeIterator(labels: Iterable<NodeLabel>, nodeCount: number): OfLong;

  /**
   * Adds a label to the available labels.
   *
   * @param nodeLabel The label to add
   */
  addLabel(nodeLabel: NodeLabel): void;

  /**
   * Adds a node ID to a label.
   *
   * @param nodeId The node ID
   * @param nodeLabel The node label
   */
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void;

  /**
   * Checks if this is a single label implementation.
   *
   * @returns True if this is a single label implementation
   */
  isSingleLabel(): boolean;

  /**
   * Converts this to a multi-label implementation.
   *
   * @param nodeLabelToMutate The label to mutate
   * @returns A multi-label implementation
   */
  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation;
}

/**
 * Nested interfaces for LabelInformation.
 */
export namespace LabelInformation {
  /**
   * Consumer for processing label information.
   */
  export interface LabelInformationConsumer {
    /**
     * Process a node label and its BitSet.
     *
     * @param nodeLabel The node label
     * @param bitSet The BitSet representing nodes with this label
     * @returns True to continue, false to stop
     */
    accept(nodeLabel: NodeLabel, bitSet: BitSet): boolean;
  }

  /**
   * Builder for creating LabelInformation instances.
   */
  export interface Builder {
    /**
     * Adds a node ID to a label.
     *
     * @param nodeLabel The node label
     * @param nodeId The node ID
     */
    addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void;

    /**
     * Builds the LabelInformation.
     *
     * @param nodeCount The total number of nodes
     * @param mappedIdFn Function to map original IDs to internal IDs
     * @returns A new LabelInformation instance
     */
    build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation;
  }
}
