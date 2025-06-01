import { Graph } from "@/api/Graph";
import { ResultStore } from "@/api/ResultStore";
import { Concurrency } from "@/concurrency/Concurrency";
import { JobId } from "@/core/utils/progress/JobId";
import { ProgressTracker } from "@/core/utils/progress/tasks";
import { TerminationFlag } from "@/termination/TerminationFlag";
import { Optional } from "@/utils/Optional";
import { RelationshipExporter } from "./RelationshipExporter";
import { RelationshipPropertyTranslator } from "./RelationshipPropertyTranslator";

/**
 * Abstract builder for creating RelationshipExporter instances.
 *
 * This builder follows the **Builder Pattern** to provide a fluent, type-safe way
 * to configure and create relationship exporters. It handles all the common configuration
 * options that relationship exporters need, while allowing concrete implementations
 * to add their own storage-specific configuration.
 *
 * **Design Philosophy:**
 * - **Graph-centric**: Built around exporting from a specific Graph instance
 * - **Flexible translation**: Support for custom property value transformations
 * - **Batch-optimized**: Configurable batch sizes for optimal performance
 * - **Progress-aware**: Built-in progress tracking for long-running exports
 * - **Cancellation-friendly**: Cooperative termination support
 *
 * **Common Usage Pattern:**
 * ```typescript
 * const exporter = exporterBuilder
 *   .withGraph(graph)                          // Required: source graph
 *   .withIdMappingOperator(idMap::toOriginal)  // Required: ID conversion
 *   .withProgressTracker(tracker)              // Optional: progress monitoring
 *   .withBatchSize(50000)                      // Optional: performance tuning
 *   .withPropertyTranslator(customTranslator)  // Optional: value transformation
 *   .withTerminationFlag(termFlag)             // Optional: cancellation support
 *   .withResultStore(resultStore)              // Optional: result caching
 *   .build();                                  // Create the final exporter
 * ```
 *
 * **Concrete Implementations:**
 * - `FileRelationshipExporterBuilder` - Exports to CSV/GraphML/JSON files
 * - `MemoryRelationshipExporterBuilder` - Stores in memory for further processing
 * - `StreamRelationshipExporterBuilder` - Streams to external systems
 * - `DatabaseRelationshipExporterBuilder` - Writes to databases (non-Neo4j)
 * - `CloudRelationshipExporterBuilder` - Exports to cloud storage services
 */
export abstract class RelationshipExporterBuilder {
  /**
   * Default write concurrency for relationship exports.
   *
   * Relationship exports are typically I/O bound, so a single thread is often
   * sufficient and avoids potential ordering issues. Concrete implementations
   * can override this for storage systems that benefit from parallel writes.
   */
  public static readonly TYPED_DEFAULT_WRITE_CONCURRENCY = new Concurrency(1);

  /**
   * Function to convert internal node IDs back to original IDs.
   *
   * This is **absolutely critical** for relationship export because:
   * - Algorithms work with sequential internal IDs (0, 1, 2, ...)
   * - Exported relationships must use original node IDs for consistency
   * - Maintains referential integrity with external systems
   */
  protected toOriginalId: (nodeId: number) => number = (id) => id;

  /**
   * Flag for cooperative cancellation of long-running export operations.
   *
   * Relationship exports can be extremely long-running for large graphs
   * (millions of relationships), so cancellation support is essential
   * for responsive user experience.
   */
  protected terminationFlag: TerminationFlag = TerminationFlag.RUNNING_TRUE;

  /**
   * The source graph containing relationships to be exported.
   *
   * This provides access to:
   * - Relationship topology (source/target node pairs)
   * - Relationship properties and their values
   * - Relationship type information
   * - Node ID mapping functions
   */
  protected graph: Graph | null = null;

  /**
   * Progress tracker for monitoring export operations.
   *
   * Relationship exports often involve millions of relationships, making
   * progress tracking crucial for user experience and operational monitoring.
   */
  protected progressTracker: ProgressTracker = ProgressTracker.NULL_TRACKER;

  /**
   * Function for translating property values during export.
   *
   * The default translator converts values to doubles, which is suitable for
   * most numeric relationship properties like weights, scores, or distances.
   * Custom translators can handle complex transformations:
   *
   * **Common Translation Patterns:**
   * ```typescript
   * // Default: convert to double
   * (value) => Number(value)
   *
   * // Scale values to different range
   * (value) => Number(value) * 100
   *
   * // Handle arrays by converting to string
   * (value) => Array.isArray(value) ? JSON.stringify(value) : String(value)
   *
   * // Apply business logic transformations
   * (value) => value > threshold ? 'HIGH' : 'LOW'
   * ```
   */
  protected propertyTranslator: RelationshipPropertyTranslator =
    RelationshipPropertyTranslator.IDENTITY;

  /**
   * Batch size for relationship export operations.
   *
   * This controls how many relationships are processed in each batch, which
   * affects both memory usage and I/O efficiency. The optimal batch size
   * depends on the target storage system and available memory.
   */
  protected batchSize: number = 10_000; // NodePropertyExporter.MIN_BATCH_SIZE equivalent

  /**
   * Optional result store for caching export results in memory.
   *
   * Enables hybrid export patterns where relationships are both written to
   * persistent storage AND kept in memory for immediate access.
   */
  protected resultStore: Optional<ResultStore> = Optional.empty();

  /**
   * Job identifier for tracking this export operation.
   *
   * Used for logging, monitoring, debugging, and coordinating with other
   * system components in enterprise environments.
   */
  protected jobId: JobId = JobId.EMPTY;

  /**
   * Abstract method that concrete builders must implement.
   *
   * This is where the actual exporter instance is created with all configured options.
   * Implementations should validate required configuration and set up any necessary
   * resources (files, connections, etc.).
   *
   * @returns The configured RelationshipExporter instance
   * @throws Error if required configuration is missing or invalid
   */
  public abstract build(): RelationshipExporter;

  /**
   * Sets a custom relationship property translator.
   *
   * Property translators enable **flexible value transformation** during export:
   * - **Type conversion**: Convert between numeric types, strings, etc.
   * - **Format adaptation**: Adapt values to target storage format requirements
   * - **Business logic**: Apply domain-specific transformations
   * - **Unit conversion**: Convert between measurement units
   * - **Encoding**: Handle special characters or encoding requirements
   *
   * **Performance Considerations:**
   * - The translator is called for every property value, so keep it lightweight
   * - Avoid expensive operations like I/O or complex computations
   * - Consider caching results for frequently repeated values
   *
   * **Example Translators:**
   * ```typescript
   * // Normalize similarity scores to percentages
   * .withPropertyTranslator(score => Math.round(score * 100))
   *
   * // Convert arrays to comma-separated strings
   * .withPropertyTranslator(arr => Array.isArray(arr) ? arr.join(',') : String(arr))
   *
   * // Apply threshold-based categorization
   * .withPropertyTranslator(weight => weight > 0.5 ? 'STRONG' : 'WEAK')
   * ```
   *
   * @param propertyTranslator Function to translate property values during export
   * @returns This builder for method chaining
   */
  public withRelationPropertyTranslator(
    propertyTranslator: RelationshipPropertyTranslator
  ): this {
    this.propertyTranslator = propertyTranslator;
    return this;
  }

  /**
   * Sets the source graph to export relationships from.
   *
   * The graph is the **primary data source** for relationship export operations.
   * It provides access to all relationship data including topology, properties,
   * and metadata needed for export.
   *
   * **Graph Requirements:**
   * - Must contain the relationships to be exported
   * - Should provide efficient iteration over relationships by type
   * - Must support property access for property-based exports
   * - Should have consistent ID mapping capabilities
   *
   * @param graph The source graph containing relationships to export
   * @returns This builder for method chaining
   * @throws Error if graph is null or invalid
   */
  public withGraph(graph: Graph): this {
    if (!graph) {
      throw new Error("Graph cannot be null");
    }
    this.graph = graph;
    return this;
  }

  /**
   * Sets the ID mapping function for converting internal to original node IDs.
   *
   * This function is **absolutely essential** for maintaining data consistency.
   * Algorithms work with internal sequential IDs for performance, but exported
   * relationships must reference the original node IDs to maintain referential
   * integrity with external systems.
   *
   * **Why ID Mapping Matters:**
   * - Exported relationships must reference correct node IDs
   * - Enables proper importing/joining with other datasets
   * - Maintains consistency with source graph systems
   * - Prevents data corruption in downstream processing
   *
   * **Typical Usage:**
   * ```typescript
   * .withIdMappingOperator(nodeId => graph.toOriginalNodeId(nodeId))
   * .withIdMappingOperator(idMap::toOriginalNodeId)
   * ```
   *
   * @param toOriginalId Function that converts internal node IDs to original IDs
   * @returns This builder for method chaining
   */
  public withIdMappingOperator(toOriginalId: (nodeId: number) => number): this {
    this.toOriginalId = toOriginalId;
    return this;
  }

  /**
   * Sets the termination flag for cooperative cancellation.
   *
   * Relationship exports can be **extremely long-running** for large graphs,
   * potentially taking hours for graphs with hundreds of millions of relationships.
   * Cancellation support is essential for responsive systems.
   *
   * **Cancellation Strategy:**
   * - Exporters should check the flag periodically (e.g., every batch)
   * - When termination is requested, clean up resources and exit gracefully
   * - Partial exports should be left in a consistent state when possible
   * - Progress tracking should reflect the cancellation
   *
   * @param terminationFlag The termination flag to monitor for cancellation requests
   * @returns This builder for method chaining
   */
  public withTerminationFlag(terminationFlag: TerminationFlag): this {
    this.terminationFlag = terminationFlag;
    return this;
  }

  /**
   * Sets the progress tracker for monitoring export operations.
   *
   * Progress tracking is **crucial for relationship exports** because they often
   * involve millions of relationships and can take significant time. Without
   * progress feedback, users cannot distinguish between normal operation and
   * system problems.
   *
   * **Progress Tracking Benefits:**
   * - **User confidence**: Shows that the system is working normally
   * - **Time estimation**: Provides estimated completion time
   * - **Performance monitoring**: Identifies bottlenecks and optimization opportunities
   * - **Error detection**: Early detection of performance degradation
   * - **Resource planning**: Data for capacity planning and optimization
   *
   * **Important Notes:**
   * - If using a TaskProgressTracker, the **caller must manage beginning and finishing subtasks**
   * - The default EmptyProgressTracker requires no task management
   * - Progress tracking has minimal performance overhead
   * - Consider batching progress updates to avoid excessive overhead
   *
   * @param progressTracker The progress tracker for monitoring export progress
   * @returns This builder for method chaining
   */
  public withProgressTracker(progressTracker: ProgressTracker): this {
    this.progressTracker = progressTracker;
    return this;
  }

  /**
   * Sets the batch size for export operations.
   *
   * Batch size is a **critical performance parameter** that balances memory usage
   * with I/O efficiency. The optimal batch size depends on several factors:
   *
   * **Factors Affecting Optimal Batch Size:**
   * - **Target storage system**: File I/O, database writes, network APIs
   * - **Available memory**: Larger batches use more memory
   * - **Relationship complexity**: Simple vs. property-rich relationships
   * - **Concurrent operations**: Other system load and resource contention
   *
   * **Sizing Guidelines:**
   * - **Small batches (1K-10K)**: Low memory usage, higher overhead
   * - **Medium batches (10K-100K)**: Good balance for most scenarios
   * - **Large batches (100K+)**: Maximum throughput, high memory usage
   *
   * **Performance Tuning:**
   * ```typescript
   * // High-throughput file export
   * .withBatchSize(100_000)
   *
   * // Memory-constrained environment
   * .withBatchSize(5_000)
   *
   * // Database export with transaction limits
   * .withBatchSize(10_000)
   * ```
   *
   * @param batchSize Number of relationships to process in each batch
   * @returns This builder for method chaining
   */
  public withBatchSize(batchSize: number): this {
    if (batchSize <= 0) {
      throw new Error("Batch size must be positive");
    }
    this.batchSize = batchSize;
    return this;
  }

  /**
   * Sets an optional result store for caching export results.
   *
   * Result stores enable **hybrid export patterns** that provide both persistence
   * and immediate access to exported data. This is particularly valuable for
   * relationship exports because the exported topology can be immediately used
   * for further graph analysis.
   *
   * **Hybrid Export Benefits:**
   * - **Pipeline processing**: Exported relationships immediately available for next algorithm
   * - **Validation workflows**: Compare exported vs. in-memory topology for consistency
   * - **Multi-format export**: Export to both persistent storage and memory simultaneously
   * - **Performance optimization**: Avoid re-reading large relationship sets immediately
   *
   * **Memory Considerations:**
   * - Relationship data can be very large (potentially GBs for large graphs)
   * - Monitor memory usage and consider streaming or compression for huge graphs
   * - Balance immediate access benefits with memory constraints
   *
   * @param resultStore Optional result store for caching export results in memory
   * @returns This builder for method chaining
   */
  public withResultStore(resultStore: Optional<ResultStore>): this {
    this.resultStore = resultStore;
    return this;
  }

  /**
   * Sets the job ID for tracking this export operation.
   *
   * Job IDs provide **operational visibility** and enable sophisticated monitoring
   * for relationship exports, which are often critical operations in graph
   * processing pipelines.
   *
   * **Operational Benefits:**
   * - **Correlation**: Connect logs and metrics across distributed components
   * - **Monitoring**: Track export operations in enterprise monitoring systems
   * - **Debugging**: Trace issues across multiple system components
   * - **Audit**: Compliance and governance records for data export operations
   * - **Performance analysis**: Correlate export performance with system metrics
   *
   * @param jobId The job identifier for this export operation
   * @returns This builder for method chaining
   */
  public withJobId(jobId: JobId): this {
    this.jobId = jobId;
    return this;
  }
}
