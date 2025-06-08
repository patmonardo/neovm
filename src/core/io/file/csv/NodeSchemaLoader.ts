import { NodeLabel } from "@/projection";
import { PropertyState } from "@/api";
import { ValueType } from "@/api";
import { MutableNodeSchema } from "@/api/schema";
import { NodeSchemaBuilderVisitor } from "@/core/io/schema";
import { DefaultValueIOHelper } from "./DefaultValueIOHelper";
import { CsvNodeSchemaVisitor } from "./CsvNodeSchemaVisitor";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

/**
 * NodeSchemaLoader using Papa Parse for robust CSV parsing.
 */
export class NodeSchemaLoader {
  private readonly nodeSchemaPath: string;

  constructor(csvDirectory: string) {
    this.nodeSchemaPath = path.join(
      csvDirectory,
      CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load MutableNodeSchema from CSV file using Papa Parse.
   */
  load(): MutableNodeSchema {
    try {
      if (!fs.existsSync(this.nodeSchemaPath)) {
        throw new Error(`Node schema file not found: ${this.nodeSchemaPath}`);
      }

      const csvContent = fs.readFileSync(this.nodeSchemaPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false,
      });

      if (result.errors.length > 0) {
        console.warn(`CSV parsing errors in ${this.nodeSchemaPath}:`, result.errors);
      }

      const rows = result.data as NodeSchemaRow[];

      if (rows.length === 0) {
        throw new Error("Node schema file is empty or contains only headers");
      }

      return this.buildNodeSchema(rows);
    } catch (error) {
      throw new Error(`Failed to load node schema: ${(error as Error).message}`);
    }
  }

  /**
   * 🧪 Simple debug method for basic file checking.
   */
  debug(): void {
    console.log("📋 === NodeSchemaLoader Debug ===");
    console.log(`📁 File: ${this.nodeSchemaPath}`);
    console.log(`📄 Exists: ${fs.existsSync(this.nodeSchemaPath)}`);

    if (fs.existsSync(this.nodeSchemaPath)) {
      try {
        const nodeSchema = this.load();
        const labels = Array.from(nodeSchema.availableLabels());
        console.log(`✅ Loaded ${labels.length} labels: ${labels.map(l => l.name()).join(", ")}`);
      } catch (error) {
        console.log(`❌ Load failed: ${(error as Error).message}`);
      }
    }
    console.log("📋 === End Debug ===\n");
  }

  /**
   * 🏗️ Build MutableNodeSchema from parsed CSV rows.
   */
  private buildNodeSchema(rows: NodeSchemaRow[]): MutableNodeSchema {
    const schemaBuilder = new NodeSchemaBuilderVisitor();

    try {
      for (const row of rows) {
        this.validateRow(row);

        const label = NodeLabel.of(row.label);
        schemaBuilder.nodeLabel(label);

        if (row.propertyKey && row.propertyKey.trim() !== "") {
          schemaBuilder.key(row.propertyKey);
          schemaBuilder.valueType(this.parseValueType(row.valueType));
          schemaBuilder.state(this.parsePropertyState(row.state));

          if (row.defaultValue && row.defaultValue.trim() !== "") {
            const valueType = this.parseValueType(row.valueType);
            const isArray = this.isArrayType(valueType);
            const defaultValue = DefaultValueIOHelper.deserialize(
              row.defaultValue,
              valueType,
              isArray
            );
            schemaBuilder.defaultValue(defaultValue);
          }
        }

        schemaBuilder.endOfEntity();
      }

      schemaBuilder.close();
      return schemaBuilder.schema();
    } catch (error) {
      throw new Error(`Failed to build node schema: ${(error as Error).message}`);
    }
  }

  private validateRow(row: NodeSchemaRow): void {
    if (!row.label || row.label.trim() === "") {
      throw new Error("Missing required field: label");
    }

    if (row.propertyKey && row.propertyKey.trim() !== "") {
      if (!row.valueType || row.valueType.trim() === "") {
        throw new Error(`Missing valueType for property ${row.propertyKey} in label ${row.label}`);
      }
      if (!row.state || row.state.trim() === "") {
        throw new Error(`Missing state for property ${row.propertyKey} in label ${row.label}`);
      }
    }
  }

  private parseValueType(valueTypeStr: string): ValueType {
    if (!valueTypeStr || valueTypeStr.trim() === "") {
      throw new Error("ValueType string is undefined or empty");
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
      throw new Error("PropertyState string is undefined or empty");
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

interface NodeSchemaRow {
  label: string;
  propertyKey: string;
  valueType: string;
  defaultValue: string;
  state: string;
}
