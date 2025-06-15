import { Orientation } from "@/projection";
import { MemoryEstimation } from "@/mem";
import { GraphProjectFromStoreConfig } from "@/config";
import { CSRGraphStoreFactory } from "@/api";
import { GraphLoaderContext } from "@/core";
import { IdMap } from "@/api";
import { GraphDimensions } from "@/core/loading";
import { CSRGraphStore } from "@/core/loading";
import { WriteMode } from "@/core/loading";
import { Nodes } from "@/core/loading";
import { RelationshipImportResult } from "@/core/loading";
import { ProgressTracker } from "@/core/utils/progress";
import { TaskProgressTracker, TaskTreeProgressTracker } from "@/core/utils/progress";
import { Tasks } from "@/core/utils/progress";
import { Concurrency } from "@/concurrency";
import { ScanningNodesImporter } from "./ScanningNodesImporter";
import { ScanningRelationshipsImporter } from "./ScanningRelationshipsImporter";
import { GraphDimensionsReader } from "./GraphDimensionsReader";
import { GraphDimensionsValidation } from "./GraphDimensionsValidation";

/**
 * NATIVE FACTORY - Direct database to CSRGraphStore construction
 *
 * This is the REAL graph projection - taking raw database data and
 * constructing efficient CSRGraphStore instances for analytics.
 *
 * ARCHITECTURE:
 * - Factory pattern for CSRGraphStore construction
 * - Progress tracking for long-running operations
 * - Memory estimation for resource planning
 * - Concurrent loading for performance
 * - Dimension validation for safety
 */
export class NativeFactory extends CSRGraphStoreFactory<GraphProjectFromStoreConfig> {

  private readonly _storeConfig: GraphProjectFromStoreConfig;
  private readonly _progressTracker: ProgressTracker;

  /**
   * Factory method - Builder pattern entry point
   */
  static create(
    graphProjectFromStoreConfig: GraphProjectFromStoreConfig,
    loadingContext: GraphLoaderContext,
    graphDimensions?: GraphDimensions
  ): NativeFactory {

    const dimensions = graphDimensions || GraphDimensionsReader.builder()
      .graphLoaderContext(loadingContext)
      .graphProjectConfig(graphProjectFromStoreConfig)
      .build()
      .call();

    return new NativeFactory(
      graphProjectFromStoreConfig,
      loadingContext,
      dimensions
    );
  }

  private constructor(
    graphProjectConfig: GraphProjectFromStoreConfig,
    loadingContext: GraphLoaderContext,
    graphDimensions: GraphDimensions
  ) {
    super(
      graphProjectConfig,
      Capabilities.of(WriteMode.LOCAL),
      loadingContext,
      graphDimensions
    );

    this._storeConfig = graphProjectConfig;
    this._progressTracker = this.initProgressTracker();
  }

  // ====================================================================
  // MEMORY ESTIMATION - Resource planning before construction
  // ====================================================================

  /**
   * Estimates memory usage during the loading process
   */
  estimateMemoryUsageDuringLoading(): MemoryEstimation {
    return this.getMemoryEstimation(
      this._storeConfig.nodeProjections(),
      this._storeConfig.relationshipProjections(),
      true  // includeTemporaryMemory
    );
  }

  /**
   * Estimates memory usage after loading is complete
   */
  estimateMemoryUsageAfterLoading(): MemoryEstimation {
    return this.getMemoryEstimation(
      this._storeConfig.nodeProjections(),
      this._storeConfig.relationshipProjections(),
      false // excludeTemporaryMemory
    );
  }

  // ====================================================================
  // PROGRESS TRACKING - Long-running operation monitoring
  // ====================================================================

  private initProgressTracker(): ProgressTracker {
    // Calculate total relationship count with orientation multiplier
    const relationshipCount = Array.from(
      this._storeConfig.relationshipProjections().projections().entries()
    ).reduce((total, [relType, projection]) => {
      let relCount = relType.name === "*"
        ? Array.from(this.dimensions.relationshipCounts().values()).reduce((sum, count) => sum + count, 0)
        : this.dimensions.relationshipCounts().get(relType) || 0;

      // UNDIRECTED relationships are stored in both directions
      if (projection.orientation() === Orientation.UNDIRECTED) {
        relCount *= 2;
      }

      return total + relCount;
    }, 0);

    // Build task hierarchy for progress tracking
    const task = Tasks.task(
      "Loading",
      Tasks.task("Nodes", Tasks.leaf("Store Scan", this.dimensions.nodeCount())),
      Tasks.task("Relationships", Tasks.leaf("Store Scan", relationshipCount))
    );

    // Choose progress tracker based on logging configuration
    if (this._storeConfig.logProgress()) {
      return new TaskProgressTracker(
        task,
        this.loadingContext.log(),
        this._storeConfig.readConcurrency(),
        this._storeConfig.jobId(),
        this.loadingContext.taskRegistryFactory()
      );
    }

    return new TaskTreeProgressTracker(
      task,
      this.loadingContext.log(),
      this._storeConfig.readConcurrency(),
      this._storeConfig.jobId(),
      this.loadingContext.taskRegistryFactory()
    );
  }

  // ====================================================================
  // MAIN CONSTRUCTION METHOD - The heart of graph projection
  // ====================================================================

  /**
   * Builds the CSRGraphStore from raw database data
   *
   * PROCESS:
   * 1. Validate dimensions and configuration
   * 2. Load nodes (scanning + importing)
   * 3. Load relationships (scanning + importing)
   * 4. Construct CSRGraphStore (CSR format assembly)
   * 5. Log summary statistics
   */
  build(): CSRGraphStore {
    GraphDimensionsValidation.validate(this.dimensions, this._storeConfig);

    const concurrency = this._storeConfig.readConcurrency();

    try {
      this._progressTracker.beginSubTask();

      // Phase 1: Load and process nodes
      const nodes = this.loadNodes(concurrency);

      // Phase 2: Load and process relationships
      const relationships = this.loadRelationships(nodes.idMap(), concurrency);

      // Phase 3: Construct the final CSRGraphStore
      const graphStore = this.createGraphStore(nodes, relationships);

      // Phase 4: Log construction summary
      this.logLoadingSummary(graphStore);

      return graphStore;

    } finally {
      this._progressTracker.endSubTask();
    }
  }

  // ====================================================================
  // LOADING PHASES - Specialized importers for each data type
  // ====================================================================

  /**
   * Phase 1: Node loading and processing
   */
  private loadNodes(concurrency: Concurrency): Nodes {
    const scanningNodesImporter = ScanningNodesImporter.builder()
      .concurrency(concurrency)
      .graphProjectConfig(this._storeConfig)
      .dimensions(this.dimensions)
      .loadingContext(this.loadingContext)
      .progressTracker(this._progressTracker)
      .build();

    try {
      this._progressTracker.beginSubTask();
      return scanningNodesImporter.call();
    } finally {
      this._progressTracker.endSubTask();
    }
  }

  /**
   * Phase 2: Relationship loading and processing
   */
  private loadRelationships(idMap: IdMap, concurrency: Concurrency): RelationshipImportResult {
    const scanningRelationshipsImporter = ScanningRelationshipsImporter.builder()
      .idMap(idMap)
      .graphProjectConfig(this._storeConfig)
      .loadingContext(this.loadingContext)
      .dimensions(this.dimensions)
      .progressTracker(this._progressTracker)
      .concurrency(concurrency)
      .build();

    try {
      this._progressTracker.beginSubTask();
      return scanningRelationshipsImporter.call();
    } finally {
      this._progressTracker.endSubTask();
    }
  }

  /**
   * Provides progress tracker to parent factory
   */
  protected progressTracker(): ProgressTracker {
    return this._progressTracker;
  }
}
