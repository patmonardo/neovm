import * as fs from 'fs';
import * as path from 'path';
import { NodeLabel } from '@/projection';
import { SimpleVisitor } from '@/core/io/schema';

/**
 * CSV visitor that exports node label mappings to a CSV file.
 * Maps node labels to their string representations.
 */
export class CsvNodeLabelMappingVisitor implements SimpleVisitor<Map.Entry<NodeLabel, string>> {
  private static readonly LABEL_MAPPING = 'index';
  private static readonly LABEL_COLUMN_NAME = 'label';
  static readonly LABEL_MAPPING_FILE_NAME = 'label-mappings.csv';

  private readonly csvWriter: fs.WriteStream;
  private readonly fileLocation: string;

  constructor(fileLocation: string) {
    this.fileLocation = path.join(fileLocation, CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME);

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
   * Export a node label mapping entry.
   */
  export(nodeLabelMapping: Map.Entry<NodeLabel, string>): void {
    const row = [
      nodeLabelMapping.value,  // mapping value (index)
      nodeLabelMapping.key.name // node label name
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
      CsvNodeLabelMappingVisitor.LABEL_MAPPING,
      CsvNodeLabelMappingVisitor.LABEL_COLUMN_NAME
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
