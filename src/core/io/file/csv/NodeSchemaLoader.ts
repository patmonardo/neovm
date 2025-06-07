/**
 * NODE SCHEMA LOADER - CSV NODE SCHEMA PARSER
 *
 * Simple loader with single load() method that reads CSV node schema files.
 * Parses schema lines and builds MutableNodeSchema using visitor pattern.
 */

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

export class NodeSchemaLoader {
  private readonly nodeSchemaPath: string;

  constructor(csvDirectory: string) {
    this.nodeSchemaPath = path.join(
      csvDirectory,
      CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load MutableNodeSchema from CSV file using Papaparse.
   *
   * @returns MutableNodeSchema built from CSV schema file
   * @throws Error if file cannot be read or parsed
   */
  load(): MutableNodeSchema {
    const schemaBuilder = new NodeSchemaBuilderVisitor();

    try {
      if (!fs.existsSync(this.nodeSchemaPath)) {
        throw new Error(`Node schema file not found: ${this.nodeSchemaPath}`);
      }
      const fileContent = fs.readFileSync(this.nodeSchemaPath, "utf-8");

      const parseResult = Papa.parse(fileContent, {
        header: true, // Use the first row as header
        skipEmptyLines: true,
        transform: (value) => value.trim(), // Trim whitespace from values
      });

      if (parseResult.errors.length > 0) {
        const firstError = parseResult.errors[0];
        throw new Error(
          `CSV parsing error: ${firstError.message} on row ${firstError.row}`
        );
      }

      if (parseResult.data.length === 0) {
        throw new Error("Node schema file is empty or contains only a header.");
      }

      console.log(
        `Node schema header from Papaparse: ${parseResult.meta.fields?.join(
          ", "
        )}`
      );

      // Process each data row
      for (const row of parseResult.data as any[]) {
        // Cast to any[] to access properties by header name
        const labelStr = row["label"];
        const propertyKey = row["propertyKey"];
        const valueTypeStr = row["valueType"];
        const defaultValueStr = row["defaultValue"];
        const stateStr = row["state"];

        if (!labelStr) {
          console.warn("Skipping row with missing label:", row);
          continue;
        }
        const label = NodeLabel.of(labelStr);
        schemaBuilder.nodeLabel(label);

        if (propertyKey) {
          // Only process property if propertyKey exists
          const valueType = this.parseValueType(valueTypeStr);
          const state = this.parsePropertyState(stateStr);

          schemaBuilder.key(propertyKey);
          schemaBuilder.valueType(valueType);

          if (defaultValueStr && defaultValueStr.trim() !== "") {
            const isArray = this.isArrayType(valueType);
            schemaBuilder.defaultValue(
              DefaultValueIOHelper.deserialize(
                defaultValueStr,
                valueType,
                isArray // Pass the correctly determined isArray flag
              )
            );
          }
          schemaBuilder.state(state);
        }
        schemaBuilder.endOfEntity();
      }
    } catch (error) {
      throw new Error(
        `Failed to load node schema: ${(error as Error).message}`
      );
    }

    schemaBuilder.close();
    return schemaBuilder.schema();
  }

  private isArrayType(valueType: ValueType): boolean {
    switch (valueType) {
      case ValueType.LONG_ARRAY:
      case ValueType.DOUBLE_ARRAY:
      case ValueType.STRING_ARRAY:
      case ValueType.FLOAT_ARRAY: // Assuming you have FLOAT_ARRAY
        return true;
      default:
        return false;
    }
  }

  private parseValueType(valueTypeStr: string | undefined): ValueType {
    if (!valueTypeStr)
      throw new Error("ValueType string is undefined or empty");
    switch (valueTypeStr.toUpperCase()) {
      case "LONG":
        return ValueType.LONG;
      case "DOUBLE":
        return ValueType.DOUBLE;
      case "STRING":
        return ValueType.STRING;
      case "BOOLEAN":
        return ValueType.BOOLEAN;
      case "LONG_ARRAY":
        return ValueType.LONG_ARRAY;
      case "DOUBLE_ARRAY":
        return ValueType.DOUBLE_ARRAY;
      case "STRING_ARRAY":
        return ValueType.STRING_ARRAY;
      case "FLOAT_ARRAY": // Assuming you have FLOAT_ARRAY
        return ValueType.FLOAT_ARRAY;
      default:
        throw new Error(`Unknown ValueType: ${valueTypeStr}`);
    }
  }

  private parsePropertyState(stateStr: string | undefined): PropertyState {
    if (!stateStr)
      throw new Error("PropertyState string is undefined or empty");
    switch (stateStr.toUpperCase()) {
      case "PERSISTENT":
        return PropertyState.PERSISTENT;
      case "TRANSIENT":
        return PropertyState.TRANSIENT;
      default:
        throw new Error(`Unknown PropertyState: ${stateStr}`);
    }
  }
}
