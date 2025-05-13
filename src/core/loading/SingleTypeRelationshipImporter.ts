import {
  Optional,
  LongSupplier,
  LongConsumer,
  RelationshipProjection,
  Aggregation,
  PropertyMapping,
  RelationshipType,
  AdjacencyCompressor,
  AdjacencyCompressorFactory,
  AdjacencyListsWithProperties,
  AdjacencyBuffer,
  ImportSizing,
  AdjacencyListBehavior,
  createAdjacencyBufferBuilder,
  AdjacencyBufferBuilder,
  RelationshipsBatchBuffer,
  PropertyReader,
  ThreadLocalSingleTypeRelationshipImporter,
  createThreadLocalSingleTypeRelationshipImporterBuilder,
  ThreadLocalSingleTypeRelationshipImporterBuilder
} from './singleTypeRelationshipImporterTypes'; // Adjust path as needed

export namespace SingleTypeRelationshipImporter {
  /**
   * Interface for ImportMetaData, mirroring the Java @ValueClass.
   */
  export interface ImportMetaData {
    projection(): RelationshipProjection;
    aggregations(): Aggregation[];
    propertyKeyIds(): number[];
    defaultValues(): number[];
    typeTokenId(): number;
    skipDanglingRelationships(): boolean;
  }

  // Helper functions for creating ImportMetaData, mimicking private static methods
  function getDefaultValues(projection: RelationshipProjection): number[] {
    return projection
      .properties()
      .mappings()
      .map(propertyMapping => propertyMapping.defaultValue().doubleValue());
  }

  function getPropertyKeyIds(
    projection: RelationshipProjection,
    relationshipPropertyTokens: Map<string, number>
  ): number[] {
    return projection.properties().mappings()
      .map(mapping => {
        const tokenId = relationshipPropertyTokens.get(mapping.neoPropertyKey());
        if (tokenId === undefined) {
          throw new Error(`Missing token for property key: ${mapping.neoPropertyKey()}`);
        }
        return tokenId;
      });
  }

  function getAggregations(projection: RelationshipProjection): Aggregation[] {
    const propertyMappings = projection.properties().mappings();
    let aggregations: Aggregation[];

    if (propertyMappings.length === 0) {
      aggregations = [Aggregation.resolve(projection.aggregation())];
    } else {
      aggregations = propertyMappings
        .map(pm => Aggregation.resolve(pm.aggregation()));
    }
    return aggregations;
  }

  /**
   * Factory for creating ImportMetaData instances.
   * Mimics the static `of` method and Immutables builder pattern.
   */
  export function createImportMetaData(
    projection: RelationshipProjection,
    typeTokenId: number,
    relationshipPropertyTokens: Map<string, number>,
    skipDanglingRelationships: boolean
  ): ImportMetaData {
    const _aggregations = getAggregations(projection);
    const _propertyKeyIds = getPropertyKeyIds(projection, relationshipPropertyTokens);
    const _defaultValues = getDefaultValues(projection);

    return Object.freeze({ // Ensure immutability
      projection: () => projection,
      aggregations: () => [..._aggregations], // Return copies for safety
      propertyKeyIds: () => [..._propertyKeyIds],
      defaultValues: () => [..._defaultValues],
      typeTokenId: () => typeTokenId,
      skipDanglingRelationships: () => skipDanglingRelationships,
    });
  }


  /**
   * Interface for SingleTypeRelationshipImportContext, mirroring the Java @ValueClass.
   */
  export interface SingleTypeRelationshipImportContext {
    relationshipType(): RelationshipType;
    inverseOfRelationshipType(): Optional<RelationshipType>;
    relationshipProjection(): RelationshipProjection;
    singleTypeRelationshipImporter(): SingleTypeRelationshipImporter; // Main class instance
  }

   /**
   * Factory for creating SingleTypeRelationshipImportContext instances.
   */
  export function createSingleTypeRelationshipImportContext(
    relationshipType: RelationshipType,
    inverseOfRelationshipType: Optional<RelationshipType>,
    relationshipProjection: RelationshipProjection,
    singleTypeRelationshipImporter: SingleTypeRelationshipImporter
  ): SingleTypeRelationshipImportContext {
    return Object.freeze({
        relationshipType: () => relationshipType,
        inverseOfRelationshipType: () => inverseOfRelationshipType,
        relationshipProjection: () => relationshipProjection,
        singleTypeRelationshipImporter: () => singleTypeRelationshipImporter,
    });
  }
}


export class SingleTypeRelationshipImporter {
  private readonly adjacencyCompressorFactory: AdjacencyCompressorFactory;
  private readonly importMetaData: SingleTypeRelationshipImporter.ImportMetaData;
  private readonly typeId: number;
  private readonly adjacencyBuffer: AdjacencyBuffer;

  /**
   * Factory method for SingleTypeRelationshipImporter.
   */
  public static of(
    importMetaData: SingleTypeRelationshipImporter.ImportMetaData,
    nodeCountSupplier: LongSupplier,
    importSizing: ImportSizing
  ): SingleTypeRelationshipImporter {
    const adjacencyCompressorFactory = AdjacencyListBehavior.asConfigured(
      nodeCountSupplier,
      importMetaData.projection().properties(),
      importMetaData.aggregations()
    );

    const adjacencyBuffer = createAdjacencyBufferBuilder()
      .importMetaData(importMetaData)
      .importSizing(importSizing)
      .adjacencyCompressorFactory(adjacencyCompressorFactory)
      .build();

    return new SingleTypeRelationshipImporter(
      adjacencyCompressorFactory,
      adjacencyBuffer,
      importMetaData,
      importMetaData.typeTokenId()
    );
  }

  private constructor(
    adjacencyCompressorFactory: AdjacencyCompressorFactory,
    adjacencyBuffer: AdjacencyBuffer,
    importMetaData: SingleTypeRelationshipImporter.ImportMetaData,
    typeToken: number
  ) {
    this.adjacencyCompressorFactory = adjacencyCompressorFactory;
    this.importMetaData = importMetaData;
    this.typeId = typeToken;
    this.adjacencyBuffer = adjacencyBuffer;
  }

  public getTypeId(): number { // Renamed from typeId to follow TS conventions
    return this.typeId;
  }

  public shouldSkipDanglingRelationships(): boolean { // Renamed
    return this.importMetaData.skipDanglingRelationships();
  }

  public shouldLoadProperties(): boolean { // Renamed
    return this.importMetaData.projection().properties().hasMappings();
  }

  public getAdjacencyListBuilderTasks( // Renamed and combined overloads
    mapper: Optional<AdjacencyCompressor.ValueMapper>,
    drainCountConsumer?: Optional<LongConsumer>
  ): AdjacencyBuffer.AdjacencyListBuilderTask[] {
    return this.adjacencyBuffer.adjacencyListBuilderTasks(mapper, drainCountConsumer || Optional.empty());
  }

  public createThreadLocalImporter<PROPERTY_REF>( // Renamed
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ): ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
    return createThreadLocalSingleTypeRelationshipImporterBuilder<PROPERTY_REF>()
      .adjacencyBuffer(this.adjacencyBuffer)
      .relationshipsBatchBuffer(relationshipsBatchBuffer)
      .importMetaData(this.importMetaData)
      .propertyReader(propertyReader)
      .build();
  }

  public build(): AdjacencyListsWithProperties {
    return this.adjacencyCompressorFactory.build(true); // Assuming isSorted is true
  }
}
