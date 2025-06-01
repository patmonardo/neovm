/**
 * CSR GRAPH STORE - CORE GRAPH STORAGE IMPLEMENTATION
 *
 * Main graph store implementation using Compressed Sparse Row format.
 * Central hub for all graph data, properties, and operations.
 */

import {
  DatabaseInfo,
  GraphStore,
  GraphSchema,
  IdMap,
  CSRGraph,
  CompositeRelationshipIterator,
  NodeLabel,
  RelationshipType,
  ValueType
} from '@/api';
import {
  GraphPropertyStore,
  GraphProperty,
  GraphPropertyValues
} from '@/api/properties/graph';
import {
  NodePropertyStore,
  NodeProperty,
  NodePropertyValues
} from '@/api/properties/nodes';
import {
  RelationshipPropertyStore,
  RelationshipProperty
} from '@/api/properties/relationships';
import {
  MutableGraphSchema,
  MutableNodeSchema,
  PropertySchema,
  PropertyState
} from '@/api/schema';
import { Concurrency } from '@/core/concurrency';
import { Capabilities } from './Capabilities';
import { SingleTypeRelationships } from './SingleTypeRelationships';
import { RelationshipImportResult } from './RelationshipImportResult';
import { DeletionResult } from './DeletionResult';
import { Nodes } from './Nodes';
import { TimeUtil } from '@/core/utils/TimeUtil';
import { StringJoining } from '@/utils/StringJoining';
import { formatWithLocale } from '@/utils/StringFormatting';

export class CSRGraphStore implements GraphStore {
  private readonly concurrency: Concurrency;
  private readonly databaseInfo: DatabaseInfo;
  private readonly capabilities: Capabilities;
  private readonly nodes: IdMap;
  private readonly relationships: Map<RelationshipType, SingleTypeRelationships>;
  private schema: MutableGraphSchema;
  private graphProperties: GraphPropertyStore;
  private nodeProperties: NodePropertyStore;
  private readonly zoneId: string; // Use string for zone ID
  private readonly creationTime: Date;
  private modificationTime: Date;

  constructor(
    databaseInfo: DatabaseInfo,
    capabilities: Capabilities,
    schema: MutableGraphSchema,
    nodes: IdMap,
    nodeProperties: NodePropertyStore,
    relationships: Map<RelationshipType, SingleTypeRelationships>,
    graphProperties: GraphPropertyStore,
    concurrency: Concurrency,
    zoneId?: string
  ) {
    this.databaseInfo = databaseInfo;
    this.capabilities = capabilities;
    this.schema = schema;
    this.graphProperties = graphProperties;
    this.nodes = nodes;
    this.nodeProperties = nodeProperties;
    this.relationships = new Map(relationships); // Mutable copy
    this.concurrency = concurrency;
    this.zoneId = zoneId || 'UTC';
    this.creationTime = new Date();
    this.modificationTime = this.creationTime;
  }

  // Factory method matching Java @Builder.Factory
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
      concurrency || Concurrency.single(),
      zoneId
    );
  }

  // GraphStore interface implementation

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

  // Graph properties

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

      this.graphProperties = GraphPropertyStore
        .builder()
        .from(this.graphProperties)
        .putIfAbsent(propertyKey, GraphProperty.of(propertyKey, propertyValues))
        .build();

      const newGraphPropertySchema = new Map(this.schema.graphProperties());
      newGraphPropertySchema.set(propertyKey, PropertySchema.of(propertyKey, propertyValues.valueType()));

      this.schema = MutableGraphSchema.of(
        this.schema.nodeSchema(),
        this.schema.relationshipSchema(),
        newGraphPropertySchema
      );
    });
  }

  removeGraphProperty(propertyKey: string): void {
    this.updateGraphStore(() => {
      this.graphProperties = GraphPropertyStore
        .builder()
        .from(this.graphProperties)
        .removeProperty(propertyKey)
        .build();

      const newGraphPropertySchema = new Map(this.schema.graphProperties());
      newGraphPropertySchema.delete(propertyKey);

      this.schema = MutableGraphSchema.of(
        this.schema.nodeSchema(),
        this.schema.relationshipSchema(),
        newGraphPropertySchema
      );
    });
  }

  // Node operations

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
      this.schema.nodeSchema().addLabel(nodeLabel, nodeSchema.unionProperties());
    });
  }

  nodePropertyKeys(label?: NodeLabel): Set<string> {
    if (label) {
      return this.schema.nodeSchema().allProperties(label);
    }
    return this.nodeProperties.keySet();
  }

  hasNodeProperty(propertyKey: string): boolean;
  hasNodeProperty(label: NodeLabel, propertyKey: string): boolean;
  hasNodeProperty(labels: NodeLabel[], propertyKey: string): boolean;
  hasNodeProperty(labelOrPropertyKey: NodeLabel | NodeLabel[] | string, propertyKey?: string): boolean {
    if (typeof labelOrPropertyKey === 'string') {
      // hasNodeProperty(propertyKey: string)
      return this.nodeProperties.containsKey(labelOrPropertyKey);
    }

    if (Array.isArray(labelOrPropertyKey)) {
      // hasNodeProperty(labels: NodeLabel[], propertyKey: string)
      return labelOrPropertyKey.every(label =>
        this.schema.nodeSchema().hasProperty(label, propertyKey!) &&
        this.hasNodeProperty(propertyKey!)
      );
    }

    // hasNodeProperty(label: NodeLabel, propertyKey: string)
    return this.schema.nodeSchema().hasProperty(labelOrPropertyKey, propertyKey!) &&
           this.hasNodeProperty(propertyKey!);
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

      this.nodeProperties = NodePropertyStore
        .builder()
        .from(this.nodeProperties)
        .putIfAbsent(propertyKey, NodeProperty.of(propertyKey, PropertyState.TRANSIENT, propertyValues))
        .build();

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
      this.nodeProperties = NodePropertyStore
        .builder()
        .from(this.nodeProperties)
        .removeProperty(propertyKey)
        .build();

      this.schema.nodeSchema().entries().forEach(entry =>
        entry.removeProperty(propertyKey)
      );
    });
  }

  nodeProperty(propertyKey: string): NodeProperty {
    return this.nodeProperties.get(propertyKey);
  }

  // Relationship operations

  relationshipTypes(): Set<RelationshipType> {
    return new Set(this.relationships.keys());
  }

  hasRelationshipType(relationshipType: RelationshipType): boolean {
    return this.relationships.has(relationshipType);
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
    return relationship ? relationship.topology().elementCount() : 0;
  }

  inverseIndexedRelationshipTypes(): Set<RelationshipType> {
    const result = new Set<RelationshipType>();
    for (const [type, relationship] of this.relationships) {
      if (relationship.inverseTopology()) {
        result.add(type);
      }
    }
    return result;
  }

  hasRelationshipProperty(relType: RelationshipType, propertyKey: string): boolean {
    const relationship = this.relationships.get(relType);
    if (!relationship) return false;

    const properties = relationship.properties();
    return properties ? properties.containsKey(propertyKey) : false;
  }

  relationshipPropertyType(propertyKey: string): ValueType {
    const propertySchema = this.schema.relationshipSchema().unionProperties().get(propertyKey);
    return propertySchema ? propertySchema.valueType() : ValueType.UNKNOWN;
  }

  relationshipPropertyKeys(): Set<string>;
  relationshipPropertyKeys(relationshipType: RelationshipType): Set<string>;
  relationshipPropertyKeys(relationshipType?: RelationshipType): Set<string> {
    if (relationshipType) {
      const relationship = this.relationships.get(relationshipType);
      const properties = relationship?.properties();
      return properties ? properties.keySet() : new Set();
    }
    return this.schema.relationshipSchema().allProperties();
  }

  relationshipPropertyValues(relationshipType: RelationshipType, propertyKey: string): RelationshipProperty {
    const relationship = this.relationships.get(relationshipType);
    if (!relationship) {
      throw new Error(`No relationship type ${relationshipType}`);
    }

    const properties = relationship.properties();
    if (!properties) {
      throw new Error(`No properties for relationship type ${relationshipType}`);
    }

    const property = properties.get(propertyKey);
    if (!property) {
      throw new Error(
        `No relationship properties found for relationship type \`${relationshipType}\` and property key \`${propertyKey}\`.`
      );
    }

    return property;
  }

  addRelationshipType(relationships: SingleTypeRelationships): void {
    this.updateGraphStore(() => {
      const relationshipType = relationships.relationshipSchemaEntry().identifier();
      if (!this.relationships.has(relationshipType)) {
        this.schema.relationshipSchema().set(relationships.relationshipSchemaEntry());
        this.relationships.set(relationshipType, relationships);
      }
    });
  }

  deleteRelationships(relationshipType: RelationshipType): DeletionResult {
    return DeletionResult.of(builder => {
      this.updateGraphStore(() => {
        const relationship = this.relationships.get(relationshipType);
        if (relationship) {
          this.relationships.delete(relationshipType);
          builder.deletedRelationships(relationship.topology().elementCount());

          const properties = relationship.properties();
          if (properties) {
            for (const property of properties.values()) {
              builder.putDeletedProperty(
                property.key(),
                property.values().elementCount()
              );
            }
          }

          this.schema.relationshipSchema().remove(relationshipType);
        } else {
          builder.deletedRelationships(0);
        }
      });
    });
  }

  // Graph creation methods

  getGraph(nodeLabels: NodeLabel[]): CSRGraph;
  getGraph(
    nodeLabels: NodeLabel[],
    relationshipTypes: RelationshipType[],
    maybeRelationshipProperty?: string
  ): CSRGraph;
  getGraph(
    nodeLabels: NodeLabel[],
    relationshipTypes?: RelationshipType[],
    maybeRelationshipProperty?: string
  ): CSRGraph {
    if (!relationshipTypes || relationshipTypes.length === 0) {
      return this.createNodeOnlyGraph(nodeLabels);
    }

    this.validateInput(relationshipTypes, maybeRelationshipProperty);
    return this.createGraph(nodeLabels, relationshipTypes, maybeRelationshipProperty);
  }

  getUnion(): CSRGraph {
    if (this.relationships.size === 0) {
      return this.getGraph(Array.from(this.nodeLabels()));
    }

    // TODO: Implement union graph creation
    throw new Error('Union graph creation not implemented yet');
  }

  getCompositeRelationshipIterator(
    relationshipType: RelationshipType,
    propertyKeys: string[]
  ): CompositeRelationshipIterator {
    if (!this.relationshipTypes().has(relationshipType)) {
      throw new Error(`Unknown relationship type \`${relationshipType}\`.`);
    }

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

    // TODO: Implement composite relationship iterator
    throw new Error('Composite relationship iterator not implemented yet');
  }

  nodeCount(): number {
    return this.nodes.nodeCount();
  }

  // Private helper methods

  private updateGraphStore(updateFunction: () => void): void {
    updateFunction();
    this.modificationTime = new Date();
  }

  private createNodeOnlyGraph(nodeLabels: NodeLabel[]): CSRGraph {
    // TODO: Implement node-only graph creation
    throw new Error('Node-only graph creation not implemented yet');
  }

  private createGraph(
    nodeLabels: NodeLabel[],
    relationshipTypes: RelationshipType[],
    maybeRelationshipProperty?: string
  ): CSRGraph {
    // TODO: Implement full graph creation
    throw new Error('Graph creation not implemented yet');
  }

  private validateInput(
    relationshipTypes: RelationshipType[],
    maybeRelationshipProperty?: string
  ): void {
    for (const relationshipType of relationshipTypes) {
      if (!this.relationships.has(relationshipType)) {
        throw new Error(
          formatWithLocale(
            "No relationships have been loaded for relationship type '%s'",
            relationshipType
          )
        );
      }

      if (maybeRelationshipProperty) {
        if (!this.hasRelationshipProperty(relationshipType, maybeRelationshipProperty)) {
          throw new Error(
            formatWithLocale(
              "Property '%s' does not exist for relationships with type '%s'.",
              maybeRelationshipProperty,
              relationshipType
            )
          );
        }
      }
    }
  }
}
