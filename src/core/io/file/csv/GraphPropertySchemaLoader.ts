import { PropertyState } from '@/api';
import { ValueType } from '@/api';
import { PropertySchema } from '@/api/schema';
import { GraphPropertySchemaBuilderVisitor } from '@/core/io/schema';
import { DefaultValueIOHelper } from './DefaultValueIOHelper';
import { CsvGraphPropertySchemaVisitor } from './CsvGraphPropertySchemaVisitor';
import * as fs from 'fs';
import * as path from 'path';
import Papa from "papaparse";

/**
 * GraphPropertySchemaLoader using Papa Parse for robust CSV parsing.
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
   * Load Map<String, PropertySchema> from CSV file using Papa Parse.
   * Returns empty map if file doesn't exist.
   */
  load(): Map<string, PropertySchema> {
    const schemaBuilder = new GraphPropertySchemaBuilderVisitor();

    try {
      // Return empty schema if file doesn't exist
      if (!fs.existsSync(this.graphPropertySchemaPath)) {
        schemaBuilder.close();
        return schemaBuilder.schema();
      }

      const csvContent = fs.readFileSync(this.graphPropertySchemaPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false,
      });

      if (result.errors.length > 0) {
        console.warn(`CSV parsing errors in ${this.graphPropertySchemaPath}:`, result.errors);
      }

      const rows = result.data as GraphPropertySchemaRow[];

      // Process each row
      for (const row of rows) {
        this.validateRow(row);

        schemaBuilder.key(row.propertyKey);
        schemaBuilder.valueType(this.parseValueType(row.valueType || "STRING"));
        schemaBuilder.state(this.parsePropertyState(row.state || "PERSISTENT"));

        // Handle default value if present
        if (row.defaultValue && row.defaultValue.trim() !== "") {
          const valueType = this.parseValueType(row.valueType || "STRING");
          const isArray = this.isArrayType(valueType);
          const defaultValue = DefaultValueIOHelper.deserialize(
            row.defaultValue,
            valueType,
            isArray
          );
          schemaBuilder.defaultValue(defaultValue);
        }

        schemaBuilder.endOfEntity();
      }

      schemaBuilder.close();
      return schemaBuilder.schema();

    } catch (error) {
      throw new Error(`Failed to load graph property schema: ${(error as Error).message}`);
    }
  }

  /**
   * 🧪 Simple debug method for basic file checking.
   */
  debug(): void {
    console.log("🌐 === GraphPropertySchemaLoader Debug ===");
    console.log(`📁 File: ${this.graphPropertySchemaPath}`);
    console.log(`📄 Exists: ${fs.existsSync(this.graphPropertySchemaPath)}`);

    if (fs.existsSync(this.graphPropertySchemaPath)) {
      try {
        const schema = this.load();
        console.log(`✅ Loaded ${schema.size} graph properties`);

        // Show first few properties
        let count = 0;
        for (const [key, propSchema] of schema.entries()) {
          if (count < 3) {
            const valueType = ValueType.csvName(propSchema.valueType());
            const state = PropertyState.name(propSchema.state());
            const hasDefault = propSchema.defaultValue() !== null;
            console.log(`  ${key}: ${valueType} (${state}) ${hasDefault ? 'has default' : 'no default'}`);
          }
          count++;
        }
        if (schema.size > 3) {
          console.log(`  ... and ${schema.size - 3} more properties`);
        }
      } catch (error) {
        console.log(`❌ Load failed: ${(error as Error).message}`);
      }
    }
    console.log("🌐 === End Debug ===\n");
  }

  /**
   * 🔧 Validate CSV row data.
   */
  private validateRow(row: GraphPropertySchemaRow): void {
    if (!row.propertyKey || row.propertyKey.trim() === "") {
      throw new Error("Missing required field: propertyKey");
    }
  }

  private parseValueType(valueTypeStr: string): ValueType {
    if (!valueTypeStr || valueTypeStr.trim() === "") {
      return ValueType.STRING; // Default value type
    }

    switch (valueTypeStr.toUpperCase()) {
      case "LONG": return ValueType.LONG;
      case "DOUBLE": return ValueType.DOUBLE;
      case "STRING": return ValueType.STRING;
      case "BOOLEAN": return ValueType.BOOLEAN;
      case "LONG_ARRAY": return ValueType.LONG_ARRAY;
      case "DOUBLE_ARRAY": return ValueType.DOUBLE_ARRAY;
      case "STRING_ARRAY": return ValueType.STRING_ARRAY;
      case "FLOAT_ARRAY": return ValueType.FLOAT_ARRAY;
      default:
        throw new Error(`Unknown ValueType: ${valueTypeStr}`);
    }
  }

  private parsePropertyState(stateStr: string): PropertyState {
    if (!stateStr || stateStr.trim() === "") {
      return PropertyState.PERSISTENT; // Default state
    }

    switch (stateStr.toUpperCase()) {
      case "PERSISTENT": return PropertyState.PERSISTENT;
      case "TRANSIENT": return PropertyState.TRANSIENT;
      default:
        throw new Error(`Unknown PropertyState: ${stateStr}`);
    }
  }

  private isArrayType(valueType: ValueType): boolean {
    switch (valueType) {
      case ValueType.LONG_ARRAY:
      case ValueType.DOUBLE_ARRAY:
      case ValueType.STRING_ARRAY:
      case ValueType.FLOAT_ARRAY:
        return true;
      default:
        return false;
    }
  }
}

/**
 * 🧩 Interface for graph property schema CSV rows.
 */
interface GraphPropertySchemaRow {
  propertyKey: string;
  valueType: string;
  defaultValue: string;
  state: string;
}
