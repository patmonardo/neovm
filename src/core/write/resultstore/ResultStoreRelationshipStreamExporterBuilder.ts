import { RelationshipStreamExporter } from '@/core/write/RelationshipStreamExporter';
import { RelationshipStreamExporterBuilder } from '@/core/write/RelationshipStreamExporterBuilder';
import { ResultStoreRelationshipStreamExporter } from './ResultStoreRelationshipStreamExporter';

/**
 * Builder for creating ResultStoreRelationshipStreamExporter instances.
 *
 * This builder extends the abstract RelationshipStreamExporterBuilder to provide a concrete
 * implementation that creates exporters for **in-memory result store storage** of relationship
 * streams. It represents the absolute simplest possible builder implementation in the entire
 * export framework since result store stream exporters require no external configuration.
 *
 * **Design Philosophy:**
 * - **Ultra-minimal configuration**: Result stores need no external setup whatsoever
 * - **Stream-oriented**: Built around pre-computed relationship streams
 * - **Immediate availability**: Streamed data instantly accessible via result store
 * - **Memory-efficient**: Maintains streaming characteristics while enabling in-memory access
 * - **Pipeline integration**: Perfect for real-time algorithm chaining and composition
 *
 * **Inheritance Benefits:**
 * By extending RelationshipStreamExporterBuilder, this class automatically inherits:
 * - **Stream management**: Pre-computed ReadableStream<ExportedRelationship> handling
 * - **ID mapping**: toOriginalId function for node ID conversion
 * - **Progress tracking**: Optional progress monitoring support (though less relevant for streams)
 * - **Cancellation support**: Cooperative termination via TerminationFlag
 * - **Result store integration**: Result store configuration for storage
 * - **Job tracking**: Job ID for operational correlation and auditing
 *
 * **Why Result Store is Required:**
 * Unlike the parent class where result store is optional (for file/database stream exporters),
 * this builder requires a result store because that's the fundamental storage mechanism.
 * The `.orElseThrow()` ensures fail-fast behavior if no result store is configured,
 * preventing runtime failures during streaming operations.
 *
 * **Stream vs. Static Data:**
 * This builder differs from other result store builders because it works with:
 * - **Pre-computed streams**: ReadableStream<ExportedRelationship> rather than Graph/GraphStore
 * - **Real-time data**: Relationships that may be generated on-demand
 * - **Memory efficiency**: Stream processing to avoid loading all data at once
 * - **Type information**: Explicit property types carried with each relationship
 *
 * **Common Usage Patterns:**
 *
 * **Real-Time Algorithm Results:**
 * ```typescript
 * const similarityStream = algorithm.computeSimilaritiesStream(graph);
 * const builder = new ResultStoreRelationshipStreamExporterBuilder()
 *   .withRelationships(similarityStream)
 *   .withIdMappingOperator(node => graph.toOriginalNodeId(node))
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('real-time-similarity'));
 *
 * const exporter = builder.build();
 *
 * // Export streaming similarities with type information
 * const count = exporter.write(
 *   'SIMILAR_TO',
 *   ['jaccard_similarity', 'cosine_similarity', 'confidence'],
 *   [ValueType.DOUBLE, ValueType.DOUBLE, ValueType.DOUBLE]
 * );
 *
 * // Stream immediately available for consumption
 * const streamResults = resultStore.getRelationshipStream('SIMILAR_TO');
 * ```
 *
 * **Memory-Efficient Large Graph Processing:**
 * ```typescript
 * const hugeGraphStream = massiveAlgorithm.processInChunks(massiveGraph);
 * const builder = new ResultStoreRelationshipStreamExporterBuilder()
 *   .withRelationships(hugeGraphStream)
 *   .withRelationshipCount(estimatedRelationshipCount) // For progress tracking
 *   .withResultStore(Optional.of(resultStore))
 *   .withProgressTracker(streamProgressTracker);
 *
 * const exporter = builder.build();
 *
 * // Process huge dataset without memory overflow
 * exporter.write(
 *   'PROCESSED_RELATIONSHIP',
 *   ['weight', 'processed_timestamp'],
 *   [ValueType.DOUBLE, ValueType.LONG]
 * );
 * ```
 *
 * **Algorithm Pipeline with Streaming:**
 * ```typescript
 * // Step 1: Generate relationship stream from algorithm
 * const algorithmStream = communityDetection.streamRelationshipsWithinCommunities(graph);
 * const exporter1 = new ResultStoreRelationshipStreamExporterBuilder()
 *   .withRelationships(algorithmStream)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('community-relationships'))
 *   .build();
 *
 * exporter1.write('COMMUNITY_MEMBER', ['community_id'], [ValueType.LONG]);
 *
 * // Step 2: Use stored stream as input to next algorithm
 * const communityStream = resultStore.getRelationshipStream('COMMUNITY_MEMBER');
 * const enrichedStream = enrichmentAlgorithm.processStream(communityStream);
 *
 * const exporter2 = new ResultStoreRelationshipStreamExporterBuilder()
 *   .withRelationships(enrichedStream)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('enriched-community-data'))
 *   .build();
 *
 * exporter2.write(
 *   'ENRICHED_COMMUNITY_MEMBER',
 *   ['community_id', 'centrality_score', 'influence_rank'],
 *   [ValueType.LONG, ValueType.DOUBLE, ValueType.LONG]
 * );
 * ```
 *
 * **Interactive Stream Analysis:**
 * ```typescript
 * // Quick setup for notebook/REPL usage with streaming data
 * const liveStream = generateLiveRelationshipStream();
 * const exporter = new ResultStoreRelationshipStreamExporterBuilder()
 *   .withRelationships(liveStream)
 *   .withResultStore(Optional.of(new InMemoryResultStore()))
 *   .build();
 *
 * // Export live data for immediate analysis
 * exporter.write(
 *   'LIVE_INTERACTION',
 *   ['interaction_type', 'strength', 'timestamp'],
 *   [ValueType.STRING, ValueType.DOUBLE, ValueType.LONG]
 * );
 *
 * // Stream available for real-time analysis
 * const liveData = resultStore.getRelationshipStream('LIVE_INTERACTION');
 * const realTimeMetrics = calculateStreamingMetrics(liveData);
 * ```
 *
 * **Stream Processing with Cancellation:**
 * ```typescript
 * const longRunningStream = longAlgorithm.processStream(hugeGraph);
 * const cancellationFlag = new TerminationFlag();
 *
 * const exporter = new ResultStoreRelationshipStreamExporterBuilder()
 *   .withRelationships(longRunningStream)
 *   .withTerminationFlag(cancellationFlag)
 *   .withResultStore(Optional.of(resultStore))
 *   .build();
 *
 * // Start streaming export
 * setTimeout(() => cancellationFlag.stop(), 30000); // Cancel after 30 seconds
 *
 * const count = exporter.write('PARTIAL_RESULTS', ['score'], [ValueType.DOUBLE]);
 * // Stream processing will stop cooperatively when cancellation flag is set
 * ```
 */
export class ResultStoreRelationshipStreamExporterBuilder extends RelationshipStreamExporterBuilder {
  /**
   * Creates a ResultStoreRelationshipStreamExporter with the configured parameters.
   *
   * This method implements the abstract build() method from RelationshipStreamExporterBuilder
   * by creating a concrete ResultStoreRelationshipStreamExporter instance. It represents
   * the absolute minimal implementation possible - just validation and object creation.
   *
   * **Configuration Validation:**
   * The method performs both inherited and explicit validation:
   *
   * **Inherited Validation (from parent class):**
   * - Relationship stream is not null (required for streaming source)
   * - toOriginalId function is present (for node ID conversion)
   * - Job ID is valid (defaults to EMPTY if not explicitly set)
   * - Optional progress tracking and termination flag configurations
   *
   * **Result Store Validation (this class):**
   * - `resultStore.orElseThrow()` ensures a result store is configured
   * - Throws exception if no result store is available
   * - Prevents runtime failures during streaming export operations
   *
   * **Why Result Store is Required:**
   * Result store relationship stream exporters have no alternative storage mechanism.
   * Unlike file stream exporters that could write to stdout or database stream exporters
   * that could use default connections, result store exporters require an explicit
   * result store instance as their storage destination.
   *
   * **Created Exporter Characteristics:**
   * The resulting exporter will provide:
   * - **Stream preservation**: Maintains streaming characteristics while enabling storage
   * - **Type safety**: Preserves explicit property type information
   * - **Immediate availability**: Stream metadata stored immediately, processing lazy
   * - **Memory efficiency**: Uses stream references, not data duplication
   * - **Real-time capability**: Supports live data streams and on-demand processing
   *
   * **Error Scenarios:**
   * ```typescript
   * // Missing result store - will throw
   * const exporter = new ResultStoreRelationshipStreamExporterBuilder()
   *   .withRelationships(relationshipStream)
   *   .withIdMappingOperator(graph.toOriginalNodeId)
   *   .build(); // Throws: exception from orElseThrow()
   *
   * // Missing relationship stream - will throw (from parent class validation)
   * const exporter = new ResultStoreRelationshipStreamExporterBuilder()
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // Throws: relationship stream validation error
   *
   * // Missing ID mapping - behavior depends on parent class defaults
   * const exporter = new ResultStoreRelationshipStreamExporterBuilder()
   *   .withRelationships(relationshipStream)
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // May succeed with identity function or throw
   * ```
   *
   * **Successful Configuration:**
   * ```typescript
   * const exporter = new ResultStoreRelationshipStreamExporterBuilder()
   *   .withRelationships(relationshipStream)              // Required: streaming data source
   *   .withIdMappingOperator(graph.toOriginalNodeId)      // Required: ID conversion
   *   .withResultStore(Optional.of(resultStore))          // Required: storage destination
   *   .withJobId(JobId.of('stream-export'))               // Optional: operation tracking
   *   .withProgressTracker(progressTracker)               // Optional: progress monitoring
   *   .withTerminationFlag(cancellationFlag)              // Optional: cancellation support
   *   .withRelationshipCount(estimatedCount)              // Optional: for progress calculation
   *   .build(); // Success: creates fully configured stream exporter
   * ```
   *
   * **Performance Characteristics:**
   * The created exporter will have:
   * - **Zero I/O overhead**: All operations are in-memory
   * - **Constant memory metadata**: Stream metadata storage is O(1)
   * - **Lazy stream processing**: Actual relationships processed when stream is consumed
   * - **Real-time capability**: Can handle live, infinite, or very large streams
   * - **Type preservation**: Maintains explicit type information for downstream safety
   *
   * @returns A fully configured ResultStoreRelationshipStreamExporter
   * @throws Error if no result store is configured via withResultStore()
   * @throws Error if required relationship stream or ID mapping configuration is missing
   */
  public build(): RelationshipStreamExporter {
    return new ResultStoreRelationshipStreamExporter(
      this.jobId,
      this.resultStore.orElseThrow(() => new Error('Result store is required for ResultStoreRelationshipStreamExporter')),
      this.relationships,
      this.toOriginalId
    );
  }
}
