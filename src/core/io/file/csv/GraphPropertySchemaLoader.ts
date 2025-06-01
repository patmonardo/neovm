/**
 * GRAPH PROPERTY SCHEMA LOADER - CSV GRAPH PROPERTY SCHEMA PARSER
 *
 * Simple loader with single load() method that reads CSV graph property schema files.
 * Parses schema lines and builds graph property schema using visitor pattern.
 */

import { PropertyState } from '@/api';
import { ValueType } from '@/api';
import { PropertySchema } from '@/api/schema';
import { GraphPropertySchemaBuilderVisitor } from '@/core/io/schema';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import { CsvGraphPropertySchemaVisitor } from './CsvGraphPropertySchemaVisitor';
import * as fs from 'fs';
import * as path from 'path';

export class GraphPropertySchemaLoader {
  private readonly graphPropertySchemaPath: string;

  constructor(csvDirectory: string) {
    this.graphPropertySchemaPath = path.join(
      csvDirectory,
      CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load Map<String, PropertySchema> from CSV file.
   * Returns empty map if file doesn't exist.
   *
   * @returns Map of property schemas built from CSV schema file
   * @throws Error if file cannot be read or parsed
   */
  load(): Map<string, PropertySchema> {
    const schemaBuilder = new GraphPropertySchemaBuilderVisitor();

    try {
      // Return empty schema if file doesn't exist
      if (!fs.existsSync(this.graphPropertySchemaPath)) {
        schemaBuilder.close();
        return schemaBuilder.schema();
      }

      // Read CSV file line by line
      const fileContent = fs.readFileSync(this.graphPropertySchemaPath, 'utf-8');
      const lines = fileContent.trim().split('\n');

      if (lines.length === 0) {
        schemaBuilder.close();
        return schemaBuilder.schema();
      }

      // Parse header line
      const header = lines[0].split(',').map(col => col.trim());
      const propertyKeyIndex = header.indexOf('propertyKey');
      const valueTypeIndex = header.indexOf('valueType');
      const defaultValueIndex = header.indexOf('defaultValue');
      const stateIndex = header.indexOf('state');

      if (propertyKeyIndex === -1) {
        throw new Error('Missing required "propertyKey" column in graph property schema');
      }

      // Process each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;

        const schemaLine = this.parseSchemaLine(line, {
          propertyKeyIndex,
          valueTypeIndex,
          defaultValueIndex,
          stateIndex
        });

        // Build schema using visitor pattern
        schemaBuilder.key(schemaLine.propertyKey);
        schemaBuilder.valueType(schemaLine.valueType);
        schemaBuilder.defaultValue(
          DefaultValueIOHelper.deserialize(schemaLine.defaultValue, schemaLine.valueType, true)
        );
        schemaBuilder.state(schemaLine.state);

        schemaBuilder.endOfEntity();
      }

    } catch (error) {
      throw new Error(`Failed to load graph property schema: ${(error as Error).message}`);
    }

    schemaBuilder.close();
    return schemaBuilder.schema();
  }

  /**
   * Parse a single CSV line into a PropertySchemaLine object.
   */
  private parseSchemaLine(line: string, indices: ColumnIndices): PropertySchemaLine {
    const columns = line.split(',').map(col => col.trim());

    const propertyKey = columns[indices.propertyKeyIndex] || '';

    const valueType = indices.valueTypeIndex >= 0 && columns[indices.valueTypeIndex]
      ? this.parseValueType(columns[indices.valueTypeIndex])
      : ValueType.STRING; // Default value type

    const defaultValue = indices.defaultValueIndex >= 0 && columns[indices.defaultValueIndex]
      ? columns[indices.defaultValueIndex]
      : null;

    const state = indices.stateIndex >= 0 && columns[indices.stateIndex]
      ? this.parsePropertyState(columns[indices.stateIndex])
      : PropertyState.PERSISTENT; // Default state

    return new PropertySchemaLine(propertyKey, valueType, defaultValue, state);
  }

  private parseValueType(valueTypeStr: string): ValueType {
    switch (valueTypeStr.toUpperCase()) {
      case 'LONG': return ValueType.LONG;
      case 'DOUBLE': return ValueType.DOUBLE;
      case 'STRING': return ValueType.STRING;
      case 'BOOLEAN': return ValueType.BOOLEAN;
      case 'LONG_ARRAY': return ValueType.LONG_ARRAY;
      case 'DOUBLE_ARRAY': return ValueType.DOUBLE_ARRAY;
      case 'STRING_ARRAY': return ValueType.STRING_ARRAY;
      default:
        throw new Error(`Unknown ValueType: ${valueTypeStr}`);
    }
  }

  private parsePropertyState(stateStr: string): PropertyState {
    switch (stateStr.toUpperCase()) {
      case 'PERSISTENT': return PropertyState.PERSISTENT;
      case 'TRANSIENT': return PropertyState.TRANSIENT;
      default:
        throw new Error(`Unknown PropertyState: ${stateStr}`);
    }
  }
}

/**
 * Property schema line data structure.
 */
class PropertySchemaLine {
  constructor(
    public readonly propertyKey: string,
    public readonly valueType: ValueType,
    public readonly defaultValue: string | null,
    public readonly state: PropertyState
  ) {}
}

/**
 * Column indices for CSV parsing.
 */
interface ColumnIndices {
  propertyKeyIndex: number;
  valueTypeIndex: number;
  defaultValueIndex: number;
  stateIndex: number;
}
