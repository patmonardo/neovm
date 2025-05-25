import { GraphStore } from '@/api/GraphStore';
import { CSRGraph } from '@/api/CSRGraph';
import { CompositeRelationshipIterator } from '@/api/CompositeRelationshipIterator';
import { DatabaseInfo } from '@/api/DatabaseInfo';
import { IdMap, FilteredIdMap } from '@/api/IdMap';
import { Topology } from '@/api/Topology';
import { AdjacencyProperties } from '@/api/AdjacencyProperties';
import { GraphCharacteristics } from '@/api/GraphCharacteristics';
import { NodeLabel, RelationshipType } from '@/types/graph';
import { ValueType } from '@/types/properties';
import { PropertyState } from '@/types/PropertyState';
import {
  GraphPropertyStore, GraphProperty, GraphPropertyValues,
  NodePropertyStore, NodeProperty, NodePropertyValues,
  RelationshipProperty, RelationshipPropertyStore
} from '@/api/properties';
import {
  GraphSchema, MutableGraphSchema,
  MutableNodeSchema, MutableRelationshipSchema,
  PropertySchema
} from '@/api/schema';
import { SingleTypeRelationships } from './SingleTypeRelationships';
import { RelationshipImportResult } from './RelationshipImportResult';
import { Nodes } from './Nodes';
import { HugeGraphBuilder } from '@/core/huge/HugeGraphBuilder';
import { NodeFilteredGraph } from '@/core/huge/NodeFilteredGraph';
import { UnionGraph } from '@/core/huge/UnionGraph';
import { CSRCompositeRelationshipIterator } from '@/core/huge/CSRCompositeRelationshipIterator';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { TimeUtil } from '@/core/utils/TimeUtil';
import { StringJoining } from '@/utils/StringJoining';
import { prettySuggestions } from '@/core/StringSimilarity';
import { formatWithLocale } from '@/utils/StringFormatting';
import { Optional } from '@/utils/Optional';
import { DeletionResult } from '@/core/DeletionResult';

/**
 * High-performance CSR (Compressed Sparse Row) graph storage implementation.
 */
export class CSRGraphStore implements GraphStore {

  private readonly concurrency: Concurrency;
  private readonly databaseInfo: DatabaseInfo;
  private readonly capabilities: Capabilities;
  private readonly nodes: IdMap;
  private readonly relationships: Map<RelationshipType, SingleTypeRelationships>;
  private schema: MutableGraphSchema;
  private graphProperties: GraphPropertyStore;
  private nodeProperties: NodePropertyStore;
  private readonly zoneId: string;
  private readonly creationTime: Date;
  private modificationTime: Date;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(
    databaseInfo: DatabaseInfo,
    capabilities: Capabilities,
    schema: MutableGraphSchema,
    nodes: IdMap,
    nodeProperties: NodePropertyStore,
    relationships: Map<RelationshipType, SingleTypeRelationships>,
    graphProperties: GraphPropertyStore,
    concurrency: Concurrency,
    zoneId: string
  ) {
    this.databaseInfo = databaseInfo;
    this.capabilities = capabilities;
    this.schema = schema;
    this.nodes = nodes;
    this.nodeProperties = nodeProperties;
    this.relationships = new Map(relationships); // Defensive copy
    this.graphProperties = graphProperties;
    this.concurrency = concurrency;
    this.zoneId = zoneId;
    this.creationTime = TimeUtil.now(zoneId);
    this.modificationTime = this.creationTime;
  }

  /**
   * Factory method for creating CSR graph stores
   */
  static of(
    databaseInfo: DatabaseInfo,
    capabilities: Capabilities,
    schema: MutableGraphSchema,
    nodes: Nodes,
    relationshipImportResult: RelationshipImportResult,
    graphProperties?: GraphPropertyStore,
    concurrency?: Concurrency,
    zoneId?: string
  ): CSRGraphStore {
    return new CSRGraphStore(
      databaseInfo,
      capabilities,
      schema,
      nodes.idMap(),
      nodes.properties(),
      relationshipImportResult.importResults(),
      graphProperties || GraphPropertyStore.empty(),
      concurrency || new Concurrency(1),
      zoneId || TimeUtil.systemTimezone()
    );
  }

  // ==================== Core Interface Methods ====================

  databaseInfo(): DatabaseInfo {
    return this.databaseInfo;
  }

  schema(): GraphSchema {
    return this.schema;
  }

  creationTime(): Date {
    return this.creationTime;
  }

  modificationTime(): Date {
    return this.modificationTime;
  }

  capabilities(): Capabilities {
    return this.capabilities;
  }

  nodeCount(): number {
    return this.nodes.nodeCount();
  }

  relationshipCount(): number {
    let sum = 0;
    for (const relationship of this.relationships.values()) {
      sum += relationship.topology().elementCount();
    }
    return sum;
  }

  relationshipCount(relationshipType: RelationshipType): number {
    const relationship = this.relationships.get(relationshipType);
    if (!relationship) {
      throw new Error(`Relationship type '${relationshipType.name}' not found`);
    }
    return relationship.topology().elementCount();
  }

  // ==================== Graph Property Management ====================

  graphPropertyKeys(): Set<string> {
    return this.graphProperties.keySet();
  }

  hasGraphProperty(propertyKey: string): boolean {
    return this.graphPropertyKeys().has(propertyKey);
  }

  graphProperty(propertyKey: string): GraphProperty {
    return this.graphProperties.get(propertyKey);
  }

  graphPropertyValues(propertyKey: string): GraphPropertyValues {
    return this.graphProperty(propertyKey).values();
  }

  addGraphProperty(propertyKey: string, propertyValues: GraphPropertyValues): void {
    this.updateGraphStore(() => {
      if (this.hasGraphProperty(propertyKey)) {
        throw new Error(
          formatWithLocale(
            "Graph property %s already exists",
            propertyKey
          )
        );
      }

      // Update property store
      this.graphProperties = GraphPropertyStore
        .builder()
        .from(this.graphProperties)
        .putIfAbsent(propertyKey, GraphProperty.of(propertyKey, propertyValues))
        .build();

      // Update schema
      const newGraphPropertySchema = new Map(this.schema.graphProperties());
      newGraphPropertySchema.set(
        propertyKey,
        PropertySchema.of(propertyKey, propertyValues.valueType())
      );

      this.schema = MutableGraphSchema.of(
        this.schema.nodeSchema(),
        this.schema.relationshipSchema(),
        newGraphPropertySchema
      );
    });
  }

  removeGraphProperty(propertyKey: string): void {
    this.updateGraphStore(() => {
      // Update property store
      this.graphProperties = GraphPropertyStore
        .builder()
        .from(this.graphProperties)
        .removeProperty(propertyKey)
        .build();

      // Update schema
      const newGraphPropertySchema = new Map(this.schema.graphProperties());
      newGraphPropertySchema.delete(propertyKey);

      this.schema = MutableGraphSchema.of(
        this.schema.nodeSchema(),
        this.schema.relationshipSchema(),
        newGraphPropertySchema
      );
    });
  }

  // ==================== Node Management ====================

  nodes(): IdMap {
    return this.nodes;
  }

  nodeLabels(): Set<NodeLabel> {
    return this.nodes.availableNodeLabels();
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    this.updateGraphStore(() => {
      this.nodes.addNodeLabel(nodeLabel);
      const nodeSchema = this.schema.nodeSchema();
      nodeSchema.addLabel(nodeLabel, nodeSchema.unionProperties());
    });
  }

  nodePropertyKeys(label: NodeLabel): Set<string> {
    return this.schema.nodeSchema().allProperties(label);
  }

  nodePropertyKeys(): Set<string> {
    return this.nodeProperties.keySet();
  }

  hasNodeProperty(propertyKey: string): boolean;
  hasNodeProperty(label: NodeLabel, propertyKey: string): boolean;
  hasNodeProperty(labels: NodeLabel[], propertyKey: string): boolean;
  hasNodeProperty(labelOrPropertyKey: NodeLabel | NodeLabel[] | string, propertyKey?: string): boolean {
    // Single property key overload
    if (typeof labelOrPropertyKey === 'string') {
      return this.nodeProperties.has(labelOrPropertyKey);
    }

    // Single label overload
    if (!Array.isArray(labelOrPropertyKey) && propertyKey) {
      return this.schema.nodeSchema().hasProperty(labelOrPropertyKey, propertyKey) &&
             this.hasNodeProperty(propertyKey);
    }

    // Multiple labels overload
    if (Array.isArray(labelOrPropertyKey) && propertyKey) {
      return labelOrPropertyKey.every(label => this.hasNodeProperty(label, propertyKey));
    }

    throw new Error('Invalid arguments');
  }

  nodeProperty(propertyKey: string): NodeProperty {
    return this.nodeProperties.get(propertyKey);
  }

  addNodeProperty(
    labels: Set<NodeLabel>,
    propertyKey: string,
    propertyValues: NodePropertyValues
  ): void {
    this.updateGraphStore(() => {
      if (this.hasNodeProperty(propertyKey)) {
        throw new Error(
          formatWithLocale(
            "Node property %s already exists",
            propertyKey
          )
        );
      }

      // Update property store
      this.nodeProperties = NodePropertyStore
        .builder()
        .from(this.nodeProperties)
        .putIfAbsent(
          propertyKey,
          NodeProperty.of(propertyKey, PropertyState.TRANSIENT, propertyValues)
        )
        .build();

      // Update schema for all specified labels
      labels.forEach(label => {
        this.schema.nodeSchema()
          .get(label)
          .addProperty(
            propertyKey,
            PropertySchema.of(
              propertyKey,
              propertyValues.valueType(),
              propertyValues.valueType().fallbackValue(),
              PropertyState.TRANSIENT
            )
          );
      });
    });
  }

  removeNodeProperty(propertyKey: string): void {
    this.updateGraphStore(() => {
      // Update property store
      this.nodeProperties = NodePropertyStore
        .builder()
        .from(this.nodeProperties)
        .removeProperty(propertyKey)
        .build();

      // Remove from all label schemas
      this.schema.nodeSchema().entries().forEach(entry => {
        entry.removeProperty(propertyKey);
      });
    });
  }

  // ==================== Relationship Management ====================

  relationshipTypes(): Set<RelationshipType> {
    return new Set(this.relationships.keys());
  }

  hasRelationshipType(relationshipType: RelationshipType): boolean {
    return this.relationships.has(relationshipType);
  }

  inverseIndexedRelationshipTypes(): Set<RelationshipType> {
    const result = new Set<RelationshipType>();

    for (const [type, relationship] of this.relationships) {
      if (relationship.inverseTopology().isPresent()) {
        result.add(type);
      }
    }

    return result;
  }

  hasRelationshipProperty(relType: RelationshipType, propertyKey: string): boolean {
    const relationship = this.relationships.get(relType);
    if (!relationship) {
      return false;
    }

    const properties = relationship.properties();
    if (!properties.isPresent()) {
      return false;
    }

    return properties.get().has(propertyKey);
  }

  relationshipPropertyType(propertyKey: string): ValueType {
    const propertySchema = this.schema.relationshipSchema().unionProperties().get(propertyKey);
    return propertySchema ? propertySchema.valueType() : ValueType.UNKNOWN;
  }

  relationshipPropertyKeys(): Set<string> {
    return this.schema.relationshipSchema().allProperties();
  }

  relationshipPropertyKeys(relationshipType: RelationshipType): Set<string> {
    const relationship = this.relationships.get(relationshipType);
    if (!relationship) {
      return new Set();
    }

    const properties = relationship.properties();
    if (!properties.isPresent()) {
      return new Set();
    }

    return properties.get().keySet();
  }

  relationshipPropertyValues(
    relationshipType: RelationshipType,
    propertyKey: string
  ): RelationshipProperty {
    const relationship = this.relationships.get(relationshipType);
    if (!relationship) {
      throw new Error(`Relationship type '${relationshipType.name}' not found`);
    }

    const properties = relationship.properties();
    if (!properties.isPresent()) {
      throw new Error(
        `No relationship properties found for relationship type '${relationshipType.name}'`
      );
    }

    const property = properties.get().get(propertyKey);
    if (!property) {
      throw new Error(
        `No relationship properties found for relationship type '${relationshipType.name}' ` +
        `and property key '${propertyKey}'`
      );
    }

    return property;
  }

  addRelationshipType(relationships: SingleTypeRelationships): void {
    this.updateGraphStore(() => {
      const relationshipType = relationships.relationshipSchemaEntry().identifier();

      if (!this.relationships.has(relationshipType)) {
        this.relationships.set(relationshipType, relationships);
        this.schema.relationshipSchema().set(relationships.relationshipSchemaEntry());
      }
    });
  }

  addInverseIndex(
    relationshipType: RelationshipType,
    topology: Topology,
    properties?: RelationshipPropertyStore
  ): void {
    const existingRelationship = this.relationships.get(relationshipType);
    if (!existingRelationship) {
      throw new Error(`Relationship type '${relationshipType.name}' not found`);
    }

    const newRelationship = SingleTypeRelationships
      .builder()
      .from(existingRelationship)
      .inverseTopology(topology)
      .inverseProperties(properties ? Optional.of(properties) : Optional.empty())
      .build();

    this.relationships.set(relationshipType, newRelationship);
  }

  deleteRelationships(relationshipType: RelationshipType): DeletionResult {
    let deletedRelationships = 0;
    const deletedProperties = new Map<string, number>();

    this.updateGraphStore(() => {
      const relationship = this.relationships.get(relationshipType);
      if (relationship) {
        deletedRelationships = relationship.topology().elementCount();

        // Count deleted properties
        const properties = relationship.properties();
        if (properties.isPresent()) {
          for (const [key, property] of properties.get().entries()) {
            deletedProperties.set(key, property.values().elementCount());
          }
        }

        // Remove from storage and schema
        this.relationships.delete(relationshipType);
        this.schema.relationshipSchema().remove(relationshipType);
      }
    });

    return {
      deletedRelationships,
      deletedProperties
    };
  }

  // ==================== Graph Materialization ====================

  getGraph(nodeLabels: NodeLabel[]): CSRGraph;
  getGraph(
    nodeLabels: NodeLabel[],
    relationshipTypes: RelationshipType[],
    relationshipProperty?: string
  ): CSRGraph;
  getGraph(
    nodeLabels: NodeLabel[],
    relationshipTypes?: RelationshipType[],
    relationshipProperty?: string
  ): CSRGraph {
    // Handle first overload
    if (!relationshipTypes) {
      return this.createNodeOnlyGraph(nodeLabels);
    }

    this.validateInput(relationshipTypes, relationshipProperty);

    if (relationshipTypes.length === 0) {
      return this.createNodeOnlyGraph(nodeLabels);
    } else {
      return this.createGraph(nodeLabels, relationshipTypes, relationshipProperty);
    }
  }

  getUnion(): CSRGraph {
    if (this.relationships.size === 0) {
      return this.getGraph(Array.from(this.nodeLabels()));
    }

    const graphs: CSRGraph[] = [];

    for (const [relationshipType, relationship] of this.relationships) {
      const properties = relationship.properties();

      if (properties.isPresent()) {
        // Create graph for each property
        for (const propertyKey of properties.get().keySet()) {
          graphs.push(
            this.createGraph(
              Array.from(this.nodeLabels()),
              [relationshipType],
              propertyKey
            )
          );
        }
      } else {
        // Create graph without properties
        graphs.push(
          this.createGraph(
            Array.from(this.nodeLabels()),
            [relationshipType]
          )
        );
      }
    }

    return UnionGraph.of(graphs);
  }

  getCompositeRelationshipIterator(
    relationshipType: RelationshipType,
    propertyKeys: string[]
  ): CompositeRelationshipIterator {
    // Validate relationship type
    if (!this.relationshipTypes().has(relationshipType)) {
      throw new Error(
        prettySuggestions(
          formatWithLocale(
            "Unknown relationship type `%s`.",
            relationshipType.name
          ),
          relationshipType.name,
          Array.from(this.relationshipTypes()).map(type => type.name)
        )
      );
    }

    // Validate property keys
    const availableProperties = this.relationshipPropertyKeys(relationshipType);
    const missingProperties = propertyKeys.filter(key => !availableProperties.has(key));

    if (missingProperties.length > 0) {
      throw new Error(
        formatWithLocale(
          "Missing property keys %s for relationship type %s. Available property keys are %s",
          StringJoining.join(missingProperties),
          relationshipType.name,
          StringJoining.join(Array.from(availableProperties))
        )
      );
    }

    const relationship = this.relationships.get(relationshipType)!;

    // Get topology
    const adjacencyList = relationship.topology().adjacencyList();
    const inverseAdjacencyList = relationship.inverseTopology()
      .map(topology => Optional.of(topology.adjacencyList()))
      .orElse(Optional.empty());

    // Get properties
    const properties = propertyKeys.length === 0
      ? []
      : propertyKeys.map(propertyKey =>
          this.relationshipPropertyValues(relationshipType, propertyKey)
            .values()
            .propertiesList()
        );

    // Get inverse properties
    const inverseProperties = relationship.inverseProperties()
      .map(propertyStore =>
        propertyKeys.map(propertyKey =>
          propertyStore.get(propertyKey).values().propertiesList()
        )
      )
      .orElse([]);

    return new CSRCompositeRelationshipIterator(
      adjacencyList,
      inverseAdjacencyList,
      propertyKeys,
      properties,
      inverseProperties
    );
  }

  // ==================== Private Methods ====================

  private updateGraphStore(updateFunction: () => void): void {
    // In a real implementation, this would use proper synchronization
    updateFunction();
    this.modificationTime = TimeUtil.now(this.zoneId);
  }

  private createGraph(
    nodeLabels: NodeLabel[],
    relationshipTypes: RelationshipType[],
    relationshipProperty?: string
  ): CSRGraph {
    if (relationshipTypes.length === 1) {
      return this.createGraph(nodeLabels, relationshipTypes[0], relationshipProperty);
    }

    const filteredNodes = this.getFilteredIdMap(nodeLabels);
    const filteredNodeProperties = this.filterNodeProperties(nodeLabels);
    const nodeSchema = this.schema.nodeSchema().filter(new Set(nodeLabels));

    const filteredGraphs = Array.from(this.relationships.keys())
      .filter(type => relationshipTypes.includes(type))
      .map(relationshipType =>
        this.createGraphFromRelationshipType(
          filteredNodes,
          filteredNodeProperties,
          nodeSchema,
          relationshipType,
          relationshipProperty
        )
      );

    return UnionGraph.of(filteredGraphs);
  }

  private createGraph(
    nodeLabels: NodeLabel[],
    relationshipType: RelationshipType,
    relationshipProperty?: string
  ): CSRGraph {
    const filteredNodes = this.getFilteredIdMap(nodeLabels);
    const filteredNodeProperties = this.filterNodeProperties(nodeLabels);
    const nodeSchema = this.schema.nodeSchema().filter(new Set(nodeLabels));

    return this.createGraphFromRelationshipType(
      filteredNodes,
      filteredNodeProperties,
      nodeSchema,
      relationshipType,
      relationshipProperty
    );
  }

  private createNodeOnlyGraph(nodeLabels: NodeLabel[]): CSRGraph {
    const filteredNodes = this.getFilteredIdMap(nodeLabels);
    const filteredNodeProperties = this.filterNodeProperties(nodeLabels);
    const nodeSchema = this.schema.nodeSchema().filter(new Set(nodeLabels));

    const graphSchema = MutableGraphSchema.of(
      nodeSchema,
      MutableRelationshipSchema.empty(),
      this.schema.graphProperties()
    );

    const initialGraph = new HugeGraphBuilder()
      .nodes(this.nodes)
      .schema(graphSchema)
      .characteristics(GraphCharacteristics.NONE)
      .nodeProperties(filteredNodeProperties)
      .topology(Topology.EMPTY)
      .build();

    return filteredNodes.isPresent()
      ? new NodeFilteredGraph(initialGraph, filteredNodes.get())
      : initialGraph;
  }

  private getFilteredIdMap(nodeLabels: NodeLabel[]): Optional<FilteredIdMap> {
    const loadAllNodes = nodeLabels.length === this.nodeLabels().size &&
                         nodeLabels.every(label => this.nodeLabels().has(label));

    return loadAllNodes || this.schema.nodeSchema().containsOnlyAllNodesLabel()
      ? Optional.empty()
      : this.nodes.withFilteredLabels(nodeLabels, this.concurrency);
  }

  private createGraphFromRelationshipType(
    filteredNodes: Optional<FilteredIdMap>,
    filteredNodeProperties: Map<string, NodePropertyValues>,
    nodeSchema: MutableNodeSchema,
    relationshipType: RelationshipType,
    relationshipProperty?: string
  ): CSRGraph {
    const graphSchema = MutableGraphSchema.of(
      nodeSchema,
      this.schema.relationshipSchema().filter(new Set([relationshipType])),
      this.schema.graphProperties()
    );

    const relationship = this.relationships.get(relationshipType)!;

    // Get relationship properties
    const properties = relationshipProperty
      ? Optional.of(
          relationship.properties()
            .map(props => props.get(relationshipProperty).values())
            .orElseThrow(() => new Error(
              `Relationship property key not present in graph: ${relationshipProperty}`
            ))
        )
      : Optional.empty();

    // Get inverse properties
    const inverseProperties = relationship.inverseProperties()
      .flatMap(inversePropertyStore =>
        relationshipProperty
          ? Optional.of(inversePropertyStore.get(relationshipProperty).values())
          : Optional.empty()
      );

    // Build characteristics
    const characteristicsBuilder = GraphCharacteristics.builder()
      .withDirection(this.schema.direction());

    if (relationship.inverseTopology().isPresent()) {
      characteristicsBuilder.inverseIndexed();
    }

    const initialGraph = new HugeGraphBuilder()
      .nodes(this.nodes)
      .schema(graphSchema)
      .characteristics(characteristicsBuilder.build())
      .nodeProperties(filteredNodeProperties)
      .topology(relationship.topology())
      .relationshipProperties(properties)
      .inverseTopology(relationship.inverseTopology())
      .inverseRelationshipProperties(inverseProperties)
      .build();

    return filteredNodes.isPresent()
      ? new NodeFilteredGraph(initialGraph, filteredNodes.get())
      : initialGraph;
  }

  private filterNodeProperties(labels: NodeLabel[]): Map<string, NodePropertyValues> {
    if (this.nodeProperties.isEmpty()) {
      return new Map();
    }

    if (labels.length === 1 || this.schema.nodeSchema().containsOnlyAllNodesLabel()) {
      return this.nodeProperties.propertyValues();
    }

    const filteredSchema = this.schema.nodeSchema().filter(new Set(labels));
    const result = new Map<string, NodePropertyValues>();

    for (const propertyKey of filteredSchema.allProperties()) {
      result.set(propertyKey, this.nodeProperty(propertyKey).values());
    }

    return result;
  }

  private validateInput(
    relationshipTypes: RelationshipType[],
    relationshipProperty?: string
  ): void {
    for (const relationshipType of relationshipTypes) {
      if (!this.relationships.has(relationshipType)) {
        throw new Error(
          formatWithLocale(
            "No relationships have been loaded for relationship type '%s'",
            relationshipType.name
          )
        );
      }

      if (relationshipProperty && !this.hasRelationshipProperty(relationshipType, relationshipProperty)) {
        throw new Error(
          formatWithLocale(
            "Property '%s' does not exist for relationships with type '%s'.",
            relationshipProperty,
            relationshipType.name
          )
        );
      }
    }
  }
}

/**
 * Graph store capabilities and feature flags.
 */
export interface Capabilities {
  supportsInverseIndexing(): boolean;
  supportsPropertyUpdates(): boolean;
  supportsSchemaEvolution(): boolean;
  supportsParallelOperations(): boolean;
}
