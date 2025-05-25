import { NodeLabel } from '@/api/NodeLabel';
import { RelationshipType } from '@/api/RelationshipType';
import { GraphStore } from '@/api/GraphStore';
import { GraphStoreExporter, IdMappingType } from '@/core/io/GraphStoreExporter';
import { GraphStoreInput } from '@/core/io/GraphStoreInput';
import { IdentifierMapper } from '@/core/io/IdentifierMapper';
import { NeoNodeProperties } from '@/core/io/NeoNodeProperties';
import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
import { Log } from '@/logging/Log';
import { GraphDatabaseService } from '@/graphdb/GraphDatabaseService';
import { GdsParallelBatchImporter } from './GdsParallelBatchImporter';
import { GraphStoreToDatabaseExporterParameters } from './GraphStoreToDatabaseExporterParameters';
import { ProgressTrackerExecutionMonitor } from './ProgressTrackerExecutionMonitor';

/**
 * Exporter that writes GraphStore data directly to a Neo4j database.
 * Uses the parallel batch import system to efficiently write large graphs
 * into a new or existing Neo4j database instance.
 *
 * This is the counterpart to file-based export - instead of writing to files,
 * it writes directly to a database using Neo4j's high-performance batch importer.
 */
export class GraphStoreToDatabaseExporter extends GraphStoreExporter {
  private readonly parallelBatchImporter: GdsParallelBatchImporter;

  /**
   * Factory method to create a database exporter without additional Neo4j properties.
   *
   * @param graphStore The GraphStore to export
   * @param databaseService The target Neo4j database service
   * @param parameters Export configuration parameters
   * @param log Logger for the export process
   * @param progressTracker Progress tracking for the export
   * @returns A new GraphStoreToDatabaseExporter instance
   */
  static of(
    graphStore: GraphStore,
    databaseService: GraphDatabaseService,
    parameters: GraphStoreToDatabaseExporterParameters,
    log: Log,
    progressTracker: ProgressTracker
  ): GraphStoreToDatabaseExporter {
    return GraphStoreToDatabaseExporter.of(
      graphStore,
      databaseService,
      parameters,
      undefined, // No additional Neo4j properties
      log,
      progressTracker
    );
  }

  /**
   * Factory method to create a database exporter with optional additional Neo4j properties.
   *
   * @param graphStore The GraphStore to export
   * @param databaseService The target Neo4j database service
   * @param parameters Export configuration parameters
   * @param neoNodeProperties Optional additional properties from Neo4j database
   * @param log Logger for the export process
   * @param progressTracker Progress tracking for the export
   * @returns A new GraphStoreToDatabaseExporter instance
   */
  static of(
    graphStore: GraphStore,
    databaseService: GraphDatabaseService,
    parameters: GraphStoreToDatabaseExporterParameters,
    neoNodeProperties: NeoNodeProperties | undefined,
    log: Log,
    progressTracker: ProgressTracker
  ): GraphStoreToDatabaseExporter {
    // Configure the parallel batch importer
    const pbiConfig = GdsParallelBatchImporter.Config.builder()
      .databaseName(parameters.databaseName())
      .batchSize(parameters.batchSize())
      .enableDebugLog(parameters.enableDebugLog())
      .defaultRelationshipType(parameters.defaultRelationshipType())
      .writeConcurrency(parameters.writeConcurrency().value())
      .databaseFormat(parameters.databaseFormat())
      .force(false)           // Don't force overwrite
      .highIO(false)          // Standard I/O performance
      .useBadCollector(false) // Don't collect bad records
      .build();

    // Create execution monitor for progress tracking
    const executionMonitor = new ProgressTrackerExecutionMonitor(graphStore, progressTracker);

    // Create the parallel batch importer from database service
    const parallelBatchImporter = GdsParallelBatchImporter.fromDb(
      databaseService,
      pbiConfig,
      log,
      executionMonitor
    );

    return new GraphStoreToDatabaseExporter(
      graphStore,
      parallelBatchImporter,
      parameters,
      neoNodeProperties
    );
  }

  private constructor(
    graphStore: GraphStore,
    parallelBatchImporter: GdsParallelBatchImporter,
    parameters: GraphStoreToDatabaseExporterParameters,
    neoNodeProperties: NeoNodeProperties | undefined
  ) {
    super(
      graphStore,
      neoNodeProperties,
      IdentifierMapper.biject(
        (nodeLabel: NodeLabel) => nodeLabel.name,
        (name: string) => NodeLabel.of(name)
      ),
      IdentifierMapper.biject(
        (relationshipType: RelationshipType) => relationshipType.name,
        (name: string) => RelationshipType.of(name)
      ),
      parameters.defaultRelationshipType(),
      parameters.writeConcurrency(),
      parameters.batchSize()
    );
    this.parallelBatchImporter = parallelBatchImporter;
  }

  /**
   * Exports the GraphStore to the database.
   * Uses the parallel batch importer to write all data efficiently.
   *
   * @param graphStoreInput The prepared GraphStore input data
   */
  export(graphStoreInput: GraphStoreInput): void {
    this.parallelBatchImporter.writeDatabase(graphStoreInput.toInput(), false);
  }

  /**
   * Returns the ID mapping strategy for database export.
   * Always uses MAPPED strategy for database exports to handle ID translation properly.
   *
   * @returns IdMappingType.MAPPED
   */
  protected idMappingType(): IdMappingType {
    return IdMappingType.MAPPED;
  }
}
