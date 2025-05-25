import * as fs from 'fs';
import * as path from 'path';
import { NodeSchemaVisitor } from '@/core/io/schema';
import { NodeLabel, ValueType, PropertyState } from '@/projection';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';

/**
 * CSV visitor that exports node schema information to a CSV file.
 * Writes label, property key, value type, default value, and state for each node property.
 */
export class CsvNodeSchemaVisitor extends NodeSchemaVisitor {
  public static readonly LABEL_COLUMN_NAME = 'label';
  public static readonly PROPERTY_KEY_COLUMN_NAME = 'propertyKey';
  public static readonly VALUE_TYPE_COLUMN_NAME = 'valueType';
  public static readonly DEFAULT_VALUE_COLUMN_NAME = 'defaultValue';
  public static readonly STATE_COLUMN_NAME = 'state';

  public static readonly NODE_SCHEMA_FILE_NAME = 'node-schema.csv';

  public static readonly NODE_SCHEMA_COLUMNS = [
    CsvNodeSchemaVisitor.LABEL_COLUMN_NAME,
    CsvNodeSchemaVisitor.PROPERTY_KEY_COLUMN_NAME,
    CsvNodeSchemaVisitor.VALUE_TYPE_COLUMN_NAME,
    CsvNodeSchemaVisitor.DEFAULT_VALUE_COLUMN_NAME,
    CsvNodeSchemaVisitor.STATE_COLUMN_NAME
  ];

  private readonly csvWriter: fs.WriteStream;
  private readonly fileLocation: string;

  // Current schema context
  private currentLabel: NodeLabel | null = null;
  private currentKey: string | null = null;
  private currentValueType: ValueType | null = null;
  private currentDefaultValue: any = null;
  private currentState: PropertyState | null = null;

  constructor(fileLocation: string) {
    super();

    this.fileLocation = path.join(fileLocation, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);

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
   * Export current node schema element to CSV.
   */
  protected export(): void {
    const row: string[] = [];
    const label = this.nodeLabel();

    row.push(label.name);

    if (this.key() !== null) {
      row.push(this.key()!);
      row.push(this.valueType().csvName());
      row.push(DefaultValueIOHelper.serialize(this.defaultValue()));
      row.push(this.state().toString());
    } else {
      // Label-only row (no properties)
      row.push(''); // empty property key
      row.push(''); // empty value type
      row.push(''); // empty default value
      row.push(''); // empty state
    }

    this.writeRecord(row);
  }

  /**
   * Close the CSV writer.
   */
  public async close(): Promise<void> {
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

  // Current context accessors (implementation of abstract methods)
  protected nodeLabel(): NodeLabel {
    if (!this.currentLabel) {
      throw new Error('No current node label set');
    }
    return this.currentLabel;
  }

  protected key(): string | null {
    return this.currentKey;
  }

  protected valueType(): ValueType {
    if (!this.currentValueType) {
      throw new Error('No current value type set');
    }
    return this.currentValueType;
  }

  protected defaultValue(): any {
    return this.currentDefaultValue;
  }

  protected state(): PropertyState {
    if (!this.currentState) {
      throw new Error('No current property state set');
    }
    return this.currentState;
  }

  protected setCurrentContext(
    label: NodeLabel,
    propertyKey: string | null,
    valueType: ValueType,
    defaultValue: any,
    state: PropertyState
  ): void {
    this.currentLabel = label;
    this.currentKey = propertyKey;
    this.currentValueType = valueType;
    this.currentDefaultValue = defaultValue;
    this.currentState = state;
  }

  /**
   * Write CSV header row.
   */
  private writeHeader(): void {
    this.writeRecord(CsvNodeSchemaVisitor.NODE_SCHEMA_COLUMNS);
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
