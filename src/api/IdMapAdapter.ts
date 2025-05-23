import { NodeLabel } from "@/projection";
import { Concurrency } from "@/concurrency/Concurrency";
import { PrimitiveLongIterable } from "@/collections/primitive/PrimitiveLongIterable";
import { PrimitiveIterator } from "@/collections/primitive/PrimitiveIterator";
import { IdMap } from "./IdMap";
import { FilteredIdMap } from "./FilteredIdMap";

/**
 * Adapter for IdMap implementations that delegates all calls to an underlying IdMap.
 * This is useful for decorating existing IdMap implementations with additional behavior.
 */
export abstract class IdMapAdapter implements IdMap {
  /**
   * The underlying IdMap instance
   */
  protected readonly idMap: IdMap;

  /**
   * Creates a new IdMapAdapter.
   *
   * @param idMap The underlying IdMap to delegate calls to
   */
  constructor(idMap: IdMap) {
    this.idMap = idMap;
  }

  typeId(): string {
    return this.idMap.typeId();
  }

  batchIterables(batchSize: number): Set<PrimitiveLongIterable> {
    // Convert iterable to array if needed
    return this.idMap.batchIterables(batchSize);
  }

  toMappedNodeId(originalNodeId: number): number {
    return this.idMap.toMappedNodeId(originalNodeId);
  }

  safeToMappedNodeId(originalNodeId: number): number {
    return this.idMap.safeToMappedNodeId(originalNodeId);
  }

  toOriginalNodeId(mappedNodeId: number): number {
    return this.idMap.toOriginalNodeId(mappedNodeId);
  }

  toRootNodeId(mappedNodeId: number): number {
    return this.idMap.toRootNodeId(mappedNodeId);
  }

  rootIdMap(): IdMap {
    return this.idMap.rootIdMap();
  }

  containsOriginalId(originalNodeId: number): boolean {
    return this.idMap.containsOriginalId(originalNodeId);
  }

  nodeCount(): number;
  nodeCount(nodeLabel: NodeLabel): number;
  nodeCount(nodeLabel?: NodeLabel): number {
    return nodeLabel ? this.idMap.nodeCount(nodeLabel) : this.idMap.nodeCount();
  }

  rootNodeCount(): number | undefined {
    return this.idMap.rootNodeCount();
  }

  highestOriginalId(): number {
    return this.idMap.highestOriginalId();
  }

  forEachNode(consumer: (nodeId: number) => boolean): void {
    this.idMap.forEachNode(consumer);
  }

  // Fix the nodeIterator implementation
  nodeIterator(): PrimitiveIterator.OfLong;
  nodeIterator(labels: Set<NodeLabel>): PrimitiveIterator.OfLong;
  nodeIterator(labels?: Set<NodeLabel>): PrimitiveIterator.OfLong {
    // Get the iterator from the underlying idMap
    const iterator = labels
      ? this.idMap.nodeIterator(labels)
      : this.idMap.nodeIterator();

    // Use the standard Iterator interface
    return iterator;
  }

  nodeLabels(mappedNodeId: number): NodeLabel[] {
    return this.idMap.nodeLabels(mappedNodeId);
  }

  forEachNodeLabel(
    mappedNodeId: number,
    consumer: IdMap.NodeLabelConsumer
  ): void {
    this.idMap.forEachNodeLabel(mappedNodeId, consumer);
  }

  availableNodeLabels(): Set<NodeLabel> {
    return this.idMap.availableNodeLabels();
  }

  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.idMap.hasLabel(mappedNodeId, label);
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    this.idMap.addNodeLabel(nodeLabel);
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.idMap.addNodeIdToLabel(nodeId, nodeLabel);
  }

  withFilteredLabels(
    nodeLabels: Set<NodeLabel>,
    concurrency: Concurrency
  ): FilteredIdMap | undefined {
    return this.idMap.withFilteredLabels(nodeLabels, concurrency);
  }
}
