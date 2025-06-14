import { NodeLabel } from "@/projection";
import { CSRGraph } from "@/api";
import { CSRGraphAdapter } from "@/api";
import { FilteredIdMap } from "@/api";
import { GraphSchema } from "@/api/schema";
import { NodePropertyValues } from "@/api/properties";
import { RelationshipConsumer } from "@/api/properties";
import { RelationshipWithPropertyConsumer } from "@/api/properties";
import { RelationshipCursor } from "@/api/properties";
import { ModifiableRelationshipCursor } from "@/api/properties";
import { PrimitiveLongIterable } from "@/collections";
import { Concurrency } from "@/concurrency";
import { RunWithConcurrency } from "@/concurrency";
import { Partition } from "@/core/utils/partition/Partition";
import { PartitionUtils } from "@/core/utils/partition/PartitionUtils";
import { CloseableThreadLocal } from "@/utils";
import { FilteredNodePropertyValues } from "./FilteredNodePropertyValues";

const NO_DEGREE = -1;

/**
 * NODE FILTERED GRAPH - Adapter that filters a graph to show only specified nodes
 *
 * This is a sophisticated filtering decorator that takes an existing CSRGraph and
 * presents only a subset of nodes (and their relationships) while maintaining
 * the full Graph interface. It's like having a "view" over a database table.
 *
 * CORE ARCHITECTURE:
 * - Extends CSRGraphAdapter for base functionality
 * - Implements FilteredIdMap for node ID translation
 * - Caches degree calculations for performance
 * - Thread-safe concurrent operations
 * - Lazy relationship counting with partitioned computation
 *
 * FILTERING BEHAVIOR:
 * - Only shows nodes that pass the filter criteria
 * - Only shows relationships between filtered nodes
 * - Maintains original graph's properties and metadata
 * - Translates between filtered and original node IDs seamlessly
 *
 * Perfect example of the Adapter + Filter patterns working together!
 */
export class NodeFilteredGraph
  extends CSRGraphAdapter
  implements FilteredIdMap
{
  private readonly filteredIdMap: FilteredIdMap;
  private relationshipCountValue: number;
  private readonly degreeCache: Int32Array;
  private readonly degreeInverseCache?: Int32Array;
  private readonly threadLocalGraph: CloseableThreadLocal<NodeFilteredGraph>;

  // ====================================================================
  // FACTORY METHODS - Graph construction and creation
  // ====================================================================

  /** Constructs a NodeFilteredGraph from original graph and filter mapping */
  constructor(originalGraph: CSRGraph, filteredIdMap: FilteredIdMap) {
    super(originalGraph);
    this.filteredIdMap = filteredIdMap;
    this.degreeCache = NodeFilteredGraph.emptyDegreeCache(filteredIdMap);
    this.degreeInverseCache = originalGraph.characteristics().isInverseIndexed()
      ? NodeFilteredGraph.emptyDegreeCache(filteredIdMap)
      : undefined;
    this.relationshipCountValue = -1;
    this.threadLocalGraph = CloseableThreadLocal.withInitial(
      () => this.concurrentCopy() as NodeFilteredGraph
    );
  }

  /** Creates empty degree cache array for filtered nodes */
  private static emptyDegreeCache(filteredIdMap: FilteredIdMap): Int32Array {
    const arr = new Int32Array(filteredIdMap.nodeCount());
    arr.fill(NO_DEGREE);
    return arr;
  }

  // ====================================================================
  // CORE GRAPH METHODS - Direct Graph interface methods
  // ====================================================================

  /** Returns filtered schema containing only available node labels */
  schema(): GraphSchema {
    return this.csrGraph
      .schema()
      .filterNodeLabels(this.filteredIdMap.availableNodeLabels());
  }

  /** Returns count of relationships in filtered graph (computed lazily) */
  relationshipCount(): number {
    if (this.relationshipCountValue === -1) {
      this.doCount();
    }
    return this.relationshipCountValue;
  }

  /** Returns true if underlying graph has relationship properties */
  hasRelationshipProperty(): boolean {
    return this.csrGraph.hasRelationshipProperty();
  }

  /** Returns characteristics from underlying graph */
  characteristics(): any {
    return this.csrGraph.characteristics();
  }

  /** Returns true if underlying graph is multi-graph */
  isMultiGraph(): boolean {
    return this.csrGraph.isMultiGraph();
  }

  /** Returns this filtered graph as the node filtered representation */
  asNodeFilteredGraph(): FilteredIdMap {
    return this;
  }

  /** Creates concurrent copy with same filter mapping */
  concurrentCopy(): NodeFilteredGraph {
    return new NodeFilteredGraph(
      this.csrGraph.concurrentCopy(),
      this.filteredIdMap
    );
  }

  /** Finds nth target using Graph utility method */
  nthTarget(nodeId: number, offset: number): number {
    return CSRGraph.nthTarget(this, nodeId, offset);
  }

  /** Checks if relationship exists between filtered nodes */
  exists(sourceNodeId: number, targetNodeId: number): boolean {
    return super.exists(
      this.filteredIdMap.toRootNodeId(sourceNodeId),
      this.filteredIdMap.toRootNodeId(targetNodeId)
    );
  }

  /** Returns relationship topologies from underlying graph */
  relationshipTopologies(): any {
    return this.csrGraph.relationshipTopologies();
  }

  /** Returns relationship topology from underlying graph */
  relationshipTopology(): any {
    return this.csrGraph.relationshipTopology();
  }

  // ====================================================================
  // IDMAP INTERFACE - Node ID mapping and management
  // ====================================================================

  /** Returns filtered node count */
  nodeCount(): number {
    return this.filteredIdMap.nodeCount();
  }

  /** Returns filtered node count for specific label */
  nodeCountWithLabel(nodeLabel: NodeLabel): number {
    return this.filteredIdMap.nodeCount(nodeLabel);
  }

  /** Returns root node count from filter mapping */
  rootNodeCount(): number | undefined {
    return this.filteredIdMap.rootNodeCount();
  }

  /** Returns highest original ID from filter mapping */
  highestOriginalId(): number {
    return this.filteredIdMap.highestOriginalId();
  }

  /** Maps original node ID to filtered node ID */
  toMappedNodeId(originalNodeId: number): number {
    return this.filteredIdMap.toMappedNodeId(originalNodeId);
  }

  /** Maps filtered node ID to root node ID */
  toRootNodeId(mappedNodeId: number): number {
    return this.filteredIdMap.toRootNodeId(mappedNodeId);
  }

  /** Maps filtered node ID to original node ID */
  toOriginalNodeId(mappedNodeId: number): number {
    return this.filteredIdMap.toOriginalNodeId(mappedNodeId);
  }

  /** Maps root node ID to filtered node ID */
  toFilteredNodeId(rootNodeId: number): number {
    return this.filteredIdMap.toFilteredNodeId(rootNodeId);
  }

  /** Checks if original node ID exists in filter */
  containsOriginalId(originalNodeId: number): boolean {
    return this.filteredIdMap.containsOriginalId(originalNodeId);
  }

  /** Checks if root node ID exists in filter */
  containsRootNodeId(rootNodeId: number): boolean {
    return this.filteredIdMap.containsRootNodeId(rootNodeId);
  }

  /** Iterates over filtered nodes */
  forEachNode(consumer: (nodeId: number) => boolean): void {
    this.filteredIdMap.forEachNode(consumer);
  }

  /** Returns iterator over filtered node IDs */
  nodeIterator(): IterableIterator<number> {
    return this.filteredIdMap.nodeIterator();
  }

  /** Returns iterator over filtered nodes with specific labels */
  nodeIteratorWithLabels(labels: Set<NodeLabel>): IterableIterator<number> {
    return this.filteredIdMap.nodeIterator(labels);
  }

  /** Returns batch iterables for filtered nodes */
  batchIterables(batchSize: number): Iterable<PrimitiveLongIterable> {
    return this.filteredIdMap.batchIterables(batchSize);
  }

  /** Returns root ID map from filter mapping */
  rootIdMap(): any {
    return this.filteredIdMap.rootIdMap();
  }

  /** Returns type ID from underlying graph */
  typeId(): string {
    return this.csrGraph.typeId();
  }

  /** Returns available node labels from filter mapping */
  availableNodeLabels(): Set<NodeLabel> {
    return this.filteredIdMap.availableNodeLabels();
  }

  /** Returns node labels for filtered node */
  nodeLabels(mappedNodeId: number): Set<NodeLabel> {
    return this.filteredIdMap.nodeLabels(mappedNodeId);
  }

  /** Checks if filtered node has specific label */
  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.filteredIdMap.hasLabel(mappedNodeId, label);
  }

  /** Iterates over node labels for filtered node */
  forEachNodeLabel(
    mappedNodeId: number,
    consumer: (label: NodeLabel) => void
  ): void {
    this.filteredIdMap.forEachNodeLabel(mappedNodeId, consumer);
  }

  /** Creates further filtered mapping with specified labels */
  withFilteredLabels(
    nodeLabels: Iterable<NodeLabel>,
    concurrency: Concurrency
  ): FilteredIdMap | undefined {
    return this.filteredIdMap.withFilteredLabels(nodeLabels, concurrency);
  }

  /** Adds node label to underlying graph */
  addNodeLabel(nodeLabel: NodeLabel): void {
    this.csrGraph.addNodeLabel(nodeLabel);
  }

  /** Adds node ID to label in underlying graph */
  addNodeIdToLabel(mappedNodeId: number, nodeLabel: NodeLabel): void {
    this.csrGraph.addNodeIdToLabel(
      this.filteredIdMap.toOriginalNodeId(mappedNodeId),
      nodeLabel
    );
  }

  /** Always returns true for filtered graphs */
  isNodeFilteredGraph(): boolean {
    return true;
  }

  // ====================================================================
  // NODE PROPERTY CONTAINER INTERFACE - Node property access
  // ====================================================================

  /** Returns filtered node properties wrapper */
  nodeProperties(propertyKey: string): NodePropertyValues | null {
    const properties = this.csrGraph.nodeProperties(propertyKey);
    if (!properties) return null;
    return new FilteredNodePropertyValues.FilteredToOriginalNodePropertyValues(
      properties,
      this
    );
  }

  /** Returns available node properties from underlying graph */
  availableNodeProperties(): Set<string> {
    return this.csrGraph.availableNodeProperties();
  }

  // ====================================================================
  // DEGREES INTERFACE - Node degree calculations
  // ====================================================================

  /** Returns cached degree for filtered node */
  degree(nodeId: number): number {
    const cached = this.degreeCache[nodeId];
    if (cached !== NO_DEGREE) return cached;
    let degree = 0;
    this.threadLocalGraph.get().forEachRelationship(nodeId, () => {
      degree++;
      return true;
    });
    this.degreeCache[nodeId] = degree;
    return degree;
  }

  /** Returns degree without parallel relationships for filtered node */
  degreeWithoutParallelRelationships(nodeId: number): number {
    const degreeCounter = new NonDuplicateRelationshipsDegreeCounter();
    this.forEachRelationship(nodeId, degreeCounter.accept.bind(degreeCounter));
    return degreeCounter.degree;
  }

  /** Returns cached inverse degree for filtered node */
  degreeInverse(nodeId: number): number {
    this.validateIndexInverse();
    const cached = this.degreeInverseCache![nodeId];
    if (cached !== NO_DEGREE) return cached;
    let degree = 0;
    this.threadLocalGraph.get().forEachInverseRelationship(nodeId, () => {
      degree++;
      return true;
    });
    this.degreeInverseCache![nodeId] = degree;
    return degree;
  }

  // ====================================================================
  // RELATIONSHIP ITERATOR INTERFACE - Relationship traversal
  // ====================================================================

  /** Iterates relationships for filtered node, filtering targets */
  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void {
    super.forEachRelationship(this.filteredIdMap.toRootNodeId(nodeId), (s, t) =>
      this.filterAndConsume(s, t, consumer)
    );
  }

  /** Iterates relationships with properties for filtered node */
  forEachRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    super.forEachRelationshipWithProperty(
      this.filteredIdMap.toRootNodeId(nodeId),
      fallbackValue,
      (s, t, p) => this.filterAndConsumeWithProperty(s, t, p, consumer)
    );
  }

  /** Iterates inverse relationships for filtered node */
  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void {
    this.validateIndexInverse();
    super.forEachInverseRelationship(
      this.filteredIdMap.toRootNodeId(nodeId),
      (s, t) => this.filterAndConsume(s, t, consumer)
    );
  }

  /** Iterates inverse relationships with properties for filtered node */
  forEachInverseRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    this.validateIndexInverse();
    super.forEachInverseRelationshipWithProperty(
      this.filteredIdMap.toRootNodeId(nodeId),
      fallbackValue,
      (s, t, p) => this.filterAndConsumeWithProperty(s, t, p, consumer)
    );
  }

  // ====================================================================
  // RELATIONSHIP PROPERTIES INTERFACE - Relationship property access
  // ====================================================================

  /** Returns relationship property between filtered nodes */
  relationshipProperty(
    sourceNodeId: number,
    targetNodeId: number,
    fallbackValue?: number
  ): number {
    return super.relationshipProperty(
      this.filteredIdMap.toRootNodeId(sourceNodeId),
      this.filteredIdMap.toRootNodeId(targetNodeId),
      fallbackValue
    );
  }

  /** Returns relationship property without fallback between filtered nodes */
  relationshipPropertyNoFallback(
    sourceNodeId: number,
    targetNodeId: number
  ): number {
    return super.relationshipProperty(
      this.filteredIdMap.toRootNodeId(sourceNodeId),
      this.filteredIdMap.toRootNodeId(targetNodeId)
    );
  }

  /** Streams filtered relationships as cursors */
  streamRelationships(
    nodeId: number,
    fallbackValue: number
  ): Iterable<RelationshipCursor> {
    if (
      !this.filteredIdMap.containsRootNodeId(
        this.filteredIdMap.toRootNodeId(nodeId)
      )
    ) {
      return [];
    }
    const base = super.streamRelationships(
      this.filteredIdMap.toRootNodeId(nodeId),
      fallbackValue
    );
    function* filtered(thisGraph: NodeFilteredGraph) {
      for (const rel of base) {
        if (thisGraph.filteredIdMap.containsRootNodeId(rel.targetId())) {
          yield (rel as ModifiableRelationshipCursor)
            .setSourceId(nodeId)
            .setTargetId(
              thisGraph.filteredIdMap.toFilteredNodeId(rel.targetId())
            );
        }
      }
    }
    return filtered(this);
  }

  // ====================================================================
  // INTERNAL IMPLEMENTATION METHODS - Private/protected methods
  // ====================================================================

  /** Lazily computes relationship count using partitioned concurrency */
  private doCount(): void {
    const partitions = PartitionUtils.rangePartition(
      Concurrency.DEFAULT,
      this.nodeCount(),
      (partition: Partition) =>
        new RelationshipCounter(this.concurrentCopy(), partition)
    );
    RunWithConcurrency.builder()
      .concurrency(Concurrency.DEFAULT)
      .tasks(partitions)
      .run();
    this.relationshipCountValue = partitions.reduce(
      (sum, task) => sum + task.relationshipCount(),
      0
    );
  }

  /** Validates that inverse indexing is available */
  private validateIndexInverse(): void {
    if (!this.degreeInverseCache) {
      throw new Error(
        "Cannot access inverse relationships as this graph is not inverse indexed."
      );
    }
  }

  /** Filters relationship and consumes if both nodes are in filter */
  private filterAndConsume(
    source: number,
    target: number,
    consumer: RelationshipConsumer
  ): boolean {
    if (
      this.filteredIdMap.containsRootNodeId(source) &&
      this.filteredIdMap.containsRootNodeId(target)
    ) {
      const internalSourceId = this.filteredIdMap.toFilteredNodeId(source);
      const internalTargetId = this.filteredIdMap.toFilteredNodeId(target);
      return consumer.accept(internalSourceId, internalTargetId);
    }
    return true;
  }

  /** Filters relationship with property and consumes if both nodes are in filter */
  private filterAndConsumeWithProperty(
    source: number,
    target: number,
    propertyValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): boolean {
    if (
      this.filteredIdMap.containsRootNodeId(source) &&
      this.filteredIdMap.containsRootNodeId(target)
    ) {
      const internalSourceId = this.filteredIdMap.toFilteredNodeId(source);
      const internalTargetId = this.filteredIdMap.toFilteredNodeId(target);
      return consumer.accept(internalSourceId, internalTargetId, propertyValue);
    }
    return true;
  }
}

/**
 * RELATIONSHIP COUNTER - Utility class for concurrent relationship counting
 *
 * Used by the lazy relationship counting mechanism to compute total
 * relationship count across partitions in parallel.
 */
class RelationshipCounter {
  private _relationshipCount = 0;
  private readonly graph: NodeFilteredGraph;
  private readonly partition: Partition;

  /** Creates counter for specific graph partition */
  constructor(graph: NodeFilteredGraph, partition: Partition) {
    this.graph = graph;
    this.partition = partition;
  }

  /** Runs counting operation over partition */
  run(): void {
    this.partition.consume((nodeId) => {
      this.graph.forEachRelationship(nodeId, () => {
        this._relationshipCount++;
        return true;
      });
    });
  }

  /** Returns total relationship count for this partition */
  relationshipCount(): number {
    return this._relationshipCount;
  }
}

/**
 * NON-DUPLICATE RELATIONSHIPS DEGREE COUNTER - Utility for parallel-edge handling
 *
 * Counts unique relationships by tracking previously seen target nodes,
 * effectively ignoring parallel edges in multi-graphs.
 */
class NonDuplicateRelationshipsDegreeCounter {
  private previousNodeId = -1;
  public degree = 0;

  /** Accepts relationship and increments degree for unique targets */
  accept(_s: number, t: number): boolean {
    if (t !== this.previousNodeId) {
      this.degree++;
      this.previousNodeId = t;
    }
    return true;
  }
}
