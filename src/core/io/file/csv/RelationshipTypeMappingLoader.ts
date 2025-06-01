/**
 * RELATIONSHIP TYPE MAPPING LOADER - CSV TYPE MAPPING PARSER
 *
 * Simple loader with single load() method that reads CSV relationship type mapping files.
 * Maps type indices to type strings for efficient type lookup.
 */

import { CsvRelationshipTypeMappingVisitor } from './CsvRelationshipTypeMappingVisitor';
import * as fs from 'fs';
import * as path from 'path';

export class RelationshipTypeMappingLoader {
  private readonly typeMappingPath: string;
  private readonly mapping: Map<string, string>;

  constructor(csvDirectory: string) {
    this.mapping = new Map<string, string>();
    this.typeMappingPath = path.join(csvDirectory, CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME);
  }

  /**
   * Load relationship type mapping from CSV file.
   * Returns empty Optional if file doesn't exist.
   *
   * @returns Map<string, string> of index -> type mappings, or null if file doesn't exist
   * @throws Error if file cannot be read or parsed
   */
  load(): Map<string, string> | null {
    // Return null if file doesn't exist (Optional.empty() equivalent)
    if (!fs.existsSync(this.typeMappingPath)) {
      return null;
    }

    try {
      // Read CSV file line by line
      const fileContent = fs.readFileSync(this.typeMappingPath, 'utf-8');
      const lines = fileContent.trim().split('\n');

      if (lines.length === 0) {
        return this.mapping;
      }

      // Parse header line
      const header = lines[0].split(',').map(col => col.trim());
      const indexColumn = header.indexOf('index');
      const typeColumn = header.indexOf('type');

      if (indexColumn === -1) {
        throw new Error('Missing required "index" column in type mapping');
      }
      if (typeColumn === -1) {
        throw new Error('Missing required "type" column in type mapping');
      }

      // Process each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;

        const mappingLine = this.parseMappingLine(line, indexColumn, typeColumn);
        this.mapping.set(mappingLine.index, mappingLine.type);
      }

    } catch (error) {
      throw new Error(`Failed to load relationship type mapping: ${(error as Error).message}`);
    }

    return this.mapping;
  }

  /**
   * Parse a single CSV line into a MappingLine object.
   */
  private parseMappingLine(line: string, indexColumn: number, typeColumn: number): MappingLine {
    const columns = line.split(',').map(col => col.trim());

    const index = columns[indexColumn] || '';
    const type = columns[typeColumn] || '';

    return new MappingLine(index, type);
  }
}

/**
 * Mapping line data structure.
 */
class MappingLine {
  constructor(
    public readonly index: string,
    public readonly type: string
  ) {}
}
