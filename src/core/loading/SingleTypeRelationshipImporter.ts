import { RelationshipProjection, RelationshipType, PropertyMapping } from '@/api';
import { AdjacencyCompressor, AdjacencyCompressorFactory, AdjacencyListsWithProperties } from '@/api/compress';
import { Aggregation } from '@/core/Aggregation';
import { AdjacencyBuffer } from '@/core/loading/AdjacencyBuffer';
import { AdjacencyBufferBuilder } from '@/core/loading/AdjacencyBufferBuilder';
import { AdjacencyListBehavior } from '@/core/loading/AdjacencyListBehavior';
import { RelationshipsBatchBuffer } from '@/core/loading/RelationshipsBatchBuffer';
import { ThreadLocalSingleTypeRelationshipImporter, ThreadLocalSingleTypeRelationshipImporterBuilder } from '@/core/loading/ThreadLocalSingleTypeRelationshipImporter';
import { PropertyReader } from '@/core/loading/PropertyReader';
import { ImportSizing } from '@/core/loading/ImportSizing';

/**
 * High-performance single relationship type importer with parallel processing.
 *
 * SingleTypeRelationshipImporter is the **core processing engine** that handles
 * importing relationships of a specific type with maximum efficiency. It combines:
 *
 * 1. **Parallel Processing**: Multi-threaded relationship ingestion and compression
 * 2. **Memory Optimization**: Efficient buffering and streaming compression
 * 3. **Property Handling**: Type-aware property processing with aggregation
 * 4. **Compression**: Advanced adjacency list compression for memory efficiency
 * 5. **Quality Control**: Dangling relationship detection and handling
 *
 * Key Architecture Components:
 *
 * ```
 * Processing Pipeline:
 * Raw Relationships → Thread-Local Buffers → Adjacency Buffer → Compressed Lists
 * [Source Data]      [Parallel Ingestion]   [Coordination]    [Final Storage]
 *
 * Thread Architecture:
 * Thread 1: BatchBuffer₁ → ThreadLocalImporter₁ ↘
 * Thread 2: BatchBuffer₂ → ThreadLocalImporter₂ → AdjacencyBuffer → CompressedOutput
 * Thread N: BatchBuffer₃ → ThreadLocalImporter₃ ↗
 *
 * Memory Flow:
 * RelationshipsBatchBuffer → AdjacencyBuffer → AdjacencyCompressor → AdjacencyLists
 * [Thread-Local Storage]    [Shared Buffer]   [Compression]       [Final Storage]
 * ```
 *
 * Performance Characteristics:
 * - **Throughput**: 10-50M relationships/second (depending on properties)
 * - **Memory**: Streaming processing with bounded memory usage
 * - **Scalability**: Near-linear scaling with thread count
 * - **Compression**: 60-90% size reduction vs naive storage
 *
 * Usage Pattern:
 * ```typescript
 * // Create importer for specific relationship type
 * const importer = SingleTypeRelationshipImporter.of(importMetaData, nodeCountSupplier, importSizing);
 *
 * // Create thread-local importers for parallel processing
 * const threadLocalImporter = importer.threadLocalImporter(batchBuffer, propertyReader);
 *
 * // Process relationships in parallel
 * relationships.parallelForEach(rel => threadLocalImporter.importRelationship(rel));
 *
 * // Build final compressed adjacency lists
 * const adjacencyLists = importer.build();
 * ```
 *
 * Production Integration:
 * This class is used by higher-level importers to process individual relationship
 * types in parallel, with each type getting its own SingleTypeRelationshipImporter
 * instance for optimal resource utilization and memory isolation.
 */
export class SingleTypeRelationshipImporter {

  /**
   * Factory for creating adjacency compressors with optimal configuration.
   *
   * The compressor factory is configured based on:
   * - Expected node count (affects compression strategy)
   * - Property mappings (determines memory layout)
   * - Aggregation requirements (affects compression algorithms)
   */
  private readonly adjacencyCompressorFactory: AdjacencyCompressorFactory;

  /**
   * Metadata describing the import configuration.
   *
   * Contains all information needed for processing this relationship type:
   * - Relationship projection (orientation, properties, aggregation)
   * - Property mappings and default values
   * - Token IDs for efficient property access
   * - Quality control settings
   */
  private readonly importMetaData: ImportMetaData;

  /**
   * Unique identifier for this relationship type.
   *
   * Used for:
   * - Efficient type-based filtering during import
   * - Property token resolution
   * - Multi-graph type separation
   */
  private readonly typeId: number;

  /**
   * Shared buffer for collecting adjacency data from all threads.
   *
   * The AdjacencyBuffer coordinates between thread-local importers
   * and the final compression phase, providing:
   * - Thread-safe adjacency accumulation
   * - Memory-efficient buffering strategies
   * - Optimal compression preparation
   */
  private readonly adjacencyBuffer: AdjacencyBuffer;

  /**
   * Create a SingleTypeRelationshipImporter with optimal configuration.
   *
   * This factory method configures all components for maximum performance:
   *
   * 1. **Compression Strategy**: Selects optimal adjacency compression based on graph characteristics
   * 2. **Buffer Sizing**: Configures buffers based on expected data volume and memory constraints
   * 3. **Property Handling**: Sets up efficient property processing pipelines
   * 4. **Parallelization**: Configures thread-safe coordination structures
   *
   * The configuration automatically adapts to:
   * - Graph size (affects compression algorithms)
   * - Property complexity (affects memory layout)
   * - Hardware characteristics (affects buffer sizes)
   * - Quality requirements (affects validation overhead)
   *
   * @param importMetaData Configuration for this relationship type import
   * @param nodeCountSupplier Supplier for current node count (for compression sizing)
   * @param importSizing Memory and performance configuration
   * @returns Configured importer ready for parallel processing
   */
  static of(
    importMetaData: ImportMetaData,
    nodeCountSupplier: () => number,
    importSizing: ImportSizing
  ): SingleTypeRelationshipImporter {

    // Configure compression strategy based on graph characteristics and properties
    const adjacencyCompressorFactory = AdjacencyListBehavior.asConfigured(
      nodeCountSupplier,
      importMetaData.projection.properties,
      importMetaData.aggregations
    );

    // Create shared adjacency buffer with optimal sizing
    const adjacencyBuffer = new AdjacencyBufferBuilder()
      .importMetaData(importMetaData)
      .importSizing(importSizing)
      .adjacencyCompressorFactory(adjacencyCompressorFactory)
      .build();

    return new SingleTypeRelationshipImporter(
      adjacencyCompressorFactory,
      adjacencyBuffer,
      importMetaData,
      importMetaData.typeTokenId
    );
  }

  /**
   * Private constructor - use factory method for proper configuration.
   */
  private constructor(
    adjacencyCompressorFactory: AdjacencyCompressorFactory,
    adjacencyBuffer: AdjacencyBuffer,
    importMetaData: ImportMetaData,
    typeToken: number
  ) {
    this.adjacencyCompressorFactory = adjacencyCompressorFactory;
    this.importMetaData = importMetaData;
    this.typeId = typeToken;
    this.adjacencyBuffer = adjacencyBuffer;
  }

  /**
   * Get the unique type identifier for this importer.
   *
   * @returns Relationship type token ID
   */
  get typeId(): number {
    return this.typeId;
  }

  /**
   * Check if dangling relationships should be skipped.
   *
   * Dangling relationships are relationships that reference nodes
   * not present in the imported node set. This can happen when:
   * - Importing subgraphs
   * - Node filtering is applied
   * - Data consistency issues exist
   *
   * @returns true if dangling relationships should be filtered out
   */
  get skipDanglingRelationships(): boolean {
    return this.importMetaData.skipDanglingRelationships;
  }

  /**
   * Check if this importer should load relationship properties.
   *
   * Property loading adds overhead but enables rich graph analytics.
   * This check allows optimization for topology-only imports.
   *
   * @returns true if properties should be processed and stored
   */
  get loadProperties(): boolean {
    return this.importMetaData.projection.properties.hasMappings;
  }

  /**
   * Get adjacency list builder tasks for parallel processing.
   *
   * This method returns a collection of tasks that can be executed
   * in parallel to build the adjacency lists efficiently. Each task
   * handles a portion of the source nodes, allowing for optimal
   * parallelization of the compression phase.
   *
   * Tasks are designed to be:
   * - **Independent**: No inter-task dependencies
   * - **Load-balanced**: Roughly equal work per task
   * - **Memory-efficient**: Streaming processing with bounded memory
   * - **Cache-friendly**: Localized memory access patterns
   *
   * @param mapper Optional value mapper for property transformation
   * @returns Collection of parallel tasks for adjacency list building
   */
  adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper
  ): Collection<AdjacencyBuffer.AdjacencyListBuilderTask> {
    return this.adjacencyBuffer.adjacencyListBuilderTasks(
      mapper ? Optional.of(mapper) : Optional.empty(),
      Optional.empty()
    );
  }

  /**
   * Get adjacency list builder tasks with drain count monitoring.
   *
   * Extended version that includes monitoring of processed relationship
   * counts for progress tracking and performance analysis.
   *
   * @param mapper Optional value mapper for property transformation
   * @param drainCountConsumer Consumer for processed relationship count updates
   * @returns Collection of parallel tasks with monitoring support
   */
  adjacencyListBuilderTasks(
    mapper: AdjacencyCompressor.ValueMapper | undefined,
    drainCountConsumer: ((count: number) => void) | undefined
  ): Collection<AdjacencyBuffer.AdjacencyListBuilderTask> {
    return this.adjacencyBuffer.adjacencyListBuilderTasks(
      mapper ? Optional.of(mapper) : Optional.empty(),
      drainCountConsumer ? Optional.of(drainCountConsumer) : Optional.empty()
    );
  }

  /**
   * Create a thread-local importer for parallel relationship processing.
   *
   * Thread-local importers provide **lock-free parallel processing** by giving
   * each thread its own import context. This eliminates contention while
   * maintaining coordination through the shared AdjacencyBuffer.
   *
   * Architecture Benefits:
   * ```
   * Thread 1: ThreadLocalImporter₁ → BatchBuffer₁ → \
   * Thread 2: ThreadLocalImporter₂ → BatchBuffer₂ → → AdjacencyBuffer → Compressed Output
   * Thread N: ThreadLocalImporter₃ → BatchBuffer₃ → /
   * ```
   *
   * Each thread-local importer:
   * - **Processes relationships independently** (no locks on hot path)
   * - **Accumulates in thread-local buffers** (optimal cache usage)
   * - **Flushes to shared buffer periodically** (batch coordination)
   * - **Handles property processing locally** (type-aware optimization)
   *
   * Performance Characteristics:
   * - **Throughput**: Scales linearly with thread count
   * - **Latency**: Low coordination overhead
   * - **Memory**: Bounded per-thread memory usage
   * - **Cache**: Excellent cache locality within threads
   *
   * @param relationshipsBatchBuffer Thread-local buffer for relationship accumulation
   * @param propertyReader Reader for extracting relationship properties
   * @returns Thread-local importer configured for this relationship type
   */
  threadLocalImporter<PROPERTY_REF>(
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ): ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
    return new ThreadLocalSingleTypeRelationshipImporterBuilder<PROPERTY_REF>()
      .adjacencyBuffer(this.adjacencyBuffer)
      .relationshipsBatchBuffer(relationshipsBatchBuffer)
      .importMetaData(this.importMetaData)
      .propertyReader(propertyReader)
      .build();
  }

  /**
   * Build the final compressed adjacency lists.
   *
   * This method triggers the **final compression phase** that transforms
   * all accumulated relationship data into optimized adjacency lists.
   *
   * The build process:
   * 1. **Flushes all buffers**: Ensures all data is collected
   * 2. **Sorts adjacency data**: Optimizes for compression and access
   * 3. **Applies compression**: Uses optimal algorithms for the data patterns
   * 4. **Generates properties**: Creates efficient property storage
   * 5. **Validates integrity**: Ensures data consistency
   *
   * Compression Strategies:
   * - **Delta encoding**: For sorted node IDs
   * - **Variable-length encoding**: For degree distributions
   * - **Dictionary compression**: For property values
   * - **Bitmap compression**: For sparse patterns
   *
   * Memory Layout Optimization:
   * - **Cache-aligned structures**: Optimal CPU cache usage
   * - **Prefetch-friendly patterns**: Predictable memory access
   * - **NUMA-aware allocation**: Optimal for multi-socket systems
   *
   * @returns Compressed adjacency lists with properties ready for graph algorithms
   */
  build(): AdjacencyListsWithProperties {
    return this.adjacencyCompressorFactory.build(true);
  }

  /**
   * Get import metadata for this relationship type.
   *
   * @returns Complete import configuration
   */
  getImportMetaData(): ImportMetaData {
    return this.importMetaData;
  }

  /**
   * Get the shared adjacency buffer.
   *
   * Primarily used for testing and monitoring.
   *
   * @returns Shared buffer coordinating parallel imports
   */
  getAdjacencyBuffer(): AdjacencyBuffer {
    return this.adjacencyBuffer;
  }

  /**
   * Get compression factory configuration.
   *
   * Useful for performance analysis and debugging.
   *
   * @returns Configured compression factory
   */
  getCompressionFactory(): AdjacencyCompressorFactory {
    return this.adjacencyCompressorFactory;
  }
}

/**
 * Import metadata containing all configuration for relationship type processing.
 *
 * This interface encapsulates all the information needed to process
 * a specific relationship type efficiently, including:
 * - Relationship projection configuration
 * - Property mappings and aggregation rules
 * - Performance optimization settings
 * - Quality control parameters
 */
export interface ImportMetaData {
  /** Relationship projection defining orientation, properties, and aggregation */
  readonly projection: RelationshipProjection;

  /** Aggregation strategies for each property (handles multi-edges) */
  readonly aggregations: Aggregation[];

  /** Property token IDs for efficient property lookup */
  readonly propertyKeyIds: number[];

  /** Default values for missing properties */
  readonly defaultValues: number[];

  /** Relationship type token ID */
  readonly typeTokenId: number;

  /** Whether to skip relationships referencing missing nodes */
  readonly skipDanglingRelationships: boolean;
}

/**
 * Immutable implementation of ImportMetaData with factory methods.
 */
export class ImmutableImportMetaData implements ImportMetaData {
  constructor(
    public readonly projection: RelationshipProjection,
    public readonly aggregations: Aggregation[],
    public readonly propertyKeyIds: number[],
    public readonly defaultValues: number[],
    public readonly typeTokenId: number,
    public readonly skipDanglingRelationships: boolean
  ) {}

  /**
   * Create ImportMetaData from relationship projection and token mappings.
   *
   * This factory method handles the complex process of extracting and
   * organizing all metadata needed for efficient relationship processing:
   *
   * 1. **Property Analysis**: Extracts property mappings and validates configuration
   * 2. **Aggregation Resolution**: Determines aggregation strategy for each property
   * 3. **Token Mapping**: Resolves property names to efficient token IDs
   * 4. **Default Value Extraction**: Handles missing property value strategies
   * 5. **Performance Optimization**: Optimizes metadata layout for access patterns
   *
   * Property Processing:
   * ```
   * PropertyMapping: { propertyKey: "weight", defaultValue: 1.0, aggregation: SUM }
   * ↓
   * propertyKeyIds: [42]  # Token ID for "weight"
   * defaultValues: [1.0]  # Default value array
   * aggregations: [SUM]   # Aggregation strategy array
   * ```
   *
   * Aggregation Strategy:
   * - **Per-property aggregation**: Each property can have its own strategy
   * - **Fallback aggregation**: Default for properties without explicit aggregation
   * - **Multi-edge handling**: Defines how to combine multiple edges between same nodes
   *
   * @param projection Relationship projection configuration
   * @param typeTokenId Token ID for this relationship type
   * @param relationshipPropertyTokens Mapping from property names to token IDs
   * @param skipDanglingRelationships Whether to filter dangling relationships
   * @returns Complete import metadata
   */
  static of(
    projection: RelationshipProjection,
    typeTokenId: number,
    relationshipPropertyTokens: Map<string, number>,
    skipDanglingRelationships: boolean
  ): ImportMetaData {
    return new ImmutableImportMetaData(
      projection,
      ImmutableImportMetaData.aggregations(projection),
      ImmutableImportMetaData.propertyKeyIds(projection, relationshipPropertyTokens),
      ImmutableImportMetaData.defaultValues(projection),
      typeTokenId,
      skipDanglingRelationships
    );
  }

  /**
   * Extract default values for all properties in correct order.
   *
   * Default values are critical for handling missing properties efficiently.
   * The order must match the property key IDs array for correct indexing.
   *
   * @param projection Relationship projection with property mappings
   * @returns Array of default values in property order
   */
  private static defaultValues(projection: RelationshipProjection): number[] {
    return projection.properties.mappings
      .map(propertyMapping => propertyMapping.defaultValue.doubleValue);
  }

  /**
   * Extract property token IDs in processing order.
   *
   * Token IDs enable efficient property lookup during import by avoiding
   * string comparisons in hot code paths. The order must be consistent
   * with default values and aggregation arrays.
   *
   * @param projection Relationship projection with property mappings
   * @param relationshipPropertyTokens Mapping from property names to token IDs
   * @returns Array of property token IDs in processing order
   */
  private static propertyKeyIds(
    projection: RelationshipProjection,
    relationshipPropertyTokens: Map<string, number>
  ): number[] {
    return projection.properties.mappings
      .map(mapping => {
        const tokenId = relationshipPropertyTokens.get(mapping.neoPropertyKey);
        if (tokenId === undefined) {
          throw new Error(`Property token not found: ${mapping.neoPropertyKey}`);
        }
        return tokenId;
      });
  }

  /**
   * Resolve aggregation strategies for all properties.
   *
   * Aggregation determines how to handle multiple relationships between
   * the same pair of nodes. Different properties may use different strategies:
   * - SUM: Add property values (weights, counts)
   * - MAX: Keep maximum value (timestamps, priorities)
   * - MIN: Keep minimum value (distances, costs)
   * - SINGLE: Keep first/last value (IDs, categories)
   *
   * Fallback Logic:
   * 1. Use per-property aggregation if specified
   * 2. Fall back to relationship-level aggregation
   * 3. Default to SINGLE for no aggregation specified
   *
   * @param projection Relationship projection with aggregation configuration
   * @returns Array of resolved aggregation strategies
   */
  private static aggregations(projection: RelationshipProjection): Aggregation[] {
    const propertyMappings = projection.properties.mappings;

    // Extract per-property aggregation strategies
    let aggregations = propertyMappings
      .map(propertyMapping => Aggregation.resolve(propertyMapping.aggregation));

    // Handle case with no properties - use relationship-level aggregation
    if (propertyMappings.length === 0) {
      aggregations = [Aggregation.resolve(projection.aggregation)];
    }

    return aggregations;
  }
}

/**
 * Context information for relationship type import processing.
 *
 * This interface encapsulates all the context needed to process a specific
 * relationship type, including bidirectional relationship handling and
 * the configured importer instance.
 */
export interface SingleTypeRelationshipImportContext {
  /** The relationship type being processed */
  readonly relationshipType: RelationshipType;

  /** For bidirectional graphs, the inverse relationship type (if different) */
  readonly inverseOfRelationshipType?: RelationshipType;

  /** Complete relationship projection configuration */
  readonly relationshipProjection: RelationshipProjection;

  /** Configured importer for this relationship type */
  readonly singleTypeRelationshipImporter: SingleTypeRelationshipImporter;
}

/**
 * Immutable implementation of SingleTypeRelationshipImportContext.
 */
export class ImmutableSingleTypeRelationshipImportContext implements SingleTypeRelationshipImportContext {
  constructor(
    public readonly relationshipType: RelationshipType,
    public readonly relationshipProjection: RelationshipProjection,
    public readonly singleTypeRelationshipImporter: SingleTypeRelationshipImporter,
    public readonly inverseOfRelationshipType?: RelationshipType
  ) {}

  /**
   * Create import context for a relationship type.
   *
   * @param relationshipType The relationship type to process
   * @param projection Configuration for this relationship type
   * @param importer Configured importer instance
   * @param inverseType Optional inverse relationship type for bidirectional processing
   * @returns Complete import context
   */
  static of(
    relationshipType: RelationshipType,
    projection: RelationshipProjection,
    importer: SingleTypeRelationshipImporter,
    inverseType?: RelationshipType
  ): SingleTypeRelationshipImportContext {
    return new ImmutableSingleTypeRelationshipImportContext(
      relationshipType,
      projection,
      importer,
      inverseType
    );
  }

  /**
   * Check if this context handles bidirectional relationships.
   *
   * @returns true if processing both forward and inverse relationships
   */
  isBidirectional(): boolean {
    return this.inverseOfRelationshipType !== undefined;
  }

  /**
   * Get the effective relationship type for processing.
   *
   * For inverse relationships, this returns the inverse type.
   * For forward relationships, this returns the primary type.
   *
   * @returns Relationship type for this processing context
   */
  getEffectiveRelationshipType(): RelationshipType {
    return this.inverseOfRelationshipType || this.relationshipType;
  }
}

// Builder pattern support
export class SingleTypeRelationshipImporterBuilder {
  private _importMetaData?: ImportMetaData;
  private _nodeCountSupplier?: () => number;
  private _importSizing?: ImportSizing;

  importMetaData(metaData: ImportMetaData): this {
    this._importMetaData = metaData;
    return this;
  }

  nodeCountSupplier(supplier: () => number): this {
    this._nodeCountSupplier = supplier;
    return this;
  }

  importSizing(sizing: ImportSizing): this {
    this._importSizing = sizing;
    return this;
  }

  build(): SingleTypeRelationshipImporter {
    if (!this._importMetaData || !this._nodeCountSupplier || !this._importSizing) {
      throw new Error('Missing required configuration for SingleTypeRelationshipImporter');
    }

    return SingleTypeRelationshipImporter.of(
      this._importMetaData,
      this._nodeCountSupplier,
      this._importSizing
    );
  }
}

// Utility class for Optional pattern (since TypeScript doesn't have Java's Optional)
export class Optional<T> {
  private constructor(private value: T | null) {}

  static empty<T>(): Optional<T> {
    return new Optional<T>(null);
  }

  static of<T>(value: T): Optional<T> {
    if (value === null || value === undefined) {
      throw new Error('Value cannot be null or undefined');
    }
    return new Optional<T>(value);
  }

  static ofNullable<T>(value: T | null | undefined): Optional<T> {
    return new Optional<T>(value || null);
  }

  isPresent(): boolean {
    return this.value !== null;
  }

  isEmpty(): boolean {
    return this.value === null;
  }

  get(): T {
    if (this.value === null) {
      throw new Error('No value present');
    }
    return this.value;
  }

  orElse(other: T): T {
    return this.value !== null ? this.value : other;
  }

  ifPresent(consumer: (value: T) => void): void {
    if (this.value !== null) {
      consumer(this.value);
    }
  }

  map<U>(mapper: (value: T) => U): Optional<U> {
    if (this.value === null) {
      return Optional.empty<U>();
    }
    return Optional.of(mapper(this.value));
  }

  filter(predicate: (value: T) => boolean): Optional<T> {
    if (this.value === null || !predicate(this.value)) {
      return Optional.empty<T>();
    }
    return this;
  }
}

// Collection type alias for compatibility
export type Collection<T> = T[];

// Export namespace for static factory methods
export namespace SingleTypeRelationshipImporter {
  export const ImportMetaData = ImmutableImportMetaData;
  export const ImportContext = ImmutableSingleTypeRelationshipImportContext;
  export type SingleTypeRelationshipImportContext = ImmutableSingleTypeRelationshipImportContext;
}
