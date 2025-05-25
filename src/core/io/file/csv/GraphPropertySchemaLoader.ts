import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { PropertySchema, PropertyState, ValueType } from '@/api';
import { GraphPropertySchemaBuilderVisitor } from './GraphPropertySchemaBuilderVisitor';
import { CsvGraphPropertySchemaVisitor } from './CsvGraphPropertySchemaVisitor';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import { JacksonConverters } from './JacksonConverters';

/**
 * Loader for graph property schema from CSV files.
 * Builds a map of property schemas for graph-level properties.
 */
export class GraphPropertySchemaLoader {
  private readonly graphPropertySchemaPath: string;

  constructor(csvDirectory: string) {
    this.graphPropertySchemaPath = path.join(
      csvDirectory,
      CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load graph property schema from CSV file.
   * Returns empty map if file doesn't exist.
   */
  async load(): Promise<Map<string, PropertySchema>> {
    const schemaBuilder = new GraphPropertySchemaBuilderVisitor();

    try {
      if (!fs.existsSync(this.graphPropertySchemaPath)) {
        // File doesn't exist, return empty schema
        schemaBuilder.close();
        return schemaBuilder.schema();
      }

      await this.parseSchemaFile(schemaBuilder);
      schemaBuilder.close();
      return schemaBuilder.schema();
    } catch (error) {
      throw new Error(`Failed to load graph property schema from ${this.graphPropertySchemaPath}: ${error}`);
    }
  }

  /**
   * Parse the CSV file and build schema.
   */
  private async parseSchemaFile(schemaBuilder: GraphPropertySchemaBuilderVisitor): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.graphPropertySchemaPath, { encoding: 'utf8' })
        .pipe(csv({
          headers: true,
          skipEmptyLines: true,
          strict: false, // Equivalent to Jackson's FAIL_ON_UNKNOWN_PROPERTIES = false
          separator: ',',
          quote: '"'
        }))
        .on('data', (row) => {
          try {
            const schemaLine = this.parsePropertySchemaLine(row);
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
   * Parse a single CSV row into PropertySchemaLine.
   */
  private parsePropertySchemaLine(row: any): PropertySchemaLine {
    return {
      propertyKey: row.propertyKey || '',
      valueType: JacksonConverters.ValueTypeConverter.convert(row.valueType || ''),
      defaultValue: row.defaultValue || '',
      state: JacksonConverters.PropertyStateConverter.convert(row.state || '')
    };
  }

  /**
   * Process a schema line and add to builder.
   */
  private processSchemaLine(
    schemaLine: PropertySchemaLine,
    schemaBuilder: GraphPropertySchemaBuilderVisitor
  ): void {
    // Deserialize default value
    const defaultValue = DefaultValueIOHelper.deserialize(
      schemaLine.defaultValue,
      schemaLine.valueType,
      true // isUserDefined = true for graph property schemas
    );

    // Build schema entry
    schemaBuilder
      .key(schemaLine.propertyKey)
      .valueType(schemaLine.valueType)
      .defaultValue(defaultValue)
      .state(schemaLine.state)
      .endOfEntity();
  }
}
