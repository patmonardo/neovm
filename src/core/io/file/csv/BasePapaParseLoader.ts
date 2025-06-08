import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

/**
 * Base class for all Papa Parse CSV loaders.
 * Provides common CSV loading functionality.
 */
export abstract class BasePapaParseLoader<T> {
  protected readonly filePath: string;
  protected readonly fileName: string;

  constructor(importPath: string, fileName: string) {
    this.fileName = fileName;
    this.filePath = path.join(importPath, fileName);
  }

  /**
   * 🚀 Load and parse CSV file using Papa Parse.
   */
  protected loadCsv(): T[] {
    try {
      if (!fs.existsSync(this.filePath)) {
        throw new Error(`File not found: ${this.filePath}`);
      }

      const csvContent = fs.readFileSync(this.filePath, "utf8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value, field) => this.transformValue(value, field),
        transformHeader: (header) => this.transformHeader(header),
      });

      if (result.errors.length > 0) {
        this.handleParseErrors(result.errors);
      }

      const data = result.data as T[];
      return this.postProcessData(data);

    } catch (error) {
      throw new Error(`Failed to load ${this.fileName}: ${error}`);
    }
  }

  /**
   * 🔧 Transform individual field values during parsing.
   */
  protected transformValue(value: string, field: string): any {
    return value.trim();
  }

  /**
   * 📋 Transform header names during parsing.
   */
  protected transformHeader(header: string): string {
    return header.trim();
  }

  /**
   * ⚠️ Handle CSV parsing errors.
   */
  protected handleParseErrors(errors: Papa.ParseError[]): void {
    console.warn(`CSV parsing errors in ${this.fileName}:`, errors);
  }

  /**
   * 🧩 Post-process loaded data (validation, transformation).
   */
  protected postProcessData(data: T[]): T[] {
    return data;
  }

  /**
   * 🔍 Debug CSV file structure and content.
   */
  debug(): void {
    try {
      console.log(`📄 ${this.constructor.name} Debug:`);
      console.log(`  File: ${this.filePath}`);
      console.log(`  Exists: ${fs.existsSync(this.filePath)}`);

      if (fs.existsSync(this.filePath)) {
        const csvContent = fs.readFileSync(this.filePath, "utf8");
        console.log(`  Size: ${csvContent.length} characters`);

        const result = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
        });

        console.log(`  Rows: ${result.data.length}`);
        console.log(`  Headers: ${result.meta.fields?.join(', ')}`);
        console.log(`  Errors: ${result.errors.length}`);

        if (result.data.length > 0) {
          console.log("  Sample data:");
          result.data.slice(0, 3).forEach((row, index) => {
            console.log(`    [${index}]: ${JSON.stringify(row)}`);
          });
        }
      }

    } catch (error) {
      console.log(`❌ Debug failed: ${error}`);
    }
  }
}
