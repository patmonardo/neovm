//import { Validator } from '@/common/Validator';
import { RelationshipType } from '@/projection';
import { GraphStore } from '@/api';
import { IdMap } from '@/api';
import { Topology } from '@/api';
import { RelationshipPropertyStore } from '@/api/properties/relationships';
import { MutableNodeSchema } from '@/api/schema';
import { Concurrency } from '@/concurrency';
import { DefaultPool } from '@/concurrency';
import { ParallelUtil } from '@/concurrency/';
import { GraphStoreGraphPropertyVisitor } from '@/core/io/GraphStoreGraphPropertyVisitor';
import { GraphStoreRelationshipVisitor } from '@/core/io/GraphStoreRelationshipVisitor';

import { WriteMode } from '@/core/loading/Capabilities';
import { ImmutableStaticCapabilities } from '@/core/loading';
import { GraphStoreBuilder } from '@/core/loading';
import { Nodes } from '@/core/loading';
import { RelationshipImportResult } from '@/core/loading';
import { GraphFactory } from '@/core/loading';
import { RelationshipsBuilder } from '@/core/loading';

import { ProgressTracker } from '@/core/utils/progress';
import { Log } from '@/utils';
import { Tasks } from '@/core/utils/progress';
import { Task } from '@/core/utils/progress';
import { TaskProgressTracker } from '@/core/utils/progress';
import { TaskRegistryFactory } from '@/core/utils/progress';
import { GraphStoreNodeVisitor } from './GraphStoreNodeVisitor';
import { ElementImportRunner } from './ElementImportRunner';
import { FileInput } from './FileInput';
import { GraphPropertyStoreFromVisitorHelper } from './GraphPropertyStoreFromVisitorHelper';
import * as fs from 'fs';

/**
 * Result record containing user name and the imported graph store.
 */
export interface UserGraphStore {
  userName: string;
  graphStore: GraphStore;
}

/**
 * Result record containing relationship topology and properties after import.
 */
export interface RelationshipTopologyAndProperties {
  topologies: Map<RelationshipType, Topology>;
  properties: Map<RelationshipType, RelationshipPropertyStore>;
  importedRelationships: number;
}

/**
 * Abstract base class for importing graph stores from file-based storage.
 * Orchestrates the complete import process including nodes, relationships,
 * and graph properties with proper progress tracking and parallel processing.
 */
export abstract class FileToGraphStoreImporter {
  private readonly nodeVisitorBuilder: GraphStoreNodeVisitor.Builder;
  private readonly relationshipVisitorBuilder: GraphStoreRelationshipVisitor.Builder;
  private readonly graphPropertyVisitorBuilder: GraphStoreGraphPropertyVisitor.Builder;
  private readonly importPath: string;
  private readonly concurrency: Concurrency;

  private readonly graphSchemaBuilder: ImmutableMutableGraphSchema.Builder;
  private readonly graphStoreBuilder: GraphStoreBuilder;
  private readonly log: Log;
  private readonly taskRegistryFactory: TaskRegistryFactory;

  private progressTracker!: ProgressTracker;

  protected constructor(
    concurrency: Concurrency,
    importPath: string,
    log: Log,
    taskRegistryFactory: TaskRegistryFactory
  ) {
    this.nodeVisitorBuilder = new GraphStoreNodeVisitor.Builder();
    this.relationshipVisitorBuilder = new GraphStoreRelationshipVisitor.Builder();
    this.graphPropertyVisitorBuilder = new GraphStoreGraphPropertyVisitor.Builder();
    this.concurrency = concurrency;
    this.importPath = importPath;
    this.graphSchemaBuilder = ImmutableMutableGraphSchema.builder();
    this.graphStoreBuilder = new GraphStoreBuilder()
      .concurrency(concurrency)
      .capabilities(ImmutableStaticCapabilities.of(WriteMode.LOCAL));
    this.log = log;
    this.taskRegistryFactory = taskRegistryFactory;
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
   * @returns UserGraphStore containing the user name and imported graph store
   * @throws Error if import fails
   */
  public run(): UserGraphStore {
    const fileInput = this.fileInput(this.importPath);
    this.progressTracker = this.createProgressTracker(fileInput);

    try {
      this.progressTracker.beginSubTask();
      this.importGraphStore(fileInput);
      this.graphStoreBuilder.schema(this.graphSchemaBuilder.build());
      const userGraphStore: UserGraphStore = {
        userName: fileInput.userName(),
        graphStore: this.graphStoreBuilder.build()
      };
      this.progressTracker.endSubTask();

      return userGraphStore;
    } catch (error) {
      this.progressTracker.endSubTaskWithFailure();
      throw error;
    }
  }

  /**
   * Creates a RelationshipImportResult from relationship builders by type.
   *
   * @param relationshipBuildersByType Map of type names to relationship builders
   * @returns RelationshipImportResult with built relationships
   */
  public static relationshipImportResult(
    relationshipBuildersByType: Map<string, RelationshipsBuilder>
  ): RelationshipImportResult {
    const relationshipsByType = new Map<RelationshipType, any>();

    for (const [typeName, builder] of relationshipBuildersByType) {
      relationshipsByType.set(RelationshipType.of(typeName), builder.build());
    }

    return RelationshipImportResult.builder().importResults(relationshipsByType).build();
  }

  /**
   * Imports the complete graph store from file input.
   */
  private importGraphStore(fileInput: FileInput): void {
    this.graphStoreBuilder.databaseInfo(fileInput.graphInfo().databaseInfo);
    this.graphStoreBuilder.capabilities(fileInput.capabilities());

    const nodes = this.importNodes(fileInput);
    this.importRelationships(fileInput, nodes.idMap());
    this.importGraphProperties(fileInput);
  }

  /**
   * Creates a progress tracker for the import operation.
   */
  private createProgressTracker(fileInput: FileInput): ProgressTracker {
    const graphInfo = fileInput.graphInfo();
    const nodeCount = graphInfo.nodeCount;

    const importTasks: Task[] = [];
    importTasks.push(Tasks.leaf("Import nodes", nodeCount));

    const relationshipTaskVolume = graphInfo.relationshipTypeCounts.size === 0
      ? Task.UNKNOWN_VOLUME
      : Array.from(graphInfo.relationshipTypeCounts.values())
          .reduce((sum, count) => sum + count, 0);
    importTasks.push(Tasks.leaf("Import relationships", relationshipTaskVolume));

    if (fileInput.graphPropertySchema().size > 0) {
      importTasks.push(Tasks.leaf("Import graph properties"));
    }

    const task = Tasks.task(
      `${this.rootTaskName()} import`,
      importTasks
    );

    return new TaskProgressTracker(task, this.log, this.concurrency, this.taskRegistryFactory);
  }

  /**
   * Imports nodes from file input.
   */
  private importNodes(fileInput: FileInput): Nodes {
    this.progressTracker.beginSubTask();
    const nodeSchema: MutableNodeSchema = fileInput.nodeSchema();
    this.graphSchemaBuilder.nodeSchema(nodeSchema);

    for (const entry of nodeSchema.entries()) {
      this.log.info(`Imported node label schema: ${entry.identifier()}`);
    }

    const labelMapping = fileInput.labelMapping();
    if (labelMapping) {
      for (const [key, value] of labelMapping) {
        this.log.info(`Label mapping: ${key} -> ${value}`);
      }
    } else {
      this.log.info("Label mapping file was not found, continuing import without label mapping");
    }

    const nodesBuilder = GraphFactory.initNodesBuilder(nodeSchema)
      .maxOriginalId(fileInput.graphInfo().maxOriginalId)
      .concurrency(this.concurrency)
      .nodeCount(fileInput.graphInfo().nodeCount)
      .deduplicateIds(false)
      .idMapBuilderType(fileInput.graphInfo().idMapBuilderType)
      .build();

    this.nodeVisitorBuilder.withNodeSchema(nodeSchema);
    this.nodeVisitorBuilder.withNodesBuilder(nodesBuilder);

    const nodesIterator = fileInput.nodes().iterator();
    const tasks: Runnable[] = ParallelUtil.tasks(
      this.concurrency,
      (index: number) => new ElementImportRunner(
        this.nodeVisitorBuilder.build(),
        nodesIterator,
        this.progressTracker
      )
    );

    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    const nodes = nodesBuilder.build();
    this.graphStoreBuilder.nodes(nodes);
    this.progressTracker.endSubTask();

    return nodes;
  }

  /**
   * Imports relationships from file input.
   */
  private importRelationships(fileInput: FileInput, nodes: IdMap): void {
    this.progressTracker.beginSubTask();
    const relationshipBuildersByType = new Map<string, RelationshipsBuilder>();
    const relationshipSchema = fileInput.relationshipSchema();
    this.graphSchemaBuilder.relationshipSchema(relationshipSchema);

    this.relationshipVisitorBuilder
      .withRelationshipSchema(relationshipSchema)
      .withNodes(nodes)
      .withConcurrency(this.concurrency)
      .withAllocationTracker()
      .withRelationshipBuildersToTypeResultMap(relationshipBuildersByType)
      .withInverseIndexedRelationshipTypes(fileInput.graphInfo().inverseIndexedRelationshipTypes);

    const relationshipsIterator = fileInput.relationships().iterator();
    const tasks: Runnable[] = ParallelUtil.tasks(
      this.concurrency,
      (index: number) => new ElementImportRunner(
        this.relationshipVisitorBuilder.build(),
        relationshipsIterator,
        this.progressTracker
      )
    );

    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    const relationshipImportResult = FileToGraphStoreImporter.relationshipImportResult(relationshipBuildersByType);
    this.graphStoreBuilder.relationshipImportResult(relationshipImportResult);
    this.progressTracker.endSubTask();
  }

  /**
   * Imports graph properties from file input.
   */
  private importGraphProperties(fileInput: FileInput): void {
    if (fileInput.graphPropertySchema().size > 0) {
      this.progressTracker.beginSubTask();

      const graphPropertySchema = fileInput.graphPropertySchema();
      this.graphSchemaBuilder.graphProperties(graphPropertySchema);
      this.graphPropertyVisitorBuilder.withGraphPropertySchema(graphPropertySchema);

      const graphStoreGraphPropertyVisitor = this.graphPropertyVisitorBuilder.build();

      const graphPropertiesIterator = fileInput.graphProperties().iterator();

      const tasks = ParallelUtil.tasks(
        this.concurrency,
        (index: number) => new ElementImportRunner(
          graphStoreGraphPropertyVisitor,
          graphPropertiesIterator,
          this.progressTracker
        )
      );
      ParallelUtil.run(tasks, DefaultPool.INSTANCE);
      graphStoreGraphPropertyVisitor.close?.();

      this.graphStoreBuilder.graphProperties(
        GraphPropertyStoreFromVisitorHelper.fromGraphPropertyVisitor(
          graphPropertySchema,
          graphStoreGraphPropertyVisitor
        )
      );

      this.progressTracker.endSubTask();
    }
  }

  /**
   * Validator to ensure directory exists and is readable.
   */
  public static readonly DIRECTORY_IS_READABLE: Validator<string> = (value: string) => {
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
