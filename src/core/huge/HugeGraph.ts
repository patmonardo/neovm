import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { CSRGraph } from "@/api/CSRGraph";
import { IdMap } from "@/api/IdMap";
import { FilteredIdMap } from "@/api/FilteredIdMap";
import { GraphCharacteristics } from "@/api/GraphCharacteristics";
import { Topology, ImmutableTopology } from "@/api/Topology";
import { AdjacencyProperties } from "@/api/AdjacencyProperties";
import { AdjacencyList } from "@/api/AdjacencyList";
import {
  Properties,
  ImmutableProperties,
} from "@/api/properties/relationships";
import {
  RelationshipConsumer,
  RelationshipWithPropertyConsumer,
  RelationshipCursor,
} from "@/api/properties/relationships";
import { AdjacencyCursor } from "@/api/AdjacencyCursor";
import { NodePropertyValues } from "@/api/properties/nodes";
import { PropertyCursor } from "@/api/properties/relationships";
import { GraphSchema } from "@/api/schema";
import { PrimitiveLongIterable } from "@/collections";
import { Concurrency } from "@/concurrency";
import { NOT_FOUND } from "@/api/IdMap";

export class HugeGraph implements CSRGraph {
  static readonly NO_PROPERTY_VALUE = Number.NaN;

  protected readonly idMap: IdMap;
  protected readonly schema: GraphSchema;
  protected readonly characteristics: GraphCharacteristics;
  protected readonly nodeProperties: Map<string, NodePropertyValues>;
  protected readonly relationshipCount: number;
  protected adjacency: AdjacencyList;
  protected inverseAdjacency?: AdjacencyList;
  private readonly defaultPropertyValue: number;
  protected properties?: AdjacencyProperties;
  protected inverseProperties?: AdjacencyProperties;
  private adjacencyCursorCache: AdjacencyCursor;
  private inverseAdjacencyCursorCache?: AdjacencyCursor;
  private propertyCursorCache?: PropertyCursor;
  private inversePropertyCursorCache?: PropertyCursor;
  protected readonly hasRelationshipProperty: boolean;
  protected readonly isMultiGraph: boolean;

  constructor(
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
    this.idMap = idMap;
    this.schema = schema;
    this.characteristics = characteristics;
    this.nodeProperties = nodeProperties;
    this.relationshipCount = relationshipCount;
    this.adjacency = adjacency;
    this.inverseAdjacency = inverseAdjacency ?? undefined;
    this.defaultPropertyValue = defaultRelationshipPropertyValue;
    this.properties = properties ?? undefined;
    this.inverseProperties = inverseProperties ?? undefined;
    this.hasRelationshipProperty = hasRelationshipProperty;
    this.isMultiGraph = isMultiGraph;

    this.adjacencyCursorCache = adjacency.rawAdjacencyCursor();
    this.inverseAdjacencyCursorCache = inverseAdjacency
      ? inverseAdjacency.rawAdjacencyCursor()
      : undefined;
    this.propertyCursorCache = properties
      ? properties.rawPropertyCursor()
      : undefined;
    this.inversePropertyCursorCache = inverseProperties
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

  nodeCount(): number {
    return this.idMap.nodeCount();
  }

  nodeCountWithLabel(nodeLabel: NodeLabel): number {
    return this.idMap.nodeCount(nodeLabel);
  }

  rootNodeCount(): number | undefined {
    return this.idMap.rootNodeCount();
  }

  highestOriginalId(): number {
    return this.idMap.highestOriginalId();
  }

  idMapInstance(): IdMap {
    return this.idMap;
  }

  rootIdMap(): IdMap {
    return this.idMap.rootIdMap();
  }

  schemaInstance(): GraphSchema {
    return this.schema;
  }

  characteristicsInstance(): GraphCharacteristics {
    return this.characteristics;
  }

  nodePropertiesMap(): Map<string, NodePropertyValues> {
    return this.nodeProperties;
  }

  relationshipCountValue(): number {
    return this.relationshipCount;
  }

  batchIterables(batchSize: number): Iterable<PrimitiveLongIterable> {
    return this.idMap.batchIterables(batchSize);
  }

  forEachNode(consumer: (nodeId: number) => boolean): void {
    this.idMap.forEachNode(consumer);
  }

  nodeIterator(): IterableIterator<number> {
    return this.idMap.nodeIterator();
  }

  nodeIteratorWithLabels(labels: Set<NodeLabel>): IterableIterator<number> {
    return this.idMap.nodeIterator(labels);
  }

  relationshipProperty(
    sourceId: number,
    targetId: number,
    fallbackValue?: number
  ): number {
    if (!this.hasRelationshipProperty) {
      return fallbackValue ?? this.defaultPropertyValue;
    }
    let maybeValue = this.properties
      ? this.findPropertyValue(sourceId, targetId)
      : Number.NaN;
    if (!Number.isNaN(maybeValue)) {
      return maybeValue;
    }
    return this.defaultPropertyValue;
  }

  private findPropertyValue(fromId: number, toId: number): number {
    if (!this.properties) return HugeGraph.NO_PROPERTY_VALUE;
    const adjacencyCursor = this.adjacency.adjacencyCursor(fromId);
    if (!adjacencyCursor.hasNextVLong()) return HugeGraph.NO_PROPERTY_VALUE;
    const propertyCursor = this.properties.propertyCursor(
      fromId,
      this.defaultPropertyValue
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
    // In JS, all numbers are floats, so just use doubleBits directly or decode if needed
    return doubleBits;
  }

  nodePropertiesByKey(propertyKey: string): NodePropertyValues | undefined {
    return this.nodeProperties.get(propertyKey);
  }

  availableNodeProperties(): Set<string> {
    return new Set(this.nodeProperties.keys());
  }

  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void {
    this.runForEach(nodeId, consumer);
  }

  forEachRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    this.runForEachWithProperty(nodeId, fallbackValue, consumer);
  }

  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void {
    this.runForEachInverse(nodeId, consumer);
  }

  forEachInverseRelationshipWithProperty(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void {
    this.runForEachInverseWithProperty(nodeId, fallbackValue, consumer);
  }

  streamRelationships(
    nodeId: number,
    fallbackValue: number
  ): Iterable<RelationshipCursor> {
    const adjacencyCursor = this.adjacencyCursorForIteration(nodeId);
    // Use your AdjacencySpliterator or generator here
    // This is a placeholder:
    return {
      [Symbol.iterator]: function* () {
        while (adjacencyCursor.hasNextVLong()) {
          yield {
            sourceId: nodeId,
            targetId: adjacencyCursor.nextVLong(),
            property: fallbackValue,
          };
        }
      },
    };
  }

  relationshipTypeFilteredGraph(
    relationshipTypes: Set<RelationshipType>
  ): HugeGraph {
    this.assertSupportedRelationships(relationshipTypes);
    return this;
  }

  relationshipTopologies(): Map<RelationshipType, Topology> {
    return new Map([[this.relationshipType(), this.relationshipTopology()]]);
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

  private relationshipType(): RelationshipType {
    return Array.from(this.schema.relationshipSchema().availableTypes())[0];
  }

  degree(node: number): number {
    return this.adjacency.degree(node);
  }

  degreeInverse(nodeId: number): number {
    if (!this.inverseAdjacency) {
      throw new Error(
        "Cannot get inverse degree on a graph without inverse indexed relationships"
      );
    }
    return this.inverseAdjacency.degree(nodeId);
  }

  degreeWithoutParallelRelationships(nodeId: number): number {
    if (!this.isMultiGraph) {
      return this.degree(nodeId);
    }
    const degreeCounter = new ParallelRelationshipsDegreeCounter();
    this.runForEach(nodeId, degreeCounter);
    return degreeCounter.degree;
  }

  toMappedNodeId(originalNodeId: number): number {
    return this.idMap.toMappedNodeId(originalNodeId);
  }

  typeId(): string {
    return this.idMap.typeId();
  }

  toOriginalNodeId(mappedNodeId: number): number {
    return this.idMap.toOriginalNodeId(mappedNodeId);
  }

  toRootNodeId(mappedNodeId: number): number {
    return this.idMap.toRootNodeId(mappedNodeId);
  }

  containsOriginalId(originalNodeId: number): boolean {
    return this.idMap.containsOriginalId(originalNodeId);
  }

  concurrentCopy(): HugeGraph {
    return new HugeGraph(
      this.idMap,
      this.schema,
      this.characteristics,
      this.nodeProperties,
      this.relationshipCount,
      this.adjacency,
      this.inverseAdjacency ?? null,
      this.hasRelationshipProperty,
      this.defaultPropertyValue,
      this.properties ?? null,
      this.inverseProperties ?? null,
      this.isMultiGraph
    );
  }

  asNodeFilteredGraph(): FilteredIdMap | undefined {
    return undefined;
  }

  exists(sourceNodeId: number, targetNodeId: number): boolean {
    const cursor = this.adjacencyCursorForIteration(sourceNodeId);
    return cursor.advance(targetNodeId) === targetNodeId;
  }

  nthTarget(nodeId: number, offset: number): number {
    if (offset >= this.degree(nodeId)) {
      return NOT_FOUND;
    }
    const cursor = this.adjacencyCursorForIteration(nodeId);
    return cursor.advanceBy(offset);
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
    if (!this.hasRelationshipProperty) {
      this.runForEach(sourceId, (s, t) => consumer.accept(s, t, fallbackValue));
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
    if (!this.hasRelationshipProperty) {
      this.runForEachInverse(sourceId, (s, t) =>
        consumer.accept(s, t, fallbackValue)
      );
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
    return this.adjacency.adjacencyCursor(
      this.adjacencyCursorCache,
      sourceNodeId
    );
  }

  private propertyCursorForIteration(sourceNodeId: number): PropertyCursor {
    if (!this.hasRelationshipProperty || !this.properties) {
      throw new Error(
        "Cannot create property cursor on a graph without relationship property"
      );
    }
    return this.properties.propertyCursor(
      this.propertyCursorCache,
      sourceNodeId,
      this.defaultPropertyValue
    );
  }

  private inverseAdjacencyCursorForIteration(
    sourceNodeId: number
  ): AdjacencyCursor {
    if (!this.inverseAdjacency) {
      throw new Error(
        "Cannot create adjacency cursor on a graph without inverse indexed relationships"
      );
    }
    return this.inverseAdjacency.adjacencyCursor(
      this.inverseAdjacencyCursorCache!,
      sourceNodeId
    );
  }

  private inversePropertyCursorForIteration(
    sourceNodeId: number
  ): PropertyCursor {
    if (!this.hasRelationshipProperty || !this.inverseProperties) {
      throw new Error(
        "Cannot create property cursor on a graph without relationship property"
      );
    }
    return this.inverseProperties.propertyCursor(
      this.inversePropertyCursorCache!,
      sourceNodeId,
      this.defaultPropertyValue
    );
  }

  relationshipTopology(): Topology {
    return ImmutableTopology.of(
      this.adjacency,
      this.relationshipCount,
      this.isMultiGraph
    );
  }

  inverseRelationshipTopology(): Topology | undefined {
    return this.inverseAdjacency
      ? ImmutableTopology.of(
          this.adjacency,
          this.relationshipCount,
          this.isMultiGraph
        )
      : undefined;
  }

  relationshipProperties(): Properties | undefined {
    return this.properties
      ? ImmutableProperties.of(
          this.properties,
          this.relationshipCount,
          this.defaultPropertyValue
        )
      : undefined;
  }

  inverseRelationshipProperties(): Properties | undefined {
    return this.inverseProperties
      ? ImmutableProperties.of(
          this.inverseProperties,
          this.relationshipCount,
          this.defaultPropertyValue
        )
      : undefined;
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
      // In JS, all numbers are floats, so just use propertyBits directly or decode if needed
      const property = propertyBits;
      if (!consumer.accept(sourceId, targetId, property)) {
        break;
      }
    }
  }

  nodeLabels(mappedNodeId: number): NodeLabel[] {
    return this.idMap.nodeLabels(mappedNodeId);
  }

  forEachNodeLabel(
    mappedNodeId: number,
    consumer: (label: NodeLabel) => void
  ): void {
    this.idMap.forEachNodeLabel(mappedNodeId, consumer);
  }

  availableNodeLabels(): Set<NodeLabel> {
    return this.idMap.availableNodeLabels();
  }

  hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
    return this.idMap.hasLabel(mappedNodeId, label);
  }

  withFilteredLabels(
    nodeLabels: Iterable<NodeLabel>,
    concurrency: Concurrency
  ): FilteredIdMap | undefined {
    return this.idMap.withFilteredLabels(nodeLabels, concurrency);
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    this.idMap.addNodeLabel(nodeLabel);
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.idMap.addNodeIdToLabel(nodeId, nodeLabel);
  }

  isMultiGraphInstance(): boolean {
    return this.isMultiGraph;
  }

  hasRelationshipPropertyInstance(): boolean {
    return this.hasRelationshipProperty;
  }
}

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
