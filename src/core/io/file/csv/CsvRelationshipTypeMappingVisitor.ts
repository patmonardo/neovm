import * as fs from "fs";
import * as path from "path";
import { RelationshipType } from "@/projection";

/**
 * Simple TypeScript interface for relationship type mappings
 */
interface RelationshipTypeMapping {
  type: RelationshipType;
  index: string;
}

/**
 * CSV visitor that exports relationship type mappings to a CSV file.
 * Maps relationship types to their string representations.
 */
export class CsvRelationshipTypeMappingVisitor {
  private static readonly INDEX_COLUMN_NAME = "index";
  private static readonly TYPE_COLUMN_NAME = "type";
  static readonly TYPE_MAPPING_FILE_NAME = "type-mappings.csv";

  private readonly csvWriter: fs.WriteStream;
  private readonly fileLocation: string;

  constructor(fileLocation: string) {
    this.fileLocation = path.join(
      fileLocation,
      CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME
    );

    try {
      this.csvWriter = fs.createWriteStream(this.fileLocation, {
        encoding: "utf8",
        flags: "w",
      });

      this.writeHeader();
    } catch (error) {
      throw new Error(
        `Failed to create CSV writer for ${this.fileLocation}: ${error}`
      );
    }
  }

  /**
   * Export a relationship type mapping.
   */
  export(mapping: RelationshipTypeMapping): void {
    const row = [
      mapping.index,           // mapping index (e.g., "0", "1", "2")
      mapping.type.name(),     // relationship type name (e.g., "KNOWS", "WORKS_AT")
    ];

    this.writeRecord(row);
  }

  /**
   * Convenience method to export type and index separately.
   */
  exportMapping(type: RelationshipType, index: string): void {
    this.export({ type, index });
  }

  /**
   * Close the CSV writer.
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.csvWriter.end((error?: Error) => {
        if (error) {
          reject(new Error(`Failed to close CSV writer: ${error}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Write CSV header row.
   */
  private writeHeader(): void {
    this.writeRecord([
      CsvRelationshipTypeMappingVisitor.INDEX_COLUMN_NAME,
      CsvRelationshipTypeMappingVisitor.TYPE_COLUMN_NAME,
    ]);
  }

  /**
   * Write a record to the CSV file.
   */
  private writeRecord(record: string[]): void {
    const csvLine =
      record.map((field) => this.escapeCsvField(field)).join(",") + "\n";
    this.csvWriter.write(csvLine);
  }

  /**
   * Escape CSV field values.
   */
  private escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
