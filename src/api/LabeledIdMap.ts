import { NodeLabel } from "@/NodeLabel";
import { IdMap } from "./IdMap";
import { LabelInformation } from "@/core/loading/LabelInformation";
import { PrimitiveLongIterable } from "@/collections/primitive/PrimitiveLongIterable";
import { LazyBatchCollection } from "@/core/utils/LazyBatchCollection";
import { OfLong } from "./OfLong";
import { IdIterable } from "./IdIterable";

/**
 * Abstract base class providing common label-related functionality for IdMap implementations.
 */
export abstract class LabeledIdMap implements IdMap {
  /**
   * Information about node labels.
   */
  protected labelInformation: LabelInformation;

  /**
   * The total number of nodes.
   */
  private readonly _nodeCount: number;

  /**
   * Creates a new LabeledIdMap.
   *
   * @param labelInformation Information about node labels
   * @param nodeCount Total number of nodes
   */
  constructor(labelInformation: LabelInformation, nodeCount: number) {
    this.labelInformation = labelInformation;
    this._nodeCount = nodeCount;
  }

  /**
   * Returns the label information.
   */
  public getLabelInformation(): LabelInformation {
    return this.labelInformation;
  }

  // Abstract methods from IdMap that must be implemented by concrete subclasses
  abstract typeId(): string;
  abstract toMappedNodeId(originalNodeId: number): number;
  abstract safeToMappedNodeId(originalNodeId: number): number;
  abstract toOriginalNodeId(mappedNodeId: number): number;
  abstract toRootNodeId(mappedNodeId: number): number;
  abstract rootIdMap(): IdMap;
  abstract rootNodeCount(): number | undefined;
  abstract containsOriginalId(originalNodeId: number): boolean;
  abstract highestOriginalId(): number;
  abstract withFilteredLabels(
    nodeLabels: Set<NodeLabel>,
    concurrency: any
  ): any;

  /**
   * Returns the total number of nodes.
   */
  nodeCount(): number;
  nodeCount(nodeLabel: NodeLabel): number;
  nodeCount(nodeLabel?: NodeLabel): number {
    if (nodeLabel === undefined) {
      return this._nodeCount;
    }
    return this.labelInformation.nodeCountForLabel(nodeLabel);
  }

  /**
   * Executes a consumer function for each node.
   *
   * @param consumer The consumer function
   */
  forEachNode(consumer: (nodeId: number) => boolean): void {
    const count = this._nodeCount;
    for (let i = 0n; i < count; i++) {
      if (!consumer(i)) {
        return;
      }
    }
  }
  // Assume you have a way to get the OfLong iterators, for example:
  private getInternalNodeIterator(): OfLong {
    // ... your logic to return an OfLong iterator for all nodes
    return {} as OfLong; // Placeholder
  }

  private getInternalNodeIteratorForLabels(labels: Set<NodeLabel>): OfLong {
    // ... your logic to return an OfLong iterator for specific labels
    return {} as OfLong; // Placeholder
  }

  // Overload signatures as required by IdMap
  nodeIterator(): Iterator<number>;
  nodeIterator(labels: Set<NodeLabel>): Iterator<number>;
  // Implementation
  nodeIterator(labels?: Set<NodeLabel>): Iterator<number> {
    const ofLongIterator = labels
      ? this.getInternalNodeIteratorForLabels(labels)
      : this.getInternalNodeIterator();

    // Adapt OfLong to the standard Iterator<number> interface
    return {
      next(): IteratorResult<number> {
        if (ofLongIterator.hasNext()) {
          // Assuming OfLong has hasNext()
          return {
            value: ofLongIterator.nextLong(), // Assuming OfLong has nextLong()
            done: false,
          };
        } else {
          return {
            value: undefined as any, // Or null, depending on your preference for exhausted iterators
            done: true,
          };
        }
      },
    };
  }


  /**
   * Returns a collection of iterables for batch processing.
   *
   * @param batchSize The size of each batch
   */
  batchIterables(batchSize: number): PrimitiveLongIterable[] {
    return LazyBatchCollection.of(
      this._nodeCount,
      batchSize,
      (start: number, end: number) => new IdIterable(start, end)
    );
  }

  /**
   * Returns the available node labels.
   */
  availableNodeLabels(): Set<NodeLabel> {
    return this.labelInformation.availableNodeLabels();
  }

  /**
   * Returns the node labels for a given node.
   *
   * @param mappedNodeId The node ID
   */
  nodeLabels(mappedNodeId: number): NodeLabel[] {
    return this.labelInformation.nodeLabelsForNodeId(mappedNodeId);
  }

  /**
   * Processes each node label for a given node.
   *
   * @param mappedNodeId The node ID
   * @param consumer The consumer function
   */
  forEachNodeLabel(
    mappedNodeId: number,
    consumer: IdMap.NodeLabelConsumer
  ): void {
    this.labelInformation.forEachNodeLabel(mappedNodeId, consumer);
  }

  /**
   * Checks if a node has a specific label.
   *
   * @param mappedNodeId The node ID
   * @param label The node label
   */
  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.labelInformation.hasLabel(mappedNodeId, label);
  }

  /**
   * Adds a node label.
   *
   * @param nodeLabel The node label to add
   */
  addNodeLabel(nodeLabel: NodeLabel): void {
    this.prepareForAddingNodeLabel(nodeLabel);
    this.labelInformation.addLabel(nodeLabel);
  }

  /**
   * Adds a node ID to a label.
   *
   * @param nodeId The node ID
   * @param nodeLabel The node label
   */
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.prepareForAddingNodeLabel(nodeLabel);
    this.labelInformation.addNodeIdToLabel(nodeId, nodeLabel);
  }

  /**
   * Prepares for adding a node label.
   *
   * @param nodeLabel The node label
   * @private
   */
  private prepareForAddingNodeLabel(nodeLabel: NodeLabel): void {
    if (this.labelInformation.isSingleLabel()) {
      this.labelInformation = this.labelInformation.toMultiLabel(nodeLabel);
    }
  }
}
