/**
 * NODE LABEL MAPPING LOADER - CSV LABEL MAPPING PARSER
 *
 * Simple loader with single load() method that reads CSV node label mapping files.
 * Maps node indices to label strings for efficient label lookup.
 */

import { CsvNodeLabelMappingVisitor } from './CsvNodeLabelMappingVisitor';
import * as fs from 'fs';
import * as path from 'path';

export class NodeLabelMappingLoader {
  private readonly labelMappingPath: string;
  private readonly mapping: Map<string, string>;

  constructor(csvDirectory: string) {
    this.mapping = new Map<string, string>();
    this.labelMappingPath = path.join(csvDirectory, CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME);
  }

  /**
   * Load node label mapping from CSV file.
   * Returns empty Optional if file doesn't exist.
   *
   * @returns Map<string, string> of index -> label mappings, or null if file doesn't exist
   * @throws Error if file cannot be read or parsed
   */
  load(): Map<string, string> | null {
    // Return null if file doesn't exist (Optional.empty() equivalent)
    if (!fs.existsSync(this.labelMappingPath)) {
      return null;
    }

    try {
      // Read CSV file line by line
      const fileContent = fs.readFileSync(this.labelMappingPath, 'utf-8');
      const lines = fileContent.trim().split('\n');

      if (lines.length === 0) {
        return this.mapping;
      }

      // Parse header line
      const header = lines[0].split(',').map(col => col.trim());
      const indexColumn = header.indexOf('index');
      const labelColumn = header.indexOf('label');

      if (indexColumn === -1) {
        throw new Error('Missing required "index" column in label mapping');
      }
      if (labelColumn === -1) {
        throw new Error('Missing required "label" column in label mapping');
      }

      // Process each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;

        const mappingLine = this.parseMappingLine(line, indexColumn, labelColumn);
        this.mapping.set(mappingLine.index, mappingLine.label);
      }

    } catch (error) {
      throw new Error(`Failed to load node label mapping: ${(error as Error).message}`);
    }

    return this.mapping;
  }

  /**
   * Parse a single CSV line into a MappingLine object.
   */
  private parseMappingLine(line: string, indexColumn: number, labelColumn: number): MappingLine {
    const columns = line.split(',').map(col => col.trim());

    const index = columns[indexColumn] || '';
    const label = columns[labelColumn] || '';

    return new MappingLine(index, label);
  }
}

/**
 * Mapping line data structure.
 */
class MappingLine {
  constructor(
    public readonly index: string,
    public readonly label: string
  ) {}
}
