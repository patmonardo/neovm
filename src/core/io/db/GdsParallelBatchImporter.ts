import { BatchImporter } from '@/batchimport/api/BatchImporter';
import { IndexConfig } from '@/batchimport/api/IndexConfig';
import { Monitor } from '@/batchimport/api/Monitor';
import { Collector } from '@/batchimport/api/input/Collector';
import { Input } from '@/batchimport/api/input/Input';
import { GraphDatabaseSettings } from '@/configuration/GraphDatabaseSettings';
import { DatabaseManagementService } from '@/dbms/api/DatabaseManagementService';
import { RelationshipType } from '@/api/RelationshipType';
import { GraphDatabaseApiProxy } from '@/compat/GraphDatabaseApiProxy';
import { ProgressTimer } from '@/core/utils/ProgressTimer';
import { Log } from '@/logging/Log';
import { Neo4jSettings } from '@/settings/Neo4jSettings';
import { GraphDatabaseService } from '@/graphdb/GraphDatabaseService';
import { DefaultAdditionalIds } from '@/internal/batchimport/DefaultAdditionalIds';
import { Collectors } from '@/internal/batchimport/input/Collectors';
import { FileSystemAbstraction } from '@/io/fs/FileSystemAbstraction';
import { DatabaseLayout } from '@/io/layout/DatabaseLayout';
import { Neo4jLayout } from '@/io/layout/Neo4jLayout';
import { CursorContextFactory } from '@/io/pagecache/context/CursorContextFactory';
import { PageCacheTracer } from '@/io/pagecache/tracing/PageCacheTracer';
import { IndexImporterFactoryImpl } from '@/kernel/impl/index/schema/IndexImporterFactoryImpl';
import { JobSchedulerFactory } from '@/kernel/impl/scheduler/JobSchedulerFactory';
import { TransactionLogInitializer } from '@/kernel/impl/transaction/log/files/TransactionLogInitializer';
import { LifeSupport } from '@/kernel/lifecycle/LifeSupport';
import { LogService } from '@/logging/internal/LogService';
import { NullLogService } from '@/logging/internal/NullLogService';
import { EmptyMemoryTracker } from '@/memory/EmptyMemoryTracker';
import { JobScheduler } from '@/scheduler/JobScheduler';
import { StorageEngineFactory } from '@/storageengine/api/StorageEngineFactory';
import { formatWithLocale } from '@/utils/StringFormatting';
import { LoggingOutputStream } from './LoggingOutputStream';
import { DIRECTORY_IS_WRITABLE } from '@/core/io/GraphStoreExporter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration interface for the parallel batch importer.
 * Defines all the parameters needed to configure the batch import process.
 */
export interface GdsParallelBatchImporterConfig {
  databaseName(): string;
  writeConcurrency(): number;
  batchSize(): number;
  defaultRelationshipType(): RelationshipType;
  enableDebugLog(): boolean;
  databaseFormat(): string;
  useBadCollector(): boolean;
  highIO(): boolean;
  force(): boolean;
}

/**
 * Implementation of the batch importer configuration.
 */
export class GdsParallelBatchImporterConfigImpl implements GdsParallelBatchImporterConfig {
  constructor(
    private readonly _databaseName: string,
    private readonly _writeConcurrency: number,
    private readonly _batchSize: number,
    private readonly _defaultRelationshipType: RelationshipType,
    private readonly _enableDebugLog: boolean,
    private readonly _databaseFormat: string,
    private readonly _useBadCollector: boolean,
    private readonly _highIO: boolean,
    private readonly _force: boolean
  ) {}

  databaseName(): string { return this._databaseName; }
  writeConcurrency(): number { return this._writeConcurrency; }
  batchSize(): number { return this._batchSize; }
  defaultRelationshipType(): RelationshipType { return this._defaultRelationshipType; }
  enableDebugLog(): boolean { return this._enableDebugLog; }
  databaseFormat(): string { return this._databaseFormat; }
  useBadCollector(): boolean { return this._useBadCollector; }
  highIO(): boolean { return this._highIO; }
  force(): boolean { return this._force; }

  /**
   * Converts this config to Neo4j's batch importer configuration format.
   */
  static toBatchImporterConfig(config: GdsParallelBatchImporterConfig): any {
    return {
      batchSize(): number {
        return config.batchSize();
      },

      maxNumberOfWorkerThreads(): number {
        return config.writeConcurrency();
      },

      highIO(): boolean {
        return config.highIO();
      },

      indexConfig(): any {
        return IndexConfig.DEFAULT.withLabelIndex().withRelationshipTypeIndex();
      }
    };
  }
}

/**
 * Builder for creating GdsParallelBatchImporterConfig instances.
 */
export class GdsParallelBatchImporterConfigBuilder {
  private _databaseName?: string;
  private _writeConcurrency: number = 4;
  private _batchSize: number = 10000;
  private _defaultRelationshipType: RelationshipType = RelationshipType.of("__ALL__");
  private _enableDebugLog: boolean = false;
  private _databaseFormat: string = "standard";
  private _useBadCollector: boolean = false;
  private _highIO: boolean = false;
  private _force: boolean = false;

  databaseName(databaseName: string): this {
    this._databaseName = databaseName;
    return this;
  }

  writeConcurrency(writeConcurrency: number): this {
    this._writeConcurrency = writeConcurrency;
    return this;
  }

  batchSize(batchSize: number): this {
    this._batchSize = batchSize;
    return this;
  }

  defaultRelationshipType(defaultRelationshipType: RelationshipType): this {
    this._defaultRelationshipType = defaultRelationshipType;
    return this;
  }

  enableDebugLog(enableDebugLog: boolean): this {
    this._enableDebugLog = enableDebugLog;
    return this;
  }

  databaseFormat(databaseFormat: string): this {
    this._databaseFormat = databaseFormat;
    return this;
  }

  useBadCollector(useBadCollector: boolean): this {
    this._useBadCollector = useBadCollector;
    return this;
  }

  highIO(highIO: boolean): this {
    this._highIO = highIO;
    return this;
  }

  force(force: boolean): this {
    this._force = force;
    return this;
  }

  build(): GdsParallelBatchImporterConfig {
    if (!this._databaseName) {
      throw new Error('databaseName is required');
    }

    return new GdsParallelBatchImporterConfigImpl(
      this._databaseName,
      this._writeConcurrency,
      this._batchSize,
      this._defaultRelationshipType,
      this._enableDebugLog,
      this._databaseFormat,
      this._useBadCollector,
      this._highIO,
      this._force
    );
  }
}

/**
 * High-performance parallel batch importer for GraphStore data.
 * Uses Neo4j's internal batch import API to efficiently write large graphs
 * directly to Neo4j database files.
 *
 * This is the core engine for database export operations.
 */
export class GdsParallelBatchImporter {
  private readonly config: GdsParallelBatchImporterConfig;
  private readonly log: Log;
  private readonly executionMonitor: Monitor;
  private readonly fileSystem: FileSystemAbstraction;
  private readonly logService: LogService;
  private readonly databaseConfig: any;
  private readonly dbms: DatabaseManagementService;

  /**
   * Creates a batch importer from a database service.
   */
  static fromDb(
    databaseService: GraphDatabaseService,
    config: GdsParallelBatchImporterConfig,
    log: Log,
    executionMonitor: Monitor
  ): GdsParallelBatchImporter {
    const dbms = GraphDatabaseApiProxy.resolveDependency(databaseService, DatabaseManagementService);
    return GdsParallelBatchImporter.fromDbms(dbms, config, log, executionMonitor);
  }

  /**
   * Creates a batch importer from a database management service.
   */
  static fromDbms(
    dbms: DatabaseManagementService,
    config: GdsParallelBatchImporterConfig,
    log: Log,
    executionMonitor: Monitor
  ): GdsParallelBatchImporter {
    const databaseService = dbms.database(GraphDatabaseSettings.SYSTEM_DATABASE_NAME);
    const fs = GraphDatabaseApiProxy.resolveDependency(databaseService, FileSystemAbstraction);
    const logService = GraphDatabaseApiProxy.resolveDependency(databaseService, LogService);
    const databaseConfig = GraphDatabaseApiProxy.resolveDependency(databaseService, 'Config');

    return new GdsParallelBatchImporter(
      config,
      log,
      executionMonitor,
      dbms,
      fs,
      logService,
      databaseConfig
    );
  }

  private constructor(
    config: GdsParallelBatchImporterConfig,
    log: Log,
    executionMonitor: Monitor,
    dbms: DatabaseManagementService,
    fileSystem: FileSystemAbstraction,
    logService: LogService,
    databaseConfig: any
  ) {
    this.config = config;
    this.log = log;
    this.executionMonitor = executionMonitor;
    this.dbms = dbms;
    this.fileSystem = fileSystem;
    this.logService = logService;

    // Build enhanced database configuration
    const configBuilder = {
      ...databaseConfig,
      neo4jHome: databaseConfig.get(Neo4jSettings.neo4jHome()),
      dataDirectory: databaseConfig.get(GraphDatabaseSettings.data_directory),
      dbFormat: config.databaseFormat().toLowerCase()
    };

    this.databaseConfig = configBuilder;
  }

  /**
   * Config namespace for builder access.
   */
  static Config = {
    builder(): GdsParallelBatchImporterConfigBuilder {
      return new GdsParallelBatchImporterConfigBuilder();
    },

    toBatchImporterConfig: GdsParallelBatchImporterConfigImpl.toBatchImporterConfig
  };

  /**
   * Writes the input data to a new Neo4j database.
   *
   * @param input The batch import input data
   * @param startDatabase Whether to start the database after import
   */
  writeDatabase(input: Input, startDatabase: boolean): void {
    this.log.info("Database import started");

    const importTimer = ProgressTimer.start();

    const databaseName = this.config.databaseName();
    const neo4jLayout = Neo4jLayout.of(this.databaseConfig);

    // Validate all available storage engines
    StorageEngineFactory.allAvailableStorageEngines().forEach(engine => {
      const databaseLayout = engine.databaseLayout(neo4jLayout, databaseName);
      this.validateWritableDirectories(databaseLayout);
      this.validateDatabaseDoesNotExist(databaseLayout);
    });

    const storageEngineFactory = StorageEngineFactory.selectStorageEngine(this.databaseConfig);
    const databaseLayout = storageEngineFactory.databaseLayout(neo4jLayout, databaseName);

    const lifeSupport = new LifeSupport();

    try {
      if (this.config.force()) {
        this.fileSystem.deleteRecursively(databaseLayout.databaseDirectory());
        this.fileSystem.deleteRecursively(databaseLayout.getTransactionLogsDirectory());
      }

      const logService = this.getLogService();
      const collector = this.getCollector();
      const jobScheduler = lifeSupport.add(JobSchedulerFactory.createScheduler());

      lifeSupport.start();

      const batchImporter = this.instantiateBatchImporter(
        databaseLayout,
        logService,
        collector,
        jobScheduler
      );

      batchImporter.doImport(input);
      this.log.info(formatWithLocale("Database import finished after %s ms", importTimer.stop().getDuration()));

      if (startDatabase) {
        const dbStartTimer = ProgressTimer.start();
        if (this.createAndStartDatabase()) {
          this.log.info(
            formatWithLocale(
              "Database created and started after %s ms",
              dbStartTimer.stop().getDuration()
            )
          );
        } else {
          this.log.error("Unable to start database " + this.config.databaseName());
        }
      }
    } catch (error) {
      throw error;
    } finally {
      lifeSupport.shutdown();
    }
  }

  /**
   * Validates that database directories are writable.
   */
  private validateWritableDirectories(databaseLayout: DatabaseLayout): void {
    DIRECTORY_IS_WRITABLE.validate(databaseLayout.databaseDirectory());
    DIRECTORY_IS_WRITABLE.validate(databaseLayout.getTransactionLogsDirectory());
  }

  /**
   * Validates that the database doesn't already exist (unless force is enabled).
   */
  private validateDatabaseDoesNotExist(databaseLayout: DatabaseLayout): void {
    const metaDataPath = databaseLayout.metadataStore();
    const dbExists = fs.existsSync(metaDataPath) && fs.constants.R_OK;

    if (dbExists && !this.config.force()) {
      throw new Error(
        formatWithLocale(
          "The database [%s] already exists. The graph export procedure can only create new databases.",
          this.config.databaseName()
        )
      );
    }
  }

  /**
   * Gets the appropriate log service based on debug configuration.
   */
  private getLogService(): LogService {
    return this.config.enableDebugLog()
      ? this.logService
      : NullLogService.getInstance();
  }

  /**
   * Gets the appropriate collector for bad records.
   */
  private getCollector(): Collector {
    return this.config.useBadCollector()
      ? Collectors.badCollector(new LoggingOutputStream(this.log), 0)
      : Collector.EMPTY;
  }

  /**
   * Creates and configures the batch importer instance.
   */
  private instantiateBatchImporter(
    databaseLayout: DatabaseLayout,
    logService: LogService,
    collector: Collector,
    jobScheduler: JobScheduler
  ): BatchImporter {
    const importConfig = GdsParallelBatchImporter.Config.toBatchImporterConfig(this.config);
    const storageEngineFactory = StorageEngineFactory.selectStorageEngine(this.databaseConfig);
    const progressOutput = process.stdout; // Equivalent to System.out
    const verboseProgressOutput = false;

    return storageEngineFactory.batchImporter(
      databaseLayout,
      this.fileSystem,
      PageCacheTracer.NULL,
      importConfig,
      logService,
      progressOutput,
      verboseProgressOutput,
      DefaultAdditionalIds.EMPTY,
      this.databaseConfig,
      this.executionMonitor,
      jobScheduler,
      collector,
      TransactionLogInitializer.getLogFilesInitializer(),
      new IndexImporterFactoryImpl(),
      EmptyMemoryTracker.INSTANCE,
      CursorContextFactory.NULL_CONTEXT_FACTORY
    );
  }

  /**
   * Creates and starts the database after import.
   */
  private createAndStartDatabase(): boolean {
    const databaseName = this.config.databaseName();
    this.dbms.createDatabase(databaseName);
    this.dbms.startDatabase(databaseName);

    const databaseService = this.dbms.database(databaseName);

    const numRetries = 10;
    for (let i = 0; i < numRetries; i++) {
      if (databaseService.isAvailable(1000)) {
        return true;
      }
      this.log.info(formatWithLocale("Database not available, retry %d of %d", i, numRetries));
    }
    return false;
  }
}
