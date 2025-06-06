import { RelationshipType } from '@/projection';
import { Concurrency } from '@/concurrency';

/**
 * Parameters record for GraphStoreToFileExporter operations.
 * Contains all the essential configuration values needed for file export.
 */
export class GraphStoreToFileExporterParameters {
  constructor(
    public readonly _exportName: string,
    public readonly _username: string,
    public readonly _defaultRelationshipType: RelationshipType,
    public readonly _concurrency: Concurrency,
    public readonly _batchSize: number
  ) {}

  /**
   * Creates a new instance with all parameters.
   */
  static of(
    exportName: string,
    username: string,
    defaultRelationshipType: RelationshipType,
    concurrency: Concurrency,
    batchSize: number
  ): GraphStoreToFileExporterParameters {
    return new GraphStoreToFileExporterParameters(
      exportName,
      username,
      defaultRelationshipType,
      concurrency,
      batchSize
    );
  }

  /**
   * Returns the export name.
   */
  exportName(): string {
    return this._exportName;
  }

  /**
   * Returns the username.
   */
  username(): string {
    return this._username;
  }

  /**
   * Returns the default relationship type.
   */
  defaultRelationshipType(): RelationshipType {
    return this._defaultRelationshipType;
  }

  /**
   * Returns the concurrency setting.
   */
  concurrency(): Concurrency {
    return this._concurrency;
  }

  /**
   * Returns the batch size.
   */
  batchSize(): number {
    return this._batchSize;
  }

  /**
   * Returns a string representation of this parameters object.
   */
  toString(): string {
    return `GraphStoreToFileExporterParameters{` +
      `exportName='${this.exportName}', ` +
      `username='${this.username}', ` +
      `defaultRelationshipType=${this.defaultRelationshipType}, ` +
      `concurrency=${this.concurrency}, ` +
      `batchSize=${this.batchSize}` +
      `}`;
  }

  /**
   * Checks equality with another parameters object.
   */
  equals(other: GraphStoreToFileExporterParameters): boolean {
    return this.exportName === other.exportName &&
           this.username === other.username &&
           this.defaultRelationshipType.equals?.(other.defaultRelationshipType) &&
           this.concurrency === other.concurrency &&
           this.batchSize === other.batchSize;
  }

  /**
   * Returns a hash code for this parameters object.
   */
  hashCode(): number {
    let hash = 17;
    hash = hash * 31 + this._exportName.length;
    hash = hash * 31 + this._username.length;
    hash = hash * 31 + (this._defaultRelationshipType.hashCode?.() || 0);
    hash = hash * 31 + this._concurrency.value();
    hash = hash * 31 + this._batchSize;
    return hash;
  }
}
