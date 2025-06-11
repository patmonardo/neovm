/**
 * GRAPH FACTORY - Complete port of Java GraphFactory
 *
 * Provides factory methods for creating NodesBuilder, RelationshipsBuilder, and HugeGraph.
 * Uses the @Builder.Factory pattern from Java with proper TypeScript builder patterns.
 */

import { IdMap, PartialIdMap, GraphCharacteristics, PropertyState, DefaultValue } from "@/api";
import {
  GraphSchema,
  NodeSchema,
  MutableGraphSchema,
  MutableNodeSchema,
  MutableRelationshipSchema,
  Direction
} from "@/api/schema";
import { HugeGraph } from "@/core/huge";
import { SingleTypeRelationships } from "@/core/loading";
import { NodesBuilder, RelationshipsBuilder } from "@/core/loading/construction";
import { NodePropertyValues } from "@/api/properties";
import { Concurrency } from "@/concurrency";
import { RelationshipType, Orientation, Aggregation } from "@/api";


/**
 * Main factory class - direct port of Java GraphFactory
 */
export class GraphFactory {
  private constructor() {} // Utility class

  // =============================================================================
  // NODES BUILDER FACTORY METHODS
  // =============================================================================

  /**
   * Initialize a nodes builder with schema discovery.
   */
  static initNodesBuilder(): NodesBuilderConfig {
    return {};
  }

  /**
   * Initialize a nodes builder with predefined schema.
   */
  static initNodesBuilder(nodeSchema: NodeSchema): NodesBuilderConfig {
    return { nodeSchema };
  }

  /**
   * Factory method for creating NodesBuilder - direct port of Java @Builder.Factory
   */
  static nodesBuilder(config: NodesBuilderConfig): NodesBuilder {
    const {
      maxOriginalId,
      nodeCount,
      nodeSchema,
      hasLabelInformation,
      hasProperties,
      deduplicateIds,
      concurrency,
      propertyState,
      idMapBuilderType,
      usePooledBuilderProvider
    } = config;

    // Determine if we have label information
    const labelInformation = nodeSchema
      ? !(nodeSchema.availableLabels().size === 0 || nodeSchema.containsOnlyAllNodesLabel())
      : hasLabelInformation ?? false;

    const threadCount = concurrency ?? new Concurrency(1);

    // Make sure we don't pass negative values to id map builders
    const validMaxOriginalId = maxOriginalId && maxOriginalId > 0 ? maxOriginalId : undefined;

    // Create IdMap builder
    const idMapType = idMapBuilderType ?? IdMap.NO_TYPE;
    const idMapBuilder = IdMapBehaviorServiceProvider.idMapBehavior().create(
      idMapType,
      threadCount,
      validMaxOriginalId,
      nodeCount
    );

    const maxOriginalNodeId = validMaxOriginalId ?? NodesBuilder.UNKNOWN_MAX_ID;
    const deduplicate = deduplicateIds ?? true;
    const usePooled = usePooledBuilderProvider ?? false;
    let maxIntermediateId = maxOriginalNodeId;

    // Handle HighLimitIdMap special case
    if (HighLimitIdMap.isHighLimitIdMap(idMapType)) {
      maxIntermediateId = nodeCount ? nodeCount - 1 : NodesBuilder.UNKNOWN_MAX_ID;

      if (deduplicate) {
        throw new Error("Cannot use high limit id map with deduplication.");
      }
    }

    // Create NodesBuilder with or without schema
    if (nodeSchema) {
      return GraphFactory.fromSchema(
        maxOriginalNodeId,
        maxIntermediateId,
        idMapBuilder,
        threadCount,
        nodeSchema,
        labelInformation,
        deduplicate,
        usePooled
      );
    } else {
      return new NodesBuilder(
        maxOriginalNodeId,
        maxIntermediateId,
        threadCount,
        NodesBuilderContext.lazy(threadCount),
        idMapBuilder,
        labelInformation,
        hasProperties ?? false,
        deduplicate,
        usePooled,
        (_: string) => propertyState ?? PropertyState.PERSISTENT
      );
    }
  }

  /**
   * Create NodesBuilder from schema - private helper
   */
  private static fromSchema(
    maxOriginalId: number,
    maxIntermediateId: number,
    idMapBuilder: any, // IdMapBuilder
    concurrency: Concurrency,
    nodeSchema: NodeSchema,
    hasLabelInformation: boolean,
    deduplicateIds: boolean,
    usePooledBuilderProvider: boolean
  ): NodesBuilder {
    return new NodesBuilder(
      maxOriginalId,
      maxIntermediateId,
      concurrency,
      NodesBuilderContext.fixed(nodeSchema, concurrency),
      idMapBuilder,
      hasLabelInformation,
      nodeSchema.hasProperties(),
      deduplicateIds,
      usePooledBuilderProvider,
      (propertyKey: string) => nodeSchema.unionProperties().get(propertyKey).state()
    );
  }

  // =============================================================================
  // RELATIONSHIPS BUILDER FACTORY METHODS
  // =============================================================================

  /**
   * Initialize a relationships builder with default configuration.
   */
  static initRelationshipsBuilder(): RelationshipsBuilderConfig {
    return {
      nodes: undefined as any, // Must be provided
      relationshipType: undefined as any, // Must be provided
      propertyConfigs: []
    };
  }

  /**
   * Factory method for creating RelationshipsBuilder - direct port of Java @Builder.Factory
   */
  static relationshipsBuilder(config: RelationshipsBuilderConfig): RelationshipsBuilder {
    const {
      nodes,
      relationshipType,
      orientation,
      propertyConfigs,
      aggregation,
      skipDanglingRelationships,
      concurrency,
      indexInverse,
      executorService,
      usePooledBuilderProvider
    } = config;

    const loadRelationshipProperties = propertyConfigs.length > 0;

    // Build aggregations array
    const aggregations = propertyConfigs.length === 0
      ? [aggregation ?? Aggregation.DEFAULT]
      : propertyConfigs.map(pc => Aggregation.resolve(pc.aggregation()));

    const isMultiGraph = aggregations.every(agg => agg.equivalentToNone());

    const actualOrientation = orientation ?? Orientation.NATURAL;

    // Build RelationshipProjection
    const projectionBuilder = RelationshipProjection.builder()
      .type(relationshipType.name())
      .orientation(actualOrientation)
      .indexInverse(indexInverse ?? false);

    propertyConfigs.forEach(propertyConfig => {
      projectionBuilder.addProperty(
        propertyConfig.propertyKey(),
        propertyConfig.propertyKey(),
        DefaultValue.of(propertyConfig.defaultValue()),
        propertyConfig.aggregation()
      );
    });

    const projection = projectionBuilder.build();

    // Build property arrays
    const propertyKeyIds = Array.from({ length: propertyConfigs.length }, (_, i) => i);
    const defaultValues = propertyConfigs.map(c => c.defaultValue().doubleValue());

    const finalConcurrency = concurrency ?? new Concurrency(1);
    const maybeRootNodeCount = nodes.rootNodeCount();

    const importSizing = maybeRootNodeCount
      ? ImportSizing.of(finalConcurrency, maybeRootNodeCount)
      : ImportSizing.of(finalConcurrency);

    // Determine buffer size
    let bufferSize = RecordsBatchBuffer.DEFAULT_BUFFER_SIZE;
    if (maybeRootNodeCount && maybeRootNodeCount > 0 && maybeRootNodeCount < RecordsBatchBuffer.DEFAULT_BUFFER_SIZE) {
      bufferSize = maybeRootNodeCount;
    }

    const skipDangling = skipDanglingRelationships ?? true;

    // Build import metadata
    const importMetaData = ImportMetaData.builder()
      .projection(projection)
      .aggregations(aggregations)
      .propertyKeyIds(propertyKeyIds)
      .defaultValues(defaultValues)
      .typeTokenId(NO_SUCH_RELATIONSHIP_TYPE)
      .skipDanglingRelationships(skipDangling)
      .build();

    // Create single type relationship importer
    const singleTypeRelationshipImporter = new SingleTypeRelationshipImporterBuilder()
      .importMetaData(importMetaData)
      .nodeCountSupplier(() => nodes.rootNodeCount() ?? 0)
      .importSizing(importSizing)
      .build();

    // Build SingleTypeRelationshipsBuilder
    const singleTypeRelationshipsBuilderBuilder = new SingleTypeRelationshipsBuilderBuilder()
      .idMap(nodes)
      .importer(singleTypeRelationshipImporter)
      .bufferSize(bufferSize)
      .relationshipType(relationshipType)
      .propertyConfigs(propertyConfigs)
      .isMultiGraph(isMultiGraph)
      .loadRelationshipProperty(loadRelationshipProperties)
      .direction(Direction.fromOrientation(actualOrientation))
      .executorService(executorService ?? DefaultPool.INSTANCE)
      .concurrency(finalConcurrency);

    // Handle inverse indexing
    if (indexInverse ?? false) {
      const inverseProjection = RelationshipProjection.builder()
        .from(projection)
        .orientation(projection.orientation().inverse())
        .build();

      const inverseImportMetaData = ImportMetaData.builder()
        .from(importMetaData)
        .projection(inverseProjection)
        .skipDanglingRelationships(skipDangling)
        .build();

      const inverseImporter = new SingleTypeRelationshipImporterBuilder()
        .importMetaData(inverseImportMetaData)
        .nodeCountSupplier(() => nodes.rootNodeCount() ?? 0)
        .importSizing(importSizing)
        .build();

      singleTypeRelationshipsBuilderBuilder.inverseImporter(inverseImporter);
    }

    const singleTypeRelationshipsBuilder = singleTypeRelationshipsBuilderBuilder.build();

    // Create local builder provider
    const localBuilderProvider = usePooledBuilderProvider ?? false
      ? LocalRelationshipsBuilderProvider.pooled(
          () => singleTypeRelationshipsBuilder.threadLocalRelationshipsBuilder(),
          finalConcurrency
        )
      : LocalRelationshipsBuilderProvider.threadLocal(
          () => singleTypeRelationshipsBuilder.threadLocalRelationshipsBuilder()
        );

    return new RelationshipsBuilder(singleTypeRelationshipsBuilder, localBuilderProvider, skipDangling);
  }

  // =============================================================================
  // HUGEGRAPH CREATION METHODS
  // =============================================================================

  /**
   * Creates a HugeGraph from the given node and relationship data.
   * Simple overload with schema inference.
   */
  static create(idMap: IdMap, relationships: SingleTypeRelationships): HugeGraph {
    const nodeSchema = MutableNodeSchema.empty();
    for (const nodeLabel of idMap.availableNodeLabels()) {
      nodeSchema.getOrCreateLabel(nodeLabel);
    }

    // Validate single relationship property constraint
    if (relationships.properties()) {
      const relationshipPropertyStore = relationships.properties()!;
      if (relationshipPropertyStore.values().size !== 1) {
        throw new Error("Cannot instantiate graph with more than one relationship property.");
      }
    }

    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.set(relationships.relationshipSchemaEntry());

    return GraphFactory.create(
      MutableGraphSchema.of(nodeSchema, relationshipSchema, new Map()),
      idMap,
      new Map(),
      relationships
    );
  }

  /**
   * Creates a HugeGraph with explicit schema and node properties.
   */
  static create(
    graphSchema: GraphSchema,
    idMap: IdMap,
    nodeProperties: Map<string, NodePropertyValues>,
    relationships: SingleTypeRelationships
  ): HugeGraph {
    const topology = relationships.topology();
    const inverseTopology = relationships.inverseTopology();

    // Extract relationship properties
    let properties: any = undefined;
    if (relationships.properties()) {
      const relationshipPropertyStore = relationships.properties()!;
      if (relationshipPropertyStore.values().size !== 1) {
        throw new Error("Cannot instantiate graph with more than one relationship property.");
      }
      properties = Array.from(relationshipPropertyStore.values())[0].values();
    }

    // Extract inverse relationship properties
    let inverseProperties: any = undefined;
    if (relationships.inverseProperties()) {
      const relationshipPropertyStore = relationships.inverseProperties()!;
      if (relationshipPropertyStore.values().size !== 1) {
        throw new Error("Cannot instantiate graph with more than one relationship property.");
      }
      inverseProperties = Array.from(relationshipPropertyStore.values())[0].values();
    }

    // Build characteristics
    const characteristicsBuilder = GraphCharacteristics.builder()
      .withDirection(graphSchema.direction());

    if (relationships.inverseTopology()) {
      characteristicsBuilder.inverseIndexed();
    }

    // Use HugeGraph.create instead of HugeGraphBuilder
    return HugeGraph.create(
      idMap,
      graphSchema,
      characteristicsBuilder.build(),
      nodeProperties,
      topology,
      properties,
      inverseTopology || undefined,
      inverseProperties
    );
  }
}
