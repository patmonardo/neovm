import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { RelationshipType } from '@/projection';
import { PropertyState, ValueType } from '@/api';
import { Direction, Aggregation } from '@/api/schema';
import { MutableRelationshipSchema } from '@/api/schema';
import { RelationshipSchemaBuilderVisitor } from './RelationshipSchemaBuilderVisitor';
import { CsvRelationshipSchemaVisitor } from './CsvRelationshipSchemaVisitor';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import { JacksonConverters } from './JacksonConverters';

/**
 * Loader for relationship schema from CSV files.
 * Builds a complete mutable relationship schema including types, directions, and properties.
 */
export class RelationshipSchemaLoader {
  private readonly relationshipSchemaPath: string;

  constructor(csvDirectory: string) {
    this.relationshipSchemaPath = path.join(csvDirectory, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
  }

  /**
   * Load relationship schema from CSV file.
   */
  async load(): Promise<MutableRelationshipSchema> {
    const schemaBuilder = new RelationshipSchemaBuilderVisitor();

    try {
      await this.parseSchemaFile(schemaBuilder);
      schemaBuilder.close();
      return schemaBuilder.schema();
    } catch (error) {
      throw new Error(`Failed to load relationship schema from ${this.relationshipSchemaPath}: ${error}`);
    }
  }

  /**
   * Parse the CSV file and build schema.
   */
  private async parseSchemaFile(schemaBuilder: RelationshipSchemaBuilderVisitor): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.relationshipSchemaPath, { encoding: 'utf8' })
        .pipe(csv({
          headers: true,
          skipEmptyLines: true,
          strict: false, // Equivalent to Jackson's FAIL_ON_UNKNOWN_PROPERTIES = false
          mapHeaders: ({ header }) => header.trim() // Equivalent to TRIM_SPACES
        }))
        .on('data', (row) => {
          try {
            const schemaLine = this.parseSchemaLine(row);
            this.processSchemaLine(schemaLine, schemaBuilder);
          } catch (error) {
            reject(new Error(`Failed to parse schema line: ${error}`));
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse a single CSV row into SchemaLine.
   */
  private parseSchemaLine(row: any): SchemaLine {
    const schemaLine: SchemaLine = {
      relationshipType: JacksonConverters.RelationshipTypeConverter.convert(row.relationshipType || ''),
      direction: JacksonConverters.DirectionConverter.convert(row.direction || 'DIRECTED')
    };

    // Optional property fields
    if (row.propertyKey && row.propertyKey.trim() !== '') {
      schemaLine.propertyKey = row.propertyKey.trim();
      schemaLine.valueType = JacksonConverters.ValueTypeConverter.convert(row.valueType || '');
      schemaLine.defaultValue = row.defaultValue || '';
      schemaLine.aggregation = JacksonConverters.AggregationConverter.convert(row.aggregation || '');
      schemaLine.state = JacksonConverters.PropertyStateConverter.convert(row.state || '');
    }

    return schemaLine;
  }

  /**
   * Process a schema line and add to builder.
   */
  private processSchemaLine(
    schemaLine: SchemaLine,
    schemaBuilder: RelationshipSchemaBuilderVisitor
  ): void {
    schemaBuilder
      .relationshipType(schemaLine.relationshipType)
      .direction(schemaLine.direction);

    if (schemaLine.propertyKey) {
      if (!schemaLine.valueType || !schemaLine.state || !schemaLine.aggregation) {
        throw new Error(`Property ${schemaLine.propertyKey} missing valueType, state, or aggregation`);
      }

      // Deserialize default value
      const defaultValue = DefaultValueIOHelper.deserialize(
        schemaLine.defaultValue || '',
        schemaLine.valueType,
        true // isUserDefined = true for relationship schemas
      );

      schemaBuilder
        .key(schemaLine.propertyKey)
        .valueType(schemaLine.valueType)
        .defaultValue(defaultValue)
        .state(schemaLine.state)
        .aggregation(schemaLine.aggregation);
    }

    schemaBuilder.endOfEntity();
  }
}
