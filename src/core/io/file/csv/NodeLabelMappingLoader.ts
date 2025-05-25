import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { CsvNodeLabelMappingVisitor } from './CsvNodeLabelMappingVisitor';

/**
 * Loader for node label mappings from CSV files.
 * Loads the mapping between string indices and node label names.
 */
export class NodeLabelMappingLoader {
  private readonly labelMappingPath: string;
  private readonly mapping: Map<string, string>;

  constructor(csvDirectory: string) {
    this.mapping = new Map<string, string>();
    this.labelMappingPath = path.join(csvDirectory, CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME);
  }

  /**
   * Load node label mapping from CSV file.
   * Returns null if file doesn't exist, otherwise returns the mapping.
   */
  async load(): Promise<Map<string, string> | null> {
    try {
      // Check if file exists and is a regular file
      if (!fs.existsSync(this.labelMappingPath)) {
        return null;
      }

      const stats = fs.statSync(this.labelMappingPath);
      if (!stats.isFile()) {
        return null;
      }

      await this.parseMappingFile();
      return new Map(this.mapping);
    } catch (error) {
      throw new Error(`Failed to load node label mapping from ${this.labelMappingPath}: ${error}`);
    }
  }

  /**
   * Parse the CSV mapping file.
   */
  private async parseMappingFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.labelMappingPath, { encoding: 'utf8' })
        .pipe(csv({
          headers: true,
          skipEmptyLines: true,
          strict: false, // Equivalent to Jackson's flexibility
          mapHeaders: ({ header }) => header.trim() // Equivalent to TRIM_SPACES
        }))
        .on('data', (row) => {
          try {
            const mappingLine = this.parseMappingLine(row);
            this.mapping.set(mappingLine.index, mappingLine.label);
          } catch (error) {
            reject(new Error(`Failed to parse mapping line: ${error}`));
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse a single CSV row into MappingLine.
   */
  private parseMappingLine(row: any): MappingLine {
    return {
      index: row.index || '',
      label: row.label || ''
    };
  }
}
