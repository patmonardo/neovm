import { CypherMapWrapper } from '@/core/CypherMapWrapper';
import { Username } from '@/core/Username';
import { GraphStoreExporterBaseConfig } from '@/core/io/GraphStoreExporterBaseConfig';
import { Configuration } from '@/annotations/Configuration';

/**
 * Configuration interface for GraphStoreToFileExporter operations.
 * Extends the base exporter configuration with file-specific options.
 */
@Configuration
export interface GraphStoreToFileExporterConfig extends GraphStoreExporterBaseConfig {
  /**
   * Whether to include metadata in the export.
   *
   * @returns true if metadata should be included, false otherwise
   * @default false
   */
  includeMetaData(): boolean;

  /**
   * The username associated with this export operation.
   * Used for tracking data provenance and ownership.
   *
   * @returns The username string
   * @default Username.EMPTY_USERNAME.username()
   */
  username(): string;

  /**
   * The name identifier for this export.
   * Used to organize and identify exported graph data.
   *
   * @returns The export name
   */
  exportName(): string;

  /**
   * Whether to use label mapping for compact storage.
   * When true, node labels are mapped to shorter identifiers.
   * Default is false to prevent breaking changes in CSV export.
   *
   * @returns true if label mapping should be used, false otherwise
   * @default false
   */
  useLabelMapping(): boolean;
}

/**
 * Default implementation of GraphStoreToFileExporterConfig.
 */
export class GraphStoreToFileExporterConfigImpl implements GraphStoreToFileExporterConfig {
  private readonly _username: string;
  private readonly config: CypherMapWrapper;

  constructor(username: string, config: CypherMapWrapper) {
    this._username = username;
    this.config = config;
  }

  includeMetaData(): boolean {
    return this.config.getBool('includeMetaData', false);
  }

  username(): string {
    return this._username || Username.EMPTY_USERNAME.username();
  }

  exportName(): string {
    return this.config.requireString('exportName');
  }

  useLabelMapping(): boolean {
    return this.config.getBool('useLabelMapping', false);
  }

  // Methods from GraphStoreExporterBaseConfig
  concurrency(): number {
    return this.config.getInt('concurrency', 4);
  }

  batchSize(): number {
    return this.config.getInt('batchSize', 10000);
  }

  defaultRelationshipType(): string {
    return this.config.getString('defaultRelationshipType', 'REL');
  }
}

/**
 * Static factory methods for creating configuration instances.
 */
export class GraphStoreToFileExporterConfig {
  /**
   * Creates a new configuration instance from username and config map.
   *
   * @param username The username for the export operation
   * @param config The configuration parameters wrapped in CypherMapWrapper
   * @returns A new GraphStoreToFileExporterConfig instance
   */
  static of(username: string, config: CypherMapWrapper): GraphStoreToFileExporterConfig {
    return new GraphStoreToFileExporterConfigImpl(username, config);
  }

  /**
   * Creates a builder for constructing configuration instances.
   *
   * @returns A new configuration builder
   */
  static builder(): GraphStoreToFileExporterConfigBuilder {
    return new GraphStoreToFileExporterConfigBuilder();
  }
}

/**
 * Builder class for constructing GraphStoreToFileExporterConfig instances.
 */
export class GraphStoreToFileExporterConfigBuilder {
  private _username?: string;
  private _exportName?: string;
  private _includeMetaData: boolean = false;
  private _useLabelMapping: boolean = false;
  private _concurrency: number = 4;
  private _batchSize: number = 10000;
  private _defaultRelationshipType: string = 'REL';

  username(username: string): this {
    this._username = username;
    return this;
  }

  exportName(exportName: string): this {
    this._exportName = exportName;
    return this;
  }

  includeMetaData(includeMetaData: boolean): this {
    this._includeMetaData = includeMetaData;
    return this;
  }

  useLabelMapping(useLabelMapping: boolean): this {
    this._useLabelMapping = useLabelMapping;
    return this;
  }

  concurrency(concurrency: number): this {
    this._concurrency = concurrency;
    return this;
  }

  batchSize(batchSize: number): this {
    this._batchSize = batchSize;
    return this;
  }

  defaultRelationshipType(defaultRelationshipType: string): this {
    this._defaultRelationshipType = defaultRelationshipType;
    return this;
  }

  build(): GraphStoreToFileExporterConfig {
    if (!this._username) {
      throw new Error('username is required');
    }
    if (!this._exportName) {
      throw new Error('exportName is required');
    }

    const configMap = new Map<string, any>();
    configMap.set('includeMetaData', this._includeMetaData);
    configMap.set('useLabelMapping', this._useLabelMapping);
    configMap.set('concurrency', this._concurrency);
    configMap.set('batchSize', this._batchSize);
    configMap.set('defaultRelationshipType', this._defaultRelationshipType);
    configMap.set('exportName', this._exportName);

    const cypherMapWrapper = new CypherMapWrapper(configMap);
    return new GraphStoreToFileExporterConfigImpl(this._username, cypherMapWrapper);
  }
}
