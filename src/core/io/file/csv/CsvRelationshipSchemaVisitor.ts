/**
 * CSV RELATIONSHIP SCHEMA VISITOR - EXPORTS RELATIONSHIP SCHEMA TO CSV
 *
 * Visitor that exports relationship schema definitions to CSV file.
 * Records type, direction, property key, value type, default value, aggregation, and state.
 */

import { RelationshipSchemaVisitor } from '@/core/io/schema';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import * as fs from 'fs';
import * as path from 'path';

export class CsvRelationshipSchemaVisitor extends RelationshipSchemaVisitor {
  static readonly RELATIONSHIP_TYPE_COLUMN_NAME = "relationshipType";
  static readonly DIRECTION_COLUMN_NAME = "direction";
  static readonly PROPERTY_KEY_COLUMN_NAME = "propertyKey";
  static readonly VALUE_TYPE_COLUMN_NAME = "valueType";
  static readonly DEFAULT_VALUE_COLUMN_NAME = "defaultValue";
  static readonly AGGREGATION_COLUMN_NAME = "aggregation";
  static readonly STATE_COLUMN_NAME = "state";

  static readonly RELATIONSHIP_SCHEMA_FILE_NAME = "relationship-schema.csv";

  static readonly RELATIONSHIP_SCHEMA_COLUMNS = [
    CsvRelationshipSchemaVisitor.RELATIONSHIP_TYPE_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.DIRECTION_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.PROPERTY_KEY_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.VALUE_TYPE_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.DEFAULT_VALUE_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.AGGREGATION_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.STATE_COLUMN_NAME
  ];

  private readonly csvFilePath: string;
  private readonly csvRows: string[] = [];

  constructor(fileLocation: string) {
    super();
    this.csvFilePath = path.join(fileLocation, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    this.writeHeader();
  }

  protected export(): void {
    const row: string[] = [];
    const relationshipType = this.relationshipType();
    const direction = this.direction();

    if (relationshipType === null || direction === null) {
      return; // Skip if missing required fields
    }

    row.push(relationshipType.name());
    row.push(direction.name());

    if (this.key() !== null) {
      row.push(this.key()!);
      row.push(this.valueType()!.csvName());
      row.push(DefaultValueIOHelper.serialize(this.defaultValue()));
      row.push(this.aggregation()!.name());
      row.push(this.state()!.name());
    } else {
      // Add empty columns for properties when no property is defined
      row.push(''); // propertyKey
      row.push(''); // valueType
      row.push(''); // defaultValue
      row.push(''); // aggregation
      row.push(''); // state
    }

    this.csvRows.push(this.formatCsvRow(row));
  }

  close(): void {
    try {
      fs.writeFileSync(this.csvFilePath, this.csvRows.join('\n'), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write relationship schema CSV: ${(error as Error).message}`);
    }
  }

  private writeHeader(): void {
    this.csvRows.push(this.formatCsvRow(CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_COLUMNS));
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
