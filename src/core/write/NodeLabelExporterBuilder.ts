import { IdMap } from '@/api/IdMap';
import { ResultStore } from '@/api/ResultStore';
import { ConcurrencyConfig } from '@/config/ConcurrencyConfig';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { JobId } from '@/core/utils/progress/JobId';
import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
import { TerminationFlag } from '@/termination/TerminationFlag';
import { NodeLabelExporter } from './NodeLabelExporter';
import { Optional } from '@/utils/Optional';

/**
 * Abstract builder for creating NodeLabelExporter instances.
 *
 * This builder follows the **Builder Pattern** to provide a fluent, type-safe way
 * to configure and create node label exporters. It handles the common configuration
 * options that all label exporters need, while allowing concrete implementations
 * to add their own specific configuration.
 *
 * **Design Philosophy:**
 * - **Fluent Interface**: Method chaining for readable configuration
 * - **Progressive Disclosure**: Required parameters enforced, optional ones available
 * - **Separation of Concerns**: Common configuration here, implementation-specific in subclasses
 * - **Fail-Fast**: Validation at build time, not runtime
 *
 * **Common Usage Pattern:**
 * ```typescript
 * const exporter = exporterBuilder
 *   .withIdMap(graphIdMap)              // Required: node ID mapping
 *   .withProgressTracker(tracker)       // Optional: progress monitoring
 *   .parallel(executor, concurrency)    // Optional: parallel configuration
 *   .withResultStore(resultStore)       // Optional: result caching
 *   .withTerminationFlag(termFlag)      // Optional: cancellation support
 *   .build();                           // Create the final exporter
 * ```
 *
 * **Concrete Implementations:**
 * - `FileNodeLabelExporterBuilder` - Exports to CSV/JSON files
 * - `MemoryNodeLabelExporterBuilder` - Stores in memory for further processing
 * - `StreamNodeLabelExporterBuilder` - Streams to external systems
 * - `DatabaseNodeLabelExporterBuilder` - Writes to databases (non-Neo4j)
 */
export abstract class NodeLabelExporterBuilder {
  /**
   * Function to convert internal node IDs back to original IDs.
   * This is crucial for maintaining consistency when writing results back.
   */
  protected toOriginalId: (nodeId: number) => number = (id) => id;

  /**
   * Total number of nodes in the graph.
   * Used for progress tracking and batch size calculations.
   */
  protected nodeCount: number = 0;

  /**
   * Flag for cooperative cancellation of long-running export operations.
   * Exporters should check this periodically and abort if termination is requested.
   */
  protected terminationFlag: TerminationFlag = TerminationFlag.RUNNING_TRUE;

  /**
   * Executor service for parallel export operations.
   * If null, export will run sequentially on the calling thread.
   */
  protected executorService: any | null = null; // ExecutorService equivalent

  /**
   * Concurrency level for write operations.
   * Controls how many parallel threads are used for export operations.
   */
  protected writeConcurrency: Concurrency = ConcurrencyConfig.TYPED_DEFAULT_CONCURRENCY;

  /**
   * Progress tracker for monitoring export operations.
   * Provides feedback to users about export progress and estimated completion time.
   */
  protected progressTracker: ProgressTracker = ProgressTracker.NULL_TRACKER;

  /**
   * Optional result store for caching export results.
   * Allows results to be stored in memory for immediate access or further processing.
   */
  protected resultStore: Optional<ResultStore> = Optional.empty();

  /**
   * Job identifier for tracking this export operation.
   * Useful for logging, monitoring, and coordinating with other system components.
   */
  protected jobId: JobId = JobId.EMPTY;

  /**
   * Abstract method that concrete builders must implement.
   * This is where the actual exporter instance is created with all configured options.
   *
   * @returns The configured NodeLabelExporter instance
   */
  public abstract build(): NodeLabelExporter;

  /**
   * Configures the builder with an IdMap for node ID translation.
   *
   * The IdMap is **essential** for proper export operations as it provides:
   * - **Node count**: Total number of nodes for progress tracking
   * - **ID mapping**: Conversion from internal to original node IDs
   * - **Validation**: Ensures node IDs are valid and within bounds
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
    this.toOriginalId = (nodeId: number) => idMap.toOriginalNodeId(nodeId);
    return this;
  }

  /**
   * Sets the termination flag for cooperative cancellation.
   *
   * Export operations can be long-running, especially for large graphs.
   * The termination flag allows callers to request cancellation, and
   * well-behaved exporters will check this flag periodically and abort
   * gracefully when termination is requested.
   *
   * @param terminationFlag The termination flag to monitor
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
   * The progress tracker provides:
   * - **Real-time feedback**: Current progress and estimated completion
   * - **Sub-task monitoring**: Detailed progress for different export phases
   * - **Error reporting**: Notification of issues during export
   *
   * **Important Notes:**
   * - If using a TaskProgressTracker, caller must manage beginning and finishing subtasks
   * - Default is EmptyProgressTracker which requires no task management
   * - Progress tracking has minimal performance overhead but provides significant UX value
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
   * Parallel export can significantly improve performance for large graphs by:
   * - **Concurrent processing**: Multiple threads processing different node batches
   * - **I/O parallelism**: Overlapping computation with I/O operations
   * - **Resource utilization**: Better use of multi-core systems
   *
   * **Performance Considerations:**
   * - Optimal concurrency depends on target system (file I/O, network, database)
   * - Too much concurrency can cause contention and reduce performance
   * - Consider memory usage when setting high concurrency levels
   *
   * @param executorService The executor service for parallel operations
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
   * Result stores enable **hybrid export patterns** where results are both
   * written to the target system AND kept in memory for immediate use:
   * - **Pipeline processing**: Results available for next algorithm in sequence
   * - **Validation**: Compare exported vs. in-memory results for consistency
   * - **Rollback**: Keep results in memory in case export needs to be undone
   * - **Performance**: Avoid re-reading exported data immediately after writing
   *
   * @param resultStore Optional result store for caching export results
   * @returns This builder for method chaining
   */
  public withResultStore(resultStore: Optional<ResultStore>): this {
    this.resultStore = resultStore;
    return this;
  }

  /**
   * Sets the job ID for tracking this export operation.
   *
   * Job IDs provide **operational visibility** and enable:
   * - **Logging correlation**: Connect log entries across system components
   * - **Monitoring integration**: Track export operations in monitoring systems
   * - **Debugging support**: Trace export issues across distributed components
   * - **Audit trails**: Record of what exports were performed when
   *
   * @param jobId The job identifier for this export operation
   * @returns This builder for method chaining
   */
  public withJobId(jobId: JobId): this {
    this.jobId = jobId;
    return this;
  }
}
