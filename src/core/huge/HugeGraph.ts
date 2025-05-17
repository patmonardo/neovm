import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { ValueType } from "@/api/ValueType";
import { IdMap } from "@/api/IdMap";
import { FilteredIdMap } from "@/api/FilteredIdMap";
import { GraphCharacteristics } from "@/api/GraphCharacteristics";
import { Topology } from "@/api/Topology";
import { ImmutableTopology } from "@/api/Topology";
import { AdjacencyProperties } from "@/api/AdjacencyProperties";
import { AdjacencyList } from "@/api/AdjacencyList";
import { Properties } from "@/api/properties/relationships";
import { ImmutableProperties } from "@/api/properties/relationships";
import { RelationshipConsumer } from "@/api/properties/relationships";
import { RelationshipWithPropertyConsumer } from "@/api/properties/relationships";
import { AdjacencyCursor } from "@/api/AdjacencyCursor";
import { NodePropertyValues } from "@/api/properties/nodes";
import { PropertyCursor } from "@/api/properties/relationships";
import { GraphSchema } from "@/api/schema/";
import { PrimitiveLongIterable } from "@/collections";
import { Concurrency } from "@/concurrency";

export class HugeGraph {
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
    this.inverseAdjacencyCursorCache = inverseAdjacency ? inverseAdjacency.rawAdjacencyCursor() : undefined;
    this.propertyCursorCache = properties ? properties.rawPropertyCursor() : undefined;
    this.inversePropertyCursorCache = inverseProperties ? inverseProperties.rawPropertyCursor() : undefined;
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

  // ...continue translating methods, mapping Java idioms to TypeScript...

  // Example for relationshipProperty
  relationshipProperty(sourceId: number, targetId: number, fallbackValue?: number): number {
    if (!this.hasRelationshipProperty) {
      return fallbackValue ?? this.defaultPropertyValue;
    }
    let maybeValue = this.properties ? this.findPropertyValue(sourceId, targetId) : Number.NaN;
    if (!Number.isNaN(maybeValue)) {
      return maybeValue;
    }
    return this.defaultPropertyValue;
  }

  private findPropertyValue(fromId: number, toId: number): number {
    if (!this.properties) return HugeGraph.NO_PROPERTY_VALUE;
    const adjacencyCursor = this.adjacency.adjacencyCursor(fromId);
    if (!adjacencyCursor.hasNextVLong()) return HugeGraph.NO_PROPERTY_VALUE;
    const propertyCursor = this.properties.propertyCursor(fromId, this.defaultPropertyValue);
    while (adjacencyCursor.hasNextVLong() && propertyCursor.hasNextLong() && adjacencyCursor.nextVLong() !== toId) {
      propertyCursor.nextLong();
    }
    if (!propertyCursor.hasNextLong()) return HugeGraph.NO_PROPERTY_VALUE;
    const doubleBits = propertyCursor.nextLong();
    // In JS, all numbers are floats, so just use doubleBits directly or decode if needed
    return doubleBits; // or decode if you store as bits
  }

  // ...implement the rest of the methods, following the Java logic...

  // Example for degree
  degree(node: number): number {
    return this.adjacency.degree(node);
  }

  degreeInverse(nodeId: number): number {
    if (!this.inverseAdjacency) {
      throw new Error("Cannot get inverse degree on a graph without inverse indexed relationships");
    }
    return this.inverseAdjacency.degree(nodeId);
  }

  // ...and so on for all other methods...

  // Example for concurrentCopy
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

  // ...implement all other required methods and properties...
}
