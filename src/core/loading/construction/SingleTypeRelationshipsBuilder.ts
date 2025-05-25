import { RelationshipType } from '@/gds';
import { PartialIdMap, DefaultValue, ImmutableTopology } from '@/api';
import {
  AdjacencyCompressor,
  AdjacencyListsWithProperties
} from '@/api/compress';
import { ValueType } from '@/api/nodeproperties';
import {
  ImmutableProperties,
  ImmutableRelationshipProperty,
  RelationshipPropertyStore
} from '@/api/properties/relationships';
import {
  Direction,
  ImmutableRelationshipPropertySchema,
  MutableRelationshipSchemaEntry,
  RelationshipPropertySchema
} from '@/api/schema';
import { Concurrency, RunWithConcurrency } from '@/core/concurrency';
import {
  AdjacencyBuffer,
  SingleTypeRelationshipImporter,
  SingleTypeRelationships
} from '@/core/loading';
import { PropertyConfig } from './GraphFactory';
import { LocalRelationshipsBuilder } from './LocalRelationshipsBuilder';

/**
 * Abstract base class for building single-type relationships with adjacency lists.
 * Supports both indexed (bidirectional) and non-indexed (unidirectional) relationships.
 */
export abstract class SingleTypeRelationshipsBuilder {
  protected readonly idMap: PartialIdMap;
  protected readonly bufferSize: number;
  protected readonly relationshipType: RelationshipType;
  protected readonly propertyConfigs: PropertyConfig[];
  protected readonly isMultiGraph: boolean;
  protected readonly loadRelationshipProperty: boolean;
  protected readonly direction: Direction;
  private readonly executorService: any; // TODO: Type ExecutorService
  private readonly concurrency: Concurrency;

  /**
   * Factory method to create appropriate builder type based on inverse importer presence.
   */
  static create(config: SingleTypeRelationshipsBuilderConfig): SingleTypeRelationshipsBuilder {
    const {
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
    } = config;

    return inverseImporter
      ? new IndexedSingleTypeRelationshipsBuilder(
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
      : new NonIndexedSingleTypeRelationshipsBuilder(
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
    propertyConfigs: PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: any,
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

  /**
   * Create a thread-local relationships builder for concurrent processing.
   */
  abstract threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder;

  /**
   * Get adjacency list builder tasks for parallel processing.
   */
  abstract adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[];

  /**
   * Get the final single-type relationships result.
   */
  abstract singleTypeRelationshipImportResult(): SingleTypeRelationships;

  /**
   * Get the partial ID map used by this builder.
   */
  partialIdMap(): PartialIdMap {
    return this.idMap;
  }

  /**
   * Build the relationships with optional compression and progress tracking.
   */
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

  /**
   * Create relationship schema entry from properties.
   */
  protected relationshipSchemaEntry(properties?: RelationshipPropertyStore): MutableRelationshipSchemaEntry {
    const entry = new MutableRelationshipSchemaEntry(
      this.relationshipType,
      this.direction
    );

    if (properties) {
      for (const [propertyKey, relationshipProperty] of properties.relationshipProperties()) {
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
      }
    }

    return entry;
  }

  /**
   * Create relationship property store from adjacency lists with properties.
   */
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
        .key(propertyConfig.propertyKey)
        .aggregation(propertyConfig.aggregation)
        .valueType(ValueType.DOUBLE)
        .defaultValue(propertyConfig.defaultValue)
        .state(propertyConfig.propertyState)
        .build();

      const relationshipProperty = ImmutableRelationshipProperty.builder()
        .values(propertyValues)
        .propertySchema(relationshipPropertySchema)
        .build();

      propertyStoreBuilder.putRelationshipProperty(propertyConfig.propertyKey, relationshipProperty);
    }

    return propertyStoreBuilder.build();
  }
}

/**
 * Non-indexed (unidirectional) relationships builder.
 */
export class NonIndexedSingleTypeRelationshipsBuilder extends SingleTypeRelationshipsBuilder {
  private readonly importer: SingleTypeRelationshipImporter;

  constructor(
    idMap: PartialIdMap,
    importer: SingleTypeRelationshipImporter,
    bufferSize: number,
    relationshipType: RelationshipType,
    propertyConfigs: PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: any,
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
    return LocalRelationshipsBuilder.nonIndexed(
      this.importer,
      this.bufferSize,
      this.propertyConfigs.length
    );
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

    const resultBuilder = SingleTypeRelationships.builder().topology(topology);

    let properties: RelationshipPropertyStore | undefined;
    if (this.loadRelationshipProperty) {
      properties = this.relationshipPropertyStore(adjacencyListsWithProperties);
      resultBuilder.properties(properties);
    }

    resultBuilder.relationshipSchemaEntry(this.relationshipSchemaEntry(properties));

    return resultBuilder.build();
  }
}

/**
 * Indexed (bidirectional) relationships builder.
 */
export class IndexedSingleTypeRelationshipsBuilder extends SingleTypeRelationshipsBuilder {
  private readonly forwardImporter: SingleTypeRelationshipImporter;
  private readonly inverseImporter: SingleTypeRelationshipImporter;

  constructor(
    idMap: PartialIdMap,
    forwardImporter: SingleTypeRelationshipImporter,
    inverseImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    relationshipType: RelationshipType,
    propertyConfigs: PropertyConfig[],
    isMultiGraph: boolean,
    loadRelationshipProperty: boolean,
    direction: Direction,
    executorService: any,
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
    return LocalRelationshipsBuilder.indexed(
      LocalRelationshipsBuilder.nonIndexed(this.forwardImporter, this.bufferSize, this.propertyConfigs.length),
      LocalRelationshipsBuilder.nonIndexed(this.inverseImporter, this.bufferSize, this.propertyConfigs.length)
    );
  }

  adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[] {
    const forwardTasks = this.forwardImporter.adjacencyListBuilderTasks(mapper, drainCountConsumer);
    const inverseTasks = this.inverseImporter.adjacencyListBuilderTasks(mapper, drainCountConsumer);

    return [...forwardTasks, ...inverseTasks];
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

    const resultBuilder = SingleTypeRelationships.builder()
      .topology(forwardTopology)
      .inverseTopology(inverseTopology);

    let forwardProperties: RelationshipPropertyStore | undefined;
    if (this.loadRelationshipProperty) {
      forwardProperties = this.relationshipPropertyStore(forwardListWithProperties);
      const inverseProperties = this.relationshipPropertyStore(inverseListWithProperties);
      resultBuilder
        .properties(forwardProperties)
        .inverseProperties(inverseProperties);
    }

    resultBuilder.relationshipSchemaEntry(this.relationshipSchemaEntry(forwardProperties));

    return resultBuilder.build();
  }
}

/**
 * Builder for SingleTypeRelationshipsBuilder configuration.
 */
export class SingleTypeRelationshipsBuilderBuilder {
  private config: Partial<SingleTypeRelationshipsBuilderConfig> = {};

  idMap(idMap: PartialIdMap): this {
    this.config.idMap = idMap;
    return this;
  }

  importer(importer: SingleTypeRelationshipImporter): this {
    this.config.importer = importer;
    return this;
  }

  inverseImporter(inverseImporter: SingleTypeRelationshipImporter): this {
    this.config.inverseImporter = inverseImporter;
    return this;
  }

  bufferSize(bufferSize: number): this {
    this.config.bufferSize = bufferSize;
    return this;
  }

  relationshipType(relationshipType: RelationshipType): this {
    this.config.relationshipType = relationshipType;
    return this;
  }

  propertyConfigs(propertyConfigs: PropertyConfig[]): this {
    this.config.propertyConfigs = propertyConfigs;
    return this;
  }

  isMultiGraph(isMultiGraph: boolean): this {
    this.config.isMultiGraph = isMultiGraph;
    return this;
  }

  loadRelationshipProperty(loadRelationshipProperty: boolean): this {
    this.config.loadRelationshipProperty = loadRelationshipProperty;
    return this;
  }

  direction(direction: Direction): this {
    this.config.direction = direction;
    return this;
  }

  executorService(executorService: any): this {
    this.config.executorService = executorService;
    return this;
  }

  concurrency(concurrency: Concurrency): this {
    this.config.concurrency = concurrency;
    return this;
  }

  build(): SingleTypeRelationshipsBuilder {
    // Validate required fields
    if (!this.config.idMap || !this.config.importer || !this.config.relationshipType) {
      throw new Error('idMap, importer, and relationshipType are required');
    }

    // Set defaults
    const config: SingleTypeRelationshipsBuilderConfig = {
      bufferSize: 8192,
      propertyConfigs: [],
      isMultiGraph: false,
      loadRelationshipProperty: false,
      direction: Direction.DIRECTED,
      concurrency: new Concurrency(1),
      ...this.config
    } as SingleTypeRelationshipsBuilderConfig;

    return SingleTypeRelationshipsBuilder.create(config);
  }
}

/**
 * Configuration interface for SingleTypeRelationshipsBuilder.
 */
export interface SingleTypeRelationshipsBuilderConfig {
  idMap: PartialIdMap;
  importer: SingleTypeRelationshipImporter;
  inverseImporter?: SingleTypeRelationshipImporter;
  bufferSize: number;
  relationshipType: RelationshipType;
  propertyConfigs: PropertyConfig[];
  isMultiGraph: boolean;
  loadRelationshipProperty: boolean;
  direction: Direction;
  executorService?: any; // TODO: Type ExecutorService
  concurrency: Concurrency;
}
