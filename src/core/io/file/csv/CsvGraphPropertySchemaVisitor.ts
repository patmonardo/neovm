/**
 * CSV GRAPH PROPERTY SCHEMA VISITOR - EXPORTS GRAPH PROPERTY SCHEMA TO CSV
 *
 * Visitor that exports graph property schema definitions to CSV file.
 * Records property key, value type, default value, and state for each graph property.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ValueType } from '@/api';
import { PropertyState } from '@/api'

import { ElementSchemaVisitor } from '@/core/io/schema/ElementSchemaVisitor';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';

export class CsvGraphPropertySchemaVisitor extends ElementSchemaVisitor {
  // Reuse column names from CsvNodeSchemaVisitor for consistency
  static readonly PROPERTY_KEY_COLUMN_NAME = "propertyKey";
  static readonly VALUE_TYPE_COLUMN_NAME = "valueType";
  static readonly DEFAULT_VALUE_COLUMN_NAME = "defaultValue";
  static readonly STATE_COLUMN_NAME = "state";

  static readonly GRAPH_PROPERTY_SCHEMA_FILE_NAME = "graph-property-schema.csv";

  static readonly GRAPH_PROPERTY_SCHEMA_COLUMNS = [
    CsvGraphPropertySchemaVisitor.PROPERTY_KEY_COLUMN_NAME,
    CsvGraphPropertySchemaVisitor.VALUE_TYPE_COLUMN_NAME,
    CsvGraphPropertySchemaVisitor.DEFAULT_VALUE_COLUMN_NAME,
    CsvGraphPropertySchemaVisitor.STATE_COLUMN_NAME
  ];

  private readonly csvFilePath: string;
  private readonly csvRows: string[] = [];

  constructor(fileLocation: string) {
    super();
    this.csvFilePath = path.join(fileLocation, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
    this.writeHeader();
  }

  protected export(): void {
    if (this.key() !== null) {
      const row = [
        this.key()!,
        ValueType.csvName(this.valueType()),
        DefaultValueIOHelper.serialize(this.defaultValue()),
        PropertyState.name(this.state())
      ];

      this.csvRows.push(this.formatCsvRow(row));
    }
  }

  close(): void {
    try {
      fs.writeFileSync(this.csvFilePath, this.csvRows.join('\n'), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write graph property schema CSV: ${(error as Error).message}`);
    }
  }

  private writeHeader(): void {
    this.csvRows.push(this.formatCsvRow(CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_COLUMNS));
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
