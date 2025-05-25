import * as fs from 'fs';
import * as path from 'path';
import { ElementSchemaVisitor, ValueType, PropertyState } from '@/core/io/schema';
import { CsvSchemaConstants } from './CsvSchemaConstants';

/**
 * CSV visitor that exports graph property schema information to a CSV file.
 * Equivalent to Java CsvGraphPropertySchemaVisitor.
 */
export class CsvGraphPropertySchemaVisitor extends ElementSchemaVisitor {
  public static readonly GRAPH_PROPERTY_SCHEMA_FILE_NAME = 'graph-property-schema.csv';

  private readonly fileLocation: string;
  private readonly writeStream: fs.WriteStream;

  constructor(fileLocation: string) {
    super();

    this.fileLocation = path.join(fileLocation, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);

    try {
      this.writeStream = fs.createWriteStream(this.fileLocation, {
        encoding: 'utf8',
        flags: 'w' // Write mode, truncate if exists
      });

      this.writeHeader();
    } catch (error) {
      throw new Error(`Failed to create CSV writer for ${this.fileLocation}: ${error}`);
    }
  }

  /**
   * Export current schema element to CSV.
   */
  protected export(): void {
    const key = this.key();
    if (key !== null) {
      const record = [
        key,
        this.valueType().csvName(),
        this.defaultValue()?.toString() || '',
        this.state().toString()
      ];

      this.writeRecord(record);
    }
  }

  /**
   * Close the CSV writer.
   */
  public close(): void {
    try {
      this.writeStream.end();
    } catch (error) {
      throw new Error(`Failed to close CSV writer: ${error}`);
    }
  }

  /**
   * Write CSV header row.
   */
  private writeHeader(): void {
    const headerRecord = [
      CsvSchemaConstants.PROPERTY_KEY_COLUMN_NAME,
      CsvSchemaConstants.VALUE_TYPE_COLUMN_NAME,
      CsvSchemaConstants.DEFAULT_VALUE_COLUMN_NAME,
      CsvSchemaConstants.STATE_COLUMN_NAME
    ];

    this.writeRecord(headerRecord);
  }

  /**
   * Write a record to the CSV file.
   */
  private writeRecord(record: string[]): void {
    const csvLine = record.map(field => this.escapeCsvField(field)).join(',') + '\n';
    this.writeStream.write(csvLine);
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

  // These abstract methods need to be implemented by the schema system
  // For now, we'll create a concrete implementation for testing

  protected key(): string | null {
    // This would be implemented by the schema traversal system
    throw new Error('key() method must be implemented by schema traversal system');
  }

  protected valueType(): ValueType {
    // This would be implemented by the schema traversal system
    throw new Error('valueType() method must be implemented by schema traversal system');
  }

  protected defaultValue(): any {
    // This would be implemented by the schema traversal system
    throw new Error('defaultValue() method must be implemented by schema traversal system');
  }

  protected state(): PropertyState {
    // This would be implemented by the schema traversal system
    throw new Error('state() method must be implemented by schema traversal system');
  }
}
