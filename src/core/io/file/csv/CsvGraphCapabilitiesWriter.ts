import * as fs from 'fs';
import * as path from 'path';
import * as csvWriter from 'csv-writer';
import { Capabilities } from '@/core/loading/Capabilities';
import { CapabilitiesDTO } from './CapabilitiesDTO';

/**
 * Writes graph capabilities to a CSV file.
 * Replaces Jackson CSV with native TypeScript csv-writer.
 */
export class CsvGraphCapabilitiesWriter {
  public static readonly GRAPH_CAPABILITIES_FILE_NAME = 'graph-capabilities.csv';

  private readonly csvWriter: any;
  private readonly fileLocation: string;

  constructor(fileLocation: string) {
    this.fileLocation = path.join(fileLocation, CsvGraphCapabilitiesWriter.GRAPH_CAPABILITIES_FILE_NAME);

    // Replace Jackson CSV schema with csv-writer configuration
    this.csvWriter = csvWriter.createObjectCsvWriter({
      path: this.fileLocation,
      header: [
        { id: 'canWriteToDatabase', title: 'canWriteToDatabase' },
        { id: 'canWriteToLocalFile', title: 'canWriteToLocalFile' },
        { id: 'writeMode', title: 'writeMode' },
        // Add other CapabilitiesDTO fields as needed
      ]
    });
  }

  /**
   * Write capabilities to CSV file.
   */
  async write(capabilities: Capabilities): Promise<void> {
    try {
      const capabilitiesDTO = CapabilitiesDTO.from(capabilities);

      // Write single record (Jackson writeValue equivalent)
      await this.csvWriter.writeRecords([capabilitiesDTO]);

    } catch (error) {
      throw new Error(`Failed to write capabilities to ${this.fileLocation}: ${error}`);
    }
  }
}

/**
 * Simple writer interface (equivalent to Java SimpleWriter<T>)
 */
export interface SimpleWriter<T> {
  write(item: T): Promise<void>;
}

// Make CsvGraphCapabilitiesWriter implement the interface
export class CsvGraphCapabilitiesWriter implements SimpleWriter<Capabilities> {
  // ... implementation above ...
}
