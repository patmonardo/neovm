import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { NodeLabel } from '@/projection';
import { PropertyState, ValueType } from '@/api';
import { MutableNodeSchema } from '@/api/schema';
import { NodeSchemaBuilderVisitor } from './NodeSchemaBuilderVisitor';
import { CsvNodeSchemaVisitor } from './CsvNodeSchemaVisitor';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import { JacksonConverters } from './JacksonConverters';

/**
 * Loader for node schema from CSV files.
 * Builds a complete mutable node schema including labels and their properties.
 */
export class NodeSchemaLoader {
  private readonly nodeSchemaPath: string;

  constructor(csvDirectory: string) {
    this.nodeSchemaPath = path.join(csvDirectory, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
  }

  /**
   * Load node schema from CSV file.
   */
  async load(): Promise<MutableNodeSchema> {
    const schemaBuilder = new NodeSchemaBuilderVisitor();

    try {
      await this.parseSchemaFile(schemaBuilder);
      schemaBuilder.close();
      return schemaBuilder.schema();
    } catch (error) {
      throw new Error(`Failed to load node schema from ${this.nodeSchemaPath}: ${error}`);
    }
  }

  /**
   * Parse the CSV file and build schema.
   */
  private async parseSchemaFile(schemaBuilder: NodeSchemaBuilderVisitor): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.nodeSchemaPath, { encoding: 'utf8' })
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
      label: JacksonConverters.NodeLabelConverter.convert(row.label || '')
    };

    // Optional property fields
    if (row.propertyKey && row.propertyKey.trim() !== '') {
      schemaLine.propertyKey = row.propertyKey.trim();
      schemaLine.valueType = JacksonConverters.ValueTypeConverter.convert(row.valueType || '');
      schemaLine.defaultValue = row.defaultValue || '';
      schemaLine.state = JacksonConverters.PropertyStateConverter.convert(row.state || '');
    }

    return schemaLine;
  }

  /**
   * Process a schema line and add to builder.
   */
  private processSchemaLine(
    schemaLine: SchemaLine,
    schemaBuilder: NodeSchemaBuilderVisitor
  ): void {
    schemaBuilder.nodeLabel(schemaLine.label);

    if (schemaLine.propertyKey) {
      if (!schemaLine.valueType || !schemaLine.state) {
        throw new Error(`Property ${schemaLine.propertyKey} missing valueType or state`);
      }

      // Deserialize default value
      const defaultValue = DefaultValueIOHelper.deserialize(
        schemaLine.defaultValue || '',
        schemaLine.valueType,
        true // isUserDefined = true for node schemas
      );

      schemaBuilder
        .key(schemaLine.propertyKey)
        .valueType(schemaLine.valueType)
        .defaultValue(defaultValue)
        .state(schemaLine.state);
    }

    schemaBuilder.endOfEntity();
  }
}
