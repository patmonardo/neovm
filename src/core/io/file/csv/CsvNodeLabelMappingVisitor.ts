/**
 * CSV NODE LABEL MAPPING VISITOR - EXPORTS LABEL INDEX MAPPINGS
 *
 * SimpleVisitor that exports node label to index mappings to CSV file.
 * Used for memory-efficient label storage using indices instead of strings.
 */

import { NodeLabel } from "@/projection";
import { SimpleVisitor } from "@/core/io/schema";
import * as fs from "fs";
import * as path from "path";

export class CsvNodeLabelMappingVisitor
  implements SimpleVisitor<Map.Entry<NodeLabel, string>>
{
  private static readonly LABEL_MAPPING = "index";
  private static readonly LABEL_COLUMN_NAME = "label";
  static readonly LABEL_MAPPING_FILE_NAME = "label-mappings.csv";

  private readonly csvFilePath: string;
  private readonly csvRows: string[] = [];

  constructor(fileLocation: string) {
    this.csvFilePath = path.join(
      fileLocation,
      CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME
    );
    this.writeHeader();
  }

  export(nodeLabelMapping: Map.Entry<NodeLabel, string>): void {
    const row = [
      nodeLabelMapping.getValue(), // index
      nodeLabelMapping.getKey().name(), // label name
    ];

    this.csvRows.push(this.formatCsvRow(row));
  }

  close(): void {
    try {
      fs.writeFileSync(this.csvFilePath, this.csvRows.join("\n"), "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to write label mapping CSV: ${(error as Error).message}`
      );
    }
  }

  private writeHeader(): void {
    this.csvRows.push(
      this.formatCsvRow([
        CsvNodeLabelMappingVisitor.LABEL_MAPPING,
        CsvNodeLabelMappingVisitor.LABEL_COLUMN_NAME,
      ])
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
