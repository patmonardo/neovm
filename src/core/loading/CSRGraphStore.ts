import { GraphStore } from "@/api";
import { DatabaseInfo } from "@/api";
import { Capabilities } from "@/core/loading";
import { MutableGraphSchema } from "@/api/schema";
import { IdMap } from "@/api";
import { NodePropertyStore } from "@/api/properties";
import { GraphPropertyStore } from "@/api/properties";
import { Nodes } from "@/core/loading";
import { SingleTypeRelationships } from "@//core/loading";
import { RelationshipImportResult } from "@/core/loading";
import { RelationshipType } from "@/projection";
import { NodeLabel } from "@/projection";
import { GraphProperty } from "@/api/properties";
import { GraphPropertyValues } from "@/api/properties";
import { NodeProperty } from "@/api/properties/nodes";
import { NodePropertyValues } from "@/api/properties/nodes";
import { PropertySchema } from "@/api/schema";
import { formatWithLocale } from "@/utils";
import { Concurrency } from "@/concurrency";
import { PropertyState } from "@/api";
import { GraphSchema } from "@/api/schema";

/**
 * CSR GRAPH STORE - COMPRESSED SPARSE ROW GRAPH STORAGE
 *
 * The central orchestrator for all graph data in GDS. This class provides:
 *
 * ARCHITECTURE PATTERN: Central Repository + Delegation
 * - Maintains references to specialized stores (NodePropertyStore, GraphPropertyStore, etc.)
 * - Delegates property access to appropriate stores
 * - Provides filtered views without copying data
 * - Tracks modification timestamps for cache invalidation
 *
 * MEMORY LAYOUT: CSR (Compressed Sparse Row) format
 * - Nodes: IdMap with label information
 * - Relationships: Map<RelationshipType, SingleTypeRelationships>
 * - Properties: Separate stores for node/graph/relationship properties
 *
 * GRAPH CREATION STRATEGY:
 * - Node-only graphs: Filtered IdMap + node properties
 * - Single relationship type: Direct CSR construction
 * - Multiple relationship types: Union of CSR graphs
 * - Union graphs: All relationship types combined
 */
export class CSRGraphStore implements GraphStore {
  // ====================================================================
  // CORE DATA STRUCTURES - The heart of the graph storage
  // ====================================================================

  /** Database metadata and connection info */
  private readonly _databaseInfo: DatabaseInfo;

  /** Graph capabilities (what operations are supported) */
  private readonly _capabilities: Capabilities;

  /** All nodes with ID mapping and label information */
  private readonly _nodes: IdMap;

  /** Relationship data organized by type in CSR format */
  private readonly _relationships: Map<
    RelationshipType,
    SingleTypeRelationships
  >;

  /** Concurrency configuration for parallel operations */
  public readonly _concurrency: Concurrency;

  /** Timezone for timestamp operations */
  public readonly _zoneId: string;

  /** When this graph store was created */
  private readonly _creationTime: Date;

  // ====================================================================
  // MUTABLE STATE - Properties and schema that can change
  // ====================================================================

  /** Graph structure definition - can evolve as properties are added */
  private _schema: MutableGraphSchema;

  /** Graph-level properties (metadata about the entire graph) */
  private _graphProperties: GraphPropertyStore;

  /** Node properties organized by property key */
  private _nodeProperties: NodePropertyStore;

  /** Last modification timestamp for cache invalidation */
  private _modificationTime: Date;

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
    this._databaseInfo = databaseInfo;
    this._capabilities = capabilities;
    this._schema = schema;
    this._nodes = nodes;
    this._nodeProperties = nodeProperties;
    this._relationships = new Map(relationships); // Defensive copy for mutation safety
    this._graphProperties = graphProperties;
    this._concurrency = concurrency;
    this._zoneId = zoneId ?? "UTC";
    this._creationTime = new Date();
    this._modificationTime = this._creationTime;
  }

  // ====================================================================
  // FACTORY METHODS - Builder pattern integration
  // ====================================================================

  /**
   * Creates a CSRGraphStore from import results.
   * This is the primary construction method used after data import.
   *
   * @param databaseInfo Database connection and metadata
   * @param capabilities What operations this graph supports
   * @param schema The graph schema definition
   * @param nodes Import result containing IdMap and node properties
   * @param relationshipImportResult All relationship data organized by type
   * @param graphProperties Optional graph-level properties
   * @param concurrency Parallelism configuration
   * @param zoneId Timezone for timestamps
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
      nodes.idMap(), // Extract IdMap from import result
      nodes.properties(), // Extract NodePropertyStore from import result
      relationshipImportResult.importResults(), // Get Map<RelationshipType, SingleTypeRelationships>
      graphProperties ?? GraphPropertyStore.empty(),
      concurrency ?? Concurrency.of(1),
      zoneId
    );
  }

  // ====================================================================
  // CORE GRAPH STORE INTERFACE - Basic graph information
  // ====================================================================

  databaseInfo(): DatabaseInfo {
    return this._databaseInfo;
  }

  schema(): GraphSchema {
    return this._schema;
  }

  creationTime(): Date {
    return this._creationTime;
  }

  modificationTime(): Date {
    return this._modificationTime;
  }

  capabilities(): Capabilities {
    return this._capabilities;
  }

  nodeCount(): number {
    return this._nodes.nodeCount();
  }

  // ====================================================================
  // GRAPH PROPERTIES - Graph-level metadata management
  // ====================================================================

  /**
   * Returns all available graph property keys.
   * DELEGATION: Forwards to GraphPropertyStore.
   */
  graphPropertyKeys(): Set<string> {
    return this._graphProperties.propertyKeySet();
  }

  /**
   * Checks if a graph property exists.
   * DELEGATION: Uses graphPropertyKeys() for consistency.
   */
  hasGraphProperty(propertyKey: string): boolean {
    return this._graphProperties.hasProperty(propertyKey);
  }

  /**
   * Gets a graph property by key.
   * DELEGATION: Forwards to GraphPropertyStore.
   */
  graphProperty(propertyKey: string): GraphProperty {
    return this._graphProperties.getProperty(propertyKey);
  }

  /**
   * Gets graph property values by key.
   * DELEGATION: Gets property, then extracts values.
   */
  graphPropertyValues(propertyKey: string): GraphPropertyValues {
    return this._graphProperties.getProperty(propertyKey).values();
  }

  /**
   * Adds a new graph property with automatic schema update.
   *
   * MUTATION PATTERN:
   * 1. Validate property doesn't exist
   * 2. Update GraphPropertyStore (immutable rebuild)
   * 3. Update schema with new property definition
   * 4. Track modification timestamp
   */
  addGraphProperty(
    propertyKey: string,
    propertyValues: GraphPropertyValues
  ): void {
    this.updateGraphStore(() => {
      // Validation: Property must not already exist
      if (this.hasGraphProperty(propertyKey)) {
        throw new Error(
          formatWithLocale("Graph property %s already exists", propertyKey)
        );
      }

      // Update property store (immutable pattern)
      this._graphProperties = GraphPropertyStore.builder()
        .from(this._graphProperties) // Copy existing properties
        .putIfAbsent(propertyKey, GraphProperty.of(propertyKey, propertyValues)) // Add new property
        .build(); // Build new immutable store

      // Update schema to include new property definition
      const newGraphPropertySchema = new Map(this._schema.graphProperties());
      newGraphPropertySchema.set(
        propertyKey,
        PropertySchema.of(propertyKey, propertyValues.valueType())
      );

      this._schema = MutableGraphSchema.of(
        this._schema.nodeSchema(), // Keep existing node schema
        this._schema.relationshipSchema(), // Keep existing relationship schema
        newGraphPropertySchema // Updated graph properties schema
      );
    });
  }

  /**
   * Removes a graph property with automatic schema update.
   *
   * MUTATION PATTERN: Mirror of addGraphProperty but for removal
   */
  removeGraphProperty(propertyKey: string): void {
    this.updateGraphStore(() => {
      // Update property store (immutable pattern)
      this._graphProperties = GraphPropertyStore.builder()
        .from(this._graphProperties)
        .removeProperty(propertyKey) // Remove the property
        .build();

      // Update schema to remove property definition
      const newGraphPropertySchema = new Map(this._schema.graphProperties());
      newGraphPropertySchema.delete(propertyKey);

      this._schema = MutableGraphSchema.of(
        this._schema.nodeSchema(),
        this._schema.relationshipSchema(),
        newGraphPropertySchema // Updated schema without removed property
      );
    });
  }

  // ====================================================================
  // NODE OPERATIONS - Node access and property management
  // ====================================================================

  /**
   * Returns the complete IdMap containing all nodes.
   * DELEGATION: Direct access to internal IdMap.
   */
  nodes(): IdMap {
    return this._nodes;
  }

  /**
   * NODE LABELS - Filtering patterns
   */
  nodeLabels(): Set<NodeLabel>;
  nodeLabels(nodeId: number): Set<NodeLabel>;
  nodeLabels(nodeId?: number): Set<NodeLabel> {
    if (nodeId === undefined) {
      return this._nodes.availableNodeLabels();
    }

    // nodeLabels(nodeId: number): Set<NodeLabel> - labels for specific node
    return this._nodes.nodeLabels(nodeId);
  }

  /**
   * Adds a new node label to the graph.
   *
   * MUTATION PATTERN: Update both IdMap and schema
   */
  addNodeLabel(nodeLabel: NodeLabel): void {
    this.updateGraphStore(() => {
      this._nodes.addNodeLabel(nodeLabel); // Update IdMap
      const nodeSchema = this._schema.nodeSchema();
      this._schema
        .nodeSchema()
        .addLabel(nodeLabel, nodeSchema.unionProperties()); // Update schema
    });
  }

  /**
   * NODE PROPERTY KEYS - Label-specific vs global
   */
  nodePropertyKeys(): Set<string>;
  nodePropertyKeys(label: NodeLabel): Set<string>;
  nodePropertyKeys(labels: NodeLabel[]): Set<string>;
  nodePropertyKeys(labelOrLabels?: NodeLabel | NodeLabel[]): Set<string> {
    if (!labelOrLabels) {
      // nodePropertyKeys(): Set<string> - all properties globally
      return new Set(this._nodeProperties.properties().keys());
    }

    if (Array.isArray(labelOrLabels)) {
      // nodePropertyKeys(labels: NodeLabel[]): Set<string> - intersection of label properties
      if (labelOrLabels.length === 0) {
        return new Set();
      }

      let result = this._schema.nodeSchema().allProperties(labelOrLabels[0]);
      for (let i = 1; i < labelOrLabels.length; i++) {
        const labelProps = this._schema
          .nodeSchema()
          .allProperties(labelOrLabels[i]);
        result = new Set([...result].filter((prop) => labelProps.has(prop)));
      }
      return result;
    }

    // nodePropertyKeys(label: NodeLabel): Set<string> - properties for specific label
    return this._schema.nodeSchema().allProperties(labelOrLabels);
  }

  /**
   * HAS NODE PROPERTY - Multiple validation patterns
   */
  hasNodeProperty(propertyKey: string): boolean;
  hasNodeProperty(label: NodeLabel, propertyKey: string): boolean;
  hasNodeProperty(labels: NodeLabel[], propertyKey: string): boolean;
  hasNodeProperty(
    labelOrPropertyKey: NodeLabel | NodeLabel[] | string,
    propertyKey?: string
  ): boolean {
    if (typeof labelOrPropertyKey === "string") {
      // hasNodeProperty(propertyKey: string): boolean - global property existence
      return this._nodeProperties.hasNodeProperty(labelOrPropertyKey);
    }

    if (Array.isArray(labelOrPropertyKey)) {
      // hasNodeProperty(labels: NodeLabel[], propertyKey: string): boolean - all labels have property
      return labelOrPropertyKey.every(
        (label) =>
          this._schema.nodeSchema().hasProperty(label, propertyKey!) &&
          this.hasNodeProperty(propertyKey!)
      );
    }

    // hasNodeProperty(label: NodeLabel, propertyKey: string): boolean - specific label has property
    return (
      this._schema.nodeSchema().hasProperty(labelOrPropertyKey, propertyKey!) &&
      this.hasNodeProperty(propertyKey!)
    );
  }

  /**
   * Adds a node property for specific labels with automatic schema update.
   *
   * MUTATION PATTERN:
   * 1. Validate property doesn't exist
   * 2. Update NodePropertyStore
   * 3. Update schema for each affected label
   */
  addNodeProperty(
    labels: Set<NodeLabel>,
    propertyKey: string,
    propertyValues: NodePropertyValues
  ): void {
    this.updateGraphStore(() => {
      if (this.hasNodeProperty(propertyKey)) {
        throw new Error(
          formatWithLocale("Node property %s already exists", propertyKey)
        );
      }

      // Update property store
      this._nodeProperties = NodePropertyStore.builder()
        .from(this._nodeProperties)
        .putIfAbsent(
          propertyKey,
          NodeProperty.of(propertyKey, PropertyState.TRANSIENT, propertyValues)
        )
        .build();

      // Update schema for each label
      labels.forEach((label) => {
        this._schema
          .nodeSchema()
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

  /**
   * Removes a node property with automatic schema cleanup.
   */
  removeNodeProperty(propertyKey: string): void {
    this.updateGraphStore(() => {
      // Update property store
      this._nodeProperties = NodePropertyStore.builder()
        .from(this._nodeProperties)
        .removeProperty(propertyKey)
        .build();

      // Remove from all label schemas
      this._schema
        .nodeSchema()
        .entries()
        .forEach((entry) => entry.removeProperty(propertyKey));
    });
  }

  /**
   * Gets a node property by key.
   * DELEGATION: Forwards to NodePropertyStore.
   */
  nodeProperty(propertyKey: string): NodeProperty {
    return this._nodeProperties.get(propertyKey);
  }

  // ====================================================================
  // RELATIONSHIP OPERATIONS - Relationship access and management
  // ====================================================================

  /**
   * Returns all relationship types in the graph.
   * DELEGATION: Gets keys from relationships map.
   */
  relationshipTypes(): Set<RelationshipType> {
    return new Set(this._relationships.keys());
  }

  /**
   * Checks if a relationship type exists.
   * DELEGATION: Checks relationships map.
   */
  hasRelationshipType(relationshipType: RelationshipType): boolean {
    return this._relationships.has(relationshipType);
  }

  /**
   * RELATIONSHIP COUNT - Multiple overload patterns
   */
  relationshipCount(): number;
  relationshipCount(relationshipType: RelationshipType): number;
  relationshipCount(relationshipTypes: RelationshipType[]): number;
  relationshipCount(
    relationshipType?: RelationshipType | RelationshipType[]
  ): number {
    if (!relationshipType) {
      // relationshipCount(): number - total across all types
      let sum = 0;
      for (const relationship of this._relationships.values()) {
        sum += relationship.topology().elementCount();
      }
      return sum;
    }

    if (Array.isArray(relationshipType)) {
      // relationshipCount(relationshipTypes: RelationshipType[]): number
      let sum = 0;
      for (const type of relationshipType) {
        const relationship = this._relationships.get(type);
        if (relationship) {
          sum += relationship.topology().elementCount();
        }
      }
      return sum;
    }

    // relationshipCount(relationshipType: RelationshipType): number
    const relationship = this._relationships.get(relationshipType);
    return relationship ? relationship.topology().elementCount() : 0;
  }

  /**
   * RELATIONSHIP PROPERTY KEYS - Type-specific patterns
   */
  relationshipPropertyKeys(): Set<string>;
  relationshipPropertyKeys(relationshipType: RelationshipType): Set<string>;
  relationshipPropertyKeys(relationshipTypes: RelationshipType[]): Set<string>;
  relationshipPropertyKeys(
    relationshipType?: RelationshipType | RelationshipType[]
  ): Set<string> {
    if (!relationshipType) {
      // relationshipPropertyKeys(): Set<string> - all relationship properties globally
      const allKeys = new Set<string>();
      for (const relationship of this._relationships.values()) {
        if (relationship.properties()) {
          for (const key of relationship.properties()!.keySet()) {
            allKeys.add(key);
          }
        }
      }
      return allKeys;
    }

    if (Array.isArray(relationshipType)) {
      // relationshipPropertyKeys(relationshipTypes: RelationshipType[]): Set<string> - union of properties
      const allKeys = new Set<string>();
      for (const type of relationshipType) {
        const relationship = this._relationships.get(type);
        if (relationship?.properties()) {
          for (const key of relationship.properties()!.keySet()) {
            allKeys.add(key);
          }
        }
      }
      return allKeys;
    }

    // relationshipPropertyKeys(relationshipType: RelationshipType): Set<string> - specific type
    const relationship = this._relationships.get(relationshipType);
    return relationship?.properties()?.keySet() || new Set();
  }

  /**
   * HAS RELATIONSHIP PROPERTY - Type-specific validation
   */
  hasRelationshipProperty(propertyKey: string): boolean;
  hasRelationshipProperty(
    relationshipType: RelationshipType,
    propertyKey: string
  ): boolean;
  hasRelationshipProperty(
    relationshipTypes: RelationshipType[],
    propertyKey: string
  ): boolean;
  hasRelationshipProperty(
    relationshipTypeOrPropertyKey:
      | RelationshipType
      | RelationshipType[]
      | string,
    propertyKey?: string
  ): boolean {
    if (typeof relationshipTypeOrPropertyKey === "string") {
      // hasRelationshipProperty(propertyKey: string): boolean - global property existence
      for (const relationship of this._relationships.values()) {
        if (
          relationship.properties()?.hasProperty(relationshipTypeOrPropertyKey)
        ) {
          return true;
        }
      }
      return false;
    }

    if (Array.isArray(relationshipTypeOrPropertyKey)) {
      // hasRelationshipProperty(relationshipTypes: RelationshipType[], propertyKey: string): boolean
      return relationshipTypeOrPropertyKey.every((type) => {
        const relationship = this._relationships.get(type);
        return relationship?.properties()?.hasProperty(propertyKey!) || false;
      });
    }

    // hasRelationshipProperty(relationshipType: RelationshipType, propertyKey: string): boolean
    const relationship = this._relationships.get(relationshipTypeOrPropertyKey);
    return relationship?.properties()?.hasProperty(propertyKey!) || false;
  }

  /**
   * GET RELATIONSHIP PROPERTY - Type-specific access
   */
  relationshipProperty(
    relationshipType: RelationshipType,
    propertyKey: string
  ): RelationshipProperty {
    const relationship = this._relationships.get(relationshipType);
    if (!relationship?.properties()) {
      throw new Error(
        formatWithLocale(
          "No properties found for relationship type %s",
          relationshipType.name()
        )
      );
    }
    return relationship.properties()!.get(propertyKey);
  }

  /**
   * Returns relationship types that have inverse indexes.
   * FILTERING: Checks which relationships have inverseTopology.
   */
  inverseIndexedRelationshipTypes(): Set<RelationshipType> {
    const result = new Set<RelationshipType>();
    for (const [type, relationship] of this._relationships) {
      if (relationship.inverseTopology()) {
        result.add(type);
      }
    }
    return result;
  }

  // ====================================================================
  // PRIVATE HELPER METHODS
  // ====================================================================

  /**
   * Mutation wrapper that updates modification timestamp.
   *
   * PATTERN: All mutations go through this method to ensure
   * modification tracking for cache invalidation.
   */
  private updateGraphStore(updateFunction: () => void): void {
    updateFunction();
    this._modificationTime = new Date();
  }
}
