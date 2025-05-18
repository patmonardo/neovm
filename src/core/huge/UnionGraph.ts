import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { IdMap } from "@/api/IdMap";
import { FilteredIdMap } from "@/api/FilteredIdMap";
import { GraphCharacteristics } from "@/api/GraphCharacteristics";
import { Topology } from "@/api/Topology";
import { GraphSchema } from "@/api/schema";
import { NodePropertyValues } from "@/api/properties/nodes";
import {
  RelationshipConsumer,
  RelationshipWithPropertyConsumer,
  RelationshipCursor,
} from "@/api/properties/relationships";
import { PrimitiveLongIterable } from "@/collections";
import { CSRGraph } from "@/api/CSRGraph";
import { CompositeAdjacencyList } from "./CompositeAdjacencyList";
import { NOT_FOUND } from "@/api/IdMap";

export class UnionGraph implements CSRGraph {
  private readonly first: CSRGraph;
  private readonly graphs: CSRGraph[];
  private readonly relationshipTypeTopologies: Map<RelationshipType, Topology>;

  static of(graphs: CSRGraph[]): CSRGraph {
    if (graphs.length === 0) {
      throw new Error("no graphs");
    }
    if (graphs.length === 1) {
      return graphs[0];
    }
    return new UnionGraph(graphs);
  }

  private constructor(graphs: CSRGraph[]) {
    this.first = graphs[0];
    this.graphs = graphs;
    this.relationshipTypeTopologies = new Map();
    graphs.forEach((graph) => {
      for (const [type, topo] of graph.relationshipTopologies().entries()) {
        this.relationshipTypeTopologies.set(type, topo);
      }
    });
  }

  nodeCount(): number {
    return this.first.nodeCount();
  }

  nodeCountWithLabel(nodeLabel: NodeLabel): number {
    return this.first.nodeCountWithLabel(nodeLabel);
  }

  rootNodeCount(): number | undefined {
    return this.first.rootNodeCount();
  }

  highestOriginalId(): number {
    return this.first.highestOriginalId();
  }

  schema(): GraphSchema {
    return this.graphs
      .map((g) => g.schema())
      .reduce((a, b) => GraphSchema.union(a, b));
  }

  characteristics(): GraphCharacteristics {
    return this.graphs
      .map((g) => g.characteristics())
      .reduce((a, b) => GraphCharacteristics.intersect(a, b));
  }

  relationshipCount(): number {
    return this.graphs.reduce((sum, g) => sum + g.relationshipCount(), 0);
  }

  batchIterables(batchSize: number): Iterable<PrimitiveLongIterable> {
    return this.first.batchIterables(batchSize);
  }

  forEachNode(consumer: (nodeId: number) => boolean): void {
    this.first.forEachNode(consumer);
  }

  nodeIterator(): IterableIterator<number> {
    return this.first.nodeIterator();
  }

  nodeIteratorWithLabels(labels: Set<NodeLabel>): IterableIterator<number> {
    return this.first.nodeIteratorWithLabels(labels);
  }

  nodeProperties(propertyKey: string): NodePropertyValues {
    return this.first.nodeProperties(propertyKey);
  }

  availableNodeProperties(): Set<string> {
    return this.first.availableNodeProperties();
  }

  toMappedNodeId(originalNodeId: number): number {
    return this.first.toMappedNodeId(originalNodeId);
  }

  typeId(): string {
    return this.first.typeId();
  }

  toOriginalNodeId(mappedNodeId: number): number {
    return this.first.toOriginalNodeId(mappedNodeId);
  }

  toRootNodeId(mappedNodeId: number): number {
    return this.first.toRootNodeId(mappedNodeId);
  }

  rootIdMap(): IdMap {
    return this.first.rootIdMap();
  }

  containsOriginalId(originalNodeId: number): boolean {
    return this.first.containsOriginalId(originalNodeId);
  }

  relationshipProperty(
    sourceNodeId: number,
    targetNodeId: number,
    fallbackValue?: number
  ): number {
    for (const graph of this.graphs) {
      const property = graph.relationshipProperty(
        sourceNodeId,
        targetNodeId,
        fallbackValue
      );
      if (!(Number.isNaN(property) || property === fallbackValue)) {
        return property;
      }
    }
    return fallbackValue ?? NaN;
  }

  relationshipPropertyNoFallback(
    sourceNodeId: number,
    targetNodeId: number
  ): number {
    for (const graph of this.graphs) {
      const property = graph.relationshipProperty(sourceNodeId, targetNodeId);
      if (!Number.isNaN(property)) {
        return property;
      }
    }
    return NaN;
  }

  relationshipTopologies(): Map<RelationshipType, Topology> {
    return this.relationshipTypeTopologies;
  }

  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void {
    for (const graph of this.graphs) {
      graph.forEachRelationship(nodeId, consumer);
    }
  }

  forEachRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    for (const graph of this.graphs) {
      graph.forEachRelationshipWithProperty(nodeId, fallbackValue, consumer);
    }
  }

  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void {
    for (const graph of this.graphs) {
      graph.forEachInverseRelationship(nodeId, consumer);
    }
  }

  forEachInverseRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    for (const graph of this.graphs) {
      graph.forEachInverseRelationshipWithProperty(
        nodeId,
        fallbackValue,
        consumer
      );
    }
  }

  streamRelationships(
    nodeId: number,
    fallbackValue: number
  ): Iterable<RelationshipCursor> {
    function* generator(graphs: CSRGraph[]) {
      for (const graph of graphs) {
        for (const rel of graph.streamRelationships(nodeId, fallbackValue)) {
          yield rel;
        }
      }
    }
    return generator(this.graphs);
  }

  relationshipTypeFilteredGraph(
    relationshipTypes: Set<RelationshipType>
  ): CSRGraph {
    const filteredGraphs = this.graphs.filter(
      (graph) =>
        relationshipTypes.size === 0 ||
        Array.from(graph.schema().relationshipSchema().availableTypes()).every(
          (type) => relationshipTypes.has(type)
        )
    );
    return UnionGraph.of(filteredGraphs);
  }

  degree(nodeId: number): number {
    let degree = 0;
    for (const graph of this.graphs) {
      degree += graph.degree(nodeId);
    }
    return degree;
  }

  degreeInverse(nodeId: number): number {
    let degree = 0;
    for (const graph of this.graphs) {
      degree += graph.degreeInverse(nodeId);
    }
    return degree;
  }

  degreeWithoutParallelRelationships(nodeId: number): number {
    if (!this.isMultiGraph()) {
      return this.degree(nodeId);
    }
    const degreeCounter = new ParallelRelationshipDegreeCounter();
    this.graphs.forEach((graph) =>
      graph.forEachRelationship(nodeId, degreeCounter)
    );
    return degreeCounter.degree();
  }

  concurrentCopy(): CSRGraph {
    return UnionGraph.of(this.graphs.map((graph) => graph.concurrentCopy()));
  }

  asNodeFilteredGraph(): FilteredIdMap | undefined {
    return this.first.asNodeFilteredGraph();
  }

  exists(sourceNodeId: number, targetNodeId: number): boolean {
    return this.graphs.some((g) => g.exists(sourceNodeId, targetNodeId));
  }

  nthTarget(nodeId: number, offset: number): number {
    let remaining = offset;
    for (const graph of this.graphs) {
      const localDegree = graph.degree(nodeId);
      if (localDegree > remaining) {
        return graph.nthTarget(nodeId, remaining);
      }
      remaining -= localDegree;
    }
    return NOT_FOUND;
  }

  hasRelationshipProperty(): boolean {
    return this.first.hasRelationshipProperty();
  }

  isMultiGraph(): boolean {
    return true;
  }

  relationshipTopology(): CompositeAdjacencyList {
    const adjacencies = this.graphs
      .map((graph) => Array.from(graph.relationshipTopologies().values()))
      .flat()
      .map((topology) => topology.adjacencyList());

    const filtered = this.first.asNodeFilteredGraph();
    if (filtered) {
      return CompositeAdjacencyList.withFilteredIdMap(adjacencies, filtered);
    }
    return CompositeAdjacencyList.of(adjacencies);
  }

  nodeLabels(mappedNodeId: number): NodeLabel[] {
    return this.first.nodeLabels(mappedNodeId);
  }

  forEachNodeLabel(
    mappedNodeId: number,
    consumer: (label: NodeLabel) => void
  ): void {
    this.first.forEachNodeLabel(mappedNodeId, consumer);
  }

  availableNodeLabels(): Set<NodeLabel> {
    return this.first.availableNodeLabels();
  }

  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.first.hasLabel(mappedNodeId, label);
  }

  isNodeFilteredGraph(): boolean {
    // @ts-ignore
    return this.first instanceof NodeFilteredGraph;
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    this.first.addNodeLabel(nodeLabel);
  }

  addNodeIdToLabel(mappedNodeId: number, nodeLabel: NodeLabel): void {
    this.first.addNodeIdToLabel(this.toOriginalNodeId(mappedNodeId), nodeLabel);
  }
}

class ParallelRelationshipDegreeCounter implements RelationshipConsumer {
  private readonly visited: Set<number> = new Set();

  accept(s: number, t: number): boolean {
    this.visited.add(t);
    return true;
  }

  degree(): number {
    return this.visited.size;
  }
}
