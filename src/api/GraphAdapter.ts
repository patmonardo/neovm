import { Graph } from "./Graph";
import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { NodePropertyValues } from "./properties/nodes/NodePropertyValues";
import { RelationshipConsumer } from "./properties/relationships/RelationshipConsumer";
import { RelationshipCursor } from "./properties/relationships/RelationshipCursor";
import { RelationshipWithPropertyConsumer } from "./properties/relationships/RelationshipWithPropertyConsumer";
import { GraphSchema } from "./schema/GraphSchema";
import { PrimitiveLongIterable } from "@/collections/primitive/PrimitiveLongIterable";
import { Concurrency } from "@/concurrency/Concurrency";
import { FilteredIdMap } from "./FilteredIdMap";
import { IdMap } from "./IdMap";
import { GraphCharacteristics } from "./GraphCharacteristics";
import { NodeLabelConsumer } from "./NodeLabelConsumer";
import { PrimitiveIterator } from "@/collections/primitive/PrimitiveIterator";

/**
 * Abstract adapter that delegates to an underlying Graph implementation.
 * Useful for creating modified views or specialized behaviors on top of existing graphs.
 */
export abstract class GraphAdapter implements Graph {
  /**
   * The underlying graph implementation.
   */
  protected readonly graph: Graph;

  /**
   * Creates a new graph adapter.
   *
   * @param graph The underlying graph to delegate to
   */
  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Returns the underlying graph.
   */
  public getGraph(): Graph {
    return this.graph;
  }

  typeId(): string {
    return this.graph.typeId();
  }

  relationshipCount(): number {
    return this.graph.relationshipCount();
  }

  hasRelationshipProperty(): boolean {
    return this.graph.hasRelationshipProperty();
  }

  asNodeFilteredGraph(): FilteredIdMap | undefined {
    return this.graph.asNodeFilteredGraph();
  }

  batchIterables(batchSize: number): PrimitiveLongIterable[] {
    return this.graph.batchIterables(batchSize);
  }

  degree(nodeId: number): number {
    return this.graph.degree(nodeId);
  }

  degreeInverse(nodeId: number): number {
    return this.graph.degreeInverse(nodeId);
  }

  degreeWithoutParallelRelationships(nodeId: number): number {
    return this.graph.degreeWithoutParallelRelationships(nodeId);
  }

  toMappedNodeId(originalNodeId: number): number {
    return this.graph.toMappedNodeId(originalNodeId);
  }

  toOriginalNodeId(mappedNodeId: number): number {
    return this.graph.toOriginalNodeId(mappedNodeId);
  }

  toRootNodeId(mappedNodeId: number): number {
    return this.graph.toRootNodeId(mappedNodeId);
  }

  rootIdMap(): IdMap {
    return this.graph.rootIdMap();
  }

  containsOriginalId(originalNodeId: number): boolean {
    return this.graph.containsOriginalId(originalNodeId);
  }

  nodeCount(): number;
  nodeCount(nodeLabel: NodeLabel): number;
  nodeCount(nodeLabel?: NodeLabel): number {
    return nodeLabel ? this.graph.nodeCount(nodeLabel) : this.graph.nodeCount();
  }

  rootNodeCount(): number | undefined {
    return this.graph.rootNodeCount();
  }

  highestOriginalId(): number {
    return this.graph.highestOriginalId();
  }

  forEachNode(consumer: (nodeId: number) => boolean): void {
    this.graph.forEachNode(consumer);
  }

    // Overload signatures
  nodeIterator(): PrimitiveIterator.OfLong;
  nodeIterator(labels: Set<NodeLabel>): Iterator<number>;
  // Implementation that handles both overloads
  nodeIterator(labels?: Set<NodeLabel>): Iterator<number> {
    // Get the underlying OfLong instance
    const ofLong = labels ? this.graph.nodeIterator(labels) : this.graph.nodeIterator();

    // Return a standard Iterator that wraps OfLong
    return {
      next(): IteratorResult<number> {
        if (ofLong.hasNext()) {
          return {
            value: ofLong.nextLong(),
            done: false
          };
        } else {
          return {
            value: undefined as any,
            done: true
          };
        }
      }
    };
  }

  schema(): GraphSchema {
    return this.graph.schema();
  }

  characteristics(): GraphCharacteristics {
    return this.graph.characteristics();
  }

  nodeLabels(mappedNodeId: number): NodeLabel[] {
    return this.graph.nodeLabels(mappedNodeId);
  }

  forEachNodeLabel(mappedNodeId: number, consumer: NodeLabelConsumer): void {
    this.graph.forEachNodeLabel(mappedNodeId, consumer);
  }

  availableNodeLabels(): Set<NodeLabel> {
    return this.graph.availableNodeLabels();
  }

  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.graph.hasLabel(mappedNodeId, label);
  }

  withFilteredLabels(
    nodeLabels: Set<NodeLabel>,
    concurrency: Concurrency
  ): FilteredIdMap | undefined {
    return this.graph.withFilteredLabels(nodeLabels, concurrency);
  }

  nodeProperties(propertyKey: string): NodePropertyValues {
    return this.graph.nodeProperties(propertyKey);
  }

  availableNodeProperties(): Set<string> {
    return this.graph.availableNodeProperties();
  }

  // Fix 1: Properly implement overloaded methods with correct implementation signature
  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void;
  forEachRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;
  forEachRelationship(
    nodeId: number,
    consumerOrFallback: RelationshipConsumer | number,
    maybeConsumer?: RelationshipWithPropertyConsumer
  ): void {
    if (typeof consumerOrFallback === "number" && maybeConsumer) {
      // This is the version with fallbackValue and RelationshipWithPropertyConsumer
      this.graph.forEachRelationship(nodeId, consumerOrFallback, maybeConsumer);
    } else if (typeof consumerOrFallback === "function") {
      // This is the version with just a RelationshipConsumer
      this.graph.forEachRelationship(nodeId, consumerOrFallback);
    } else {
      throw new Error("Invalid parameters for forEachRelationship");
    }
  }

  // Fix 2: Same pattern for forEachInverseRelationship
  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void;
  forEachInverseRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;
  forEachInverseRelationship(
    nodeId: number,
    consumerOrFallback: RelationshipConsumer | number,
    maybeConsumer?: RelationshipWithPropertyConsumer
  ): void {
    if (typeof consumerOrFallback === "number" && maybeConsumer) {
      // This is the version with fallbackValue and RelationshipWithPropertyConsumer
      this.graph.forEachInverseRelationship(
        nodeId,
        consumerOrFallback,
        maybeConsumer
      );
    } else if (typeof consumerOrFallback === "function") {
      // This is the version with just a RelationshipConsumer
      this.graph.forEachInverseRelationship(nodeId, consumerOrFallback);
    } else {
      throw new Error("Invalid parameters for forEachInverseRelationship");
    }
  }

  // Fix 3: Also fix relationshipProperty with similar pattern
  relationshipProperty(sourceNodeId: number, targetNodeId: number): number;
  relationshipProperty(
    sourceNodeId: number,
    targetNodeId: number,
    fallbackValue: number
  ): number;
  relationshipProperty(
    sourceNodeId: number,
    targetNodeId: number,
    fallbackValue?: number
  ): number {
    return fallbackValue !== undefined
      ? this.graph.relationshipProperty(
          sourceNodeId,
          targetNodeId,
          fallbackValue
        )
      : this.graph.relationshipProperty(sourceNodeId, targetNodeId);
  }

  streamRelationships(
    nodeId: number,
    fallbackValue: number
  ): RelationshipCursor[] {
    return this.graph.streamRelationships(nodeId, fallbackValue);
  }

  relationshipTypeFilteredGraph(
    relationshipTypes: Set<RelationshipType>
  ): Graph {
    return this.graph.relationshipTypeFilteredGraph(relationshipTypes);
  }

  exists(sourceNodeId: number, targetNodeId: number): boolean {
    return this.graph.exists(sourceNodeId, targetNodeId);
  }

  nthTarget(nodeId: number, offset: number): number {
    return this.graph.nthTarget(nodeId, offset);
  }

  isMultiGraph(): boolean {
    return this.graph.isMultiGraph();
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    this.graph.addNodeLabel(nodeLabel);
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.graph.addNodeIdToLabel(nodeId, nodeLabel);
  }
}
