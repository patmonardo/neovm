import { NodeLabel } from "../../core/NodeLabel";
import { IdMap } from "../../api/IdMap";
import { ResultStore } from "../../api/ResultStore";
import { ConcurrencyConfig } from "../../config/ConcurrencyConfig";
import { Concurrency } from "../concurrency/Concurrency";
import { JobId } from "../utils/progress/JobId";
import { ProgressTracker } from "../utils/progress/tasks/ProgressTracker";
import { TerminationFlag } from "../termination/TerminationFlag";
import { NodePropertyExporter } from "./NodePropertyExporter";

/**
 * Abstract builder for creating NodePropertyExporter instances.
 * Concrete implementations must provide the build method.
 */
export abstract class NodePropertyExporterBuilder {
  /**
   * The number of nodes in the graph.
   */
  protected nodeCount: number;

  /**
   * Set of node labels in the graph.
   */
  protected nodeLabels: Set<NodeLabel>;

  /**
   * Function to convert internal node IDs to original (Neo4j) IDs.
   */
  protected toOriginalId: (id: number) => number;

  /**
   * Flag for checking if the operation should be terminated.
   */
  protected terminationFlag: TerminationFlag;

  /**
   * Executor service for parallel operations.
   */
  protected executorService: any; // Replace with proper ExecutorService type when available

  /**
   * Concurrency level for write operations.
   */
  protected writeConcurrency: Concurrency = ConcurrencyConfig.TYPED_DEFAULT_CONCURRENCY;

  /**
   * Tracker for reporting progress.
   */
  protected progressTracker: ProgressTracker = ProgressTracker.NULL_TRACKER;

  /**
   * Optional store for algorithm results.
   */
  protected resultStore: ResultStore | null = null;

  /**
   * ID of the current job.
   */
  protected jobId: JobId;

  /**
   * Builds a NodePropertyExporter instance.
   * Must be implemented by concrete subclasses.
   * 
   * @returns A new NodePropertyExporter instance
   */
  public abstract build(): NodePropertyExporter;

  /**
   * Sets the ID map for node information.
   * 
   * @param idMap The ID map containing node information
   * @returns This builder for method chaining
   */
  public withIdMap(idMap: IdMap): this {
    if (!idMap) {
      throw new Error("IdMap cannot be null");
    }
    
    this.nodeCount = idMap.nodeCount();
    this.nodeLabels = idMap.availableNodeLabels();
    this.toOriginalId = (id: number) => idMap.toOriginalNodeId(id);
    
    return this;
  }

  /**
   * Sets the termination flag.
   * 
   * @param terminationFlag Flag for checking if operation should be terminated
   * @returns This builder for method chaining
   */
  public withTerminationFlag(terminationFlag: TerminationFlag): this {
    this.terminationFlag = terminationFlag;
    return this;
  }

  /**
   * Sets the progress tracker for operation progress reporting.
   * 
   * If a TaskProgressTracker is used, caller must manage beginning and finishing the subtasks.
   * By default, an EmptyProgressTracker is used which doesn't require task management.
   * 
   * @param progressTracker The progress tracker to use
   * @returns This builder for method chaining
   */
  public withProgressTracker(progressTracker: ProgressTracker): this {
    this.progressTracker = progressTracker;
    return this;
  }

  /**
   * Configures the builder for parallel execution.
   * 
   * @param es The executor service to use
   * @param writeConcurrency The concurrency level for write operations
   * @returns This builder for method chaining
   */
  public parallel(es: any, writeConcurrency: Concurrency): this {
    this.executorService = es;
    this.writeConcurrency = writeConcurrency;
    return this;
  }

  /**
   * Sets the result store.
   * 
   * @param resultStore The optional result store
   * @returns This builder for method chaining
   */
  public withResultStore(resultStore: ResultStore | null): this {
    this.resultStore = resultStore;
    return this;
  }

  /**
   * Sets the job ID.
   * 
   * @param jobId The job ID
   * @returns This builder for method chaining
   */
  public withJobId(jobId: JobId): this {
    this.jobId = jobId;
    return this;
  }
}