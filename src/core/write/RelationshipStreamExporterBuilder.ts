import { ExportedRelationship } from '@/api/ExportedRelationship';
import { ResultStore } from '@/api/ResultStore';
import { JobId } from '@/core/utils/progress/JobId';
import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
import { TerminationFlag } from '@/termination/TerminationFlag';
import { RelationshipStreamExporter } from './RelationshipStreamExporter';
import { Optional } from '@/utils/Optional';

/**
 * Abstract builder for creating RelationshipStreamExporter instances.
 *
 * This builder follows the **Builder Pattern** to provide a fluent, type-safe way
 * to configure and create relationship stream exporters. Unlike batch exporters that
 * work with graph instances, stream exporters are built around a **pre-computed stream**
 * of relationships, making them ideal for scenarios where relationships are generated
 * on-demand or need to be processed immediately.
 *
 * **Design Philosophy:**
 * - **Stream-oriented**: Built around a Stream<ExportedRelationship> rather than a Graph
 * - **Memory-efficient**: Processes relationships one at a time without accumulation
 * - **Pre-computed data**: Works with already-computed relationship streams
 * - **Minimal configuration**: Simpler than batch exporters due to streaming focus
 * - **Real-time ready**: Designed for immediate processing and output
 *
 * **Key Architectural Differences:**
 *
 * **vs. RelationshipExporterBuilder:**
 * - **Data source**: Stream of ExportedRelationship vs. Graph instance
 * - **Processing model**: Streaming vs. batch processing
 * - **Memory usage**: Constant vs. batch-dependent memory footprint
 * - **Configuration complexity**: Simpler (no graph-specific config needed)
 *
 * **vs. RelationshipPropertiesExporterBuilder:**
 * - **Property handling**: Pre-computed properties vs. on-demand property lookup
 * - **Type information**: Explicit types in ExportedRelationship vs. dynamic lookup
 * - **Performance**: Lower latency due to pre-computed nature
 *
 * **Common Usage Pattern:**
 * ```typescript
 * const exporter = streamExporterBuilder
 *   .withRelationships(relationshipStream)     // Required: pre-computed relationship stream
 *   .withIdMappingOperator(idMapper)           // Required: ID conversion
 *   .withRelationshipCount(estimatedCount)     // Optional: for progress tracking
 *   .withProgressTracker(tracker)              // Optional: progress monitoring
 *   .withTerminationFlag(termFlag)             // Optional: cancellation support
 *   .withResultStore(resultStore)              // Optional: result caching
 *   .build();                                  // Create the final exporter
 * ```
 *
 * **Stream Processing Scenarios:**
 *
 * **Real-Time Algorithm Results:**
 * ```typescript
 * // Stream recommendations as they're computed
 * const recommendationStream = algorithm.computeRecommendationsStream();
 * const exporter = builder
 *   .withRelationships(recommendationStream)
 *   .build();
 * ```
 *
 * **Memory-Constrained Processing:**
 * ```typescript
 * // Process huge graphs without loading all relationships into memory
 * const hugeGraphStream = graph.streamRelationships('CONNECTED_TO');
 * const exporter = builder
 *   .withRelationships(hugeGraphStream)
 *   .withRelationshipCount(graph.relationshipCount())
 *   .build();
 * ```
 *
 * **Pipeline Integration:**
 * ```typescript
 * // Chain multiple processing stages
 * const processedStream = rawRelationshipStream
 *   .map(rel => enrichWithProperties(rel))
 *   .filter(rel => rel.score > threshold);
 *
 * const exporter = builder
 *   .withRelationships(processedStream)
 *   .build();
 * ```
 *
 * **Typical Implementations:**
 * - `KafkaRelationshipStreamExporterBuilder` - Stream to Apache Kafka
 * - `FileRelationshipStreamExporterBuilder` - Continuous file writing
 * - `WebSocketRelationshipStreamExporterBuilder` - Real-time web streaming
 * - `MemoryRelationshipStreamExporterBuilder` - In-memory stream processing
 * - `DatabaseRelationshipStreamExporterBuilder` - Streaming database inserts
 */
export abstract class RelationshipStreamExporterBuilder {
  /**
   * The stream of relationships to be exported.
   *
   * This is the **primary data source** for stream exporters. Unlike batch exporters
   * that extract relationships from a graph on-demand, stream exporters work with
   * a pre-computed stream of ExportedRelationship objects.
   *
   * **Stream Characteristics:**
   * - **Pre-computed**: Relationships and their properties are already computed
   * - **Type-safe**: Each ExportedRelationship contains explicit type information
   * - **Memory-efficient**: Can be processed one-at-a-time without accumulation
   * - **Ordered**: Maintains processing order if required by target system
   */
  protected relationships: ReadableStream<ExportedRelationship> | null = null;

  /**
   * Batch size for stream processing operations.
   *
   * **FIXME**: The original comment indicates this is "dodgy" and only overridden
   * in specific implementations. This suggests it may not be universally applicable
   * to streaming scenarios, where batch size is less relevant than in bulk operations.
   *
   * **Stream Processing Context:**
   * Unlike batch exporters where batch size is critical for memory management,
   * stream exporters typically process relationships individually. However,
   * some streaming targets (like Kafka) may benefit from micro-batching.
   *
   * **When Batch Size Matters in Streaming:**
   * - **Micro-batching**: Small batches for better throughput to streaming targets
   * - **Transaction boundaries**: Grouping for transactional streaming targets
   * - **Network efficiency**: Reducing network round-trips for remote targets
   */
  protected batchSize: number = 10_000; // NodePropertyExporter.MIN_BATCH_SIZE equivalent

  /**
   * Function to convert internal node IDs back to original IDs.
   *
   * Even though relationships are pre-computed, they still contain internal node IDs
   * that need to be converted to original IDs for export consistency and referential
   * integrity with external systems.
   */
  protected toOriginalId: (nodeId: number) => number = (id) => id;

  /**
   * Flag for cooperative cancellation of streaming operations.
   *
   * Stream processing can be long-running or even infinite (for live data streams),
   * making cancellation support essential for responsive systems.
   */
  protected terminationFlag: TerminationFlag = TerminationFlag.RUNNING_TRUE;

  /**
   * Progress tracker for monitoring streaming operations.
   *
   * Stream processing progress is different from batch processing:
   * - **Rate-based**: Measured in items/second rather than completion percentage
   * - **Continuous**: May run indefinitely for live streams
   * - **Latency-sensitive**: Progress updates should not significantly impact latency
   */
  protected progressTracker: ProgressTracker = ProgressTracker.NULL_TRACKER;

  /**
   * Expected total number of relationships in the stream.
   *
   * Used for **progress calculation and memory pre-allocation**. For infinite or
   * unknown-length streams, this should be set to -1 (indicating unknown length).
   *
   * **Progress Tracking Benefits:**
   * - Enables percentage-based progress for finite streams
   * - Provides completion time estimates
   * - Helps with resource planning and monitoring
   */
  protected relationshipCount: number = -1;

  /**
   * Optional result store for caching streamed results.
   *
   * For streaming scenarios, result stores enable **hybrid processing patterns**
   * where streamed data is also accumulated for later analysis or validation.
   */
  protected resultStore: Optional<ResultStore> = Optional.empty();

  /**
   * Job identifier for tracking this streaming operation.
   *
   * Particularly important for streaming operations which may run for extended
   * periods and need to be monitored, debugged, or correlated with other
   * system operations.
   */
  protected jobId: JobId = JobId.EMPTY;

  /**
   * Abstract method that concrete builders must implement.
   *
   * Creates the actual stream exporter instance with all configured options.
   * Stream exporter implementations should be optimized for low-latency,
   * continuous processing.
   *
   * @returns The configured RelationshipStreamExporter instance
   * @throws Error if required configuration is missing or invalid
   */
  public abstract build(): RelationshipStreamExporter;

  /**
   * Sets the ID mapping function for converting internal to original node IDs.
   *
   * This is **essential for maintaining referential integrity** in exported streams.
   * Even though relationships are pre-computed, they still reference internal node IDs
   * that must be converted for external consumption.
   *
   * **Stream Processing Considerations:**
   * - ID mapping should be **fast** since it's applied to every relationship
   * - Consider caching frequently accessed ID mappings
   * - Avoid expensive lookup operations that could impact streaming latency
   *
   * @param toOriginalNodeId Function that converts internal node IDs to original IDs
   * @returns This builder for method chaining
   */
  public withIdMappingOperator(toOriginalNodeId: (nodeId: number) => number): this {
    this.toOriginalId = toOriginalNodeId;
    return this;
  }

  /**
   * Sets the termination flag for cooperative cancellation.
   *
   * Streaming operations have unique cancellation requirements:
   * - **Immediate responsiveness**: Should check termination flag frequently
   * - **Graceful cleanup**: Properly close streaming connections and resources
   * - **State consistency**: Leave partial results in a consistent state
   * - **Infinite streams**: Essential for stopping potentially infinite processing
   *
   * @param terminationFlag The termination flag to monitor for cancellation requests
   * @returns This builder for method chaining
   */
  public withTerminationFlag(terminationFlag: TerminationFlag): this {
    this.terminationFlag = terminationFlag;
    return this;
  }

  /**
   * Sets the stream of relationships to be exported.
   *
   * This is the **core data source** for stream exporters. The stream should contain
   * ExportedRelationship objects with all necessary data (source, target, type, properties)
   * already computed and ready for export.
   *
   * **Stream Requirements:**
   * - **Complete data**: Each ExportedRelationship should contain all needed information
   * - **Consistent ordering**: Maintain order if required by target system
   * - **Error handling**: Stream should handle errors gracefully
   * - **Resource management**: Properly manage underlying resources (connections, files, etc.)
   *
   * **Performance Considerations:**
   * - Stream should be **lazy** to avoid loading all data into memory
   * - Consider **backpressure** handling for slow downstream consumers
   * - Optimize for **low latency** between stream production and consumption
   *
   * @param relationships The stream of ExportedRelationship objects to export
   * @returns This builder for method chaining
   * @throws Error if relationships stream is null
   */
  public withRelationships(relationships: ReadableStream<ExportedRelationship>): this {
    if (!relationships) {
      throw new Error('Relationships stream cannot be null');
    }
    this.relationships = relationships;
    return this;
  }

  /**
   * Sets the expected number of relationships in the stream.
   *
   * This information enables **better progress tracking and resource management**
   * for finite streams. For infinite or unknown-length streams, use -1.
   *
   * **Benefits of Known Count:**
   * - **Progress percentage**: Enable completion percentage calculations
   * - **Time estimation**: Provide estimated completion time
   * - **Resource planning**: Pre-allocate resources based on expected volume
   * - **Monitoring**: Better operational visibility into processing progress
   *
   * **Streaming-Specific Considerations:**
   * - Count may be **approximate** for dynamically generated streams
   * - **Rate-based progress** may be more useful than percentage for live streams
   * - Consider **checkpoint-based progress** for very long streams
   *
   * @param relationshipCount Expected number of relationships (-1 if unknown)
   * @returns This builder for method chaining
   */
  public withRelationshipCount(relationshipCount: number): this {
    this.relationshipCount = relationshipCount;
    return this;
  }

  /**
   * Sets the batch size for micro-batching operations.
   *
   * **Note**: This method is marked as @TestOnly in the original, suggesting it's
   * primarily used for testing scenarios rather than production configuration.
   *
   * **Stream Processing Context:**
   * Most streaming scenarios process relationships individually for minimal latency.
   * However, some streaming targets may benefit from micro-batching:
   *
   * **When Micro-Batching Helps:**
   * - **Network efficiency**: Reduce round-trips to remote streaming targets
   * - **Transaction boundaries**: Group operations for transactional targets
   * - **Throughput optimization**: Balance latency vs. throughput for high-volume streams
   *
   * **When to Avoid Batching:**
   * - **Real-time requirements**: When every millisecond of latency matters
   * - **Memory constraints**: When even small batches could cause memory pressure
   * - **Ordered processing**: When strict ordering must be maintained
   *
   * @param batchSize Number of relationships to process in micro-batches
   * @returns This builder for method chaining
   * @throws Error if batchSize is not positive
   */
  public withBatchSize(batchSize: number): this {
    if (batchSize <= 0) {
      throw new Error('Batch size must be positive');
    }
    this.batchSize = batchSize;
    return this;
  }

  /**
   * Sets the progress tracker for monitoring streaming operations.
   *
   * Progress tracking for streams has **unique characteristics** compared to batch operations:
   *
   * **Streaming Progress Patterns:**
   * - **Rate-based metrics**: Items/second more meaningful than completion percentage
   * - **Continuous updates**: Progress updates throughout the stream processing
   * - **Latency considerations**: Progress tracking should not impact stream latency
   * - **Long-running operations**: May need to track progress over hours or days
   *
   * **Progress Tracking Strategies:**
   * ```typescript
   * // Rate-based progress
   * setInterval(() => {
   *   progressTracker.logProgress(`Processing rate: ${currentRate} rels/sec`);
   * }, 10000);
   *
   * // Milestone-based progress
   * if (processedCount % 100000 === 0) {
   *   progressTracker.logProgress(`Processed ${processedCount} relationships`);
   * }
   * ```
   *
   * **Important Notes:**
   * - If using a TaskProgressTracker, the **caller must manage beginning and finishing subtasks**
   * - The default EmptyProgressTracker requires no task management
   * - Consider **sampling** progress updates to avoid overhead in high-throughput streams
   *
   * @param progressTracker The progress tracker for monitoring streaming progress
   * @returns This builder for method chaining
   */
  public withProgressTracker(progressTracker: ProgressTracker): this {
    this.progressTracker = progressTracker;
    return this;
  }

  /**
   * Sets an optional result store for caching streamed results.
   *
   * Result stores enable **hybrid streaming patterns** where data flows through
   * the stream while also being accumulated for later analysis:
   *
   * **Hybrid Streaming Benefits:**
   * - **Real-time + batch**: Immediate streaming plus batch analytics on accumulated data
   * - **Validation**: Compare streamed vs. accumulated results for consistency
   * - **Replay capability**: Re-process accumulated data if streaming fails
   * - **Development support**: Access to full dataset for debugging and testing
   *
   * **Memory Management for Streaming:**
   * Streaming with result stores requires careful memory management:
   * - **Bounded accumulation**: Limit how much data is accumulated
   * - **Sliding windows**: Keep only recent data in memory
   * - **Compression**: Use compressed storage for large accumulated datasets
   * - **Persistence**: Consider persistent backing for accumulated data
   *
   * @param resultStore Optional result store for caching streamed results
   * @returns This builder for method chaining
   */
  public withResultStore(resultStore: Optional<ResultStore>): this {
    this.resultStore = resultStore;
    return this;
  }

  /**
   * Sets the job ID for tracking this streaming operation.
   *
   * Job IDs are **particularly valuable** for streaming operations because they:
   * - Often run for **extended periods** (hours, days, or indefinitely)
   * - May need to be **stopped and restarted** for maintenance
   * - Require **operational monitoring** to ensure they're functioning correctly
   * - Need **correlation** with other system components and metrics
   *
   * **Streaming Operation Monitoring:**
   * - **Health checks**: Verify that streaming is still active and processing data
   * - **Performance monitoring**: Track throughput, latency, and error rates
   * - **Resource usage**: Monitor memory, CPU, and network usage over time
   * - **Error tracking**: Correlate errors with specific streaming operations
   *
   * @param jobId The job identifier for this streaming operation
   * @returns This builder for method chaining
   */
  public withJobId(jobId: JobId): this {
    this.jobId = jobId;
    return this;
  }
}
