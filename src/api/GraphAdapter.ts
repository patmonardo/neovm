import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { NodePropertyValues } from "@/api/properties/nodes";
import { RelationshipCursor } from "@/api/properties/relationships";
import { RelationshipConsumer } from "@/api/properties/relationships";
import { RelationshipWithPropertyConsumer } from "@/api/properties/relationships";
import { PrimitiveLongIterable } from "@/collections";
import { PrimitiveIterator } from "@/collections";
import { LongPredicate } from "@/collections";
import { Concurrency } from "@/concurrency";
import { GraphSchema } from "./schema";
import { IdMap } from "./IdMap";
import { FilteredIdMap } from "./FilteredIdMap";
import { GraphCharacteristics } from "./GraphCharacteristics";
import { Graph } from "./Graph";

export abstract class GraphAdapter implements Graph {
  protected readonly graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  getGraph(): Graph {
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

  batchIterables(batchSize: number): Array<PrimitiveLongIterable> {
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
    return nodeLabel !== undefined
      ? this.graph.nodeCount(nodeLabel)
      : this.graph.nodeCount();
  }

  rootNodeCount(): number | undefined {
    return this.graph.rootNodeCount();
  }

  highestOriginalId(): number {
    return this.graph.highestOriginalId();
  }

  forEachNode(consumer: LongPredicate): void {
    this.graph.forEachNode(consumer);
  }

  nodeIterator(): PrimitiveIterator.OfLong;
  nodeIterator(labels: Set<NodeLabel>): PrimitiveIterator.OfLong;
  nodeIterator(labels?: Set<NodeLabel>): PrimitiveIterator.OfLong {
    return labels !== undefined
      ? this.graph.nodeIterator(labels)
      : this.graph.nodeIterator();
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

  forEachNodeLabel(
    mappedNodeId: number,
    consumer: IdMap.NodeLabelConsumer
  ): void {
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

  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void;
  forEachRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;
  forEachRelationship(
    nodeId: number,
    arg2: RelationshipConsumer | number,
    arg3?: RelationshipWithPropertyConsumer
  ): void {
    if (typeof arg2 === "number" && arg3) {
      this.graph.forEachRelationship(nodeId, arg2, arg3);
    } else if (typeof arg2 === "function") {
      this.graph.forEachRelationship(nodeId, arg2);
    } else {
      throw new Error("Invalid parameters for forEachRelationship");
    }
  }

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
    arg2: RelationshipConsumer | number,
    arg3?: RelationshipWithPropertyConsumer
  ): void {
    if (typeof arg2 === "number" && arg3) {
      this.graph.forEachInverseRelationship(nodeId, arg2, arg3);
    } else if (typeof arg2 === "function") {
      this.graph.forEachInverseRelationship(nodeId, arg2);
    } else {
      throw new Error("Invalid parameters for forEachInverseRelationship");
    }
  }

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
  ): Iterable<RelationshipCursor> {
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

  isEmpty(): boolean {
    return this.graph.isEmpty();
  }

  concurrentCopy(): Graph {
    return this.graph.concurrentCopy();
  }

  safeToMappedNodeId(originalNodeId: number): number {
    return this.graph.safeToMappedNodeId(originalNodeId);
  }
}
