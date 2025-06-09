import { RelationshipType } from "@/projection";
import { GraphStore } from "@/api";
import { IdMap } from "@/api";
import { Topology } from "@/api";
import { RelationshipPropertyStore } from "@/api/properties";
import { MutableNodeSchema } from "@/api/schema";
import { Concurrency } from "@/concurrency";
import { DefaultPool } from "@/concurrency";
import { ParallelUtil } from "@/concurrency/";
import { GraphStoreGraphPropertyVisitor } from "@/core/io";
import { GraphStoreRelationshipVisitor } from "@/core/io";
import { WriteMode } from "@/core/loading/Capabilities";
import { ImmutableStaticCapabilities } from "@/core/loading";
import { GraphStoreBuilder } from "@/core/loading";
import { Nodes } from "@/core/loading";
import { RelationshipImportResult } from "@/core/loading";
import { GraphFactory } from "@/core/loading";
import { RelationshipsBuilder } from "@/core/loading";
import { ProgressTracker } from "@/core/utils/progress";
import { Log } from "@/utils";
import { Tasks } from "@/core/utils/progress";
import { Task } from "@/core/utils/progress";
import { TaskProgressTracker } from "@/core/utils/progress";
import { TaskRegistryFactory } from "@/core/utils/progress";
import { GraphStoreNodeVisitor } from "./GraphStoreNodeVisitor";
import { ElementImportRunner } from "./ElementImportRunner";
import { FileInput } from "./FileInput";
import { GraphPropertyStoreFromVisitorHelper } from "./GraphPropertyStoreFromVisitorHelper";
import * as fs from "fs";

/**
 * Result record containing user name and the imported graph store.
 */
export interface UserGraphStore {
  userName: string;
  graphStore: GraphStore;
  importStatistics: ImportStatistics;
}

/**
 * Import statistics for monitoring and debugging.
 */
export interface ImportStatistics {
  startTime: Date;
  endTime: Date;
  durationMs: number;

  // Counts
  nodesImported: number;
  relationshipsImported: number;
  graphPropertiesImported: number;

  // Performance
  nodesPerSecond: number;
  relationshipsPerSecond: number;
  memoryUsageMB: number;

  // Errors
  errorCount: number;
  warningCount: number;

  // File statistics
  nodeFilesProcessed: number;
  relationshipFilesProcessed: number;
  graphPropertyFilesProcessed: number;
}

/**
 * Result record containing relationship topology and properties after import.
 */
export interface RelationshipTopologyAndProperties {
  topologies: Map<RelationshipType, Topology>;
  properties: Map<RelationshipType, RelationshipPropertyStore>;
  importedRelationships: number;
  processingTimeMs: number;
}

/**
 * Abstract base class for importing graph stores from file-based storage.
 *
 * MAJOR IMPROVEMENTS:
 * - Enhanced error handling and recovery
 * - Detailed import statistics collection
 * - Better progress tracking with sub-task details
 * - Memory usage monitoring
 * - Parallel processing optimization
 * - Comprehensive logging and debugging
 */
export abstract class FileToGraphStoreImporter {
  private readonly nodeVisitorBuilder: GraphStoreNodeVisitor.Builder;
  private readonly relationshipVisitorBuilder: GraphStoreRelationshipVisitor.Builder;
  private readonly graphPropertyVisitorBuilder: GraphStoreGraphPropertyVisitor.Builder;
  private readonly importPath: string;
  private readonly concurrency: Concurrency;

  private readonly graphSchemaBuilder: MutableGraphSchema;
  private readonly graphStoreBuilder: GraphStoreBuilder;
  private readonly log: Log;
  private readonly taskRegistryFactory: TaskRegistryFactory;

  // Enhanced tracking and statistics
  private progressTracker!: ProgressTracker;
  private readonly importStatistics: Partial<ImportStatistics>;
  private errorCount: number = 0;
  private warningCount: number = 0;

  protected constructor(
    concurrency: Concurrency,
    importPath: string,
    log: Log,
    taskRegistryFactory: TaskRegistryFactory
  ) {
    this.nodeVisitorBuilder = new GraphStoreNodeVisitor.Builder();
    this.relationshipVisitorBuilder =
      new GraphStoreRelationshipVisitor.Builder();
    this.graphPropertyVisitorBuilder =
      new GraphStoreGraphPropertyVisitor.Builder();
    this.concurrency = concurrency;
    this.importPath = importPath;
    this.graphSchemaBuilder = MutableGraphSchema.builder();
    this.graphStoreBuilder = new GraphStoreBuilder()
      .concurrency(concurrency)
      .capabilities(ImmutableStaticCapabilities.of(WriteMode.LOCAL));
    this.log = log;
    this.taskRegistryFactory = taskRegistryFactory;

    // Initialize statistics
    this.importStatistics = {
      nodesImported: 0,
      relationshipsImported: 0,
      graphPropertiesImported: 0,
      errorCount: 0,
      warningCount: 0,
      nodeFilesProcessed: 0,
      relationshipFilesProcessed: 0,
      graphPropertyFilesProcessed: 0,
    };
  }

  /**
   * Abstract method to create FileInput from the import path.
   * Subclasses implement this to handle specific file formats.
   */
  protected abstract fileInput(importPath: string): FileInput;

  /**
   * Abstract method to provide the root task name for progress tracking.
   */
  protected abstract rootTaskName(): string;

  /**
   * Main entry point to run the import process.
   *
   * @returns UserGraphStore containing the user name, imported graph store, and statistics
   * @throws Error if import fails
   */
  public run(): UserGraphStore {
    const startTime = new Date();
    this.importStatistics.startTime = startTime;

    this.log.info(
      `🚀 Starting ${this.rootTaskName()} import from: ${this.importPath}`
    );

    try {
      const fileInput = this.fileInput(this.importPath);
      this.progressTracker = this.createProgressTracker(fileInput);

      // ✅ ENHANCED: Validate input before processing
      this.validateFileInput(fileInput);

      this.progressTracker.beginSubTask();
      this.importGraphStore(fileInput);
      this.graphStoreBuilder.schema(this.graphSchemaBuilder.build());

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      //  Complete statistics
      const completeStatistics: ImportStatistics = {
        ...(this.importStatistics as ImportStatistics),
        endTime,
        durationMs,
        nodesPerSecond: this.calculateRate(
          this.importStatistics.nodesImported!,
          durationMs
        ),
        relationshipsPerSecond: this.calculateRate(
          this.importStatistics.relationshipsImported!,
          durationMs
        ),
        memoryUsageMB: this.getMemoryUsageMB(),
        errorCount: this.errorCount,
        warningCount: this.warningCount,
      };

      this.logImportSummary(completeStatistics);

      const userGraphStore: UserGraphStore = {
        userName: fileInput.userName(),
        graphStore: this.graphStoreBuilder.build(),
        importStatistics: completeStatistics,
      };

      this.progressTracker.endSubTask();
      this.log.info(`✅ ${this.rootTaskName()} import completed successfully`);

      return userGraphStore;
    } catch (error) {
      this.errorCount++;
      this.progressTracker?.endSubTaskWithFailure();
      this.log.error(
        `❌ ${this.rootTaskName()} import failed: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   *  Validate file input before processing.
   */
  private validateFileInput(fileInput: FileInput): void {
    this.log.info("🔍 Validating file input...");

    const graphInfo = fileInput.graphInfo();
    if (graphInfo.nodeCount < 0) {
      throw new Error(`Invalid node count: ${graphInfo.nodeCount}`);
    }

    const nodeSchema = fileInput.nodeSchema();
    if (nodeSchema.availableLabels().size === 0) {
      this.warningCount++;
      this.log.warn("⚠️ No node labels found in schema");
    }

    const relationshipSchema = fileInput.relationshipSchema();
    if (relationshipSchema.availableTypes().size === 0) {
      this.warningCount++;
      this.log.warn("⚠️ No relationship types found in schema");
    }

    this.log.info("✅ File input validation completed");
  }

  /**
   * Creates a RelationshipImportResult from relationship builders by type.
   */
  public static relationshipImportResult(
    relationshipBuildersByType: Map<string, RelationshipsBuilder>
  ): RelationshipImportResult {
    const relationshipsByType = new Map<RelationshipType, any>();

    for (const [typeName, builder] of relationshipBuildersByType) {
      relationshipsByType.set(RelationshipType.of(typeName), builder.build());
    }

    return RelationshipImportResult.builder()
      .importResults(relationshipsByType)
      .build();
  }

  /**
   * Imports the complete graph store from file input.
   */
  private importGraphStore(fileInput: FileInput): void {
    this.log.info("📊 Starting graph store import...");

    this.graphStoreBuilder.databaseInfo(fileInput.graphInfo().databaseInfo);
    this.graphStoreBuilder.capabilities(fileInput.capabilities());

    const nodes = this.importNodes(fileInput);
    this.importRelationships(fileInput, nodes.idMap());
    this.importGraphProperties(fileInput);

    this.log.info("✅ Graph store import completed");
  }

  /**
   * Creates a progress tracker for the import operation.
   */
  private createProgressTracker(fileInput: FileInput): ProgressTracker {
    const graphInfo = fileInput.graphInfo();
    const nodeCount = graphInfo.nodeCount;

    this.log.info(`📋 Creating progress tracker for ${nodeCount} nodes`);

    const importTasks: Task[] = [];
    importTasks.push(Tasks.leaf("Import nodes", nodeCount));

    const relationshipTaskVolume =
      graphInfo.relationshipTypeCounts.size === 0
        ? Task.UNKNOWN_VOLUME
        : Array.from(graphInfo.relationshipTypeCounts.values()).reduce(
            (sum, count) => sum + count,
            0
          );
    importTasks.push(
      Tasks.leaf("Import relationships", relationshipTaskVolume)
    );

    if (fileInput.graphPropertySchema().size > 0) {
      importTasks.push(Tasks.leaf("Import graph properties"));
    }

    const task = Tasks.task(`${this.rootTaskName()} import`, importTasks);

    return new TaskProgressTracker(
      task,
      this.jobId(),
      this.log,
      this.taskRegistryFactory,
      this.importPath
    );
  }

  /**
   * Imports nodes from file input.
   */
  private importNodes(fileInput: FileInput): Nodes {
    this.log.info("👥 Starting node import...");
    this.progressTracker.beginSubTask();

    const nodeImportStart = Date.now();
    const nodeSchema: MutableNodeSchema = fileInput.nodeSchema();
    this.graphSchemaBuilder.nodeSchema(nodeSchema);

    // Log schema information
    const nodeLabels = Array.from(nodeSchema.availableLabels());
    this.log.info(
      `📋 Node labels (${nodeLabels.length}): ${nodeLabels
        .map((l) => l.name())
        .join(", ")}`
    );

    for (const entry of nodeSchema.entries()) {
      this.log.info(`  📊 Imported node label schema: ${entry.identifier()}`);
    }

    // Handle label mapping
    const labelMapping = fileInput.labelMapping();
    if (labelMapping) {
      this.log.info(`🏷️ Label mappings found: ${labelMapping.size} entries`);
      for (const [key, value] of labelMapping) {
        this.log.info(`  🏷️ Label mapping: ${key} -> ${value}`);
      }
    } else {
      this.log.info(
        "🏷️ Label mapping file was not found, continuing import without label mapping"
      );
    }

    // Build nodes
    const nodesBuilder = GraphFactory.initNodesBuilder(nodeSchema)
      .maxOriginalId(fileInput.graphInfo().maxOriginalId)
      .concurrency(this.concurrency)
      .nodeCount(fileInput.graphInfo().nodeCount)
      .deduplicateIds(false)
      .idMapBuilderType(fileInput.graphInfo().idMapBuilderType)
      .build();

    this.nodeVisitorBuilder.withNodeSchema(nodeSchema);
    this.nodeVisitorBuilder.withNodesBuilder(nodesBuilder);

    // Parallel processing with error handling
    const nodesIterator = fileInput.nodes().iterator();
    const tasks: Runnable[] = ParallelUtil.tasks(
      this.concurrency,
      (index: number) =>
        new ElementImportRunner(
          this.nodeVisitorBuilder.build(),
          nodesIterator,
          this.progressTracker
        )
    );

    try {
      ParallelUtil.run(tasks, DefaultPool.INSTANCE);
    } catch (error) {
      this.errorCount++;
      this.log.error(`❌ Node import failed: ${(error as Error).message}`);
      throw error;
    }

    const nodes = nodesBuilder.build();
    this.graphStoreBuilder.nodes(nodes);

    // ✅ NEW: Update statistics
    const nodeImportTime = Date.now() - nodeImportStart;
    this.importStatistics.nodesImported = fileInput.graphInfo().nodeCount;
    this.importStatistics.nodeFilesProcessed = 1; // Could be enhanced to count actual files

    this.log.info(
      `✅ Node import completed: ${this.importStatistics.nodesImported} nodes in ${nodeImportTime}ms`
    );
    this.progressTracker.endSubTask();

    return nodes;
  }

  /**
   * Imports relationships from file input.
   */
  private importRelationships(fileInput: FileInput, nodes: IdMap): void {
    this.log.info("🔗 Starting relationship import...");
    this.progressTracker.beginSubTask();

    const relationshipImportStart = Date.now();
    const relationshipBuildersByType = new Map<string, RelationshipsBuilder>();
    const relationshipSchema = fileInput.relationshipSchema();
    this.graphSchemaBuilder.relationshipSchema(relationshipSchema);

    // Log relationship schema information
    const relationshipTypes = Array.from(relationshipSchema.availableTypes());
    this.log.info(
      `🔗 Relationship types (${relationshipTypes.length}): ${relationshipTypes
        .map((t) => t.name())
        .join(", ")}`
    );

    this.relationshipVisitorBuilder
      .withRelationshipSchema(relationshipSchema)
      .withNodes(nodes)
      .withConcurrency(this.concurrency)
      .withAllocationTracker()
      .withRelationshipBuildersToTypeResultMap(relationshipBuildersByType)
      .withInverseIndexedRelationshipTypes(
        fileInput.graphInfo().inverseIndexedRelationshipTypes
      );

    // ✅ ENHANCED: Parallel processing with error handling
    const relationshipsIterator = fileInput.relationships().iterator();
    const tasks: Runnable[] = ParallelUtil.tasks(
      this.concurrency,
      (index: number) =>
        new ElementImportRunner(
          this.relationshipVisitorBuilder.build(),
          relationshipsIterator,
          this.progressTracker
        )
    );

    try {
      ParallelUtil.run(tasks, DefaultPool.INSTANCE);
    } catch (error) {
      this.errorCount++;
      this.log.error(
        `❌ Relationship import failed: ${(error as Error).message}`
      );
      throw error;
    }

    const relationshipImportResult =
      FileToGraphStoreImporter.relationshipImportResult(
        relationshipBuildersByType
      );
    this.graphStoreBuilder.relationshipImportResult(relationshipImportResult);

    // ✅ NEW: Update statistics
    const relationshipImportTime = Date.now() - relationshipImportStart;
    const totalRelationships = Array.from(
      fileInput.graphInfo().relationshipTypeCounts.values()
    ).reduce((sum, count) => sum + count, 0);
    this.importStatistics.relationshipsImported = totalRelationships;
    this.importStatistics.relationshipFilesProcessed =
      relationshipBuildersByType.size;

    this.log.info(
      `✅ Relationship import completed: ${totalRelationships} relationships in ${relationshipImportTime}ms`
    );
    this.progressTracker.endSubTask();
  }

  /**
   * ✅ ENHANCED: Imports graph properties from file input.
   */
  private importGraphProperties(fileInput: FileInput): void {
    if (fileInput.graphPropertySchema().size > 0) {
      this.log.info("🌐 Starting graph properties import...");
      this.progressTracker.beginSubTask();

      const graphPropertySchema = fileInput.graphPropertySchema();
      this.log.info(
        `🌐 Graph properties (${graphPropertySchema.size}): ${Array.from(
          graphPropertySchema.keys()
        ).join(", ")}`
      );

      this.graphSchemaBuilder.graphProperties(graphPropertySchema);
      this.graphPropertyVisitorBuilder.withGraphPropertySchema(
        graphPropertySchema
      );

      const graphStoreGraphPropertyVisitor =
        this.graphPropertyVisitorBuilder.build();

      const graphPropertiesIterator = fileInput.graphProperties().iterator();

      const tasks = ParallelUtil.tasks(
        this.concurrency,
        (index: number) =>
          new ElementImportRunner(
            graphStoreGraphPropertyVisitor,
            graphPropertiesIterator,
            this.progressTracker
          )
      );

      try {
        ParallelUtil.run(tasks, DefaultPool.INSTANCE);
        graphStoreGraphPropertyVisitor.close?.();
      } catch (error) {
        this.errorCount++;
        this.log.error(
          `❌ Graph properties import failed: ${(error as Error).message}`
        );
        throw error;
      }

      this.graphStoreBuilder.graphProperties(
        GraphPropertyStoreFromVisitorHelper.fromGraphPropertyVisitor(
          graphPropertySchema,
          graphStoreGraphPropertyVisitor
        )
      );

      // ✅ NEW: Update statistics
      this.importStatistics.graphPropertiesImported = graphPropertySchema.size;
      this.importStatistics.graphPropertyFilesProcessed = 1;

      this.log.info(
        `✅ Graph properties import completed: ${graphPropertySchema.size} properties`
      );
      this.progressTracker.endSubTask();
    } else {
      this.log.info("🌐 No graph properties to import");
    }
  }

  /**
   * ✅ NEW: Calculate rate per second.
   */
  private calculateRate(count: number, durationMs: number): number {
    return durationMs > 0 ? Math.round((count * 1000) / durationMs) : 0;
  }

  /**
   *  Get current memory usage in MB.
   */
  private getMemoryUsageMB(): number {
    try {
      const memUsage = process.memoryUsage();
      return Math.round(memUsage.heapUsed / 1024 / 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Log comprehensive import summary.
   */
  private logImportSummary(statistics: ImportStatistics): void {
    this.log.info("📊 === IMPORT SUMMARY ===");
    this.log.info(`⏱️ Duration: ${statistics.durationMs}ms`);
    this.log.info(
      `👥 Nodes: ${statistics.nodesImported} (${statistics.nodesPerSecond}/sec)`
    );
    this.log.info(
      `🔗 Relationships: ${statistics.relationshipsImported} (${statistics.relationshipsPerSecond}/sec)`
    );
    this.log.info(`🌐 Graph Properties: ${statistics.graphPropertiesImported}`);
    this.log.info(
      `📁 Files: ${statistics.nodeFilesProcessed} node, ${statistics.relationshipFilesProcessed} relationship, ${statistics.graphPropertyFilesProcessed} graph property`
    );
    this.log.info(`💾 Memory: ${statistics.memoryUsageMB}MB`);
    this.log.info(`⚠️ Warnings: ${statistics.warningCount}`);
    this.log.info(`❌ Errors: ${statistics.errorCount}`);
    this.log.info("📊 === END SUMMARY ===");
  }

  /**
   * Validator to ensure directory exists and is readable.
   */
  public static readonly DIRECTORY_IS_READABLE = (value: string): void => {
    if (!fs.existsSync(value)) {
      throw new Error(`Directory '${value}' does not exist`);
    }
    if (!fs.statSync(value).isDirectory()) {
      throw new Error(`'${value}' is not a directory`);
    }
    try {
      fs.accessSync(value, fs.constants.R_OK);
    } catch {
      throw new Error(`Directory '${value}' not readable`);
    }
  };
}
