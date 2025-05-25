import * as fs from 'fs';
import * as path from 'path';
import { RelationshipSchemaVisitor, Direction, Aggregation } from '@/core/io/schema';
import { RelationshipType, ValueType, PropertyState } from '@/projection';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import { CsvSchemaConstants } from './CsvSchemaConstants';

/**
 * CSV visitor that exports relationship schema information to a CSV file.
 * Writes relationship type, direction, property key, value type, default value, aggregation, and state.
 */
export class CsvRelationshipSchemaVisitor extends RelationshipSchemaVisitor {
  public static readonly RELATIONSHIP_TYPE_COLUMN_NAME = 'relationshipType';
  public static readonly AGGREGATION_COLUMN_NAME = 'aggregation';
  public static readonly DIRECTION_COLUMN_NAME = 'direction';

  public static readonly RELATIONSHIP_SCHEMA_FILE_NAME = 'relationship-schema.csv';

  public static readonly RELATIONSHIP_SCHEMA_COLUMNS = [
    CsvRelationshipSchemaVisitor.RELATIONSHIP_TYPE_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.DIRECTION_COLUMN_NAME,
    CsvSchemaConstants.PROPERTY_KEY_COLUMN_NAME,
    CsvSchemaConstants.VALUE_TYPE_COLUMN_NAME,
    CsvSchemaConstants.DEFAULT_VALUE_COLUMN_NAME,
    CsvRelationshipSchemaVisitor.AGGREGATION_COLUMN_NAME,
    CsvSchemaConstants.STATE_COLUMN_NAME
  ];

  private readonly csvWriter: fs.WriteStream;
  private readonly fileLocation: string;

  // Current schema context
  private currentRelationshipType: RelationshipType | null = null;
  private currentDirection: Direction | null = null;
  private currentKey: string | null = null;
  private currentValueType: ValueType | null = null;
  private currentDefaultValue: any = null;
  private currentAggregation: Aggregation | null = null;
  private currentState: PropertyState | null = null;

  constructor(fileLocation: string) {
    super();

    this.fileLocation = path.join(fileLocation, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);

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
   * Export current relationship schema element to CSV.
   */
  protected export(): void {
    const row: string[] = [];

    row.push(this.relationshipType().name);
    row.push(this.direction().toString());

    if (this.key() !== null) {
      row.push(this.key()!);
      row.push(this.valueType().csvName());
      row.push(DefaultValueIOHelper.serialize(this.defaultValue()));
      row.push(this.aggregation().toString());
      row.push(this.state().toString());
    } else {
      // Type-only row (no properties)
      row.push(''); // empty property key
      row.push(''); // empty value type
      row.push(''); // empty default value
      row.push(''); // empty aggregation
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
  protected relationshipType(): RelationshipType {
    if (!this.currentRelationshipType) {
      throw new Error('No current relationship type set');
    }
    return this.currentRelationshipType;
  }

  protected direction(): Direction {
    if (!this.currentDirection) {
      throw new Error('No current direction set');
    }
    return this.currentDirection;
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

  protected aggregation(): Aggregation {
    if (!this.currentAggregation) {
      throw new Error('No current aggregation set');
    }
    return this.currentAggregation;
  }

  protected state(): PropertyState {
    if (!this.currentState) {
      throw new Error('No current property state set');
    }
    return this.currentState;
  }

  protected setCurrentContext(
    relationshipType: RelationshipType,
    direction: Direction,
    propertyKey: string | null,
    valueType: ValueType,
    defaultValue: any,
    aggregation: Aggregation,
    state: PropertyState
  ): void {
    this.currentRelationshipType = relationshipType;
    this.currentDirection = direction;
    this.currentKey = propertyKey;
    this.currentValueType = valueType;
    this.currentDefaultValue = defaultValue;
    this.currentAggregation = aggregation;
    this.currentState = state;
  }

  /**
   * Write CSV header row.
   */
  private writeHeader(): void {
    this.writeRecord(CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_COLUMNS);
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
