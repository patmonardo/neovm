import * as fs from 'fs';
import * as path from 'path';
import { RelationshipType } from '@/projection';
import { SimpleVisitor } from '@/core/io/schema';

/**
 * CSV visitor that exports relationship type mappings to a CSV file.
 * Maps relationship types to their string representations.
 */
export class CsvRelationshipTypeMappingVisitor implements SimpleVisitor<Map.Entry<RelationshipType, string>> {
  private static readonly LABEL_MAPPING = 'index';
  private static readonly TYPE_COLUMN_NAME = 'type';
  static readonly TYPE_MAPPING_FILE_NAME = 'type_mappings.csv';

  private readonly csvWriter: fs.WriteStream;
  private readonly fileLocation: string;

  constructor(fileLocation: string) {
    this.fileLocation = path.join(fileLocation, CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME);

    try {
      this.csvWriter = fs.createWriteStream(this.fileLocation, {
        encoding: 'utf8',
        flags: 'w'
      });

      this.writeHeader();
    } catch (error) {
      throw new Error(`Failed to create CSV writer for ${this.fileLocation}: ${error}`);
    }
  }

  /**
   * Export a relationship type mapping entry.
   */
  export(relationshipTypeMapping: Map.Entry<RelationshipType, string>): void {
    const row = [
      relationshipTypeMapping.value,    // mapping value (index)
      relationshipTypeMapping.key.name  // relationship type name
    ];

    this.writeRecord(row);
  }

  /**
   * Close the CSV writer.
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.csvWriter.end((error) => {
        if (error) {
          reject(new Error(`Failed to close CSV writer: ${error}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Write CSV header row.
   */
  private writeHeader(): void {
    this.writeRecord([
      CsvRelationshipTypeMappingVisitor.LABEL_MAPPING,
      CsvRelationshipTypeMappingVisitor.TYPE_COLUMN_NAME
    ]);
  }

  /**
   * Write a record to the CSV file.
   */
  private writeRecord(record: string[]): void {
    const csvLine = record.map(field => this.escapeCsvField(field)).join(',') + '\n';
    this.csvWriter.write(csvLine);
  }

  /**
   * Escape CSV field values.
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
