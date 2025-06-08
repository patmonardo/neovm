import { CsvNodeLabelMappingVisitor } from "./CsvNodeLabelMappingVisitor";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

/**
 * NodeLabelMappingLoader using Papa Parse for robust CSV parsing.
 * Maps node indices to label strings for efficient label lookup.
 */
export class NodeLabelMappingLoader {
  private readonly labelMappingPath: string;

  constructor(csvDirectory: string) {
    this.labelMappingPath = path.join(
      csvDirectory,
      CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME
    );
  }

  /**
   * Load node label mapping from CSV file using Papa Parse.
   * Returns empty Map if file doesn't exist.
   */
  load(): Map<string, string> | null {
    if (!fs.existsSync(this.labelMappingPath)) {
      return null;
    }

    try {
      const csvContent = fs.readFileSync(this.labelMappingPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false,
      });

      if (result.errors.length > 0) {
        console.warn(`CSV parsing errors in ${this.labelMappingPath}:`, result.errors);
      }

      const rows = result.data as NodeLabelMappingRow[];

      if (rows.length === 0) {
        return new Map<string, string>();
      }

      return this.buildMapping(rows);
    } catch (error) {
      throw new Error(`Failed to load node label mapping: ${(error as Error).message}`);
    }
  }

  /**
   * 🧪 Simple debug method for basic file checking.
   */
  debug(): void {
    console.log("🏷️ === NodeLabelMappingLoader Debug ===");
    console.log(`📁 File: ${this.labelMappingPath}`);
    console.log(`📄 Exists: ${fs.existsSync(this.labelMappingPath)}`);

    if (fs.existsSync(this.labelMappingPath)) {
      try {
        const mapping = this.load();
        if (mapping) {
          console.log(`✅ Loaded ${mapping.size} label mappings`);
          // Show first few mappings
          let count = 0;
          for (const [index, label] of mapping.entries()) {
            if (count < 3) {
              console.log(`  ${index} -> ${label}`);
            }
            count++;
          }
          if (mapping.size > 3) {
            console.log(`  ... and ${mapping.size - 3} more mappings`);
          }
        } else {
          console.log("📄 File not found, returned null");
        }
      } catch (error) {
        console.log(`❌ Load failed: ${(error as Error).message}`);
      }
    }
    console.log("🏷️ === End Debug ===\n");
  }

  /**
   * 🏗️ Build mapping from parsed CSV rows.
   */
  private buildMapping(rows: NodeLabelMappingRow[]): Map<string, string> {
    const mapping = new Map<string, string>();

    for (const row of rows) {
      this.validateRow(row);
      mapping.set(row.index, row.label);
    }

    return mapping;
  }

  /**
   * 🔧 Validate CSV row data.
   */
  private validateRow(row: NodeLabelMappingRow): void {
    if (!row.index || row.index.trim() === "") {
      throw new Error("Missing required field: index");
    }
    if (!row.label || row.label.trim() === "") {
      throw new Error("Missing required field: label");
    }
  }
}

/**
 * 🧩 Interface for node label mapping CSV rows.
 */
interface NodeLabelMappingRow {
  index: string;
  label: string;
}
