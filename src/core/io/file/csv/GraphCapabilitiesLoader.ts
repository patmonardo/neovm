import { WriteMode } from "@/core/loading/Capabilities";
import { Capabilities } from "@/core/loading/Capabilities";
import { StaticCapabilities } from "@/core/loading/StaticCapabilities";
import { CapabilitiesDTO } from "./CapabilitiesDTO";
import { CsvGraphCapabilitiesWriter } from "./CsvGraphCapabilitiesWriter";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

/**
 * GraphCapabilitiesLoader using Papa Parse for robust CSV parsing.
 */
export class GraphCapabilitiesLoader {
  private readonly capabilitiesPath: string;

  constructor(csvDirectory: string) {
    this.capabilitiesPath = path.join(
      csvDirectory,
      CsvGraphCapabilitiesWriter.GRAPH_CAPABILITIES_FILE_NAME
    );
  }

  /**
   * Load Capabilities from CSV file using Papa Parse.
   * Returns default StaticCapabilities if file doesn't exist.
   */
  load(): Capabilities {
    try {
      // Return default if file doesn't exist
      if (!fs.existsSync(this.capabilitiesPath)) {
        return StaticCapabilities.of();
      }

      const csvContent = fs.readFileSync(this.capabilitiesPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false,
      });

      if (result.errors.length > 0) {
        console.warn(`CSV parsing errors in ${this.capabilitiesPath}:`, result.errors);
      }

      const rows = result.data as GraphCapabilitiesRow[];

      if (rows.length === 0) {
        // Empty file, return default
        return StaticCapabilities.of();
      }

      // Use first row (should only be one row for capabilities)
      const capabilitiesRow = rows[0];
      this.validateRow(capabilitiesRow);

      const writeMode = this.parseWriteMode(capabilitiesRow.writeMode || "LOCAL");

      // Create capabilities from parsed data
      return CapabilitiesDTO.of(writeMode);

    } catch (error) {
      throw new Error(`Failed to load graph capabilities: ${(error as Error).message}`);
    }
  }

  /**
   * 🧪 Simple debug method for basic file checking.
   */
  debug(): void {
    console.log("⚡ === GraphCapabilitiesLoader Debug ===");
    console.log(`📁 File: ${this.capabilitiesPath}`);
    console.log(`📄 Exists: ${fs.existsSync(this.capabilitiesPath)}`);

    if (fs.existsSync(this.capabilitiesPath)) {
      try {
        const capabilities = this.load();
        console.log(`✅ Loaded capabilities:`);
        console.log(`  Write Mode: ${capabilities.writeMode()}`);
        console.log(`  Can Write Local: ${capabilities.canWriteToLocalDatabase()}`);
        console.log(`  Can Write Remote: ${capabilities.canWriteToRemoteDatabase()}`);
      } catch (error) {
        console.log(`❌ Load failed: ${(error as Error).message}`);
      }
    } else {
      console.log("📄 No capabilities file - using defaults");
      const defaultCaps = StaticCapabilities.of();
      console.log(`  Default Write Mode: ${defaultCaps.writeMode()}`);
      console.log(`  Default Can Write Local: ${defaultCaps.canWriteToLocalDatabase()}`);
      console.log(`  Default Can Write Remote: ${defaultCaps.canWriteToRemoteDatabase()}`);
    }
    console.log("⚡ === End Debug ===\n");
  }

  /**
   * 🔧 Validate CSV row data.
   */
  private validateRow(row: GraphCapabilitiesRow): void {
    // All fields are optional with defaults, so just check structure
    if (typeof row !== 'object' || row === null) {
      throw new Error("Invalid capabilities row data");
    }
  }

  /**
   * 🔧 Parse WriteMode from string.
   */
  private parseWriteMode(writeModeStr: string): WriteMode {
    if (!writeModeStr || writeModeStr.trim() === "") {
      return WriteMode.LOCAL; // Default
    }

    switch (writeModeStr.toUpperCase()) {
      case "LOCAL": return WriteMode.LOCAL;
      case "REMOTE": return WriteMode.REMOTE;
      case "NONE": return WriteMode.NONE;
      default:
        console.warn(`Unknown WriteMode: ${writeModeStr}, using LOCAL`);
        return WriteMode.LOCAL;
    }
  }
}

/**
 * 🧩 Interface for graph capabilities CSV rows.
 */
interface GraphCapabilitiesRow {
  canWriteToDatabase?: string;
  canWriteToLocalFile?: string;
  writeMode?: string;
}
