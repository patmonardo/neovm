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

export class NodeSchemaLoader {
  private readonly nodeSchemaPath: string;

  constructor(csvDirectory: string) {
    this.nodeSchemaPath = path.join(
      csvDirectory,
      CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load MutableNodeSchema from CSV file.
   *
   * @returns MutableNodeSchema built from CSV schema file
   * @throws Error if file cannot be read or parsed
   */
  load(): MutableNodeSchema {
    const schemaBuilder = new NodeSchemaBuilderVisitor();

    try {
      // Read CSV file line by line
      const fileContent = fs.readFileSync(this.nodeSchemaPath, "utf-8");
      const lines = fileContent.trim().split("\n");

      if (lines.length === 0) {
        throw new Error("Node schema file is empty");
      }

      // Parse header line
      const header = lines[0].split(",").map((col) => col.trim());
      const labelIndex = header.indexOf("label");
      const propertyKeyIndex = header.indexOf("propertyKey");
      const valueTypeIndex = header.indexOf("valueType");
      const defaultValueIndex = header.indexOf("defaultValue");
      const stateIndex = header.indexOf("state");

      if (labelIndex === -1) {
        throw new Error('Missing required "label" column in node schema');
      }

      // Process each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        const schemaLine = this.parseSchemaLine(line, {
          labelIndex,
          propertyKeyIndex,
          valueTypeIndex,
          defaultValueIndex,
          stateIndex,
        });

        // Build schema using visitor pattern
        schemaBuilder.nodeLabel(schemaLine.label);

        if (schemaLine.propertyKey !== null) {
          schemaBuilder.key(schemaLine.propertyKey);
          schemaBuilder.valueType(schemaLine.valueType!);
          schemaBuilder.defaultValue(
            DefaultValueIOHelper.deserialize(
              schemaLine.defaultValue,
              schemaLine.valueType!,
              true
            )
          );
          schemaBuilder.state(schemaLine.state!);
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

  /**
   * Parse a single CSV line into a SchemaLine object.
   */
  private parseSchemaLine(line: string, indices: ColumnIndices): SchemaLine {
    const columns = line.split(",").map((col) => col.trim());

    const label = NodeLabel.of(columns[indices.labelIndex] || "");

    const propertyKey =
      indices.propertyKeyIndex >= 0 && columns[indices.propertyKeyIndex]
        ? columns[indices.propertyKeyIndex]
        : null;

    const valueType =
      indices.valueTypeIndex >= 0 && columns[indices.valueTypeIndex]
        ? this.parseValueType(columns[indices.valueTypeIndex])
        : null;

    const defaultValue =
      indices.defaultValueIndex >= 0 && columns[indices.defaultValueIndex]
        ? columns[indices.defaultValueIndex]
        : null;

    const state =
      indices.stateIndex >= 0 && columns[indices.stateIndex]
        ? this.parsePropertyState(columns[indices.stateIndex])
        : null;

    return new SchemaLine(label, propertyKey, valueType, defaultValue, state);
  }

  private parseValueType(valueTypeStr: string): ValueType {
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
      default:
        throw new Error(`Unknown ValueType: ${valueTypeStr}`);
    }
  }

  private parsePropertyState(stateStr: string): PropertyState {
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

/**
 * Schema line data structure.
 */
class SchemaLine {
  constructor(
    public readonly label: NodeLabel,
    public readonly propertyKey: string | null,
    public readonly valueType: ValueType | null,
    public readonly defaultValue: string | null,
    public readonly state: PropertyState | null
  ) {}
}

/**
 * Column indices for CSV parsing.
 */
interface ColumnIndices {
  labelIndex: number;
  propertyKeyIndex: number;
  valueTypeIndex: number;
  defaultValueIndex: number;
  stateIndex: number;
}
