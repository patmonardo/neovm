import * as path from "path";
import * as fs from "fs";
import Papa from "papaparse";
import { Capabilities } from "@/core/loading/Capabilities";
import { CapabilitiesDTO } from "./CapabilitiesDTO";

/**
 * Writes graph capabilities to a CSV file using Papa Parse.
 * Consistent with our Papa Parse usage throughout the project.
 */
export class CsvGraphCapabilitiesWriter {
  public static readonly GRAPH_CAPABILITIES_FILE_NAME =
    "graph-capabilities.csv";

  private readonly fileLocation: string;

  constructor(fileLocation: string) {
    this.fileLocation = path.join(
      fileLocation,
      CsvGraphCapabilitiesWriter.GRAPH_CAPABILITIES_FILE_NAME
    );
  }

  /**
   * Write capabilities to CSV file using Papa Parse.
   */
  async write(capabilities: Capabilities): Promise<void> {
    try {
      const capabilitiesDTO = CapabilitiesDTO.from(capabilities);

      // 🚀 Papa Parse CSV generation
      const csvContent = Papa.unparse([capabilitiesDTO], {
        header: true, // Include column headers
        delimiter: ",", // Standard CSV delimiter
        newline: "\n", // Unix line endings
        skipEmptyLines: true, // Clean output
        quotes: false, // Only quote when necessary
        quoteChar: '"', // Standard quote character
        escapeChar: '"', // Standard escape character
        columns: [
          // Explicit column order
          "canWriteToDatabase",
          "canWriteToLocalFile",
          "writeMode",
          // Add other CapabilitiesDTO fields as needed
        ],
      });

      // 📁 Write to file (async version)
      await fs.promises.writeFile(this.fileLocation, csvContent, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to write capabilities to ${this.fileLocation}: ${error}`
      );
    }
  }

  /**
   * 🧩 Alternative: Synchronous write method
   */
  writeSync(capabilities: Capabilities): void {
    try {
      const capabilitiesDTO = CapabilitiesDTO.from(capabilities);

      const csvContent = Papa.unparse([capabilitiesDTO], {
        header: true,
        delimiter: ",",
        newline: "\n",
        skipEmptyLines: true,
      });

      fs.writeFileSync(this.fileLocation, csvContent, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to write capabilities to ${this.fileLocation}: ${error}`
      );
    }
  }

  /**
   * 🎪 Append capabilities to existing CSV file
   */
  async append(capabilities: Capabilities): Promise<void> {
    try {
      const capabilitiesDTO = CapabilitiesDTO.from(capabilities);

      // Check if file exists to determine if we need headers
      const fileExists = fs.existsSync(this.fileLocation);

      const csvContent = Papa.unparse([capabilitiesDTO], {
        header: !fileExists, // Only add headers if file doesn't exist
        delimiter: ",",
        newline: "\n",
        skipEmptyLines: true,
      });

      // Append to file
      await fs.promises.appendFile(
        this.fileLocation,
        (fileExists ? "\n" : "") + csvContent,
        "utf8"
      );
    } catch (error) {
      throw new Error(
        `Failed to append capabilities to ${this.fileLocation}: ${error}`
      );
    }
  }

  /**
   * 🔧 Write multiple capabilities records
   */
  async writeMultiple(capabilitiesList: Capabilities[]): Promise<void> {
    try {
      const capabilitiesDTOs = capabilitiesList.map((cap) =>
        CapabilitiesDTO.from(cap)
      );

      const csvContent = Papa.unparse(capabilitiesDTOs, {
        header: true,
        delimiter: ",",
        newline: "\n",
        skipEmptyLines: true,
      });

      await fs.promises.writeFile(this.fileLocation, csvContent, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to write multiple capabilities to ${this.fileLocation}: ${error}`
      );
    }
  }

  /**
   * 📊 Get the output file path
   */
  getFilePath(): string {
    return this.fileLocation;
  }

  /**
   * 🔍 Check if output file exists
   */
  exists(): boolean {
    return fs.existsSync(this.fileLocation);
  }
}

/**
 * Simple writer interface (equivalent to Java SimpleWriter<T>)
 */
export interface SimpleWriter<T> {
  write(item: T): Promise<void>;
}

/**
 * 🚀 Factory function for creating capabilities writers
 */
export function createCapabilitiesWriter(
  outputDirectory: string
): CsvGraphCapabilitiesWriter {
  return new CsvGraphCapabilitiesWriter(outputDirectory);
}
