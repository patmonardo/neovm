import { RelationshipType } from '@/api/RelationshipType';
import { Concurrency } from '@/core/concurrency/Concurrency';

/**
 * Parameter record for GraphStore to database export operations.
 * Contains all the necessary configuration parameters for exporting
 * a GraphStore directly to a Neo4j database.
 *
 * This is a simple data container that holds validated export parameters
 * used by the GraphStoreToDatabaseExporter.
 */
export class GraphStoreToDatabaseExporterParameters {
  constructor(
    public readonly databaseName: string,
    public readonly writeConcurrency: Concurrency,
    public readonly batchSize: number,
    public readonly defaultRelationshipType: RelationshipType,
    public readonly databaseFormat: string,
    public readonly enableDebugLog: boolean
  ) {}

  /**
   * Gets the target database name for export.
   */
  databaseName(): string {
    return this.databaseName;
  }

  /**
   * Gets the write concurrency level for parallel export.
   */
  writeConcurrency(): Concurrency {
    return this.writeConcurrency;
  }

  /**
   * Gets the batch size for import operations.
   */
  batchSize(): number {
    return this.batchSize;
  }

  /**
   * Gets the default relationship type to use when none is specified.
   */
  defaultRelationshipType(): RelationshipType {
    return this.defaultRelationshipType;
  }

  /**
   * Gets the database format to use for export.
   */
  databaseFormat(): string {
    return this.databaseFormat;
  }

  /**
   * Gets whether debug logging is enabled.
   * @deprecated Will be removed in version 2.2
   */
  enableDebugLog(): boolean {
    return this.enableDebugLog;
  }

  /**
   * Creates a builder for constructing exporter parameters.
   */
  static builder(): GraphStoreToDatabaseExporterParametersBuilder {
    return new GraphStoreToDatabaseExporterParametersBuilder();
  }

  /**
   * Returns a string representation of these parameters.
   */
  toString(): string {
    return `GraphStoreToDatabaseExporterParameters{` +
      `databaseName='${this.databaseName}', ` +
      `writeConcurrency=${this.writeConcurrency.value()}, ` +
      `batchSize=${this.batchSize}, ` +
      `defaultRelationshipType=${this.defaultRelationshipType.name}, ` +
      `databaseFormat='${this.databaseFormat}', ` +
      `enableDebugLog=${this.enableDebugLog}` +
      `}`;
  }

  /**
   * Checks equality with another parameters instance.
   */
  equals(other: GraphStoreToDatabaseExporterParameters): boolean {
    return this.databaseName === other.databaseName &&
           this.writeConcurrency.equals(other.writeConcurrency) &&
           this.batchSize === other.batchSize &&
           this.defaultRelationshipType.equals(other.defaultRelationshipType) &&
           this.databaseFormat === other.databaseFormat &&
           this.enableDebugLog === other.enableDebugLog;
  }

  /**
   * Returns a hash code for these parameters.
   */
  hashCode(): number {
    let hash = 17;
    hash = hash * 31 + this.databaseName.length;
    hash = hash * 31 + this.writeConcurrency.value();
    hash = hash * 31 + this.batchSize;
    hash = hash * 31 + this.defaultRelationshipType.name.length;
    hash = hash * 31 + this.databaseFormat.length;
    hash = hash * 31 + (this.enableDebugLog ? 1 : 0);
    return hash;
  }
}

/**
 * Builder for constructing GraphStoreToDatabaseExporterParameters with validation and defaults.
 */
export class GraphStoreToDatabaseExporterParametersBuilder {
  private _databaseName?: string;
  private _writeConcurrency: Concurrency = Concurrency.DEFAULT;
  private _batchSize: number = 10000;
  private _defaultRelationshipType: RelationshipType = RelationshipType.of("__ALL__");
  private _databaseFormat: string = "standard";
  private _enableDebugLog: boolean = false;

  /**
   * Sets the target database name.
   */
  databaseName(databaseName: string): this {
    this._databaseName = databaseName;
    return this;
  }

  /**
   * Sets the write concurrency level.
   */
  writeConcurrency(writeConcurrency: Concurrency): this {
    this._writeConcurrency = writeConcurrency;
    return this;
  }

  /**
   * Sets the batch size for import operations.
   */
  batchSize(batchSize: number): this {
    this._batchSize = batchSize;
    return this;
  }

  /**
   * Sets the default relationship type.
   */
  defaultRelationshipType(defaultRelationshipType: RelationshipType): this {
    this._defaultRelationshipType = defaultRelationshipType;
    return this;
  }

  /**
   * Sets the database format.
   */
  databaseFormat(databaseFormat: string): this {
    this._databaseFormat = databaseFormat;
    return this;
  }

  /**
   * Sets whether debug logging is enabled.
   * @deprecated Will be removed in version 2.2
   */
  enableDebugLog(enableDebugLog: boolean): this {
    this._enableDebugLog = enableDebugLog;
    return this;
  }

  /**
   * Builds the parameters instance with validation.
   */
  build(): GraphStoreToDatabaseExporterParameters {
    if (!this._databaseName) {
      throw new Error('databaseName is required');
    }

    if (this._batchSize <= 0) {
      throw new Error('batchSize must be positive');
    }

    if (this._writeConcurrency.value() <= 0) {
      throw new Error('writeConcurrency must be positive');
    }

    return new GraphStoreToDatabaseExporterParameters(
      this._databaseName,
      this._writeConcurrency,
      this._batchSize,
      this._defaultRelationshipType,
      this._databaseFormat,
      this._enableDebugLog
    );
  }
}
