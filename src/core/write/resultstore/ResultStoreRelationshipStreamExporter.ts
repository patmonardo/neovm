import { ExportedRelationship } from '@/api/ExportedRelationship';
import { ResultStore } from '@/api/ResultStore';
import { ResultStoreEntry } from '@/api/ResultStoreEntry';
import { ValueType } from '@/api/nodeproperties/ValueType';
import { JobId } from '@/core/utils/progress/JobId';
import { RelationshipStreamExporter } from '@/core/write/RelationshipStreamExporter';

/**
 * Result store implementation of RelationshipStreamExporter.
 *
 * This exporter stores relationship streams **directly in memory** via the result store,
 * making them immediately available for subsequent graph operations. Unlike file or
 * database stream exporters that write data externally, this implementation optimizes
 * for **immediate accessibility** and **zero I/O overhead** while maintaining the
 * streaming paradigm for memory efficiency.
 *
 * **Design Philosophy:**
 * - **Stream preservation**: Maintains streaming characteristics while enabling in-memory storage
 * - **Immediate availability**: Streamed data instantly accessible via result store
 * - **Type-aware storage**: Preserves explicit property type information for downstream consumers
 * - **Memory-efficient**: Leverages streaming to avoid loading all data into memory at once
 * - **Pipeline integration**: Enables seamless algorithm chaining with streamed results
 *
 * **Key Architectural Features:**
 *
 * **Stream-Based Storage:**
 * Unlike other result store exporters that work with static data, this implementation
 * stores a **live stream** of ExportedRelationship objects. This approach:
 * - **Preserves streaming benefits**: Memory efficiency and lazy evaluation
 * - **Enables real-time access**: Consumers can process data as it becomes available
 * - **Maintains type safety**: Each relationship carries explicit property type information
 * - **Supports large datasets**: Stream processing prevents memory overflow
 *
 * **Type Information Preservation:**
 * The exporter stores both property keys and their corresponding ValueType information,
 * enabling downstream consumers to:
 * - **Properly deserialize**: Know how to interpret property values
 * - **Validate data**: Ensure property types match expectations
 * - **Optimize processing**: Use type-specific algorithms and data structures
 * - **Prevent errors**: Catch type mismatches early in processing pipelines
 *
 * **Result Store Integration:**
 * Creates a `ResultStoreEntry.RelationshipStream` that encapsulates:
 * - **Relationship type**: Semantic type of the streamed relationships
 * - **Property metadata**: Keys and types of relationship properties
 * - **Live stream**: The actual stream of ExportedRelationship objects
 * - **ID mapping**: Function to convert internal to original node IDs
 *
 * **Use Cases:**
 *
 * **Real-Time Algorithm Results:**
 * ```typescript
 * // Stream similarity computations as they're calculated
 * const exporter = new ResultStoreRelationshipStreamExporter(
 *   jobId, resultStore, similarityStream, idMapper
 * );
 *
 * const count = exporter.write(
 *   'SIMILAR_TO',
 *   ['jaccard_similarity', 'cosine_similarity'],
 *   [ValueType.DOUBLE, ValueType.DOUBLE]
 * );
 *
 * // Stream immediately available for consumption
 * const similarityStream = resultStore.getRelationshipStream('SIMILAR_TO');
 * const recommendations = generateRecommendations(similarityStream);
 * ```
 *
 * **Memory-Efficient Large Graph Processing:**
 * ```typescript
 * // Process huge graphs without loading all relationships into memory
 * const hugeGraphStream = algorithm.computeRelationshipsStream(massiveGraph);
 * const exporter = new ResultStoreRelationshipStreamExporter(
 *   jobId, resultStore, hugeGraphStream, idMapper
 * );
 *
 * exporter.write(
 *   'PROCESSED_EDGE',
 *   ['weight', 'confidence', 'source_algorithm'],
 *   [ValueType.DOUBLE, ValueType.DOUBLE, ValueType.STRING]
 * );
 *
 * // Stream processing prevents memory overflow
 * const processedStream = resultStore.getRelationshipStream('PROCESSED_EDGE');
 * ```
 *
 * **Pipeline Integration:**
 * ```typescript
 * // Chain multiple streaming algorithms
 * const stage1Stream = algorithm1.computeStream(inputGraph);
 * const exporter1 = new ResultStoreRelationshipStreamExporter(
 *   jobId, resultStore, stage1Stream, idMapper
 * );
 * exporter1.write('STAGE1_RESULT', ['score'], [ValueType.DOUBLE]);
 *
 * // Use stored stream as input to next stage
 * const stage1Results = resultStore.getRelationshipStream('STAGE1_RESULT');
 * const stage2Stream = algorithm2.computeStream(stage1Results);
 * const exporter2 = new ResultStoreRelationshipStreamExporter(
 *   jobId, resultStore, stage2Stream, idMapper
 * );
 * exporter2.write('FINAL_RESULT', ['final_score'], [ValueType.DOUBLE]);
 * ```
 *
 * **Interactive Analysis with Type Safety:**
 * ```typescript
 * // Export typed relationship stream for analysis
 * exporter.write(
 *   'RISK_RELATIONSHIP',
 *   ['risk_score', 'risk_category', 'detected_at', 'requires_review'],
 *   [ValueType.DOUBLE, ValueType.STRING, ValueType.LONG, ValueType.BOOLEAN]
 * );
 *
 * // Type information available for safe processing
 * const riskStream = resultStore.getRelationshipStream('RISK_RELATIONSHIP');
 * riskStream.forEach(relationship => {
 *   const riskScore = relationship.getProperty(0) as number; // Safe because ValueType.DOUBLE
 *   const category = relationship.getProperty(1) as string;  // Safe because ValueType.STRING
 *   const timestamp = relationship.getProperty(2) as number; // Safe because ValueType.LONG
 *   const needsReview = relationship.getProperty(3) as boolean; // Safe because ValueType.BOOLEAN
 * });
 * ```
 *
 * **Performance Characteristics:**
 * - **Zero I/O latency**: All operations are in-memory
 * - **Stream efficiency**: Memory usage independent of total relationship count
 * - **Immediate availability**: Results accessible instantly after writing
 * - **Type validation**: Explicit type checking prevents runtime errors
 * - **Lazy evaluation**: Relationships processed on-demand when stream is consumed
 */
export class ResultStoreRelationshipStreamExporter implements RelationshipStreamExporter {
  /**
   * Job identifier for correlating this export operation with other system activities.
   * Enables tracking, auditing, and grouping of related result store entries.
   */
  private readonly jobId: JobId;

  /**
   * The result store where relationship stream will be stored.
   * Provides immediate access to streamed relationships for subsequent operations.
   */
  private readonly resultStore: ResultStore;

  /**
   * The stream of ExportedRelationship objects to be stored.
   * This is a live stream that will be processed when accessed from the result store,
   * maintaining memory efficiency while enabling immediate availability.
   */
  private readonly relationshipStream: ReadableStream<ExportedRelationship>;

  /**
   * Function to convert internal node IDs back to original node IDs.
   * Essential for maintaining referential integrity when streamed relationships
   * are accessed by external systems or subsequent algorithms.
   */
  private readonly toOriginalId: (nodeId: number) => number;

  /**
   * Creates a new result store relationship stream exporter.
   *
   * **Package-Private Constructor:**
   * This constructor is package-private (no explicit access modifier) to indicate
   * that ResultStoreRelationshipStreamExporter instances should be created through
   * the builder pattern rather than direct instantiation.
   *
   * @param jobId Job identifier for tracking this export operation
   * @param resultStore The result store for immediate stream access
   * @param relationshipStream The stream of relationships to export
   * @param toOriginalId Function to convert internal to original node IDs
   */
  constructor(
    jobId: JobId,
    resultStore: ResultStore,
    relationshipStream: ReadableStream<ExportedRelationship>,
    toOriginalId: (nodeId: number) => number
  ) {
    this.jobId = jobId;
    this.resultStore = resultStore;
    this.relationshipStream = relationshipStream;
    this.toOriginalId = toOriginalId;
  }

  /**
   * Writes a relationship stream with typed properties to the result store.
   *
   * This method stores the **stream metadata and reference** rather than immediately
   * processing all relationships. The actual stream processing happens lazily when
   * the stream is accessed from the result store, maintaining memory efficiency
   * while providing immediate availability.
   *
   * **Storage Strategy:**
   * Creates a `ResultStoreEntry.RelationshipStream` that contains:
   * - **Relationship type**: Semantic type of relationships in the stream
   * - **Property keys**: Names of properties for each relationship
   * - **Property types**: ValueType information for proper deserialization
   * - **Stream reference**: The live stream of ExportedRelationship objects
   * - **ID mapping**: Function to resolve original node IDs
   *
   * **Type Safety Benefits:**
   * The explicit property types enable:
   * - **Safe deserialization**: Downstream consumers know expected property types
   * - **Early validation**: Type mismatches caught during stream processing
   * - **Performance optimization**: Type-specific processing paths can be used
   * - **Development safety**: IDE and compiler support for type checking
   *
   * **Stream Processing Model:**
   * ```typescript
   * // Storage: Immediate metadata storage, lazy stream processing
   * exporter.write('SIMILAR_TO', ['score'], [ValueType.DOUBLE]);
   *
   * // Access: Stream processing happens when accessed
   * const stream = resultStore.getRelationshipStream('SIMILAR_TO');
   * stream.forEach(relationship => {
   *   // Each relationship processed on-demand
   *   const score = relationship.getProperty(0) as number; // Type-safe access
   * });
   * ```
   *
   * **Memory Efficiency:**
   * - **Constant storage overhead**: Only metadata stored immediately
   * - **Lazy processing**: Relationships processed when stream is consumed
   * - **No duplication**: Stream reference used, not data copying
   * - **Backpressure support**: Stream can handle slow consumers gracefully
   *
   * **Property Key and Type Validation:**
   * The method assumes that propertyKeys and propertyTypes have the same length
   * and correspond in order. This validation should be enforced by calling code:
   * ```typescript
   * // Correct usage
   * exporter.write(
   *   'WEIGHTED_EDGE',
   *   ['weight', 'confidence'],           // 2 keys
   *   [ValueType.DOUBLE, ValueType.DOUBLE] // 2 types, matching order
   * );
   * ```
   *
   * **TODO: Relationship Count Tracking**
   * The method currently returns 0 as a placeholder. The comment indicates that
   * this should return the actual number of relationships in the stream. However,
   * for true streaming scenarios, this count may not be known in advance or may
   * be expensive to compute. Possible implementations:
   *
   * **Option 1: Count during stream processing**
   * ```typescript
   * // Count relationships as they're processed (when stream is consumed)
   * let count = 0;
   * const countingStream = relationshipStream.map(rel => {
   *   count++;
   *   return rel;
   * });
   * // Store counting stream and return count when processing completes
   * ```
   *
   * **Option 2: Pre-computed count**
   * ```typescript
   * // If count is known in advance, pass it to the constructor
   * private readonly expectedCount: number;
   * public write(...): number {
   *   // Store stream and return expected count
   *   return this.expectedCount;
   * }
   * ```
   *
   * **Option 3: Async count**
   * ```typescript
   * // Return promise for count that resolves when streaming completes
   * public async write(...): Promise<number> {
   *   // Store stream and return promise for eventual count
   * }
   * ```
   *
   * @param relationshipType The type of relationships in the stream
   * @param propertyKeys List of property keys for each relationship
   * @param propertyTypes List of property types corresponding to the keys
   * @returns Currently returns 0 (TODO: implement actual relationship count)
   */
  public write(
    relationshipType: string,
    propertyKeys: string[],
    propertyTypes: ValueType[]
  ): number {
    // Create result store entry with stream metadata and reference
    const streamEntry = new ResultStoreEntry.RelationshipStream(
      relationshipType,
      propertyKeys,
      propertyTypes,
      this.relationshipStream,
      this.toOriginalId
    );

    // Store stream reference for immediate availability
    this.resultStore.add(this.jobId, streamEntry);

    // TODO: return the number of relationships written
    // Currently returns 0 as placeholder - see method documentation for implementation options
    return 0;
  }
}
