import * as fs from 'fs';
import * as path from 'path';
import * as csvWriter from 'csv-writer';
import { RelationshipType } from '@/projection';
import { GraphInfo, SingleRowVisitor } from '@/core/io/file';
import { CsvMapUtil } from './CsvMapUtil';

/**
 * CSV visitor that exports graph information to a CSV file.
 * Equivalent to Java CsvGraphInfoVisitor.
 */
export class CsvGraphInfoVisitor implements SingleRowVisitor<GraphInfo> {
  public static readonly GRAPH_INFO_FILE_NAME = 'graph_info.csv';
  public static readonly DATABASE_NAME_COLUMN_NAME = 'databaseName';
  public static readonly DATABASE_LOCATION_COLUMN_NAME = 'databaseLocation';
  public static readonly REMOTE_DATABASE_ID_COLUMN_NAME = 'remoteDatabaseId';
  public static readonly ID_MAP_BUILDER_TYPE_COLUMN_NAME = 'idMapBuilderType';
  public static readonly NODE_COUNT_COLUMN_NAME = 'nodeCount';
  public static readonly MAX_ORIGINAL_ID_COLUMN_NAME = 'maxOriginalId';
  public static readonly REL_TYPE_COUNTS_COLUMN_NAME = 'relTypeCounts';
  public static readonly INVERSE_INDEXED_REL_TYPES = 'inverseIndexedRelTypes';

  private readonly csvWriter: any;
  private readonly fileLocation: string;

  constructor(fileLocation: string) {
    this.fileLocation = path.join(fileLocation, CsvGraphInfoVisitor.GRAPH_INFO_FILE_NAME);

    // Replace de.siegmar.fastcsv with csv-writer
    this.csvWriter = csvWriter.createArrayCsvWriter({
      path: this.fileLocation,
      header: [
        CsvGraphInfoVisitor.DATABASE_NAME_COLUMN_NAME,
        CsvGraphInfoVisitor.DATABASE_LOCATION_COLUMN_NAME,
        CsvGraphInfoVisitor.REMOTE_DATABASE_ID_COLUMN_NAME,
        CsvGraphInfoVisitor.ID_MAP_BUILDER_TYPE_COLUMN_NAME,
        CsvGraphInfoVisitor.NODE_COUNT_COLUMN_NAME,
        CsvGraphInfoVisitor.MAX_ORIGINAL_ID_COLUMN_NAME,
        CsvGraphInfoVisitor.REL_TYPE_COUNTS_COLUMN_NAME,
        CsvGraphInfoVisitor.INVERSE_INDEXED_REL_TYPES
      ]
    });

    this.writeHeader();
  }

  /**
   * Export graph information to CSV.
   */
  export(graphInfo: GraphInfo): void {
    const inverseIndexedRelTypesString = Array.from(graphInfo.inverseIndexedRelationshipTypes())
      .map(relType => relType.name)
      .join(';');

    const record = [
      graphInfo.databaseInfo().databaseId().databaseName(),
      graphInfo.databaseInfo().databaseLocation().name(),
      graphInfo.databaseInfo().remoteDatabaseId()?.databaseName() || '',
      graphInfo.idMapBuilderType(),
      graphInfo.nodeCount().toString(),
      graphInfo.maxOriginalId().toString(),
      CsvMapUtil.relationshipCountsToString(graphInfo.relationshipTypeCounts()),
      inverseIndexedRelTypesString
    ];

    // Write synchronously like the Java version
    try {
      // Note: csv-writer is async, but we can make it sync-like for compatibility
      this.writeRecord(record);
    } catch (error) {
      throw new Error(`Failed to write graph info record: ${error}`);
    }
  }

  /**
   * Close the CSV writer.
   */
  close(): void {
    // csv-writer doesn't need explicit closing, but we can add cleanup if needed
  }

  private writeHeader(): void {
    // Header is automatically written by csv-writer configuration
    // This method exists for API compatibility with Java version
  }

  private writeRecord(record: string[]): void {
    // For synchronous writing like Java, we can use fs.appendFileSync
    // or queue records and write them in batches
    const csvLine = record.map(field => this.escapeCsvField(field)).join(',') + '\n';

    // Ensure file exists and write header if this is the first write
    if (!fs.existsSync(this.fileLocation)) {
      const headerLine = [
        CsvGraphInfoVisitor.DATABASE_NAME_COLUMN_NAME,
        CsvGraphInfoVisitor.DATABASE_LOCATION_COLUMN_NAME,
        CsvGraphInfoVisitor.REMOTE_DATABASE_ID_COLUMN_NAME,
        CsvGraphInfoVisitor.ID_MAP_BUILDER_TYPE_COLUMN_NAME,
        CsvGraphInfoVisitor.NODE_COUNT_COLUMN_NAME,
        CsvGraphInfoVisitor.MAX_ORIGINAL_ID_COLUMN_NAME,
        CsvGraphInfoVisitor.REL_TYPE_COUNTS_COLUMN_NAME,
        CsvGraphInfoVisitor.INVERSE_INDEXED_REL_TYPES
      ].join(',') + '\n';

      fs.writeFileSync(this.fileLocation, headerLine);
    }

    fs.appendFileSync(this.fileLocation, csvLine);
  }

  private escapeCsvField(field: string): string {
    // Simple CSV escaping - wrap in quotes if contains comma, quote, or newline
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
