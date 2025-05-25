import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { Capabilities } from '@/core/loading/Capabilities';
import { ImmutableStaticCapabilities, CapabilitiesDTO } from './ImmutableStaticCapabilities';
import { CsvGraphCapabilitiesWriter } from './CsvGraphCapabilitiesWriter';

/**
 * Loader for graph capabilities from CSV files.
 * Handles reading and parsing capabilities configuration from CSV format.
 */
export class GraphCapabilitiesLoader {
  private readonly capabilitiesPath: string;

  constructor(csvDirectory: string) {
    this.capabilitiesPath = path.join(csvDirectory, CsvGraphCapabilitiesWriter.GRAPH_CAPABILITIES_FILE_NAME);
  }

  /**
   * Load capabilities from CSV file.
   * Returns default capabilities if file doesn't exist.
   */
  async load(): Promise<Capabilities> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.capabilitiesPath)) {
        return ImmutableStaticCapabilities.builder().build();
      }

      const capabilitiesDTO = await this.parseCsvFile();
      return ImmutableStaticCapabilities.fromDTO(capabilitiesDTO);
    } catch (error) {
      throw new Error(`Failed to load capabilities from ${this.capabilitiesPath}: ${error}`);
    }
  }

  /**
   * Parse CSV file and return DTO.
   */
  private async parseCsvFile(): Promise<CapabilitiesDTO> {
    return new Promise((resolve, reject) => {
      let capabilitiesDTO: CapabilitiesDTO = {};
      let recordCount = 0;

      fs.createReadStream(this.capabilitiesPath)
        .pipe(csv({
          headers: true,
          skipEmptyLines: true,
          strict: false, // Equivalent to withStrictHeaders(false)
        }))
        .on('data', (row) => {
          recordCount++;

          // Parse the first row (should only be one record)
          if (recordCount === 1) {
            capabilitiesDTO = this.parseCapabilitiesRow(row);
          }
        })
        .on('end', () => {
          resolve(capabilitiesDTO);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse a single CSV row into CapabilitiesDTO.
   */
  private parseCapabilitiesRow(row: any): CapabilitiesDTO {
    const dto: CapabilitiesDTO = {};

    // Parse writeMode
    if (row.writeMode && typeof row.writeMode === 'string') {
      const trimmedWriteMode = row.writeMode.trim();
      if (trimmedWriteMode && trimmedWriteMode in Capabilities.WriteMode) {
        dto.writeMode = trimmedWriteMode;
      }
    }

    // Parse canWriteToLocalDatabase
    if (row.canWriteToLocalDatabase !== undefined) {
      dto.canWriteToLocalDatabase = this.parseBooleanValue(row.canWriteToLocalDatabase);
    }

    // Parse canWriteToRemoteDatabase
    if (row.canWriteToRemoteDatabase !== undefined) {
      dto.canWriteToRemoteDatabase = this.parseBooleanValue(row.canWriteToRemoteDatabase);
    }

    return dto;
  }

  /**
   * Parse boolean value from CSV (handles string representations).
   */
  private parseBooleanValue(value: any): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
    }

    return undefined;
  }
}
