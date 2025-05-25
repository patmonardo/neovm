import { NodeLabel } from '@/projection';
import { IdMap } from '@/api';
import { ResultStore } from '@/api';
import { ConcurrencyConfig } from '@/config/ConcurrencyConfig';
import { Concurrency } from '@/concurrency/Concurrency';
import { JobId } from '@/core/utils/progress/JobId';
import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
import { TerminationFlag } from '@/termination/TerminationFlag';
import { Optional } from '@/utils/Optional';
import { NodePropertyExporter } from './NodePropertyExporter';

/**
 * Abstract builder for creating NodePropertyExporter instances.
 *
 * This builder follows the **Builder Pattern** to provide a fluent, type-safe way
 * to configure and create node property exporters. It handles all the common configuration
 * options that property exporters need, while allowing concrete implementations
 * to add their own storage-specific configuration.
 *
 * **Design Philosophy:**
 * - **Fluent Interface**: Method chaining for readable, self-documenting configuration
 * - **Progressive Disclosure**: Required parameters enforced, optional ones available
 * - **Separation of Concerns**: Common configuration here, implementation-specific in subclasses
 * - **Fail-Fast Validation**: Input validation at build time, not runtime
 * - **Immutable Configuration**: Once built, the exporter configuration cannot be changed
 *
 * **Common Usage Pattern:**
 * ```typescript
 * const exporter = exporterBuilder
 *   .withIdMap(graphIdMap)              // Required: node ID mapping and labels
 *   .withProgressTracker(tracker)       // Optional: progress monitoring
 *   .parallel(executor, concurrency)    // Optional: parallel write configuration
 *   .withResultStore(resultStore)       // Optional: result caching
 *   .withTerminationFlag(termFlag)      // Optional: cancellation support
 *   .withJobId(jobId)                   // Optional: operation tracking
 *   .build();                           // Create the final exporter
 * ```
 *
 * **Concrete Implementations:**
 * - `FileNodePropertyExporterBuilder` - Exports to CSV/JSON/Parquet files
 * - `MemoryNodePropertyExporterBuilder` - Stores in memory for further processing
 * - `StreamNodePropertyExporterBuilder` - Streams to external systems via APIs
 * - `DatabaseNodePropertyExporterBuilder` - Writes to databases (PostgreSQL, MongoDB, etc.)
 * - `CloudNodePropertyExporterBuilder` - Exports to cloud storage (S3, Azure, GCS)
 */
export abstract class NodePropertyExporterBuilder {
  /**
   * Total number of nodes in the graph.
   * Used for progress tracking, batch size calculations, and memory estimation.
   */
  protected nodeCount: number = 0;

  /**
   * Set of node labels present in the graph.
   * Used for label-specific export logic and validation.
   * Some exporters may want to export properties only for specific node types.
   */
  protected nodeLabels: Set<NodeLabel> = new Set();

  /**
   * Function to convert internal node IDs back to original IDs.
   * This is **crucial for maintaining consistency** when writing results back,
   * as algorithms work with internal sequential IDs but exports need original IDs.
   */
  protected toOriginalId: (nodeId: number) => number = (id) => id;

  /**
   * Flag for cooperative cancellation of long-running export operations.
   * Well-behaved exporters should check this periodically and abort gracefully
   * when termination is requested. Essential for responsive user experience.
   */
  protected terminationFlag: TerminationFlag = TerminationFlag.RUNNING_TRUE;

  /**
   * Executor service for parallel export operations.
   * If null, export will run sequentially on the calling thread.
   * Parallel export can significantly improve performance for large graphs.
   */
  protected executorService: any | null = null; // ExecutorService equivalent

  /**
   * Concurrency level for write operations.
   * Controls how many parallel threads are used for export operations.
   * Must be balanced with target system capabilities and memory constraints.
   */
  protected writeConcurrency: Concurrency = ConcurrencyConfig.TYPED_DEFAULT_CONCURRENCY;

  /**
   * Progress tracker for monitoring export operations.
   * Provides real-time feedback to users about export progress and estimated completion.
   * Essential for long-running exports on large graphs.
   */
  protected progressTracker: ProgressTracker = ProgressTracker.NULL_TRACKER;

  /**
   * Optional result store for caching export results in memory.
   * Enables hybrid patterns where results are both written to storage AND
   * kept in memory for immediate access or further processing.
   */
  protected resultStore: Optional<ResultStore> = Optional.empty();

  /**
   * Job identifier for tracking this export operation.
   * Used for logging, monitoring, debugging, and coordinating with other system components.
   */
  protected jobId: JobId = JobId.EMPTY;

  /**
   * Abstract method that concrete builders must implement.
   * This is where the actual exporter instance is created with all configured options.
   *
   * **Implementation Responsibilities:**
   * - Validate that all required configuration is present
   * - Create the appropriate exporter type with the configured options
   * - Set up any necessary resources (files, connections, etc.)
   * - Return a fully configured, ready-to-use exporter
   *
   * @returns The configured NodePropertyExporter instance
   * @throws Error if required configuration is missing or invalid
   */
  public abstract build(): NodePropertyExporter;

  /**
   * Configures the builder with an IdMap for node ID translation and metadata.
   *
   * The IdMap is **absolutely essential** for proper export operations as it provides:
   * - **Node count**: Total number of nodes for progress tracking and memory estimation
   * - **Node labels**: Available node types for label-specific export logic
   * - **ID mapping**: Critical conversion from internal to original node IDs
   * - **Validation**: Ensures node IDs are valid and within bounds
   *
   * **Why ID Mapping Matters:**
   * Algorithms work with sequential internal IDs (0, 1, 2, ...) for performance,
   * but exported data must use the original node IDs to maintain consistency
   * with the source graph and enable proper importing/joining later.
   *
   * @param idMap The ID mapping for the graph being exported
   * @returns This builder for method chaining
   * @throws Error if idMap is null or undefined
   */
  public withIdMap(idMap: IdMap): this {
    if (!idMap) {
      throw new Error('IdMap cannot be null or undefined');
    }
    this.nodeCount = idMap.nodeCount();
    this.nodeLabels = idMap.availableNodeLabels();
    this.toOriginalId = (nodeId: number) => idMap.toOriginalNodeId(nodeId);
    return this;
  }

  /**
   * Sets the termination flag for cooperative cancellation.
   *
   * Export operations can be **very long-running**, especially for large graphs with
   * millions of nodes and multiple properties. The termination flag provides a way
   * for users to cancel operations gracefully without corrupting data or leaving
   * resources in an inconsistent state.
   *
   * **Cancellation Strategy:**
   * - Exporters should check the flag periodically (e.g., every batch)
   * - When termination is requested, clean up resources and exit gracefully
   * - Partial results should be left in a consistent state when possible
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
   * Progress tracking is **crucial for user experience** during long-running exports.
   * Without progress feedback, users don't know if the operation is proceeding normally
   * or has stalled, leading to unnecessary cancellations and support issues.
   *
   * **Progress Tracking Benefits:**
   * - **Real-time feedback**: Current progress percentage and estimated completion time
   * - **Sub-task monitoring**: Detailed progress for different export phases
   * - **Error reporting**: Immediate notification of issues during export
   * - **Performance monitoring**: Track throughput and identify bottlenecks
   * - **User confidence**: Users can see that the system is working
   *
   * **Important Implementation Notes:**
   * - If using a TaskProgressTracker, the **caller must manage beginning and finishing subtasks**
   * - The default EmptyProgressTracker requires no task management
   * - Progress tracking has minimal performance overhead but provides significant UX value
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
   * Configures parallel execution for the export operation.
   *
   * Parallel export can provide **significant performance improvements** for large graphs:
   * - **Concurrent processing**: Multiple threads processing different property batches
   * - **I/O parallelism**: Overlapping computation with I/O operations
   * - **Resource utilization**: Better use of multi-core systems and I/O bandwidth
   * - **Scalability**: Near-linear speedup for I/O-bound operations
   *
   * **Performance Considerations:**
   * - **Optimal concurrency** depends heavily on the target system characteristics
   * - **File I/O**: Limited by disk bandwidth and seek times
   * - **Network I/O**: Limited by bandwidth and connection pooling
   * - **Database writes**: Limited by transaction throughput and locking
   * - **Memory usage**: Each thread may buffer data, increasing memory requirements
   *
   * **Concurrency Guidelines:**
   * - Start with 2-4 threads and measure performance
   * - Too much concurrency can cause contention and reduce performance
   * - Consider the target system's capabilities and limitations
   * - Monitor memory usage and adjust batch sizes accordingly
   *
   * @param executorService The executor service for managing parallel operations
   * @param writeConcurrency The level of write concurrency to use
   * @returns This builder for method chaining
   */
  public parallel(executorService: any, writeConcurrency: Concurrency): this {
    this.executorService = executorService;
    this.writeConcurrency = writeConcurrency;
    return this;
  }

  /**
   * Sets an optional result store for caching export results.
   *
   * Result stores enable **hybrid export patterns** that provide the best of both worlds:
   * durability through persistent storage AND immediate access through memory caching.
   *
   * **Hybrid Export Benefits:**
   * - **Pipeline processing**: Results immediately available for next algorithm in sequence
   * - **Validation workflows**: Compare exported vs. in-memory results for consistency
   * - **Rollback scenarios**: Keep results in memory in case export needs to be undone
   * - **Performance optimization**: Avoid re-reading exported data immediately after writing
   * - **Development/testing**: Quick access to results for debugging and validation
   *
   * **Memory Management:**
   * - Result stores can consume significant memory for large graphs
   * - Consider memory limits when deciding whether to use result stores
   * - Some implementations may use memory-mapped files or compression
   * - Monitor memory usage and adjust based on available resources
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
   * Job IDs provide **operational visibility** and enable sophisticated monitoring:
   * - **Logging correlation**: Connect log entries across distributed system components
   * - **Monitoring integration**: Track export operations in monitoring and alerting systems
   * - **Debugging support**: Trace export issues across multiple services and threads
   * - **Audit trails**: Compliance and governance records of what exports were performed when
   * - **Performance analysis**: Correlate export performance with system metrics
   *
   * **Production Benefits:**
   * - Easier troubleshooting when exports fail or perform poorly
   * - Better visibility into system resource usage patterns
   * - Improved capacity planning based on historical export data
   * - Enhanced security monitoring and compliance reporting
   *
   * @param jobId The job identifier for this export operation
   * @returns This builder for method chaining
   */
  public withJobId(jobId: JobId): this {
    this.jobId = jobId;
    return this;
  }
}
