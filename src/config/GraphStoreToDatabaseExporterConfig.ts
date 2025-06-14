import { DatabaseNameValidator } from "@/configuration/helpers/DatabaseNameValidator";
import { SettingProxy } from "@/compat/SettingProxy";
import { JobIdConfig } from "@/config/JobIdConfig";
import { CypherMapWrapper } from "@/core/CypherMapWrapper";
import { GraphStoreExporterBaseConfig } from "@/core/io/GraphStoreExporterBaseConfig";
import { NormalizedDatabaseName } from "@/kernel/database/NormalizedDatabaseName";

/**
 * Configuration interface for GraphStore to database export operations.
 * Extends the base exporter config with database-specific settings like
 * database name and format.
 */
export interface GraphStoreToDatabaseExporterConfig
  extends GraphStoreExporterBaseConfig,
    JobIdConfig {
  /**
   * Gets the target database name for export.
   */
  databaseName(): string;

  /**
   * Gets the database format to use for export.
   * Defaults to the system's default database format.
   */
  databaseFormat(): string;

  /**
   * @deprecated Will be removed in version 2.2
   * Gets whether debug logging is enabled.
   */
  enableDebugLog(): boolean;

  /**
   * Validates the configuration settings.
   * Ensures the database name is valid according to Neo4j naming rules.
   */
  validate(): void;
}

/**
 * Configuration constants for database export.
 */
export namespace GraphStoreToDatabaseExporterConfig {
  export const DB_NAME_KEY = "dbName";
  export const DB_FORMAT_KEY = "dbFormat";

  /**
   * Factory method to create a configuration from a Cypher map.
   * Validates and normalizes the database name according to Neo4j standards.
   *
   * @param config The configuration map from Cypher
   * @returns A validated configuration instance
   */
  export function of(
    config: CypherMapWrapper
  ): GraphStoreToDatabaseExporterConfig {
    const normalizedConfig = config
      .getString(DB_NAME_KEY)
      .map((dbName) => {
        const normalizedName = new NormalizedDatabaseName(dbName);
        DatabaseNameValidator.validateExternalDatabaseName(normalizedName);
        const databaseName = normalizedName.name();
        return config.withString(DB_NAME_KEY, databaseName);
      })
      .orElse(config);

    return new GraphStoreToDatabaseExporterConfigImpl(normalizedConfig);
  }
}

/**
 * Implementation of the database exporter configuration.
 */
export class GraphStoreToDatabaseExporterConfigImpl
  implements GraphStoreToDatabaseExporterConfig
{
  private readonly config: CypherMapWrapper;

  constructor(config: CypherMapWrapper) {
    this.config = config;
  }

  /**
   * Gets the target database name.
   */
  databaseName(): string {
    return this.config.requireString(
      GraphStoreToDatabaseExporterConfig.DB_NAME_KEY
    );
  }

  /**
   * Gets the database format, defaulting to system default.
   */
  databaseFormat(): string {
    return this.config
      .getString(GraphStoreToDatabaseExporterConfig.DB_FORMAT_KEY)
      .orElse(SettingProxy.defaultDatabaseFormatSetting());
  }

  /**
   * @deprecated Will be removed in version 2.2
   */
  enableDebugLog(): boolean {
    return false;
  }

  /**
   * Validates the database name according to Neo4j naming conventions.
   */
  validate(): void {
    const normalizedName = new NormalizedDatabaseName(this.databaseName());
    DatabaseNameValidator.validateExternalDatabaseName(normalizedName);
  }

  // Inherited from GraphStoreExporterBaseConfig
  defaultRelationshipType(): RelationshipType {
    return this.config
      .getRelationshipType(
        GraphStoreExporterBaseConfig.DEFAULT_RELATIONSHIP_TYPE_KEY
      )
      .orElse(RelationshipType.of("__ALL__"));
  }

  batchSize(): number {
    return this.config
      .getNumber(GraphStoreExporterBaseConfig.BATCH_SIZE_KEY)
      .orElse(GraphStoreExporterBaseConfig.DEFAULT_BATCH_SIZE);
  }

  writeConcurrency(): Concurrency {
    return this.config
      .getConcurrency(GraphStoreExporterBaseConfig.WRITE_CONCURRENCY_KEY)
      .orElse(Concurrency.DEFAULT);
  }

  // Inherited from JobIdConfig
  jobId(): JobId {
    return this.config.getJobId();
  }

  username(): string {
    return this.config.getUsername();
  }

  /**
   * Returns a string representation of this configuration.
   */
  toString(): string {
    return (
      `GraphStoreToDatabaseExporterConfig{` +
      `databaseName='${this.databaseName()}', ` +
      `databaseFormat='${this.databaseFormat()}', ` +
      `batchSize=${this.batchSize()}, ` +
      `writeConcurrency=${this.writeConcurrency().value()}` +
      `}`
    );
  }
}
