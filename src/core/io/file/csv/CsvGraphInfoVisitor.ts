/**
 * CSV GRAPH INFO VISITOR - WRITES GRAPH INFO TO CSV
 *
 * SingleRowVisitor that exports GraphInfo metadata to CSV file.
 * Used for writing graph statistics and configuration during export.
 */

import { GraphInfo } from '@/core/io/file';
import { SingleRowVisitor } from '@/core/io/file';
import { CsvMapUtil } from './CsvMapUtil';
import * as fs from 'fs';
import * as path from 'path';

export class CsvGraphInfoVisitor implements SingleRowVisitor<GraphInfo> {
  static readonly GRAPH_INFO_FILE_NAME = "graph_info.csv";
  static readonly DATABASE_NAME_COLUMN_NAME = "databaseName";
  static readonly DATABASE_LOCATION_COLUMN_NAME = "databaseLocation";
  static readonly REMOTE_DATABASE_ID_COLUMN_NAME = "remoteDatabaseId";
  static readonly ID_MAP_BUILDER_TYPE_COLUMN_NAME = "idMapBuilderType";
  static readonly NODE_COUNT_COLUMN_NAME = "nodeCount";
  static readonly MAX_ORIGINAL_ID_COLUMN_NAME = "maxOriginalId";
  static readonly REL_TYPE_COUNTS_COLUMN_NAME = "relTypeCounts";
  static readonly INVERSE_INDEXED_REL_TYPES = "inverseIndexedRelTypes";

  private readonly csvFilePath: string;
  private readonly csvRows: string[] = [];

  constructor(fileLocation: string) {
    this.csvFilePath = path.join(fileLocation, CsvGraphInfoVisitor.GRAPH_INFO_FILE_NAME);
    this.writeHeader();
  }

  export(graphInfo: GraphInfo): void {
    const inverseIndexedRelTypesString = graphInfo
      .inverseIndexedRelationshipTypes()
      .map(relType => relType.name())
      .join(';');

    const remoteDatabaseName = graphInfo.databaseInfo().remoteDatabaseId()
      ? graphInfo.databaseInfo().remoteDatabaseId()!.databaseName()
      : '';

    this.csvRows.push(this.formatCsvRow([
      graphInfo.databaseInfo().databaseId().databaseName(),
      graphInfo.databaseInfo().databaseLocation().toString(),
      remoteDatabaseName,
      graphInfo.idMapBuilderType(),
      graphInfo.nodeCount().toString(),
      graphInfo.maxOriginalId().toString(),
      CsvMapUtil.relationshipCountsToString(graphInfo.relationshipTypeCounts()),
      inverseIndexedRelTypesString
    ]));
  }

  close(): void {
    try {
      fs.writeFileSync(this.csvFilePath, this.csvRows.join('\n'), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write graph info CSV: ${(error as Error).message}`);
    }
  }

  private writeHeader(): void {
    this.csvRows.push(this.formatCsvRow([
      CsvGraphInfoVisitor.DATABASE_NAME_COLUMN_NAME,
      CsvGraphInfoVisitor.DATABASE_LOCATION_COLUMN_NAME,
      CsvGraphInfoVisitor.REMOTE_DATABASE_ID_COLUMN_NAME,
      CsvGraphInfoVisitor.ID_MAP_BUILDER_TYPE_COLUMN_NAME,
      CsvGraphInfoVisitor.NODE_COUNT_COLUMN_NAME,
      CsvGraphInfoVisitor.MAX_ORIGINAL_ID_COLUMN_NAME,
      CsvGraphInfoVisitor.REL_TYPE_COUNTS_COLUMN_NAME,
      CsvGraphInfoVisitor.INVERSE_INDEXED_REL_TYPES
    ]));
  }

  private formatCsvRow(values: string[]): string {
    // Simple CSV formatting - escape quotes and wrap in quotes if needed
    return values.map(value => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }
}
