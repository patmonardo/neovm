import { CsvRelationshipTypeMappingVisitor } from "./CsvRelationshipTypeMappingVisitor";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

/**
 * RelationshipTypeMappingLoader using Papa Parse for robust CSV parsing.
 * Maps relationship type indices to type strings for efficient type lookup.
 */
export class RelationshipTypeMappingLoader {
  private readonly typeMappingPath: string;

  constructor(csvDirectory: string) {
    this.typeMappingPath = path.join(
      csvDirectory,
      CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME
    );
  }

  /**
   * Load relationship type mapping from CSV file using Papa Parse.
   * Returns empty Map if file doesn't exist.
   */
  load(): Map<string, string> | null {
    if (!fs.existsSync(this.typeMappingPath)) {
      return null;
    }

    try {
      const csvContent = fs.readFileSync(this.typeMappingPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false,
      });

      if (result.errors.length > 0) {
        console.warn(
          `CSV parsing errors in ${this.typeMappingPath}:`,
          result.errors
        );
      }

      const rows = result.data as RelationshipTypeMappingRow[];

      if (rows.length === 0) {
        return new Map<string, string>();
      }

      return this.buildMapping(rows);
    } catch (error) {
      throw new Error(
        `Failed to load relationship type mapping: ${(error as Error).message}`
      );
    }
  }

  /**
   * 🧪 Simple debug method for basic file checking.
   */
  debug(): void {
    console.log("🔗 === RelationshipTypeMappingLoader Debug ===");
    console.log(`📁 File: ${this.typeMappingPath}`);
    console.log(`📄 Exists: ${fs.existsSync(this.typeMappingPath)}`);

    if (fs.existsSync(this.typeMappingPath)) {
      try {
        const mapping = this.load();
        if (mapping) {
          console.log(`✅ Loaded ${mapping.size} type mappings`);
          // Show first few mappings
          let count = 0;
          for (const [index, type] of mapping.entries()) {
            if (count < 3) {
              console.log(`  ${index} -> ${type}`);
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
    console.log("🔗 === End Debug ===\n");
  }

  /**
   * 🏗️ Build mapping from parsed CSV rows.
   */
  private buildMapping(
    rows: RelationshipTypeMappingRow[]
  ): Map<string, string> {
    const mapping = new Map<string, string>();

    for (const row of rows) {
      this.validateRow(row);
      mapping.set(row.index, row.type);
    }

    return mapping;
  }

  /**
   * 🔧 Validate CSV row data.
   */
  private validateRow(row: RelationshipTypeMappingRow): void {
    if (!row.index || row.index.trim() === "") {
      throw new Error("Missing required field: index");
    }
    if (!row.type || row.type.trim() === "") {
      throw new Error("Missing required field: type");
    }
  }
}

/**
 * 🧩 Interface for relationship type mapping CSV rows.
 */
interface RelationshipTypeMappingRow {
  index: string;
  type: string;
}
