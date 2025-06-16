import { RelationshipType } from "@/projection";
import { PartialIdMap } from "@/api";
import { DefaultValue } from "@/api";
import { ImmutableTopology } from "@/api";
import { AdjacencyListsWithProperties } from "@/api/compress";
import { ValueType } from "@/api";
import { ImmutableProperties } from "@/api/properties/relationships";
import { ImmutableRelationshipProperty } from "@/api/properties/relationships";
import { RelationshipPropertyStore } from "@/api/properties/relationships";
import { Direction } from "@/api/schema";
import { ImmutableRelationshipPropertySchema } from "@/api/schema";
import { MutableRelationshipSchemaEntry } from "@/api/schema";
import { RelationshipPropertySchema } from "@/api/schema";
import { Concurrency } from "@/concurrency";
import { RunWithConcurrency } from "@/concurrency";
import { AdjacencyBuffer } from "@/core/loading";
import { SingleTypeRelationshipImporter } from "@/core/loading";
import { SingleTypeRelationships } from "@/core/loading";
import { LocalRelationshipsBuilder } from "./LocalRelationshipsBuilder";

/**
 * SINGLE TYPE RELATIONSHIPS BUILDER - DIRECT JAVA TRANSLATION
 *
 * Abstract builder for constructing relationships of a single type.
 * Uses factory pattern to create either NonIndexed or Indexed implementations.
 */
export abstract class SingleTypeRelationshipsBuilder {
  protected readonly idMap: PartialIdMap;
  protected readonly bufferSize: number;
  protected readonly relationshipType: RelationshipType;
  protected readonly propertyConfigs: GraphFactory.PropertyConfig[];
  protected readonly isMultiGraph: boolean;
  protected readonly loadRelationshipProperty: boolean;
  protected readonly direction: Direction;
  private readonly executorService: ExecutorService;
  private readonly concurrency: Concurrency;

  /**
   * Factory method - direct translation of Java @Builder.Factory
   */
  static singleTypeRelationshipsBuilder(
    idMap: PartialIdMap,
    importer: SingleTypeRelationshipImporter,
    inverseImporter?: SingleTypeRelationshipImporter,
    bufferSize: number = 8192,
    relationshipType: RelationshipType,
    propertyConfigs: GraphFactory.PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: ExecutorService,
    concurrency: Concurrency
  ): SingleTypeRelationshipsBuilder {
    return inverseImporter
      ? new Indexed(
          idMap,
          importer,
          inverseImporter,
          bufferSize,
          relationshipType,
          propertyConfigs,
          isMultiGraph,
          loadRelationshipProperty,
          direction,
          executorService,
          concurrency
        )
      : new NonIndexed(
          idMap,
          importer,
          bufferSize,
          relationshipType,
          propertyConfigs,
          isMultiGraph,
          loadRelationshipProperty,
          direction,
          executorService,
          concurrency
        );
  }

  protected constructor(
    idMap: PartialIdMap,
    bufferSize: number,
    relationshipType: RelationshipType,
    propertyConfigs: GraphFactory.PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: ExecutorService,
    concurrency: Concurrency
  ) {
    this.idMap = idMap;
    this.bufferSize = bufferSize;
    this.relationshipType = relationshipType;
    this.propertyConfigs = propertyConfigs;
    this.isMultiGraph = isMultiGraph;
    this.loadRelationshipProperty = loadRelationshipProperty;
    this.direction = direction;
    this.executorService = executorService;
    this.concurrency = concurrency;
  }

  // Abstract methods - implemented by subclasses
  abstract threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder;

  abstract adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[];

  abstract singleTypeRelationshipImportResult(): SingleTypeRelationships;

  partialIdMap(): PartialIdMap {
    return this.idMap;
  }

  build(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): SingleTypeRelationships {
    const adjacencyListBuilderTasks = this.adjacencyListBuilderTasks(mapper, drainCountConsumer);

    RunWithConcurrency.builder()
      .concurrency(this.concurrency)
      .tasks(adjacencyListBuilderTasks)
      .executor(this.executorService)
      .run();

    return this.singleTypeRelationshipImportResult();
  }

  protected relationshipSchemaEntry(properties?: RelationshipPropertyStore): MutableRelationshipSchemaEntry {
    const entry = new MutableRelationshipSchemaEntry(
      this.relationshipType,
      this.direction
    );

    if (properties) {
      properties.relationshipProperties().forEach((relationshipProperty, propertyKey) => {
        entry.addProperty(
          propertyKey,
          RelationshipPropertySchema.of(
            propertyKey,
            relationshipProperty.valueType(),
            relationshipProperty.defaultValue(),
            relationshipProperty.propertyState(),
            relationshipProperty.aggregation()
          )
        );
      });
    }

    return entry;
  }

  protected relationshipPropertyStore(adjacencyListsWithProperties: AdjacencyListsWithProperties): RelationshipPropertyStore {
    const propertyStoreBuilder = RelationshipPropertyStore.builder();

    const properties = adjacencyListsWithProperties.properties();
    const relationshipCount = adjacencyListsWithProperties.relationshipCount();

    for (let propertyKeyId = 0; propertyKeyId < this.propertyConfigs.length; propertyKeyId++) {
      const propertyConfig = this.propertyConfigs[propertyKeyId];

      const propertyValues = ImmutableProperties.builder()
        .propertiesList(properties.get(propertyKeyId))
        .defaultPropertyValue(DefaultValue.DOUBLE_DEFAULT_FALLBACK)
        .elementCount(relationshipCount)
        .build();

      const relationshipPropertySchema = ImmutableRelationshipPropertySchema.builder()
        .key(propertyConfig.propertyKey())
        .aggregation(propertyConfig.aggregation())
        .valueType(ValueType.DOUBLE)
        .defaultValue(propertyConfig.defaultValue())
        .state(propertyConfig.propertyState())
        .build();

      const relationshipProperty = ImmutableRelationshipProperty.builder()
        .values(propertyValues)
        .propertySchema(relationshipPropertySchema)
        .build();

      propertyStoreBuilder.putRelationshipProperty(propertyConfig.propertyKey(), relationshipProperty);
    }

    return propertyStoreBuilder.build();
  }
}

/**
 * NON-INDEXED IMPLEMENTATION - Direct translation of Java NonIndexed static class
 */
class NonIndexed extends SingleTypeRelationshipsBuilder {
  private readonly importer: SingleTypeRelationshipImporter;

  constructor(
    idMap: PartialIdMap,
    importer: SingleTypeRelationshipImporter,
    bufferSize: number,
    relationshipType: RelationshipType,
    propertyConfigs: GraphFactory.PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: ExecutorService,
    concurrency: Concurrency
  ) {
    super(
      idMap,
      bufferSize,
      relationshipType,
      propertyConfigs,
      isMultiGraph,
      loadRelationshipProperty,
      direction,
      executorService,
      concurrency
    );
    this.importer = importer;
  }

  threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder {
    return LocalRelationshipsBuilder.createNonIndexed(this.importer, this.bufferSize, this.propertyConfigs.length);
  }

  adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[] {
    return this.importer.adjacencyListBuilderTasks(mapper, drainCountConsumer);
  }

  singleTypeRelationshipImportResult(): SingleTypeRelationships {
    const adjacencyListsWithProperties = this.importer.build();
    const adjacencyList = adjacencyListsWithProperties.adjacency();
    const relationshipCount = adjacencyListsWithProperties.relationshipCount();

    const topology = ImmutableTopology.builder()
      .isMultiGraph(this.isMultiGraph)
      .adjacencyList(adjacencyList)
      .elementCount(relationshipCount)
      .build();

    const singleRelationshipTypeImportResultBuilder = SingleTypeRelationships.builder()
      .topology(topology);

    let properties: RelationshipPropertyStore | undefined = undefined;
    if (this.loadRelationshipProperty) {
      properties = this.relationshipPropertyStore(adjacencyListsWithProperties);
      singleRelationshipTypeImportResultBuilder.properties(properties);
    }

    singleRelationshipTypeImportResultBuilder
      .relationshipSchemaEntry(this.relationshipSchemaEntry(properties));

    return singleRelationshipTypeImportResultBuilder.build();
  }
}

/**
 * INDEXED IMPLEMENTATION - Direct translation of Java Indexed static class
 */
class Indexed extends SingleTypeRelationshipsBuilder {
  private readonly forwardImporter: SingleTypeRelationshipImporter;
  private readonly inverseImporter: SingleTypeRelationshipImporter;

  constructor(
    idMap: PartialIdMap,
    forwardImporter: SingleTypeRelationshipImporter,
    inverseImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    relationshipType: RelationshipType,
    propertyConfigs: GraphFactory.PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: ExecutorService,
    concurrency: Concurrency
  ) {
    super(
      idMap,
      bufferSize,
      relationshipType,
      propertyConfigs,
      isMultiGraph,
      loadRelationshipProperty,
      direction,
      executorService,
      concurrency
    );
    this.forwardImporter = forwardImporter;
    this.inverseImporter = inverseImporter;
  }

  threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder {
    return LocalRelationshipsBuilder.createIndexed(
      LocalRelationshipsBuilder.createNonIndexed(this.forwardImporter, this.bufferSize, this.propertyConfigs.length),
      LocalRelationshipsBuilder.createNonIndexed(this.inverseImporter, this.bufferSize, this.propertyConfigs.length)
    );
  }

  adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[] {
    const forwardTasks = this.forwardImporter.adjacencyListBuilderTasks(mapper, drainCountConsumer);
    const reverseTasks = this.inverseImporter.adjacencyListBuilderTasks(mapper, drainCountConsumer);

    return [...forwardTasks, ...reverseTasks];
  }

  singleTypeRelationshipImportResult(): SingleTypeRelationships {
    const forwardListWithProperties = this.forwardImporter.build();
    const inverseListWithProperties = this.inverseImporter.build();
    const forwardAdjacencyList = forwardListWithProperties.adjacency();
    const inverseAdjacencyList = inverseListWithProperties.adjacency();

    const relationshipCount = forwardListWithProperties.relationshipCount();

    const forwardTopology = ImmutableTopology.builder()
      .isMultiGraph(this.isMultiGraph)
      .adjacencyList(forwardAdjacencyList)
      .elementCount(relationshipCount)
      .build();

    const inverseTopology = ImmutableTopology.builder()
      .from(forwardTopology)
      .adjacencyList(inverseAdjacencyList)
      .build();

    const singleRelationshipTypeImportResultBuilder = SingleTypeRelationships.builder()
      .topology(forwardTopology)
      .inverseTopology(inverseTopology);

    let forwardProperties: RelationshipPropertyStore | undefined = undefined;
    if (this.loadRelationshipProperty) {
      forwardProperties = this.relationshipPropertyStore(forwardListWithProperties);
      const inverseProperties = this.relationshipPropertyStore(inverseListWithProperties);
      singleRelationshipTypeImportResultBuilder.properties(forwardProperties).inverseProperties(inverseProperties);
    }

    singleRelationshipTypeImportResultBuilder
      .relationshipSchemaEntry(this.relationshipSchemaEntry(forwardProperties));

    return singleRelationshipTypeImportResultBuilder.build();
  }
}

/**
 * EXECUTOR SERVICE INTERFACE - Simplified for TypeScript
 */
export interface ExecutorService {
  execute(task: () => void): void;
  shutdown(): Promise<void>;
}
