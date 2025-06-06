/**
 * GRAPH CAPABILITIES LOADER - CSV CAPABILITIES PARSER
 *
 * Simple loader with single load() method that reads CSV capabilities files.
 * Uses simplified CapabilitiesDTO instead of complex Jackson mapping.
 */

import { WriteMode } from "@/core/loading/Capabilities";
import { Capabilities } from "@/core/loading/Capabilities";
import { StaticCapabilities } from "@/core/loading/StaticCapabilities";
import { CapabilitiesDTO } from "./CapabilitiesDTO";
import { CsvGraphCapabilitiesWriter } from "./CsvGraphCapabilitiesWriter";
import * as fs from "fs";
import * as path from "path";

export class GraphCapabilitiesLoader {
  private readonly capabilitiesPath: string;

  constructor(csvDirectory: string) {
    this.capabilitiesPath = path.join(
      csvDirectory,
      CsvGraphCapabilitiesWriter.GRAPH_CAPABILITIES_FILE_NAME
    );
  }

  /**
   * Load Capabilities from CSV file.
   * Returns default StaticCapabilities if file doesn't exist.
   *
   * @returns Capabilities loaded from CSV or default instance
   * @throws Error if file cannot be read or parsed
   */
  load(): Capabilities {
    try {
      // Return default if file doesn't exist
      if (!fs.existsSync(this.capabilitiesPath)) {
        return StaticCapabilities.of();
      }

      // Read and parse CSV file
      const fileContent = fs.readFileSync(this.capabilitiesPath, "utf-8");
      const lines = fileContent.trim().split("\n");

      if (lines.length < 2) {
        // Empty or header-only file, return default
        return StaticCapabilities.of();
      }

      // Parse header and data
      const header = lines[0].split(",").map((col) => col.trim());
      const data = lines[1].split(",").map((col) => col.trim());

      const writeMode = this.parseWriteMode(header, data);
      return CapabilitiesDTO.of(writeMode);
    } catch (error) {
      throw new Error(
        `Failed to load graph capabilities: ${(error as Error).message}`
      );
    }
  }

  /**
   * Parse WriteMode from CSV header/data.
   */
  private parseWriteMode(header: string[], data: string[]): any {
    const writeModeIndex = header.indexOf("writeMode");

    if (writeModeIndex >= 0 && writeModeIndex < data.length) {
      const writeModeStr = data[writeModeIndex];

      switch (writeModeStr.toUpperCase()) {
        case "LOCAL":
          return WriteMode.LOCAL;
        case "REMOTE":
          return WriteMode.REMOTE;
        case "NONE":
          return WriteMode.NONE;
        default:
          console.warn(`Unknown WriteMode: ${writeModeStr}, using LOCAL`);
          return WriteMode.LOCAL;
      }
    }

    return WriteMode.LOCAL; // Default
  }
}
