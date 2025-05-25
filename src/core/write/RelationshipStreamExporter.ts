import { ValueType } from '@/api';
import { Task } from '@/core/utils/progress/tasks';
import { Tasks } from '@/core/utils/progress/tasks';

/**
 * Interface for streaming relationship exports with typed property support.
 *
 * RelationshipStreamExporter provides a **streaming-oriented approach** to relationship
 * export that emphasizes real-time processing and memory efficiency. Unlike batch exporters
 * that collect data before writing, stream exporters process and emit relationships
 * continuously as they're encountered.
 *
 * **Design Philosophy:**
 * - **Streaming-first**: Designed for continuous, real-time processing
 * - **Memory-efficient**: Minimal memory footprint through immediate processing
 * - **Type-aware**: Explicit property type information for downstream consumers
 * - **Performance-oriented**: Returns count of processed relationships for monitoring
 * - **Single-shot**: One write operation per relationship type for simplicity
 *
 * **Key Differences from Other Relationship Exporters:**
 *
 * **vs. RelationshipExporter:**
 * - **Processing model**: Stream vs. batch processing
 * - **Memory usage**: Constant vs. batch-dependent memory usage
 * - **Real-time capability**: Immediate vs. delayed availability of results
 *
 * **vs. RelationshipPropertiesExporter:**
 * - **Type information**: Explicit type metadata vs. implicit typing
 * - **Streaming focus**: Optimized for continuous processing vs. bulk operations
 * - **Consumer integration**: Better integration with downstream streaming systems
 *
 * **Common Use Cases:**
 *
 * **Real-Time Analytics:**
 * ```typescript
 * // Stream similarity results to real-time recommendation engine
 * const count = exporter.write(
 *   'SIMILAR_TO',
 *   ['similarity_score', 'confidence_level'],
 *   [ValueType.DOUBLE, ValueType.DOUBLE]
 * );
 * console.log(`Streamed ${count} similarity relationships`);
 * ```
 *
 * **Live Data Pipelines:**
 * ```typescript
 * // Stream computed relationships to downstream processing systems
 * const fraudCount = exporter.write(
 *   'SUSPICIOUS_TRANSACTION',
 *   ['risk_score', 'alert_level', 'transaction_count'],
 *   [ValueType.DOUBLE, ValueType.STRING, ValueType.LONG]
 * );
 * ```
 *
 * **Memory-Constrained Environments:**
 * ```typescript
 * // Process large graphs without loading all relationships into memory
 * const relationshipCount = exporter.write(
 *   'CONNECTED_TO',
 *   ['weight', 'edge_type', 'is_verified'],
 *   [ValueType.DOUBLE, ValueType.STRING, ValueType.BOOLEAN]
 * );
 * ```
 *
 * **Integration Scenarios:**
 * - **Message queues**: Stream to Kafka, RabbitMQ, or similar systems
 * - **Real-time databases**: Direct streaming to time-series or streaming databases
 * - **API endpoints**: Live feed to REST/GraphQL APIs
 * - **Monitoring systems**: Real-time metrics and alerting
 * - **ML pipelines**: Continuous feature streaming for online learning
 *
 * **Performance Characteristics:**
 * - **Constant memory usage**: Memory footprint independent of graph size
 * - **Low latency**: Immediate processing and emission of relationships
 * - **High throughput**: Optimized for continuous, high-volume processing
 * - **Backpressure handling**: Can adapt to downstream system processing rates
 *
 * **Typical Implementations:**
 * - `KafkaRelationshipStreamExporter` - Stream to Apache Kafka topics
 * - `WebSocketRelationshipStreamExporter` - Real-time web streaming
 * - `MemoryRelationshipStreamExporter` - In-memory streaming for testing
 * - `FileRelationshipStreamExporter` - Continuous file writing
 * - `DatabaseRelationshipStreamExporter` - Streaming database inserts
 */
export interface RelationshipStreamExporter {
  /**
   * Streams all relationships of the specified type with their properties.
   *
   * This method processes and streams relationships **immediately as they're encountered**,
   * rather than collecting them in memory first. The property type information enables
   * downstream consumers to properly deserialize and process the streamed data.
   *
   * **Method Behavior:**
   * - Iterates through all relationships of the specified type
   * - For each relationship, extracts values for the specified property keys
   * - Immediately streams the relationship data (source, target, properties) to the target system
   * - Uses the provided type information to ensure proper serialization
   * - Returns the total count of relationships processed
   *
   * **Property Processing:**
   * - Property keys and types must correspond (same length, matching order)
   * - Missing properties are handled according to implementation (null, skip, default value)
   * - Type conversion is performed according to the specified ValueType
   * - Invalid property values are handled gracefully (logged, skipped, or defaulted)
   *
   * **Streaming Strategy:**
   * ```typescript
   * // Immediate processing - no batching
   * graph.forEachRelationship('SIMILAR_TO', (source, target) => {
   *   const properties = extractProperties(source, target, propertyKeys);
   *   const typedProperties = convertTypes(properties, propertyTypes);
   *   streamingTarget.emit(source, target, 'SIMILAR_TO', typedProperties);
   * });
   * ```
   *
   * **Type Safety Benefits:**
   * The explicit type information enables:
   * - **Proper serialization**: Downstream systems know how to encode values
   * - **Schema validation**: Verify that property types match expectations
   * - **Performance optimization**: Use type-specific serialization paths
   * - **Error prevention**: Catch type mismatches early in the pipeline
   *
   * **Error Handling:**
   * Implementations should handle various error conditions gracefully:
   * - **Missing properties**: Use defaults or skip relationships
   * - **Type conversion failures**: Log and use fallback values
   * - **Streaming failures**: Implement retry logic or dead letter queues
   * - **Backpressure**: Handle cases where downstream systems are slow
   *
   * **Performance Considerations:**
   * - **No memory accumulation**: Constant memory usage regardless of relationship count
   * - **Immediate processing**: Low latency from computation to downstream availability
   * - **Streaming overhead**: Small per-relationship overhead for streaming operations
   * - **Type conversion cost**: Type validation and conversion for each property value
   *
   * **Monitoring and Observability:**
   * The return value enables:
   * - **Progress tracking**: Monitor how many relationships have been processed
   * - **Performance metrics**: Calculate throughput (relationships/second)
   * - **Validation**: Verify expected number of relationships were processed
   * - **Debugging**: Identify processing bottlenecks or failures
   *
   * **Example Usage:**
   * ```typescript
   * // Stream multi-property similarity results
   * const similarityCount = exporter.write(
   *   'SIMILAR_TO',
   *   ['jaccard_similarity', 'cosine_similarity', 'confidence'],
   *   [ValueType.DOUBLE, ValueType.DOUBLE, ValueType.DOUBLE]
   * );
   *
   * console.log(`Streamed ${similarityCount} similarity relationships`);
   *
   * // Stream fraud detection results with mixed types
   * const fraudCount = exporter.write(
   *   'SUSPICIOUS_ACTIVITY',
   *   ['risk_score', 'alert_type', 'detected_at', 'requires_review'],
   *   [ValueType.DOUBLE, ValueType.STRING, ValueType.LONG, ValueType.BOOLEAN]
   * );
   *
   * // Stream recommendation results
   * const recCount = exporter.write(
   *   'RECOMMENDS',
   *   ['score', 'category', 'explanation'],
   *   [ValueType.DOUBLE, ValueType.STRING, ValueType.STRING]
   * );
   * ```
   *
   * @param relationshipType The type of relationships to stream (e.g., 'SIMILAR_TO', 'RECOMMENDS')
   * @param propertyKeys List of property keys to include in the stream
   * @param propertyTypes List of property types corresponding to the keys (same order and length)
   * @returns The total number of relationships that were processed and streamed
   * @throws Error if propertyKeys and propertyTypes have different lengths
   * @throws Error if relationshipType is null or empty
   * @throws Error if propertyKeys or propertyTypes are null or empty
   */
  write(
    relationshipType: string,
    propertyKeys: string[],
    propertyTypes: ValueType[]
  ): number;
}

/**
 * Static utilities for creating progress tracking tasks.
 *
 * These helper methods provide standardized task creation for progress
 * monitoring during relationship streaming operations.
 */
export namespace RelationshipStreamExporter {
  /**
   * Creates a base-level task for tracking relationship streaming operations.
   *
   * This represents the **top-level progress** for relationship streaming processes,
   * typically shown to users as "Streaming Recommendations" or "Writing Relationship Stream".
   *
   * **Streaming Progress Characteristics:**
   * Unlike batch operations, streaming operations have different progress patterns:
   * - **Continuous progress**: Progress updates continuously rather than in discrete steps
   * - **Rate-based metrics**: Progress measured in relationships/second rather than percentage
   * - **Real-time feedback**: Immediate visibility into streaming performance
   * - **Open-ended duration**: Streaming may continue indefinitely for live data
   *
   * **Task Hierarchy for Streaming:**
   * ```
   * PageRank :: WriteRelationshipStream
   * ├── Initializing Stream (sub-task)
   * ├── Processing Relationships (continuous sub-task)
   * ├── Type Conversion (continuous sub-task)
   * └── Streaming to Target (continuous sub-task)
   * ```
   *
   * **Progress Tracking Strategies:**
   * ```typescript
   * // Rate-based progress tracking
   * const task = RelationshipStreamExporter.baseTask('Similarity');
   * progressTracker.beginSubTask(task);
   *
   * let processedCount = 0;
   * const startTime = Date.now();
   *
   * setInterval(() => {
   *   const rate = processedCount / ((Date.now() - startTime) / 1000);
   *   progressTracker.logProgress(`Streaming rate: ${rate.toFixed(0)} rels/sec`);
   * }, 5000);
   * ```
   *
   * **Note on Task Volume:**
   * For streaming operations, the task volume concept is less applicable since:
   * - The total number of relationships may not be known in advance
   * - Streaming may be continuous/infinite
   * - Progress is better measured by rate than completion percentage
   *
   * Therefore, this method creates a leaf task without a specific volume,
   * relying on rate-based progress reporting instead.
   *
   * @param operationName Name of the algorithm or operation producing the stream
   * @returns A leaf task for tracking streaming progress
   */
  export function baseTask(operationName: string): Task {
    return Tasks.leaf(`${operationName} :: WriteRelationshipStream`);
  }
}
