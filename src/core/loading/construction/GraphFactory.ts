import { IdMap, PartialIdMap, GraphCharacteristics } from '@/api';
import {
  GraphSchema,
  MutableGraphSchema,
  MutableNodeSchema,
  MutableRelationshipSchema,
  NodeSchema,
  Direction
} from '@/api/schema';
import { PropertyState, DefaultValue } from '@/api';
import { NodePropertyValues } from '@/api/properties/nodes';
import { HugeGraph, HugeGraphBuilder } from '@/core/huge';
import { RelationshipType, Orientation, RelationshipProjection } from '@/gds';
import { Aggregation } from '@/core';
import { Concurrency, DefaultPool } from '@/core/concurrency';
import {
  HighLimitIdMap,
  IdMapBuilder,
  ImportMetaData,
  ImportSizing,
  RecordsBatchBuffer,
  SingleTypeRelationshipImporter,
  SingleTypeRelationshipImporterBuilder,
  SingleTypeRelationships
} from '@/core/loading';
import { NodesBuilder, NodesBuilderContext } from './NodesBuilder';
import { RelationshipsBuilder } from './RelationshipsBuilder';
import { LocalRelationshipsBuilderProvider } from './LocalRelationshipsBuilderProvider';
import { SingleTypeRelationshipsBuilder, SingleTypeRelationshipsBuilderBuilder } from './SingleTypeRelationshipsBuilder';
import { IdMapBehaviorServiceProvider } from '@/core';

/**
 * Main factory for constructing graphs from various data sources.
 * Provides high-level APIs for building nodes and relationships with proper concurrency and optimization.
 */
export class GraphFactory {
  private constructor() {} // Utility class

  /**
   * Initialize a nodes builder with default configuration.
   */
  static initNodesBuilder(): NodesBuilderBuilder {
    return new NodesBuilderBuilder();
  }

  /**
   * Initialize a nodes builder with a predefined schema.
   */
  static initNodesBuilderWithSchema(nodeSchema: NodeSchema): NodesBuilderBuilder {
    return new NodesBuilderBuilder().nodeSchema(nodeSchema);
  }

  /**
   * Factory method for creating a NodesBuilder with comprehensive configuration.
   */
  static createNodesBuilder(config: NodesBuilderConfig): NodesBuilder {
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

    // Determine if we have label information
    const labelInformation = nodeSchema
      ? !(nodeSchema.availableLabels().isEmpty() || nodeSchema.containsOnlyAllNodesLabel())
      : hasLabelInformation ?? false;

    // Ensure we don't pass negative values to id map builders
    const validMaxOriginalId = maxOriginalId && maxOriginalId > 0 ? maxOriginalId : undefined;

    // Get the appropriate id map behavior
    const idMapBehavior = IdMapBehaviorServiceProvider.idMapBehavior();
    const idMapType = idMapBuilderType ?? IdMap.NO_TYPE;

    const idMapBuilder = idMapBehavior.create(
      idMapType,
      concurrency,
      validMaxOriginalId ? validMaxOriginalId : undefined,
      nodeCount
    );

    const maxOriginalNodeId = validMaxOriginalId ?? NodesBuilder.UNKNOWN_MAX_ID;
    let maxIntermediateId = maxOriginalNodeId;

    // Handle high limit id map special case
    if (HighLimitIdMap.isHighLimitIdMap(idMapType)) {
      maxIntermediateId = nodeCount ? nodeCount - 1 : NodesBuilder.UNKNOWN_MAX_ID;

      if (deduplicateIds) {
        throw new Error("Cannot use high limit id map with deduplication.");
      }
    }

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

  private static createNodesBuilderFromSchema(
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

  /**
   * Initialize a relationships builder.
   */
  static initRelationshipsBuilder(): RelationshipsBuilderBuilder {
    return new RelationshipsBuilderBuilder();
  }

  /**
   * Factory method for creating a RelationshipsBuilder.
   */
  static createRelationshipsBuilder(config: RelationshipsBuilderConfig): RelationshipsBuilder {
    const {
      nodes,
      relationshipType,
      orientation = Orientation.NATURAL,
      propertyConfigs = [],
      aggregation,
      skipDanglingRelationships = true,
      concurrency = new Concurrency(1),
      indexInverse = false,
      executorService,
      usePooledBuilderProvider = false
    } = config;

    const loadRelationshipProperties = propertyConfigs.length > 0;

    // Build aggregations array
    const aggregations = propertyConfigs.length === 0
      ? [aggregation ?? Aggregation.DEFAULT]
      : propertyConfigs.map(config => Aggregation.resolve(config.aggregation));

    const isMultiGraph = aggregations.every(agg => agg.equivalentToNone());

    // Build relationship projection
    const projectionBuilder = RelationshipProjection
      .builder()
      .type(relationshipType.name)
      .orientation(orientation)
      .indexInverse(indexInverse);

    for (const propertyConfig of propertyConfigs) {
      projectionBuilder.addProperty(
        propertyConfig.propertyKey,
        propertyConfig.propertyKey,
        DefaultValue.of(propertyConfig.defaultValue),
        propertyConfig.aggregation
      );
    }

    const projection = projectionBuilder.build();

    // Create property configuration arrays
    const propertyKeyIds = Array.from({ length: propertyConfigs.length }, (_, i) => i);
    const defaultValues = propertyConfigs.map(c => c.defaultValue.doubleValue());

    // Determine import sizing
    const maybeRootNodeCount = nodes.rootNodeCount();
    const importSizing = maybeRootNodeCount !== null
      ? ImportSizing.of(concurrency, maybeRootNodeCount)
      : ImportSizing.of(concurrency);

    // Determine buffer size
    let bufferSize = RecordsBatchBuffer.DEFAULT_BUFFER_SIZE;
    if (maybeRootNodeCount !== null && maybeRootNodeCount > 0 && maybeRootNodeCount < RecordsBatchBuffer.DEFAULT_BUFFER_SIZE) {
      bufferSize = maybeRootNodeCount;
    }

    // Create import metadata
    const importMetaData: ImportMetaData = {
      projection,
      aggregations,
      propertyKeyIds,
      defaultValues,
      typeTokenId: -1, // NO_SUCH_RELATIONSHIP_TYPE
      skipDanglingRelationships
    };

    // Create single type relationship importer
    const singleTypeRelationshipImporter = new SingleTypeRelationshipImporterBuilder()
      .importMetaData(importMetaData)
      .nodeCountSupplier(() => nodes.rootNodeCount() ?? 0)
      .importSizing(importSizing)
      .build();

    // Create relationships builder
    const singleTypeRelationshipsBuilderBuilder = new SingleTypeRelationshipsBuilderBuilder()
      .idMap(nodes)
      .importer(singleTypeRelationshipImporter)
      .bufferSize(bufferSize)
      .relationshipType(relationshipType)
      .propertyConfigs(propertyConfigs)
      .isMultiGraph(isMultiGraph)
      .loadRelationshipProperty(loadRelationshipProperties)
      .direction(Direction.fromOrientation(orientation))
      .executorService(executorService ?? DefaultPool.INSTANCE)
      .concurrency(concurrency);

    // Handle inverse indexing
    if (indexInverse) {
      const inverseProjection = RelationshipProjection
        .builder()
        .from(projection)
        .orientation(projection.orientation().inverse())
        .build();

      const inverseImportMetaData: ImportMetaData = {
        ...importMetaData,
        projection: inverseProjection
      };

      const inverseImporter = new SingleTypeRelationshipImporterBuilder()
        .importMetaData(inverseImportMetaData)
        .nodeCountSupplier(() => nodes.rootNodeCount() ?? 0)
        .importSizing(importSizing)
        .build();

      singleTypeRelationshipsBuilderBuilder.inverseImporter(inverseImporter);
    }

    const singleTypeRelationshipsBuilder = singleTypeRelationshipsBuilderBuilder.build();

    // Create local builder provider
    const localBuilderProvider = usePooledBuilderProvider
      ? LocalRelationshipsBuilderProvider.pooled(
          () => singleTypeRelationshipsBuilder.threadLocalRelationshipsBuilder(),
          concurrency
        )
      : LocalRelationshipsBuilderProvider.threadLocal(
          () => singleTypeRelationshipsBuilder.threadLocalRelationshipsBuilder()
        );

    return new RelationshipsBuilder(
      singleTypeRelationshipsBuilder,
      localBuilderProvider,
      skipDanglingRelationships
    );
  }

  /**
   * Creates a HugeGraph from IdMap and SingleTypeRelationships with inferred schema.
   */
  static create(idMap: IdMap, relationships: SingleTypeRelationships): HugeGraph {
    // Infer node schema from available labels
    const nodeSchema = MutableNodeSchema.empty();
    for (const nodeLabel of idMap.availableNodeLabels()) {
      nodeSchema.getOrCreateLabel(nodeLabel);
    }

    // Validate single relationship property constraint
    const relationshipProperties = relationships.properties();
    if (relationshipProperties && relationshipProperties.values().size() !== 1) {
      throw new Error("Cannot instantiate graph with more than one relationship property.");
    }

    // Create relationship schema
    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.set(relationships.relationshipSchemaEntry());

    return this.createWithSchema(
      MutableGraphSchema.of(nodeSchema, relationshipSchema, new Map()),
      idMap,
      new Map(),
      relationships
    );
  }

  /**
   * Creates a HugeGraph with explicit schema and properties.
   */
  static createWithSchema(
    graphSchema: GraphSchema,
    idMap: IdMap,
    nodeProperties: Map<string, NodePropertyValues>,
    relationships: SingleTypeRelationships
  ): HugeGraph {
    const topology = relationships.topology();
    const inverseTopology = relationships.inverseTopology();

    // Extract relationship properties
    const properties = relationships.properties()?.values().size() === 1
      ? Array.from(relationships.properties()!.values())[0].values()
      : undefined;

    const inverseProperties = relationships.inverseProperties()?.values().size() === 1
      ? Array.from(relationships.inverseProperties()!.values())[0].values()
      : undefined;

    // Validate single property constraint
    if (relationships.properties() && relationships.properties()!.values().size() !== 1) {
      throw new Error("Cannot instantiate graph with more than one relationship property.");
    }
    if (relationships.inverseProperties() && relationships.inverseProperties()!.values().size() !== 1) {
      throw new Error("Cannot instantiate graph with more than one inverse relationship property.");
    }

    // Build graph characteristics
    const characteristicsBuilder = GraphCharacteristics
      .builder()
      .withDirection(graphSchema.direction());

    if (inverseTopology) {
      characteristicsBuilder.inverseIndexed();
    }

    // Build the HugeGraph
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
}

/**
 * Property configuration for relationships.
 */
export interface PropertyConfig {
  propertyKey: string;
  aggregation: Aggregation;
  defaultValue: DefaultValue;
  propertyState: PropertyState;
}

/**
 * Factory methods for PropertyConfig.
 */
export class PropertyConfigFactory {
  static of(propertyKey: string): PropertyConfig {
    return {
      propertyKey,
      aggregation: Aggregation.NONE,
      defaultValue: DefaultValue.forDouble(),
      propertyState: PropertyState.TRANSIENT
    };
  }

  static create(
    propertyKey: string,
    aggregation: Aggregation,
    defaultValue: DefaultValue,
    propertyState: PropertyState = PropertyState.TRANSIENT
  ): PropertyConfig {
    return {
      propertyKey,
      aggregation,
      defaultValue,
      propertyState
    };
  }

  static builder(): PropertyConfigBuilder {
    return new PropertyConfigBuilder();
  }
}

export class PropertyConfigBuilder {
  private _propertyKey?: string;
  private _aggregation: Aggregation = Aggregation.NONE;
  private _defaultValue: DefaultValue = DefaultValue.forDouble();
  private _propertyState: PropertyState = PropertyState.TRANSIENT;

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

/**
 * Builder for NodesBuilder configuration.
 */
export class NodesBuilderBuilder {
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
    return GraphFactory.createNodesBuilder(this.config as NodesBuilderConfig);
  }
}

/**
 * Builder for RelationshipsBuilder configuration.
 */
export class RelationshipsBuilderBuilder {
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

  executorService(executorService: any): this { // TODO: Type ExecutorService
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
    return GraphFactory.createRelationshipsBuilder(this.config as RelationshipsBuilderConfig);
  }
}

/**
 * Configuration interfaces.
 */
export interface NodesBuilderConfig {
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

export interface RelationshipsBuilderConfig {
  nodes: PartialIdMap;
  relationshipType: RelationshipType;
  orientation?: Orientation;
  propertyConfigs?: PropertyConfig[];
  aggregation?: Aggregation;
  skipDanglingRelationships?: boolean;
  concurrency?: Concurrency;
  indexInverse?: boolean;
  executorService?: any; // TODO: Type ExecutorService
  usePooledBuilderProvider?: boolean;
}
