import { NodeLabel } from "@/projection";
import { Concurrency } from "@/concurrency/Concurrency";
import { PartialIdMap } from "./PartialIdMap";
import { NodeIterator } from "./NodeIterator";
import { BatchNodeIterable } from "./BatchNodeIterable";
import { FilteredIdMap } from "./FilteredIdMap";

/**
 * Bidirectional mapping between two id spaces.
 * Usually the IdMap is used to map between neo4j
 * node ids and consecutive mapped node ids.
 */
export interface IdMap extends PartialIdMap, NodeIterator, BatchNodeIterable {
  /**
   * A unique identifier for this type of IdMap.
   *
   * @returns Type identifier string
   */
  typeId(): string;

  /**
   * Map original nodeId to mapped nodeId.
   * Returns IdMap.NOT_FOUND if the nodeId is not mapped.
   *
   * @param originalNodeId Original node ID to map
   * @returns The mapped node ID or NOT_FOUND if not found
   */
  toMappedNodeId(originalNodeId: number): number;

  /**
   * Map original nodeId to mapped nodeId safely.
   * Returns IdMap.NOT_FOUND if the nodeId is not mapped.
   *
   * @param originalNodeId Original node ID to map
   * @returns The mapped node ID or NOT_FOUND if not found
   */
  safeToMappedNodeId(originalNodeId: number): number;

  /**
   * Returns the original node id for the given mapped node id.
   * The original node id is typically the Neo4j node id.
   *
   * This method is guaranteed to always return the Neo4j id,
   * regardless of the given mapped node id refers to a filtered
   * node id space or a regular / unfiltered node id space.
   *
   * @param mappedNodeId Internal node ID to translate
   * @returns Original node ID from the database
   */
  toOriginalNodeId(mappedNodeId: number): number;

  /**
   * Maps a filtered mapped node id to its root mapped node id.
   * This is necessary for nested (filtered) id mappings.
   *
   * If this mapping is a nested mapping, this method
   * returns the root mapped node id of the parent mapping.
   * For the root mapping this method returns the given
   * node id.
   *
   * @param mappedNodeId Mapped node ID to convert
   * @returns Root node ID
   */
  toRootNodeId(mappedNodeId: number): number;

  /**
   * Returns true if the Neo4j id is mapped, otherwise false.
   *
   * @param originalNodeId Original node ID to check
   * @returns True if the ID is mapped
   */
  containsOriginalId(originalNodeId: number): boolean;

  /**
   * Number of mapped nodeIds.
   *
   * @returns Total number of nodes in the mapping
   */
  nodeCount(): number;

  /**
   * Number of mapped nodeIds for a specific node label.
   *
   * @param nodeLabel Node label to count nodes for
   * @returns Number of nodes with the specified label
   */
  nodeCount(nodeLabel: NodeLabel): number;

  /**
   * The highest id that is mapped in this id mapping.
   *
   * The value is the upper bound of the original node id space.
   *
   * @returns Highest original ID in the mapping
   */
  highestOriginalId(): number;

  /**
   * Gets all labels for a specific node.
   *
   * @param mappedNodeId Mapped node ID
   * @returns List of node labels
   */
  nodeLabels(mappedNodeId: number): Set<NodeLabel>;

  /**
   * Iterates through all labels of a node.
   *
   * @param mappedNodeId Mapped node ID
   * @param consumer Function to call for each label
   */
  forEachNodeLabel(
    mappedNodeId: number,
    consumer: IdMap.NodeLabelConsumer
  ): void;

  /**
   * Gets all available node labels.
   *
   * @returns Set of all node labels
   */
  availableNodeLabels(): Set<NodeLabel>;

  /**
   * Checks if a node has a specific label.
   *
   * @param mappedNodeId Mapped node ID to check
   * @param label Label to check for
   * @returns True if the node has the label
   */
  hasLabel(mappedNodeId: number, label: NodeLabel): boolean;

  /**
   * Adds new node label to the available node labels.
   * The label is not assigned to any nodes at this point.
   *
   * @param nodeLabel The node label to add
   */
  addNodeLabel(nodeLabel: NodeLabel): void;

  /**
   * Assigns a node to the given node label.
   *
   * @param nodeId The node id to assign
   * @param nodeLabel The node label to which the node will be assigned to
   */
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void;

  /**
   * Returns the original node mapping if the current node mapping is filtered, otherwise
   * it returns itself.
   *
   * @returns Root IdMap
   */
  rootIdMap(): IdMap;

  /**
   * Creates a filtered view of this mapping based on node labels.
   *
   * @param nodeLabels Collection of node labels to filter by
   * @param concurrency Concurrency settings
   * @returns Optional filtered ID map
   */
  withFilteredLabels(
    nodeLabels: Array<NodeLabel>,
    concurrency: Concurrency
  ): FilteredIdMap | undefined;
}

/**
 * Namespace containing types and constants related to IdMap.
 */
export namespace IdMap {
  /**
   * Defines the lower bound of mapped ids
   */
  export const START_NODE_ID = 0;

  /**
   * Defines the value for unmapped ids
   */
  export const NOT_FOUND = -1;

  /**
   * Used for IdMap implementations that do not require a type definition.
   */
  export const NO_TYPE = "unsupported";

  /**
   * Consumer interface for processing node labels.
   */
  export interface NodeLabelConsumer {
    /**
     * Process a node label.
     *
     * @param nodeLabel The node label to process
     * @returns True to continue iteration, false to stop
     */
    accept(nodeLabel: NodeLabel): boolean;
  }
}
