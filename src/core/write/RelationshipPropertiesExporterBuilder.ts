import { GraphStore } from '@/api/GraphStore';
import { ResultStore } from '@/api/ResultStore';
import { JobId } from '@/core/utils/progress/JobId';
import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
import { Optional } from '@/utils/Optional';
import { TerminationFlag } from '@/termination/TerminationFlag';
import { RelationshipPropertiesExporter } from './RelationshipPropertiesExporter';
import { RelationshipPropertyTranslator } from './RelationshipPropertyTranslator';

/**
 * Abstract builder for creating RelationshipPropertiesExporter instances.
 *
 * This builder follows the **Builder Pattern** to provide a fluent, type-safe way
 * to configure and create relationship properties exporters. It handles the common
 * configuration options needed for efficient multi-property relationship exports.
 *
 * **Design Philosophy:**
 * - **GraphStore-centric**: Built around exporting from a GraphStore (multi-graph support)
 * - **Multi-property focused**: Optimized for exporting multiple properties simultaneously
 * - **Flexible translation**: Support for custom property value transformations
 * - **Performance-tuned**: Configurable batch sizes and relationship counts for optimization
 * - **Progress-aware**: Built-in progress tracking for long-running exports
 *
 * **Key Differences from RelationshipExporterBuilder:**
 * - **Data Source**: Uses GraphStore instead of single Graph (supports multiple relationship types)
 * - **Export Focus**: Optimized for multiple properties per relationship
 * - **Batch Strategy**: Different batching approach optimized for property-heavy operations
 * - **Memory Management**: Enhanced memory control for large property sets
 *
 * **Common Usage Pattern:**
 * ```typescript
 * const exporter = exporterBuilder
 *   .withGraphStore(graphStore)                    // Required: multi-graph data source
 *   .withRelationPropertyTranslator(translator)    // Optional: value transformation
 *   .withProgressTracker(tracker)                  // Optional: progress monitoring
 *   .withBatchSize(25000)                          // Optional: performance tuning
 *   .withRelationshipCount(estimatedCount)         // Optional: memory pre-allocation
 *   .withTerminationFlag(termFlag)                 // Optional: cancellation support
 *   .withResultStore(resultStore)                  // Optional: result caching
 *   .build();                                      // Create the final exporter
 * ```
 *
 * **Concrete Implementations:**
 * - `FileRelationshipPropertiesExporterBuilder` - Multi-column CSV/JSON export
 * - `MemoryRelationshipPropertiesExporterBuilder` - Structured in-memory storage
 * - `DatabaseRelationshipPropertiesExporterBuilder` - Multi-column database inserts
 * - `ArrowRelationshipPropertiesExporterBuilder` - Apache Arrow columnar format
 * - `StreamRelationshipPropertiesExporterBuilder` - Structured streaming to external systems
 */
export abstract class RelationshipPropertiesExporterBuilder {
  /**
   * Default property translator that converts values to doubles.
   *
   * This is suitable for most numeric relationship properties like weights,
   * scores, distances, or other continuous values. The default behavior
   * ensures consistent numeric representation across different storage systems.
   */
  private static readonly DEFAULT_PROPERTY_TRANSLATOR: RelationshipPropertyTranslator =
    RelationshipPropertyTranslator.IDENTITY;

  /**
   * Minimum batch size for efficient relationship properties export.
   *
   * This constant is borrowed from NodePropertyExporter and represents
   * the minimum number of relationships that should be processed in each
   * batch for optimal performance.
   */
  private static readonly MIN_BATCH_SIZE = 10_000; // NativeNodePropertyExporter.MIN_BATCH_SIZE equivalent

  /**
   * Flag for cooperative cancellation of long-running export operations.
   *
   * Multi-property relationship exports can be extremely time-consuming,
   * especially when exporting many properties for millions of relationships.
   * Cancellation support is essential for responsive user experience.
   */
  protected terminationFlag: TerminationFlag = TerminationFlag.RUNNING_TRUE;

  /**
   * The source graph store containing relationships and properties to be exported.
   *
   * GraphStore provides access to:
   * - Multiple relationship types and their properties
   * - Efficient property lookup across different relationship types
   * - Metadata about available properties and their types
   * - Optimized iteration over relationships by type
   */
  protected graphStore: GraphStore | null = null;

  /**
   * Progress tracker for monitoring export operations.
   *
   * Multi-property exports often involve substantial data processing, making
   * progress tracking crucial for user experience and operational monitoring.
   * The tracker provides feedback on both relationship processing and property
   * conversion progress.
   */
  protected progressTracker: ProgressTracker = ProgressTracker.NULL_TRACKER;

  /**
   * Function for translating property values during export.
   *
   * This translator is applied to **every property value** during export,
   * enabling flexible transformations to meet target format requirements.
   * The default converts values to doubles, suitable for most numeric properties.
   *
   * **Common Translation Patterns:**
   * ```typescript
   * // Default: convert to double (numeric properties)
   * (value) => Number(value)
   *
   * // Preserve original types (mixed property types)
   * (value) => value
   *
   * // Scale similarity scores to percentages
   * (value) => Math.round(Number(value) * 100)
   *
   * // Convert arrays to JSON strings
   * (value) => Array.isArray(value) ? JSON.stringify(value) : String(value)
   *
   * // Apply business logic transformations
   * (value) => {
   *   const num = Number(value);
   *   return num > 0.8 ? 'HIGH' : num > 0.5 ? 'MEDIUM' : 'LOW';
   * }
   * ```
   */
  protected propertyTranslator: RelationshipPropertyTranslator =
    RelationshipPropertiesExporterBuilder.DEFAULT_PROPERTY_TRANSLATOR;

  /**
   * Expected total number of relationships to be exported.
   *
   * This is used for **memory pre-allocation and progress calculation**.
   * While not always required, providing an accurate count enables:
   * - Better memory management through pre-allocation
   * - More accurate progress percentage calculations
   * - Improved performance through optimized data structures
   *
   * **Note**: Set to -1 if unknown (default behavior)
   */
  protected relationshipCount: number = -1;

  /**
   * Batch size for relationship processing.
   *
   * This controls how many relationships are processed together in each batch,
   * which is **critical for performance optimization**:
   * - **Memory control**: Prevents excessive memory usage with large property sets
   * - **I/O efficiency**: Balances write operations with memory usage
   * - **Progress granularity**: Controls how often progress is updated
   *
   * **Sizing Guidelines for Multi-Property Exports:**
   * - **Small batches (5K-10K)**: Memory-constrained environments, many properties
   * - **Medium batches (10K-50K)**: Balanced performance for most scenarios
   * - **Large batches (50K+)**: High-memory systems, fewer properties per relationship
   */
  protected batchSize: number = RelationshipPropertiesExporterBuilder.MIN_BATCH_SIZE;

  /**
   * Optional result store for caching export results in memory.
   *
   * Enables hybrid export patterns where multi-property relationship data
   * is both written to persistent storage AND kept in memory for immediate access.
   * Particularly valuable for complex analytics pipelines.
   */
  protected resultStore: Optional<ResultStore> = Optional.empty();

  /**
   * Job identifier for tracking this export operation.
   *
   * Essential for operational visibility in enterprise environments where
   * multi-property exports are often part of larger data processing pipelines.
   */
  protected jobId: JobId = JobId.EMPTY;

  /**
   * Abstract method that concrete builders must implement.
   *
   * This is where the actual exporter instance is created with all configured options.
   * Implementations should validate required configuration and optimize for the
   * specific export scenario (file format, database type, etc.).
   *
   * @returns The configured RelationshipPropertiesExporter instance
   * @throws Error if required configuration is missing or invalid
   */
  public abstract build(): RelationshipPropertiesExporter;

  /**
   * Sets the source graph store containing relationships and properties to export.
   *
   * The GraphStore is the **primary data source** for relationship properties export.
   * It provides efficient access to multiple relationship types and their associated
   * properties, which is essential for multi-property export operations.
   *
   * **GraphStore Capabilities Required:**
   * - Multiple relationship type support
   * - Efficient property lookup by relationship type and property key
   * - Metadata about available properties and their types
   * - Optimized iteration over relationships with property access
   *
   * **Performance Considerations:**
   * - GraphStore should support efficient batch property lookup
   * - Property access patterns should be optimized for the export workload
   * - Memory usage should be predictable for large relationship sets
   *
   * @param graphStore The source graph store containing relationships and properties
   * @returns This builder for method chaining
   * @throws Error if graphStore is null
   */
  public withGraphStore(graphStore: GraphStore): this {
    if (!graphStore) {
      throw new Error('GraphStore cannot be null');
    }
    this.graphStore = graphStore;
    return this;
  }

  /**
   * Sets a custom relationship property translator.
   *
   * Property translators enable **flexible value transformation** during export.
   * Since this exporter handles multiple properties simultaneously, the translator
   * is applied to all property values, making it crucial for performance.
   *
   * **Multi-Property Translation Strategies:**
   *
   * **Type-Specific Translation:**
   * ```typescript
   * .withRelationPropertyTranslator(value => {
   *   if (typeof value === 'number') return Number(value);
   *   if (Array.isArray(value)) return JSON.stringify(value);
   *   return String(value);
   * })
   * ```
   *
   * **Business Logic Translation:**
   * ```typescript
   * .withRelationPropertyTranslator(value => {
   *   // Normalize all similarity scores to 0-100 range
   *   const num = Number(value);
   *   return Math.round(Math.max(0, Math.min(1, num)) * 100);
   * })
   * ```
   *
   * **Format-Specific Translation:**
   * ```typescript
   * .withRelationPropertyTranslator(value => {
   *   // CSV-safe string conversion
   *   const str = String(value);
   *   return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
   * })
   * ```
   *
   * **Performance Considerations:**
   * - The translator is called for **every property of every relationship**
   * - Keep translation logic lightweight to avoid export bottlenecks
   * - Consider caching results for frequently repeated values
   * - Avoid expensive operations like I/O or complex computations
   *
   * @param propertyTranslator Function to translate property values during export
   * @returns This builder for method chaining
   */
  public withRelationPropertyTranslator(propertyTranslator: RelationshipPropertyTranslator): this {
    this.propertyTranslator = propertyTranslator;
    return this;
  }

  /**
   * Sets the termination flag for cooperative cancellation.
   *
   * Multi-property relationship exports are often **the most time-consuming operations**
   * in graph processing pipelines due to the volume of data involved. Cancellation
   * support is essential for maintaining system responsiveness.
   *
   * **Cancellation Scenarios:**
   * - User-initiated cancellation from UI
   * - System shutdown or maintenance
   * - Resource exhaustion or timeout conditions
   * - Pipeline failures requiring cleanup
   *
   * **Graceful Cancellation Strategy:**
   * - Check termination flag at batch boundaries
   * - Complete current batch before terminating
   * - Clean up any open resources or temporary files
   * - Leave partial results in a consistent state
   * - Update progress tracking to reflect cancellation
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
   * Progress tracking is **absolutely critical** for multi-property relationship exports
   * because they often involve processing millions of relationships with multiple
   * properties each, resulting in very long-running operations.
   *
   * **Progress Tracking Benefits:**
   * - **User confidence**: Shows that complex operations are proceeding normally
   * - **Time estimation**: Provides realistic completion time estimates
   * - **Performance monitoring**: Identifies bottlenecks in property processing
   * - **Resource planning**: Data for optimizing future export operations
   * - **Error detection**: Early warning of performance degradation
   *
   * **Multi-Property Progress Patterns:**
   * ```typescript
   * // Overall progress based on relationships processed
   * progressTracker.beginSubTask(baseTask);
   *
   * // Detailed progress including property processing
   * progressTracker.beginSubTask(propertyConversionTask);
   * progressTracker.beginSubTask(writeOperationTask);
   * ```
   *
   * **Important Implementation Notes:**
   * - If using a TaskProgressTracker, the **caller must manage beginning and finishing subtasks**
   * - The default EmptyProgressTracker requires no task management
   * - Progress updates should be batched to avoid excessive overhead
   * - Consider separate progress tracking for relationship vs. property processing
   *
   * @param progressTracker The progress tracker for monitoring export progress
   * @returns This builder for method chaining
   */
  public withProgressTracker(progressTracker: ProgressTracker): this {
    this.progressTracker = progressTracker;
    return this;
  }

  /**
   * Sets the expected number of relationships to be exported.
   *
   * This information enables **performance optimizations** and **better user experience**:
   *
   * **Memory Pre-allocation:**
   * - Data structures can be sized appropriately from the start
   * - Reduces memory fragmentation from repeated allocations
   * - Improves performance by avoiding resize operations
   *
   * **Progress Calculation:**
   * - Enables accurate progress percentage calculations
   * - Provides realistic time estimates for completion
   * - Allows for better resource planning and scheduling
   *
   * **Batch Optimization:**
   * - Can adjust batch sizes based on total volume
   * - Optimize memory usage patterns for known data sizes
   * - Better I/O scheduling for large exports
   *
   * **Usage Guidelines:**
   * ```typescript
   * // Use exact count if known
   * .withRelationshipCount(graphStore.relationshipCount('SIMILAR_TO'))
   *
   * // Use estimate if exact count is expensive to calculate
   * .withRelationshipCount(estimatedRelationshipCount)
   *
   * // Skip if unknown (default behavior)
   * // .withRelationshipCount(-1) // implicit default
   * ```
   *
   * @param relationshipCount Expected number of relationships (-1 if unknown)
   * @returns This builder for method chaining
   */
  public withRelationshipCount(relationshipCount: number): this {
    this.relationshipCount = relationshipCount;
    return this;
  }

  /**
   * Sets the batch size for relationship processing.
   *
   * Batch size is **especially critical** for multi-property exports because each
   * relationship involves processing multiple property values, multiplying the
   * memory and computational requirements.
   *
   * **Multi-Property Batch Size Considerations:**
   *
   * **Memory Usage Calculation:**
   * ```
   * Memory per batch ≈ batch_size × num_properties × avg_property_size
   * ```
   *
   * **Performance Trade-offs:**
   * - **Smaller batches**: Lower memory usage, higher overhead per relationship
   * - **Larger batches**: Higher memory usage, better amortization of fixed costs
   * - **Optimal size**: Balance between memory constraints and processing efficiency
   *
   * **Sizing Guidelines:**
   * ```typescript
   * // High property count (10+ properties per relationship)
   * .withBatchSize(5_000)
   *
   * // Medium property count (3-10 properties per relationship)
   * .withBatchSize(15_000)
   *
   * // Low property count (1-3 properties per relationship)
   * .withBatchSize(50_000)
   *
   * // High-memory systems with fast storage
   * .withBatchSize(100_000)
   * ```
   *
   * **Dynamic Batch Sizing:**
   * Some implementations may adjust batch size dynamically based on:
   * - Available memory
   * - Number of properties being exported
   * - Target storage system performance characteristics
   *
   * @param batchSize Number of relationships to process in each batch
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
   * Sets an optional result store for caching export results.
   *
   * Result stores are **particularly valuable** for multi-property relationship exports
   * because the processed data represents significant computational investment and
   * can be immediately useful for downstream analytics.
   *
   * **Multi-Property Result Store Benefits:**
   * - **Immediate analytics**: Exported properties available for immediate graph analysis
   * - **Validation workflows**: Compare exported vs. computed values for consistency
   * - **Pipeline optimization**: Skip re-computation in subsequent pipeline stages
   * - **Development support**: Quick access to results for debugging and testing
   *
   * **Memory Management for Multi-Property Results:**
   * Multi-property relationship data can be **extremely large**:
   * ```
   * Memory usage ≈ relationship_count × property_count × avg_property_size
   * ```
   *
   * **Strategies for Large Results:**
   * - Use compressed in-memory representations
   * - Implement lazy loading for property access
   * - Consider memory-mapped file backing for huge result sets
   * - Provide selective property caching (cache only frequently accessed properties)
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
   * Job IDs are **especially important** for multi-property relationship exports
   * because these operations are often:
   * - **Long-running**: Can take hours for large graphs with many properties
   * - **Resource-intensive**: High memory and I/O usage
   * - **Pipeline-critical**: Often blocking operations in data processing workflows
   *
   * **Operational Monitoring Benefits:**
   * - **Performance tracking**: Monitor export throughput and identify bottlenecks
   * - **Resource correlation**: Connect export operations with system resource usage
   * - **Error diagnosis**: Trace issues across the complex export pipeline
   * - **Capacity planning**: Historical data for optimizing future export operations
   * - **SLA monitoring**: Track export completion times against service level agreements
   *
   * @param jobId The job identifier for this export operation
   * @returns This builder for method chaining
   */
  public withJobId(jobId: JobId): this {
    this.jobId = jobId;
    return this;
  }
}
