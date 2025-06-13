import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { Graph } from "@/api";
import { CSRGraph } from "@/api";
import { GraphCharacteristics } from "@/api";
import { IdMap } from "@/api";
import { FilteredIdMap } from "@/api";
import { Topology } from "@/api";
import { ImmutableTopology } from "@/api";
import { AdjacencyList } from "@/api";
import { AdjacencyCursor } from "@/api";
import { AdjacencyProperties } from "@/api";
import { GraphSchema } from "@/api/schema";
import { Properties } from "@/api/properties";
import { PropertyCursor } from "@/api/properties";
import { ImmutableProperties } from "@/api/properties";
import { NodePropertyValues } from "@/api/properties";
import { RelationshipConsumer } from "@/api/properties";
import { RelationshipWithPropertyConsumer } from "@/api/properties";
import { RelationshipCursor } from "@/api/properties";
import { Concurrency } from "@/concurrency";
import { PrimitiveLongIterable } from "@/collections";
import { PrimitiveIterator } from "@/collections";
import { LongPredicate } from "@/collections";
import { AdjacencySpliterator } from "./AdjacencySpliterator";

/**
 * PATH DHARMA ANALYSIS - HugeGraph 🏗️
 *
 * CSR GRAPH IMPLEMENTATION - High-performance compressed sparse row graph storage
 *
 * This class implements the Graph interface using Compressed Sparse Row (CSR) format
 * for maximum memory efficiency and traversal performance. Unlike GraphAdapter which
 * delegates to an underlying Graph, HugeGraph IS the actual graph implementation.
 *
 * CORE ARCHITECTURE:
 * - CSR adjacency lists for relationship storage
 * - Compressed property arrays for relationship properties
 * - IdMap for original ↔ mapped ID translation
 * - Cached cursors for high-performance iteration
 * - Optional inverse indexes for bidirectional traversal
 *
 * PATH OPERATORS:
 * PathOp₁: External query → Method routing → Internal data structure access
 * PathOp₂: Node/relationship access → Cursor positioning → Data retrieval
 * PathOp₃: Property access → Property cursor → Compressed data lookup
 * PathOp₄: Traversal → Adjacency cursor → CSR array iteration
 *
 * MEMORY OPTIMIZATION:
 * - CSR format: O(V + E) space complexity (optimal for sparse graphs)
 * - Cursor caching: Reuse cursor objects to minimize GC pressure
 * - Compressed properties: Efficient storage of relationship properties
 * - Optional inverse indexes: Only created when needed
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Node access: O(1) via IdMap
 * - Relationship traversal: O(degree) via CSR adjacency
 * - Property lookup: O(degree) via compressed property arrays
 * - Degree calculation: O(1) via precomputed degree arrays
 */
export class HugeGraph implements CSRGraph {
  static readonly NO_PROPERTY_VALUE = Number.NaN;
  protected readonly NOT_FOUND = -1;

  // Core graph data structures
  protected readonly _idMap: IdMap;
  protected readonly _schema: GraphSchema;
  protected readonly _isEmpty: boolean = false;
  protected readonly _characteristics: GraphCharacteristics;
  protected readonly _nodeProperties: Map<string, NodePropertyValues>;
  protected readonly _relationshipCount: number;

  // CSR adjacency structures
  protected _adjacency: AdjacencyList;
  protected _inverseAdjacency?: AdjacencyList;

  // Property structures
  private readonly _defaultPropertyValue: number;
  protected _properties?: AdjacencyProperties;
  protected _inverseProperties?: AdjacencyProperties;
  protected readonly _hasRelationshipProperty: boolean;
  protected readonly _isMultiGraph: boolean;

  // Performance optimization: cached cursors
  private _adjacencyCursorCache: AdjacencyCursor;
  private _inverseAdjacencyCursorCache?: AdjacencyCursor;
  private _propertyCursorCache?: PropertyCursor;
  private _inversePropertyCursorCache?: PropertyCursor;

  protected constructor(
    idMap: IdMap,
    schema: GraphSchema,
    characteristics: GraphCharacteristics,
    nodeProperties: Map<string, NodePropertyValues>,
    relationshipCount: number,
    adjacency: AdjacencyList,
    inverseAdjacency: AdjacencyList | null,
    hasRelationshipProperty: boolean,
    defaultRelationshipPropertyValue: number,
    properties: AdjacencyProperties | null,
    inverseProperties: AdjacencyProperties | null,
    isMultiGraph: boolean
  ) {
    this._idMap = idMap;
    this._schema = schema;
    this._characteristics = characteristics;
    this._nodeProperties = nodeProperties;
    this._relationshipCount = relationshipCount;
    this._adjacency = adjacency;
    this._inverseAdjacency = inverseAdjacency ?? undefined;
    this._defaultPropertyValue = defaultRelationshipPropertyValue;
    this._properties = properties ?? undefined;
    this._inverseProperties = inverseProperties ?? undefined;
    this._hasRelationshipProperty = hasRelationshipProperty;
    this._isMultiGraph = isMultiGraph;

    // Initialize cached cursors for performance
    this._adjacencyCursorCache = adjacency.rawAdjacencyCursor();
    this._inverseAdjacencyCursorCache = inverseAdjacency
      ? inverseAdjacency.rawAdjacencyCursor()
      : undefined;
    this._propertyCursorCache = properties
      ? properties.rawPropertyCursor()
      : undefined;
    this._inversePropertyCursorCache = inverseProperties
      ? inverseProperties.rawPropertyCursor()
      : undefined;
  }

  static create(
    idMap: IdMap,
    schema: GraphSchema,
    characteristics: GraphCharacteristics,
    nodeProperties: Map<string, NodePropertyValues>,
    topology: Topology,
    relationshipProperties?: Properties,
    inverseTopology?: Topology,
    inverseRelationshipProperties?: Properties
  ): HugeGraph {
    return new HugeGraph(
      idMap,
      schema,
      characteristics,
      nodeProperties,
      topology.elementCount(),
      topology.adjacencyList(),
      inverseTopology ? inverseTopology.adjacencyList() : null,
      !!relationshipProperties,
      relationshipProperties
        ? relationshipProperties.defaultPropertyValue()
        : Number.NaN,
      relationshipProperties ? relationshipProperties.propertiesList() : null,
      inverseRelationshipProperties
        ? inverseRelationshipProperties.propertiesList()
        : null,
      topology.isMultiGraph()
    );
  }

  // ====================================================================
  // CORE GRAPH METHODS - Direct Graph interface methods
  // ====================================================================

  /** Returns the type ID for the graph. */
  public typeId(): string {
    return this._idMap.typeId();
  }

  /** Returns the number of relationships in the graph. */
  public relationshipCount(): number {
    return this._relationshipCount;
  }

  /** Returns true if the graph has relationship properties. */
  public hasRelationshipProperty(): boolean {
    return this._hasRelationshipProperty;
  }

  /** Returns the graph schema instance. */
  public schema(): GraphSchema {
    return this._schema;
  }

  /** Returns the graph characteristics instance. */
  public characteristics(): GraphCharacteristics {
    return this._characteristics;
  }

  public isEmpty(): boolean {
    return this._isEmpty;
  }

  /** Returns true if the graph is a multigraph. */
  public isMultiGraph(): boolean {
    return this._isMultiGraph;
  }

  /** Returns a filtered graph by relationship types. */
  public relationshipTypeFilteredGraph(
    relationshipTypes: Set<RelationshipType>
  ): Graph {
    this.assertSupportedRelationships(relationshipTypes);
    return this;
  }

  /** Returns a concurrent copy of the graph. */
  public concurrentCopy(): HugeGraph {
    return new HugeGraph(
      this._idMap,
      this._schema,
      this._characteristics,
      this._nodeProperties,
      this._relationshipCount,
      this._adjacency,
      this._inverseAdjacency ?? null,
      this._hasRelationshipProperty,
      this._defaultPropertyValue,
      this._properties ?? null,
      this._inverseProperties ?? null,
      this._isMultiGraph
    );
  }

  public asNodeFilteredGraph(): FilteredIdMap | undefined {
    return undefined;
  }

  /** Returns the nth target node for a given node. */
  public nthTarget(nodeId: number, offset: number): number {
    if (offset >= this.degree(nodeId)) {
      return this.NOT_FOUND;
    }
    const cursor = this.adjacencyCursorForIteration(nodeId);
    return cursor.advanceBy(offset);
  }

  /** Checks if a relationship exists between two nodes. */
  public exists(sourceNodeId: number, targetNodeId: number): boolean {
    const cursor = this.adjacencyCursorForIteration(sourceNodeId);
    return cursor.advance(targetNodeId) === targetNodeId;
  }

  // ====================================================================
  // IDMAP INTERFACE - Node ID mapping and management
  // ====================================================================

  /** Maps an original node ID to a mapped node ID. */
  public toMappedNodeId(originalNodeId: number): number {
    return this._idMap.toMappedNodeId(originalNodeId);
  }

  /** Maps an original node ID to a mapped node ID safely. */
  public safeToMappedNodeId(originalNodeId: number): number {
    return this.highestOriginalId() < originalNodeId
      ? this.NOT_FOUND
      : this.toMappedNodeId(originalNodeId);
  }

  /** Maps a mapped node ID to the original node ID. */
  public toOriginalNodeId(mappedNodeId: number): number {
    return this._idMap.toOriginalNodeId(mappedNodeId);
  }

  /** Maps a mapped node ID to the root node ID. */
  public toRootNodeId(mappedNodeId: number): number {
    return this._idMap.toRootNodeId(mappedNodeId);
  }

  /** Returns the root ID map. */
  public rootIdMap(): IdMap {
    return this._idMap.rootIdMap();
  }

  /** Checks if the graph contains an original node ID. */
  public containsOriginalId(originalNodeId: number): boolean {
    return this._idMap.containsOriginalId(originalNodeId);
  }

  /** SetGets the number of nodes in the graph. */
  public nodeCount(nodeLabel?: NodeLabel): number {
    switch (arguments.length) {
      case 0:
        return this._idMap.nodeCount();
      case 1:
        return this._idMap.nodeCount(nodeLabel!);
      default:
        throw new Error("Invalid arguments");
    }
  }

  /** Returns the number of root nodes, if available. */
  public rootNodeCount(): number | undefined {
    return this._idMap.rootNodeCount();
  }

  /** Returns the highest original node ID. */
  public highestOriginalId(): number {
    return this._idMap.highestOriginalId();
  }

  /** Iterates over all nodes, calling the consumer for each. */
  public forEachNode(consumer: LongPredicate): void {
    this._idMap.forEachNode(consumer);
  }

  /** Returns an iterator over all node IDs. */
  public nodeIterator(...args: any[]): PrimitiveIterator.OfLong {
    if (args.length === 0) {
      return this._idMap.nodeIterator();
    } else {
      return this._idMap.nodeIterator(args[0] as Set<NodeLabel>);
    }
  }

  /** Returns batch iterables for processing nodes in batches. */
  public batchIterables(batchSize: number): Set<PrimitiveLongIterable> {
    return this._idMap.batchIterables(batchSize);
  }

  // Node Label Management (IdMap interface)

  /** Returns all labels for a mapped node ID. */
  public nodeLabels(mappedNodeId: number): Set<NodeLabel> {
    return this._idMap.nodeLabels(mappedNodeId);
  }

  /** Iterates over all labels for a mapped node ID. */
  public forEachNodeLabel(
    mappedNodeId: number,
    consumer: IdMap.NodeLabelConsumer
  ): void {
    this._idMap.forEachNodeLabel(mappedNodeId, consumer);
  }

  /** Returns all available node labels. */
  public availableNodeLabels(): Set<NodeLabel> {
    return this._idMap.availableNodeLabels();
  }

  /** Checks if a mapped node ID has a specific label. */
  public hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this._idMap.hasLabel(mappedNodeId, label);
  }

  /** Filters nodes by labels with concurrency. */
  public withFilteredLabels(
    nodeLabels: Set<NodeLabel>,
    concurrency: Concurrency
  ): FilteredIdMap | undefined {
    return this._idMap.withFilteredLabels(nodeLabels, concurrency);
  }

  /** Adds a label to the graph. */
  public addNodeLabel(nodeLabel: NodeLabel): void {
    this._idMap.addNodeLabel(nodeLabel);
  }

  /** Adds a node ID to a label. */
  public addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this._idMap.addNodeIdToLabel(nodeId, nodeLabel);
  }

  // ====================================================================
  // NODE PROPERTY CONTAINER INTERFACE - Node property access
  // ====================================================================

  /** Returns the map of node properties. */
  public nodeProperties(propertyKey: string): NodePropertyValues {
    return this._nodeProperties.get(propertyKey)!;
  }

  /** Returns all available node property keys. */
  public availableNodeProperties(): Set<string> {
    return new Set(this._nodeProperties.keys());
  }

  // Additional node property methods (CSR-specific)
  /** Returns the map of node properties. */
  public nodePropertiesMap(): Map<string, NodePropertyValues> {
    return this._nodeProperties;
  }

  /** Returns the value of a node property by key. */
  public nodePropertiesByKey(
    propertyKey: string
  ): NodePropertyValues | undefined {
    return this._nodeProperties.get(propertyKey);
  }

  // ====================================================================
  // DEGREES INTERFACE - Node degree calculations
  // ====================================================================

  /** Returns the degree of a node. */
  public degree(node: number): number {
    return this._adjacency.degree(node);
  }

  /** Returns the inverse degree of a node. */
  public degreeInverse(nodeId: number): number {
    if (!this._inverseAdjacency) {
      throw new Error(
        "Cannot get inverse degree on a graph without inverse indexed relationships"
      );
    }
    return this._inverseAdjacency.degree(nodeId);
  }

  /** Returns the degree of a node, ignoring parallel relationships. */
  public degreeWithoutParallelRelationships(nodeId: number): number {
    if (!this._isMultiGraph) {
      return this.degree(nodeId);
    }
    const degreeCounter = new ParallelRelationshipsDegreeCounter();
    this.runForEach(nodeId, degreeCounter);
    return degreeCounter.degree;
  }

  // ====================================================================
  // RELATIONSHIP ITERATOR INTERFACE - Relationship traversal
  // ====================================================================

  /** Iterates over all relationships for a node. */
  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void;
  forEachRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;
  forEachRelationship(nodeId: number, arg2: any, arg3?: any): void {
    if (typeof arg3 === "function") {
      // Called with (nodeId, fallbackValue, consumer)
      const fallbackValue = arg2 as number;
      const consumer = arg3 as RelationshipWithPropertyConsumer;
      this.runForEachWithProperty(nodeId, fallbackValue, consumer);
    } else {
      // Called with (nodeId, consumer)
      const consumer = arg2 as RelationshipConsumer;
      this.runForEach(nodeId, consumer);
    }
  }

  public forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void;
  public forEachInverseRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;
  public forEachInverseRelationship(
    nodeId: number,
    arg2: any,
    arg3?: any
  ): void {
    if (typeof arg3 === "function") {
      // Called with (nodeId, fallbackValue, consumer)
      const fallbackValue = arg2 as number;
      const consumer = arg3 as RelationshipWithPropertyConsumer;
      this.runForEachInverseWithProperty(nodeId, fallbackValue, consumer);
    } else {
      // Called with (nodeId, consumer)
      const consumer = arg2 as RelationshipConsumer;
      this.runForEachInverse(nodeId, consumer);
    }
  }

  // ====================================================================
  // RELATIONSHIP PROPERTIES INTERFACE - Relationship property access
  // ====================================================================

  /** Returns the value of a relationship property, or fallback/default. */
  public relationshipProperty(
    sourceId: number,
    targetId: number,
    fallbackValue?: number
  ): number {
    if (!this._hasRelationshipProperty) {
      return fallbackValue ?? this._defaultPropertyValue;
    }
    let maybeValue = this._properties
      ? this.findPropertyValue(sourceId, targetId)
      : Number.NaN;
    if (!Number.isNaN(maybeValue)) {
      return maybeValue;
    }
    return this._defaultPropertyValue;
  }

  /** Streams relationships for a node as RelationshipCursor objects. */
  public streamRelationships(
    nodeId: number,
    fallbackValue: number
  ): Iterable<RelationshipCursor> {
    const adjacencyCursor = this.adjacencyCursorForIteration(nodeId);

    // Use AdjacencySpliterator to yield RelationshipCursor objects
    if (!this._hasRelationshipProperty) {
      // No relationship property: use fallbackValue
      return AdjacencySpliterator.of(adjacencyCursor, nodeId, fallbackValue);
    } else {
      // Has relationship property: use property cursor
      const propertyCursor = this.propertyCursorForIteration(nodeId);
      return AdjacencySpliterator.ofWithProperty(
        adjacencyCursor,
        propertyCursor,
        nodeId
      );
    }
  }

  // ====================================================================
  // CSR-SPECIFIC METHODS - Compressed Sparse Row specific functionality
  // ====================================================================

  /** Returns the ID map instance. */
  public idMap(): IdMap {
    return this._idMap;
  }

  /** Returns a map of relationship types to their topologies. */
  public relationshipTopologies(): Map<RelationshipType, Topology> {
    return new Map([[this.relationshipType(), this.relationshipTopology()]]);
  }

  /** Returns the relationship topology. */
  public relationshipTopology(): Topology {
    return ImmutableTopology.of(
      this._adjacency,
      this._relationshipCount,
      this._isMultiGraph
    );
  }

  /** Returns the inverse relationship topology, if available. */
  public inverseRelationshipTopology(): Topology | undefined {
    return this._inverseAdjacency
      ? ImmutableTopology.of(
          this._adjacency,
          this._relationshipCount,
          this._isMultiGraph
        )
      : undefined;
  }

  /** Returns the relationship properties, if available. */
  public relationshipProperties(): Properties | undefined {
    return this._properties
      ? ImmutableProperties.of(
          this._properties,
          this._relationshipCount,
          this._defaultPropertyValue
        )
      : undefined;
  }

  /** Returns the inverse relationship properties, if available. */
  public inverseRelationshipProperties(): Properties | undefined {
    return this._inverseProperties
      ? ImmutableProperties.of(
          this._inverseProperties,
          this._relationshipCount,
          this._defaultPropertyValue
        )
      : undefined;
  }

  // ====================================================================
  // INTERNAL IMPLEMENTATION METHODS - Private/protected methods
  // ====================================================================

  private relationshipType(): RelationshipType {
    return Array.from(this._schema.relationshipSchema().availableTypes())[0];
  }

  private assertSupportedRelationships(
    relationshipTypes: Set<RelationshipType>
  ) {
    if (
      relationshipTypes.size > 1 ||
      (relationshipTypes.size === 1 &&
        !relationshipTypes.has(this.relationshipType()))
    ) {
      throw new Error(
        `One or more relationship types of ${Array.from(
          relationshipTypes
        )} are not supported. This graph has a relationship of type ${this.relationshipType()}.`
      );
    }
  }

  private findPropertyValue(fromId: number, toId: number): number {
    if (!this._properties) return HugeGraph.NO_PROPERTY_VALUE;
    const adjacencyCursor = this._adjacency.adjacencyCursor(fromId);
    if (!adjacencyCursor.hasNextVLong()) return HugeGraph.NO_PROPERTY_VALUE;
    const propertyCursor = this._properties.propertyCursor(
      fromId,
      this._defaultPropertyValue
    );
    while (
      adjacencyCursor.hasNextVLong() &&
      propertyCursor.hasNextLong() &&
      adjacencyCursor.nextVLong() !== toId
    ) {
      propertyCursor.nextLong();
    }
    if (!propertyCursor.hasNextLong()) return HugeGraph.NO_PROPERTY_VALUE;
    const doubleBits = propertyCursor.nextLong();
    return doubleBits;
  }

  private runForEach(sourceId: number, consumer: RelationshipConsumer): void {
    const adjacencyCursor = this.adjacencyCursorForIteration(sourceId);
    this.consumeAdjacentNodes(sourceId, adjacencyCursor, consumer);
  }

  private runForEachWithProperty(
    sourceId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    if (!this._hasRelationshipProperty) {
      this.runForEach(sourceId, {
        accept: (s: number, t: number) => consumer.accept(s, t, fallbackValue),
      });
    } else {
      const adjacencyCursor = this.adjacencyCursorForIteration(sourceId);
      const propertyCursor = this.propertyCursorForIteration(sourceId);
      this.consumeAdjacentNodesWithProperty(
        sourceId,
        adjacencyCursor,
        propertyCursor,
        consumer
      );
    }
  }

  private runForEachInverse(
    sourceId: number,
    consumer: RelationshipConsumer
  ): void {
    const adjacencyCursor = this.inverseAdjacencyCursorForIteration(sourceId);
    this.consumeAdjacentNodes(sourceId, adjacencyCursor, consumer);
  }

  private runForEachInverseWithProperty(
    sourceId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    if (!this._hasRelationshipProperty) {
      this.runForEachInverse(sourceId, {
        accept: (s: number, t: number) => consumer.accept(s, t, fallbackValue),
      });
    } else {
      const adjacencyCursor = this.inverseAdjacencyCursorForIteration(sourceId);
      const propertyCursor = this.inversePropertyCursorForIteration(sourceId);
      this.consumeAdjacentNodesWithProperty(
        sourceId,
        adjacencyCursor,
        propertyCursor,
        consumer
      );
    }
  }

  private adjacencyCursorForIteration(sourceNodeId: number): AdjacencyCursor {
    return this._adjacency.adjacencyCursor(
      this._adjacencyCursorCache,
      sourceNodeId,
      0
    );
  }

  private propertyCursorForIteration(sourceNodeId: number): PropertyCursor {
    if (!this._hasRelationshipProperty || !this._properties) {
      throw new Error(
        "Cannot create property cursor on a graph without relationship property"
      );
    }
    return this._properties.propertyCursor(
      this._propertyCursorCache!,
      sourceNodeId,
      this._defaultPropertyValue
    );
  }

  private inverseAdjacencyCursorForIteration(
    sourceNodeId: number
  ): AdjacencyCursor {
    if (!this._inverseAdjacency) {
      throw new Error(
        "Cannot create adjacency cursor on a graph without inverse indexed relationships"
      );
    }
    return this._inverseAdjacency.adjacencyCursor(
      this._inverseAdjacencyCursorCache!,
      sourceNodeId,
      0
    );
  }

  private inversePropertyCursorForIteration(
    sourceNodeId: number
  ): PropertyCursor {
    if (!this._hasRelationshipProperty || !this._inverseProperties) {
      throw new Error(
        "Cannot create property cursor on a graph without relationship property"
      );
    }
    return this._inverseProperties.propertyCursor(
      this._inversePropertyCursorCache!,
      sourceNodeId,
      this._defaultPropertyValue
    );
  }

  private consumeAdjacentNodes(
    sourceId: number,
    adjacencyCursor: AdjacencyCursor,
    consumer: RelationshipConsumer
  ): void {
    while (adjacencyCursor.hasNextVLong()) {
      if (!consumer.accept(sourceId, adjacencyCursor.nextVLong())) {
        break;
      }
    }
  }

  private consumeAdjacentNodesWithProperty(
    sourceId: number,
    adjacencyCursor: AdjacencyCursor,
    propertyCursor: PropertyCursor,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    while (adjacencyCursor.hasNextVLong()) {
      const targetId = adjacencyCursor.nextVLong();
      const propertyBits = propertyCursor.nextLong();
      const property = propertyBits;
      if (!consumer.accept(sourceId, targetId, property)) {
        break;
      }
    }
  }
}

// Utility class for parallel relationship counting
class ParallelRelationshipsDegreeCounter implements RelationshipConsumer {
  previousNodeId = -1;
  degree = 0;

  accept(_s: number, t: number): boolean {
    if (t !== this.previousNodeId) {
      this.degree++;
      this.previousNodeId = t;
    }
    return true;
  }
}
