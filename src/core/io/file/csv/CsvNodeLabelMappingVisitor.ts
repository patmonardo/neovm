import { NodeLabel } from "@/projection";
import * as fs from "fs";
import * as path from "path";

/**
 * CSV NODE LABEL MAPPING VISITOR - EXPORTS LABEL INDEX MAPPINGS
 *
 * Visitor that exports node label to index mappings to CSV file.
 * Used for memory-efficient label storage using indices instead of strings.
 */

// 🎯 Simple TypeScript interface instead of Map.Entry
interface LabelMapping {
  label: NodeLabel;
  index: string;
}

export class CsvNodeLabelMappingVisitor {
  private static readonly INDEX_HEADER = "index";
  private static readonly LABEL_HEADER = "label";
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

  // 🍫 Simple export method - no confusing generics
  export(mapping: LabelMapping): void {
    const row = [
      mapping.index,           // index value
      mapping.label.name(),    // label name
    ];

    this.csvRows.push(this.formatCsvRow(row));
  }

  // 🍫 Alternative: export individual values
  exportMapping(label: NodeLabel, index: string): void {
    const row = [index, label.name()];
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
        CsvNodeLabelMappingVisitor.INDEX_HEADER,
        CsvNodeLabelMappingVisitor.LABEL_HEADER,
      ])
    );
  }

  private formatCsvRow(values: string[]): string {
    // Proper CSV formatting with quote escaping
    return values
      .map((value) => {
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n") ||
          value.includes("\r")
        ) {
          // Escape quotes by doubling them, then wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  }
}
