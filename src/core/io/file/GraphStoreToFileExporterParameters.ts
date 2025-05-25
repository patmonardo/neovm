import { RelationshipType } from '@/api/RelationshipType';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { Parameters } from '@/annotations/Parameters';

/**
 * Parameters record for GraphStoreToFileExporter operations.
 * Contains all the essential configuration values needed for file export.
 */
@Parameters
export class GraphStoreToFileExporterParameters {
  constructor(
    public readonly exportName: string,
    public readonly username: string,
    public readonly defaultRelationshipType: RelationshipType,
    public readonly concurrency: Concurrency,
    public readonly batchSize: number
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
    return this.exportName;
  }

  /**
   * Returns the username.
   */
  username(): string {
    return this.username;
  }

  /**
   * Returns the default relationship type.
   */
  defaultRelationshipType(): RelationshipType {
    return this.defaultRelationshipType;
  }

  /**
   * Returns the concurrency setting.
   */
  concurrency(): Concurrency {
    return this.concurrency;
  }

  /**
   * Returns the batch size.
   */
  batchSize(): number {
    return this.batchSize;
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
    hash = hash * 31 + this.exportName.length;
    hash = hash * 31 + this.username.length;
    hash = hash * 31 + (this.defaultRelationshipType.hashCode?.() || 0);
    hash = hash * 31 + this.concurrency.valueOf();
    hash = hash * 31 + this.batchSize;
    return hash;
  }
}
