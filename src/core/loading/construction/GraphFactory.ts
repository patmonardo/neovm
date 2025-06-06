/**
 * GRAPH FACTORY - MAIN API FOR GRAPH CONSTRUCTION
 *
 * This is the primary entry point for building graphs from raw data.
 * It orchestrates the entire construction pipeline with sensible defaults
 * and comprehensive configuration options.
 *
 * CORE RESPONSIBILITIES:
 * 🏗️ ORCHESTRATION: Coordinates NodesBuilder and RelationshipsBuilder
 * ⚙️  CONFIGURATION: Provides builder patterns with smart defaults
 * 🔧 OPTIMIZATION: Handles concurrency, memory, and performance tuning
 * 📊 SCHEMA MANAGEMENT: Supports both schema discovery and validation
 * 🎯 SIMPLIFICATION: High-level API that hides complex construction details
 *
 * TWO CONSTRUCTION APPROACHES:
 *
 * 1. SCHEMA DISCOVERY (Lazy):
 *    - Learn node labels and properties from input data
 *    - Flexible but requires runtime coordination
 *    - Use when schema is unknown or varies by source
 *
 * 2. SCHEMA VALIDATION (Fixed):
 *    - Validate input against predefined schema
 *    - Faster and stricter but requires upfront schema
 *    - Use when schema is known and consistent
 *
 * USAGE PATTERNS:
 * ```typescript
 * // Simple node construction
 * const nodesBuilder = GraphFactory.initNodesBuilder()
 *   .maxOriginalId(100000)
 *   .concurrency(Concurrency.of(4))
 *   .build();
 *
 * // Relationship construction
 * const relsBuilder = GraphFactory.initRelationshipsBuilder()
 *   .nodes(idMap)
 *   .relationshipType(RelationshipType.of("FOLLOWS"))
 *   .orientation(Orientation.NATURAL)
 *   .build();
 *
 * // Final graph assembly
 * const graph = GraphFactory.create(idMap, relationships);
 * ```
 *
 * WHY THIS IS LARGE:
 * - Java uses @Builder.Factory (auto-generated code)
 * - Java uses @ValueClass (auto-generated interfaces)
 * - Java has implicit type inference
 * - TypeScript requires explicit interfaces and implementations
 * - More comprehensive documentation for unfamiliar codebase
 */

import { IdMap, PartialIdMap, GraphCharacteristics } from '@/api';
import {
  GraphSchema,
  MutableGraphSchema,
  MutableNodeSchema,
  MutableRelationshipSchema,
  NodeSchema,
} from '@/api/schema';
import { PropertyState, DefaultValue } from '@/api';
import { NodePropertyValues } from '@/api/properties/nodes';
import { HugeGraph, HugeGraphBuilder } from '@/core/huge';
import { RelationshipType, Orientation } from '@/projection';
import { Aggregation } from '@/core';
import { Concurrency } from '@/concurrency';
import {
  HighLimitIdMap,
  IdMapBuilder,
  SingleTypeRelationships
} from '@/core/loading';
import { IdMapBehaviorServiceProvider } from '@/core';
import { NodesBuilder, NodesBuilderContext } from '@/core/loading/construction';
import { RelationshipsBuilder } from '@/core/loading/construction';

/**
 * Main factory for graph construction with high-level, user-friendly APIs.
 *
 * DESIGN PATTERNS:
 * - Factory Pattern: Creates complex builders with sensible defaults
 * - Builder Pattern: Fluent configuration APIs for both nodes and relationships
 * - Template Method: Common construction flow with strategy variations
 * - Facade Pattern: Simplifies complex construction pipeline
 */
export class GraphFactory {
  private constructor() {} // Utility class - no instances

  // =============================================================================
  // NODES BUILDER FACTORY METHODS
  // =============================================================================

  /**
   * Initialize a nodes builder with schema discovery (most flexible).
   *
   * SCHEMA DISCOVERY:
   * - Learns node labels and properties from input data
   * - Thread-safe accumulation of schema information
   * - Suitable when schema is unknown or varies by data source
   */
  static initNodesBuilder(): NodesBuilder.Builder {
    return new NodesBuilder.Builder();
  }

  /**
   * Initialize a nodes builder with schema validation (fastest/strictest).
   *
   * SCHEMA VALIDATION:
   * - Pre-creates all property builders from known schema
   * - Validates input data matches expected schema
   * - Throws errors for unexpected properties or incompatible types
   */
  static initNodesBuilderWithSchema(nodeSchema: NodeSchema): NodesBuilder.Builder {
    return new NodesBuilder.Builder().nodeSchema(nodeSchema);
  }

  // =============================================================================
  // RELATIONSHIPS BUILDER FACTORY METHODS
  // =============================================================================

  /**
   * Initialize a relationships builder with default configuration.
   *
   * DEFAULTS:
   * - Natural orientation (directed)
   * - Skip dangling relationships (graceful error handling)
   * - Single-threaded concurrency
   * - No relationship properties
   */
  static initRelationshipsBuilder(): RelationshipsBuilder.Builder {
    return new RelationshipsBuilder.Builder();
  }

  // =============================================================================
  // GRAPH ASSEMBLY METHODS
  // =============================================================================

  /**
   * Create a HugeGraph from IdMap and relationships with inferred schema.
   *
   * SCHEMA INFERENCE:
   * - Node schema inferred from available node labels in IdMap
   * - Relationship schema uses the provided relationship type
   * - Property schema inferred from relationship properties (if any)
   *
   * CONSTRAINTS:
   * - Only supports single relationship property (enforced by assertion)
   * - All nodes get labels that exist in the IdMap
   *
   * @param idMap Node mapping with labels and properties
   * @param relationships Single relationship type with topology and properties
   * @returns Complete HugeGraph ready for algorithms
   */
  static create(idMap: IdMap, relationships: SingleTypeRelationships): HugeGraph {
    // Infer node schema from available labels
    const nodeSchema = MutableNodeSchema.empty();
    for (const nodeLabel of idMap.availableNodeLabels()) {
      nodeSchema.getOrCreateLabel(nodeLabel);
    }

    // Validate single relationship property constraint
    if (relationships.properties()?.values().size !== 1) {
      throw new Error("Cannot instantiate graph with more than one relationship property.");
    }

    // Create relationship schema from relationship data
    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.set(relationships.relationshipSchemaEntry());

    return this.createWithSchema(
      MutableGraphSchema.of(nodeSchema, relationshipSchema, new Map()),
      idMap,
      new Map(), // No node properties
      relationships
    );
  }

  /**
   * Create a HugeGraph with explicit schema and node properties.
   *
   * EXPLICIT SCHEMA:
   * - Complete control over node and relationship schemas
   * - Support for multiple node properties
   * - Support for complex relationship schemas
   *
   * ADVANCED FEATURES:
   * - Bidirectional relationship support (if inverse topology provided)
   * - Multiple relationship properties (with validation)
   * - Graph characteristics inference (direction, inverse indexing)
   *
   * @param graphSchema Complete graph schema
   * @param idMap Node mapping
   * @param nodeProperties Map of node property values by property key
   * @param relationships Relationship data with topology and properties
   * @returns Complete HugeGraph with all specified features
   */
  static createWithSchema(
    graphSchema: GraphSchema,
    idMap: IdMap,
    nodeProperties: Map<string, NodePropertyValues>,
    relationships: SingleTypeRelationships
  ): HugeGraph {
    const topology = relationships.topology();
    const inverseTopology = relationships.inverseTopology();

    // Extract relationship properties (enforce single property constraint)
    const properties = this.extractSingleProperty(relationships.properties(), "relationship");
    const inverseProperties = this.extractSingleProperty(relationships.inverseProperties(), "inverse relationship");

    // Build graph characteristics from schema and topology
    const characteristicsBuilder = GraphCharacteristics
      .builder()
      .withDirection(graphSchema.direction());

    if (inverseTopology) {
      characteristicsBuilder.inverseIndexed();
    }

    // Assemble final HugeGraph
    return new HugeGraphBuilder()
      .nodes(idMap)
      .schema(graphSchema)
      .characteristics(characteristicsBuilder.build())
      .nodeProperties(nodeProperties)
      .topology(topology)
      .inverseTopology(inverseTopology || undefined)
      .relationshipProperties(properties)
      .inverseRelationshipProperties(inverseProperties)
      .build();
  }

  /**
   * Extract single property from property store (enforces constraint).
   *
   * SINGLE PROPERTY CONSTRAINT:
   * - HugeGraph currently supports only one relationship property
   * - Multiple properties require different graph representation
   * - This constraint may be relaxed in future versions
   */
  private static extractSingleProperty(
    propertyStore: any,
    propertyType: string
  ): any {
    if (!propertyStore) return undefined;

    if (propertyStore.values().size !== 1) {
      throw new Error(`Cannot instantiate graph with more than one ${propertyType} property.`);
    }

    return Array.from(propertyStore.values())[0].values();
  }
}

// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

/**
 * Property configuration for relationships.
 *
 * SIMPLIFIED CONFIG:
 * - Focuses on essential relationship property attributes
 * - Provides sensible defaults for common use cases
 * - Extensible for advanced configurations
 */
export interface PropertyConfig {
  /** Property key name */
  propertyKey: string;

  /** How to aggregate multiple property values for same relationship */
  aggregation: Aggregation;

  /** Default value when property is missing */
  defaultValue: DefaultValue;

  /** Whether property is stored persistently or computed transiently */
  propertyState: PropertyState;
}

/**
 * Factory methods for PropertyConfig creation.
 * Provides convenient ways to create property configurations.
 */
export namespace PropertyConfig {
  /**
   * Create property config with minimal configuration (defaults for everything else).
   */
  export function of(propertyKey: string): PropertyConfig {
    return {
      propertyKey,
      aggregation: Aggregation.NONE,
      defaultValue: DefaultValue.forDouble(),
      propertyState: PropertyState.TRANSIENT
    };
  }

  /**
   * Create property config with full control over all settings.
   */
  export function create(
    propertyKey: string,
    aggregation: Aggregation,
    defaultValue: DefaultValue,
    propertyState: PropertyState = PropertyState.TRANSIENT
  ): PropertyConfig {
    return { propertyKey, aggregation, defaultValue, propertyState };
  }

  /**
   * Create a builder for step-by-step property configuration.
   */
  export function builder(): PropertyConfig.Builder {
    return new PropertyConfig.Builder();
  }
}

/**
 * Builder for PropertyConfig with fluent API.
 */
export namespace PropertyConfig {
  export class Builder {
    private _propertyKey?: string;
    private _aggregation = Aggregation.NONE;
    private _defaultValue = DefaultValue.forDouble();
    private _propertyState = PropertyState.TRANSIENT;

    propertyKey(propertyKey: string): this {
      this._propertyKey = propertyKey;
      return this;
    }

    aggregation(aggregation: Aggregation): this {
      this._aggregation = aggregation;
      return this;
    }

    defaultValue(defaultValue: DefaultValue): this {
      this._defaultValue = defaultValue;
      return this;
    }

    propertyState(propertyState: PropertyState): this {
      this._propertyState = propertyState;
      return this;
    }

    build(): PropertyConfig {
      if (!this._propertyKey) {
        throw new Error('Property key is required');
      }
      return {
        propertyKey: this._propertyKey,
        aggregation: this._aggregation,
        defaultValue: this._defaultValue,
        propertyState: this._propertyState
      };
    }
  }
}

// =============================================================================
// BUILDER EXTENSIONS (to be added to respective classes)
// =============================================================================

/**
 * Extensions to NodesBuilder class for GraphFactory integration.
 * These would be added to the NodesBuilder class itself.
 */
export namespace NodesBuilder {
  export class Builder {
    private config: Partial<NodesBuilderConfig> = {};

    maxOriginalId(maxOriginalId: number): this {
      this.config.maxOriginalId = maxOriginalId;
      return this;
    }

    nodeCount(nodeCount: number): this {
      this.config.nodeCount = nodeCount;
      return this;
    }

    nodeSchema(nodeSchema: NodeSchema): this {
      this.config.nodeSchema = nodeSchema;
      return this;
    }

    hasLabelInformation(hasLabelInformation: boolean): this {
      this.config.hasLabelInformation = hasLabelInformation;
      return this;
    }

    hasProperties(hasProperties: boolean): this {
      this.config.hasProperties = hasProperties;
      return this;
    }

    deduplicateIds(deduplicateIds: boolean): this {
      this.config.deduplicateIds = deduplicateIds;
      return this;
    }

    concurrency(concurrency: Concurrency): this {
      this.config.concurrency = concurrency;
      return this;
    }

    propertyState(propertyState: PropertyState): this {
      this.config.propertyState = propertyState;
      return this;
    }

    idMapBuilderType(idMapBuilderType: string): this {
      this.config.idMapBuilderType = idMapBuilderType;
      return this;
    }

    usePooledBuilderProvider(usePooledBuilderProvider: boolean): this {
      this.config.usePooledBuilderProvider = usePooledBuilderProvider;
      return this;
    }

    build(): NodesBuilder {
      return this.createNodesBuilder(this.config);
    }

    /**
     * Create NodesBuilder with intelligent defaults and validation.
     *
     * INTELLIGENT DEFAULTS:
     * - Concurrency: Single-threaded if not specified
     * - Deduplication: Enabled by default
     * - Property state: Persistent by default
     * - ID map type: Auto-selected based on constraints
     *
     * VALIDATION:
     * - High-limit ID maps cannot use deduplication
     * - Negative max IDs are filtered out
     * - Node count consistency checks
     */
    private createNodesBuilder(config: Partial<NodesBuilderConfig>): NodesBuilder {
      const {
        maxOriginalId,
        nodeCount,
        nodeSchema,
        hasLabelInformation,
        hasProperties,
        deduplicateIds = true,
        concurrency = new Concurrency(1),
        propertyState,
        idMapBuilderType,
        usePooledBuilderProvider = false
      } = config;

      // Determine label information strategy
      const labelInformation = nodeSchema
        ? !(nodeSchema.availableLabels().isEmpty() || nodeSchema.containsOnlyAllNodesLabel())
        : hasLabelInformation ?? false;

      // Filter out negative/invalid max IDs
      const validMaxOriginalId = maxOriginalId && maxOriginalId > 0 ? maxOriginalId : undefined;

      // Get appropriate ID map behavior and type
      const idMapBehavior = IdMapBehaviorServiceProvider.idMapBehavior();
      const idMapType = idMapBuilderType ?? IdMap.NO_TYPE;

      const idMapBuilder = idMapBehavior.create(
        idMapType,
        concurrency,
        validMaxOriginalId,
        nodeCount
      );

      const maxOriginalNodeId = validMaxOriginalId ?? NodesBuilder.UNKNOWN_MAX_ID;
      let maxIntermediateId = maxOriginalNodeId;

      // Handle high-limit ID map special case
      if (HighLimitIdMap.isHighLimitIdMap(idMapType)) {
        maxIntermediateId = nodeCount ? nodeCount - 1 : NodesBuilder.UNKNOWN_MAX_ID;

        if (deduplicateIds) {
          throw new Error("Cannot use high limit id map with deduplication.");
        }
      }

      // Create builder using appropriate strategy
      return nodeSchema
        ? this.createNodesBuilderFromSchema(
            maxOriginalNodeId,
            maxIntermediateId,
            idMapBuilder,
            concurrency,
            nodeSchema,
            labelInformation,
            deduplicateIds,
            usePooledBuilderProvider
          )
        : new NodesBuilder({
            maxOriginalId: maxOriginalNodeId,
            maxIntermediateId,
            concurrency,
            context: NodesBuilderContext.lazy(concurrency),
            idMapBuilder,
            hasLabelInformation: labelInformation,
            hasProperties: hasProperties ?? false,
            deduplicateIds,
            usePooledBuilderProvider,
            propertyStateFunction: () => propertyState ?? PropertyState.PERSISTENT
          });
    }

    /**
     * Create NodesBuilder with schema validation strategy.
     */
    private createNodesBuilderFromSchema(
      maxOriginalId: number,
      maxIntermediateId: number,
      idMapBuilder: IdMapBuilder,
      concurrency: Concurrency,
      nodeSchema: NodeSchema,
      hasLabelInformation: boolean,
      deduplicateIds: boolean,
      usePooledBuilderProvider: boolean
    ): NodesBuilder {
      return new NodesBuilder({
        maxOriginalId,
        maxIntermediateId,
        concurrency,
        context: NodesBuilderContext.fixed(nodeSchema, concurrency),
        idMapBuilder,
        hasLabelInformation,
        hasProperties: nodeSchema.hasProperties(),
        deduplicateIds,
        usePooledBuilderProvider,
        propertyStateFunction: (propertyKey: string) =>
          nodeSchema.unionProperties().get(propertyKey)?.state() ?? PropertyState.PERSISTENT
      });
    }
  }

  /**
   * Configuration interface for NodesBuilder.
   */
  export interface Config {
    maxOriginalId?: number;
    nodeCount?: number;
    nodeSchema?: NodeSchema;
    hasLabelInformation?: boolean;
    hasProperties?: boolean;
    deduplicateIds?: boolean;
    concurrency?: Concurrency;
    propertyState?: PropertyState;
    idMapBuilderType?: string;
    usePooledBuilderProvider?: boolean;
  }
}

/**
 * Extensions to RelationshipsBuilder class for GraphFactory integration.
 */
export namespace RelationshipsBuilder {
  export class Builder {
    private config: Partial<RelationshipsBuilderConfig> = {};

    nodes(nodes: PartialIdMap): this {
      this.config.nodes = nodes;
      return this;
    }

    relationshipType(relationshipType: RelationshipType): this {
      this.config.relationshipType = relationshipType;
      return this;
    }

    orientation(orientation: Orientation): this {
      this.config.orientation = orientation;
      return this;
    }

    propertyConfigs(propertyConfigs: PropertyConfig[]): this {
      this.config.propertyConfigs = propertyConfigs;
      return this;
    }

    addPropertyConfig(propertyConfig: PropertyConfig): this {
      if (!this.config.propertyConfigs) {
        this.config.propertyConfigs = [];
      }
      this.config.propertyConfigs.push(propertyConfig);
      return this;
    }

    aggregation(aggregation: Aggregation): this {
      this.config.aggregation = aggregation;
      return this;
    }

    skipDanglingRelationships(skipDanglingRelationships: boolean): this {
      this.config.skipDanglingRelationships = skipDanglingRelationships;
      return this;
    }

    concurrency(concurrency: Concurrency): this {
      this.config.concurrency = concurrency;
      return this;
    }

    indexInverse(indexInverse: boolean): this {
      this.config.indexInverse = indexInverse;
      return this;
    }

    executorService(executorService: any): this {
      this.config.executorService = executorService;
      return this;
    }

    usePooledBuilderProvider(usePooledBuilderProvider: boolean): this {
      this.config.usePooledBuilderProvider = usePooledBuilderProvider;
      return this;
    }

    build(): RelationshipsBuilder {
      if (!this.config.nodes || !this.config.relationshipType) {
        throw new Error('Nodes and relationshipType are required');
      }
      return this.createRelationshipsBuilder(this.config);
    }

    // Implementation would be extracted from current GraphFactory.createRelationshipsBuilder
    private createRelationshipsBuilder(config: Partial<RelationshipsBuilderConfig>): RelationshipsBuilder {
      // Complex implementation here - same as current createRelationshipsBuilder method
      throw new Error('Implementation needed');
    }
  }

  /**
   * Configuration interface for RelationshipsBuilder.
   */
  export interface Config {
    nodes: PartialIdMap;
    relationshipType: RelationshipType;
    orientation?: Orientation;
    propertyConfigs?: PropertyConfig[];
    aggregation?: Aggregation;
    skipDanglingRelationships?: boolean;
    concurrency?: Concurrency;
    indexInverse?: boolean;
    executorService?: any;
    usePooledBuilderProvider?: boolean;
  }
}

// Type aliases for external interface
type NodesBuilderConfig = NodesBuilder.Config;
type RelationshipsBuilderConfig = RelationshipsBuilder.Config;
