/**
 * CSV RELATIONSHIP VISITOR - EXPORTS RELATIONSHIPS TO CSV FILES
 *
 * Visitor that exports relationship data to CSV files grouped by relationship type.
 * Creates separate header and data files for each relationship type.
 */

import { RelationshipType } from '@/projection';
import { RelationshipSchema } from '@/api/schema';
import { PropertySchema } from '@/api/schema';
import { IdentifierMapper } from '@/core/io/IdentifierMapper';
import { RelationshipVisitor } from '@/core/io/file/RelationshipVisitor';
import { SimpleCsvWriter } from './CsvSimpleWriter';
import * as fs from 'fs';
import * as path from 'path';

export class CsvRelationshipVisitor extends RelationshipVisitor {
  static readonly START_ID_COLUMN_NAME = ":START_ID";
  static readonly END_ID_COLUMN_NAME = ":END_ID";

  private readonly fileLocation: string;
  private readonly headerFiles: Set<string>;
  private readonly visitorId: number;
  private readonly csvWriters: Map<string, SimpleCsvWriter>;

  constructor(
    fileLocation: string,
    relationshipSchema: RelationshipSchema,
    headerFiles: Set<string>,
    visitorId: number,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ) {
    super(relationshipSchema, relationshipTypeMapping);
    this.fileLocation = fileLocation;
    this.headerFiles = headerFiles;
    this.visitorId = visitorId;
    this.csvWriters = new Map<string, SimpleCsvWriter>();
  }

  /**
   * Test-only constructor with default values.
   */
  static forTesting(
    fileLocation: string,
    relationshipSchema: RelationshipSchema,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ): CsvRelationshipVisitor {
    return new CsvRelationshipVisitor(
      fileLocation,
      relationshipSchema,
      new Set<string>(),
      0,
      relationshipTypeMapping
    );
  }

  protected exportElement(): void {
    const writer = this.getWriter();

    // Start CSV row
    const row: string[] = [];

    // Add START_ID and END_ID columns
    row.push(this.startNode().toString());
    row.push(this.endNode().toString());

    // Add property values
    this.forEachProperty((key, value) => {
      row.push(this.formatCsvValue(value));
    });

    // Write row
    writer.writeRow(row);
  }

  close(): void {
    for (const writer of this.csvWriters.values()) {
      try {
        writer.flush();
        writer.close();
      } catch (error) {
        throw new Error(`Failed to close CSV writer: ${(error as Error).message}`);
      }
    }
  }

  flush(): void {
    for (const writer of this.csvWriters.values()) {
      writer.flush();
    }
  }

  private getWriter(): SimpleCsvWriter {
    const relationshipTypeStr = this.relationshipType();

    return this.csvWriters.get(relationshipTypeStr) || this.createWriter(relationshipTypeStr);
  }

  private createWriter(relationshipTypeStr: string): SimpleCsvWriter {
    const fileName = `relationships_${relationshipTypeStr}`;
    const headerFileName = `${fileName}_header.csv`;
    const dataFileName = `${fileName}_${this.visitorId}.csv`;

    // Write header file if not already written
    if (this.headerFiles.add(headerFileName)) {
      this.writeHeaderFile(headerFileName);
    }

    // Create data file writer
    const dataFilePath = path.join(this.fileLocation, dataFileName);
    const writer = new SimpleCsvWriter(dataFilePath);

    this.csvWriters.set(relationshipTypeStr, writer);
    return writer;
  }

  private writeHeaderFile(headerFileName: string): void {
    const headerFilePath = path.join(this.fileLocation, headerFileName);
    const headerRow: string[] = [];

    // Add START_ID and END_ID columns
    headerRow.push(CsvRelationshipVisitor.START_ID_COLUMN_NAME);
    headerRow.push(CsvRelationshipVisitor.END_ID_COLUMN_NAME);

    // Add property columns with types
    this.forEachPropertyWithType((key, value, type) => {
      const propertyHeader = `${key}:${type.csvName()}`;
      headerRow.push(propertyHeader);
    });

    // Write header file
    try {
      const csvContent = headerRow.join(',');
      fs.writeFileSync(headerFilePath, csvContent, 'utf-8');
    } catch (error) {
      throw new Error(`Could not write header file: ${(error as Error).message}`);
    }
  }

  protected getPropertySchema(): PropertySchema[] {
    const relationshipType = this.relationshipTypeMapping().forIdentifier(this.relationshipType());
    const propertySchemaForType = this.relationshipSchema().filter(relationshipType);
    const properties = Array.from(propertySchemaForType.properties().values());

    // Sort by key for consistent ordering
    properties.sort((a, b) => a.key().localeCompare(b.key()));

    return properties;
  }

  private formatCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = value.toString();

    // Escape CSV special characters
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}
