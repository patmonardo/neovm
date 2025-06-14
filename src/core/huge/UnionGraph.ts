import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { IdMap } from "@/api";
import { FilteredIdMap } from "@/api";
import { GraphCharacteristics } from "@/api/GraphCharacteristics";
import { Topology } from "@/api/Topology";
import { GraphSchema } from "@/api/schema";
import { NodePropertyValues } from "@/api/properties";
import { RelationshipConsumer } from "@/api/properties";
import { RelationshipWithPropertyConsumer } from "@/api/properties";
import { RelationshipCursor } from "@/api/properties";
import { PrimitiveLongIterable } from "@/collections";
import { CSRGraph } from "@/api";
import { CompositeAdjacencyList } from "./CompositeAdjacencyList";

const NOT_FOUND = -1; // 🔧 FIX: Missing constant

/**
 * UNION GRAPH - Simple decorator that makes multiple graphs appear as one
 *
 * This is the "mom's projection" of graph composition - straightforward,
 * reliable, and does exactly what you'd expect. Takes a list of graphs
 * and presents them as a single unified graph interface.
 *
 * Perfect example of the Decorator Pattern in action!
 */
export class UnionGraph implements CSRGraph {
  private readonly first: CSRGraph;
  private readonly graphs: CSRGraph[];
  private readonly relationshipTypeTopologies: Map<RelationshipType, Topology>;

  // ====================================================================
  // FACTORY METHODS - Graph construction and creation
  // ====================================================================

  /** Creates a UnionGraph from multiple graphs, or returns single graph if only one */
  static of(graphs: CSRGraph[]): CSRGraph {
    if (graphs.length === 0) {
      throw new Error("no graphs");
    }
    if (graphs.length === 1) {
      return graphs[0];
    }
    return new UnionGraph(graphs);
  }

  /** Constructs a UnionGraph from array of graphs */
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

  // ====================================================================
  // CORE GRAPH METHODS - Direct Graph interface methods
  // ====================================================================

  /** Returns type ID from first graph */
  typeId(): string {
    return this.first.typeId();
  }

  /** Returns sum of relationship counts from all graphs */
  relationshipCount(): number {
    return this.graphs.reduce((sum, g) => sum + g.relationshipCount(), 0);
  }

  /** Returns true if first graph has relationship properties */
  hasRelationshipProperty(): boolean {
    return this.first.hasRelationshipProperty();
  }

  /** Returns union of all graph schemas */
  schema(): GraphSchema {
    return this.graphs
      .map((g) => g.schema())
      .reduce((a, b) => GraphSchema.union(a, b));
  }

  /** Returns intersection of all graph characteristics */
  characteristics(): GraphCharacteristics {
    return this.graphs
      .map((g) => g.characteristics())
      .reduce((a, b) => GraphCharacteristics.intersect(a, b));
  }

  /** Always returns true since union can create multi-graph scenarios */
  isMultiGraph(): boolean {
    return true;
  }

  /** Returns filtered union graph containing only specified relationship types */
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

  /** Creates concurrent copy by copying all underlying graphs */
  concurrentCopy(): CSRGraph {
    return UnionGraph.of(this.graphs.map((graph) => graph.concurrentCopy()));
  }

  /** Returns node filtered graph from first graph */
  asNodeFilteredGraph(): FilteredIdMap | undefined {
    return this.first.asNodeFilteredGraph();
  }

  /** Finds nth target by distributing offset across graphs */
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

  /** Checks if relationship exists in any of the graphs */
  exists(sourceNodeId: number, targetNodeId: number): boolean {
    return this.graphs.some((g) => g.exists(sourceNodeId, targetNodeId));
  }

  /** Returns unified map of relationship type topologies */
  relationshipTopologies(): Map<RelationshipType, Topology> {
    return this.relationshipTypeTopologies;
  }

  /** Creates composite adjacency list from all graph topologies */
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

  // ====================================================================
  // IDMAP INTERFACE - Node ID mapping and management
  // ====================================================================

  /** Maps original node ID to mapped ID using first graph */
  toMappedNodeId(originalNodeId: number): number {
    return this.first.toMappedNodeId(originalNodeId);
  }

  /** Maps mapped node ID to original ID using first graph */
  toOriginalNodeId(mappedNodeId: number): number {
    return this.first.toOriginalNodeId(mappedNodeId);
  }

  /** Maps mapped node ID to root ID using first graph */
  toRootNodeId(mappedNodeId: number): number {
    return this.first.toRootNodeId(mappedNodeId);
  }

  /** Returns root ID map from first graph */
  rootIdMap(): IdMap {
    return this.first.rootIdMap();
  }

  /** Checks if first graph contains original node ID */
  containsOriginalId(originalNodeId: number): boolean {
    return this.first.containsOriginalId(originalNodeId);
  }

  /** Returns total node count from first graph (all graphs share same nodes) */
  nodeCount(): number {
    return this.first.nodeCount();
  }

  /** Returns node count with specific label from first graph */
  nodeCountWithLabel(nodeLabel: NodeLabel): number {
    return this.first.nodeCountWithLabel(nodeLabel);
  }

  /** Returns root node count from first graph */
  rootNodeCount(): number | undefined {
    return this.first.rootNodeCount();
  }

  /** Returns highest original ID from first graph */
  highestOriginalId(): number {
    return this.first.highestOriginalId();
  }

  /** Delegates node iteration to first graph */
  forEachNode(consumer: (nodeId: number) => boolean): void {
    this.first.forEachNode(consumer);
  }

  /** Returns node iterator from first graph */
  nodeIterator(): IterableIterator<number> {
    return this.first.nodeIterator();
  }

  /** Returns labeled node iterator from first graph */
  nodeIteratorWithLabels(labels: Set<NodeLabel>): IterableIterator<number> {
    return this.first.nodeIteratorWithLabels(labels);
  }

  /** Returns batch iterables from first graph */
  batchIterables(batchSize: number): Iterable<PrimitiveLongIterable> {
    return this.first.batchIterables(batchSize);
  }

  /** Returns node labels from first graph */
  nodeLabels(mappedNodeId: number): Set<NodeLabel> {
    // 🔧 FIX: Changed return type from NodeLabel[] to Set<NodeLabel>
    return this.first.nodeLabels(mappedNodeId);
  }

  /** Iterates node labels from first graph */
  forEachNodeLabel(
    mappedNodeId: number,
    consumer: (label: NodeLabel) => void
  ): void {
    this.first.forEachNodeLabel(mappedNodeId, consumer);
  }

  /** Returns available node labels from first graph */
  availableNodeLabels(): Set<NodeLabel> {
    return this.first.availableNodeLabels();
  }

  /** Checks if node has label using first graph */
  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.first.hasLabel(mappedNodeId, label);
  }

  /** Adds node label to first graph */
  addNodeLabel(nodeLabel: NodeLabel): void {
    this.first.addNodeLabel(nodeLabel);
  }

  /** Adds node ID to label in first graph */
  addNodeIdToLabel(mappedNodeId: number, nodeLabel: NodeLabel): void {
    this.first.addNodeIdToLabel(this.toOriginalNodeId(mappedNodeId), nodeLabel);
  }

  /** Checks if this is a node filtered graph */
  isNodeFilteredGraph(): boolean {
    return false; // 🔧 FIX: Removed @ts-ignore and instanceof check
  }

  // ====================================================================
  // NODE PROPERTY CONTAINER INTERFACE - Node property access
  // ====================================================================

  /** Returns node properties from first graph */
  nodeProperties(propertyKey: string): NodePropertyValues | null {
    // 🔧 FIX: Added null return type
    return this.first.nodeProperties(propertyKey);
  }

  /** Returns available node properties from first graph */
  availableNodeProperties(): Set<string> {
    return this.first.availableNodeProperties();
  }

  // ====================================================================
  // DEGREES INTERFACE - Node degree calculations
  // ====================================================================

  /** Returns sum of degrees from all graphs for given node */
  degree(nodeId: number): number {
    let degree = 0;
    for (const graph of this.graphs) {
      degree += graph.degree(nodeId);
    }
    return degree;
  }

  /** Returns sum of inverse degrees from all graphs for given node */
  degreeInverse(nodeId: number): number {
    let degree = 0;
    for (const graph of this.graphs) {
      degree += graph.degreeInverse(nodeId);
    }
    return degree;
  }

  /** Returns degree without parallel relationships by counting unique targets */
  degreeWithoutParallelRelationships(nodeId: number): number {
    if (!this.isMultiGraph()) {
      return this.degree(nodeId);
    }
    const degreeCounter = new ParallelRelationshipDegreeCounter();
    this.graphs.forEach(
      (graph) =>
        graph.forEachRelationship(
          nodeId,
          degreeCounter.accept.bind(degreeCounter)
        ) // 🔧 FIX: Bind the accept method
    );
    return degreeCounter.degree();
  }

  // ====================================================================
  // RELATIONSHIP ITERATOR INTERFACE - Relationship traversal
  // ====================================================================

  /** Iterates relationships from all graphs for given node */
  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void {
    for (const graph of this.graphs) {
      graph.forEachRelationship(nodeId, consumer);
    }
  }

  /** Iterates relationships with properties from all graphs for given node */
  forEachRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    for (const graph of this.graphs) {
      graph.forEachRelationshipWithProperty(nodeId, fallbackValue, consumer);
    }
  }

  /** Iterates inverse relationships from all graphs for given node */
  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void {
    for (const graph of this.graphs) {
      graph.forEachInverseRelationship(nodeId, consumer);
    }
  }

  /** Iterates inverse relationships with properties from all graphs for given node */
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

  // ====================================================================
  // RELATIONSHIP PROPERTIES INTERFACE - Relationship property access
  // ====================================================================

  /** Finds relationship property by checking all graphs in order */
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

  /** Finds relationship property without fallback by checking all graphs */
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

  /** Streams relationships from all graphs as unified iterator */
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
  // ====================================================================
  // THE PATH TO NODE NIRVANA - Missing methods for CSRGraph completeness
  // ====================================================================

  /** Checks if this union graph is empty (no nodes or relationships) */
  isEmpty(): boolean {
    // Union is empty if first graph is empty
    // (since all graphs share same node space)
    return this.first.isEmpty();
  }

  /** Safely maps original node ID to mapped ID, returns -1 if not found */
  safeToMappedNodeId(originalNodeId: number): number {
    // Delegate to first graph for safe mapping
    return this.first.safeToMappedNodeId(originalNodeId);
  }

  /** Creates filtered mapping with specified node labels */
  withFilteredLabels(
    nodeLabels: Iterable<NodeLabel>
  ): FilteredIdMap | undefined {
    // Union delegates filtering to first graph
    return this.first.withFilteredLabels(nodeLabels);
  }
}

/**
 * Helper class to count unique relationship targets (ignoring parallel edges)
 */
class ParallelRelationshipDegreeCounter implements RelationshipConsumer {
  private readonly visited: Set<number> = new Set();

  /** Accepts relationship and tracks unique targets */
  accept(s: number, t: number): boolean {
    this.visited.add(t);
    return true;
  }

  /** Returns count of unique targets visited */
  degree(): number {
    return this.visited.size;
  }
}
