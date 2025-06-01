/**
 * CSV NODE SCHEMA VISITOR - EXPORTS NODE SCHEMA TO CSV
 *
 * Visitor that exports node schema definitions to CSV file.
 * Records label, property key, value type, default value, and state for each property.
 */

import * as fs from "fs";
import * as path from "path";
import { ValueType } from "@/api";
import { PropertyState } from "@/api";
import { NodeSchemaVisitor } from "@/core/io/schema";
import { DefaultValueIOHelper } from "./DefaultValueIOHelper";

export class CsvNodeSchemaVisitor extends NodeSchemaVisitor {
  static readonly LABEL_COLUMN_NAME = "label";
  static readonly PROPERTY_KEY_COLUMN_NAME = "propertyKey";
  static readonly VALUE_TYPE_COLUMN_NAME = "valueType";
  static readonly DEFAULT_VALUE_COLUMN_NAME = "defaultValue";
  static readonly STATE_COLUMN_NAME = "state";

  static readonly NODE_SCHEMA_FILE_NAME = "node-schema.csv";

  static readonly NODE_SCHEMA_COLUMNS = [
    CsvNodeSchemaVisitor.LABEL_COLUMN_NAME,
    CsvNodeSchemaVisitor.PROPERTY_KEY_COLUMN_NAME,
    CsvNodeSchemaVisitor.VALUE_TYPE_COLUMN_NAME,
    CsvNodeSchemaVisitor.DEFAULT_VALUE_COLUMN_NAME,
    CsvNodeSchemaVisitor.STATE_COLUMN_NAME,
  ];

  private readonly csvFilePath: string;
  private readonly csvRows: string[] = [];

  constructor(fileLocation: string) {
    super();
    this.csvFilePath = path.join(
      fileLocation,
      CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME
    );
    this.writeHeader();
  }

  protected export(): void {
    const row: string[] = [];
    const label = this.nodeLabel();

    if (label === null) {
      return; // Skip if no label
    }

    row.push(label.name());

    if (this.key() !== null) {
      row.push(this.key()!);
      row.push(ValueType.csvName(this.valueType()));
      row.push(DefaultValueIOHelper.serialize(this.defaultValue()));
      row.push(PropertyState.name(this.state()));``
      // Add empty columns for properties when no property is defined
      row.push(""); // propertyKey
      row.push(""); // valueType
      row.push(""); // defaultValue
      row.push(""); // state
    }

    this.csvRows.push(this.formatCsvRow(row));
  }

  close(): void {
    try {
      fs.writeFileSync(this.csvFilePath, this.csvRows.join("\n"), "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to write node schema CSV: ${(error as Error).message}`
      );
    }
  }

  private writeHeader(): void {
    this.csvRows.push(
      this.formatCsvRow(CsvNodeSchemaVisitor.NODE_SCHEMA_COLUMNS)
    );
  }

  private formatCsvRow(values: string[]): string {
    // Simple CSV formatting - escape quotes and wrap in quotes if needed
    return values
      .map((value) => {
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  }
}
