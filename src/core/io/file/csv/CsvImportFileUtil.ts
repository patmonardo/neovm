import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { NodeFileHeader, RelationshipFileHeader, GraphPropertyFileHeader } from '@/core/io/file';

/**
 * Utility class for CSV import file operations.
 * Handles file discovery, header parsing, and file mapping.
 */
export class CsvImportFileUtil {

  private constructor() {
    // Utility class - no instantiation
  }

  /**
   * Parse node header file and return header information.
   */
  static async parseNodeHeader(
    headerFile: string,
    labelMapping: (label: string) => string = (label) => label
  ): Promise<NodeFileHeader> {
    try {
      const headerLine = await CsvImportFileUtil.readFirstCsvLine(headerFile);
      if (!headerLine) {
        throw new Error('Header line was null');
      }

      const nodeLabels = CsvImportFileUtil.inferNodeLabels(headerFile);
      const mappedLabels = nodeLabels.map(labelMapping);

      return NodeFileHeader.of(headerLine, mappedLabels);
    } catch (error) {
      throw new Error(`Failed to parse node header ${headerFile}: ${error}`);
    }
  }

  /**
   * Parse relationship header file and return header information.
   */
  static async parseRelationshipHeader(
    headerFile: string,
    typeMapping: (type: string) => string = (type) => type
  ): Promise<RelationshipFileHeader> {
    try {
      const headerLine = await CsvImportFileUtil.readFirstCsvLine(headerFile);
      if (!headerLine) {
        throw new Error('Header line was null');
      }

      const relationshipType = CsvImportFileUtil.inferRelationshipType(headerFile);
      const mappedType = typeMapping(relationshipType);

      return RelationshipFileHeader.of(headerLine, mappedType);
    } catch (error) {
      throw new Error(`Failed to parse relationship header ${headerFile}: ${error}`);
    }
  }

  /**
   * Parse graph property header file and return header information.
   */
  static async parseGraphPropertyHeader(headerFile: string): Promise<GraphPropertyFileHeader> {
    try {
      const headerLine = await CsvImportFileUtil.readFirstCsvLine(headerFile);
      if (!headerLine) {
        throw new Error('Header line was null');
      }

      return GraphPropertyFileHeader.of(headerLine);
    } catch (error) {
      throw new Error(`Failed to parse graph property header ${headerFile}: ${error}`);
    }
  }

  /**
   * Map node header files to their corresponding data files with specific identifiers.
   */
  static async nodeHeaderToFileMapping(
    csvDirectory: string,
    identifiers?: string[]
  ): Promise<Map<string, string[]>> {
    if (identifiers) {
      const files = identifiers.map(id => `nodes_${id}_header.csv`);
      return CsvImportFileUtil.headerToFileMapping(
        csvDirectory,
        (dir) => CsvImportFileUtil.getFilesByList(dir, files)
      );
    } else {
      return CsvImportFileUtil.headerToFileMapping(
        csvDirectory,
        CsvImportFileUtil.getNodeHeaderFiles
      );
    }
  }

  /**
   * Map relationship header files to their corresponding data files.
   */
  static async relationshipHeaderToFileMapping(csvDirectory: string): Promise<Map<string, string[]>> {
    return CsvImportFileUtil.headerToFileMapping(
      csvDirectory,
      CsvImportFileUtil.getRelationshipHeaderFiles
    );
  }

  /**
   * Map graph property header files to their corresponding data files.
   */
  static async graphPropertyHeaderToFileMapping(csvDirectory: string): Promise<Map<string, string[]>> {
    return CsvImportFileUtil.headerToFileMapping(
      csvDirectory,
      CsvImportFileUtil.getGraphPropertyHeaderFiles
    );
  }

  /**
   * Get all node header files in directory.
   */
  static async getNodeHeaderFiles(csvDirectory: string): Promise<string[]> {
    const nodeFilesPattern = /^nodes(_\w+)*_header\.csv$/;
    return CsvImportFileUtil.getFilesByRegex(csvDirectory, nodeFilesPattern);
  }

  /**
   * Get all relationship header files in directory.
   */
  static async getRelationshipHeaderFiles(csvDirectory: string): Promise<string[]> {
    const relationshipFilesPattern = /^relationships(_\w+)+_header\.csv$/;
    return CsvImportFileUtil.getFilesByRegex(csvDirectory, relationshipFilesPattern);
  }

  /**
   * Get all graph property header files in directory.
   */
  static async getGraphPropertyHeaderFiles(csvDirectory: string): Promise<string[]> {
    const graphPropertyFilesPattern = /^graph_property(_\w+)+_header\.csv$/;
    return CsvImportFileUtil.getFilesByRegex(csvDirectory, graphPropertyFilesPattern);
  }

  /**
   * Read first line of CSV file and return as array.
   */
  private static async readFirstCsvLine(filePath: string): Promise<string[] | null> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
          if (!resolved) {
            resolved = true;
            // csv-parser returns object with numeric keys for headerless CSV
            const values = Object.values(row) as string[];
            resolve(values);
          }
        })
        .on('end', () => {
          if (!resolved) {
            resolve(null);
          }
        })
        .on('error', (error) => {
          if (!resolved) {
            reject(error);
          }
        });
    });
  }

  /**
   * Create mapping from header files to their corresponding data files.
   */
  private static async headerToFileMapping(
    csvDirectory: string,
    headerPathsFunction: (csvDirectory: string) => Promise<string[]>
  ): Promise<Map<string, string[]>> {
    const headerToDataFileMapping = new Map<string, string[]>();
    const headerFiles = await headerPathsFunction(csvDirectory);

    for (const headerFile of headerFiles) {
      const headerFileName = path.basename(headerFile);
      const dataFilePattern = new RegExp(
        headerFileName.replace('_header', '(_\\d+)').replace('.', '\\.')
      );

      const dataPaths = await CsvImportFileUtil.getFilesByRegex(csvDirectory, dataFilePattern);
      headerToDataFileMapping.set(headerFile, dataPaths);
    }

    return headerToDataFileMapping;
  }

  /**
   * Get files matching regex pattern.
   */
  private static async getFilesByRegex(csvDirectory: string, pattern: RegExp): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(csvDirectory);
      return files
        .filter(file => pattern.test(file))
        .map(file => path.join(csvDirectory, file));
    } catch (error) {
      throw new Error(`Failed to read directory ${csvDirectory}: ${error}`);
    }
  }

  /**
   * Get files from specific list of filenames.
   */
  private static async getFilesByList(csvDirectory: string, fileNames: string[]): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(csvDirectory);
      return files
        .filter(file => fileNames.includes(file))
        .map(file => path.join(csvDirectory, file));
    } catch (error) {
      throw new Error(`Failed to read directory ${csvDirectory}: ${error}`);
    }
  }

  /**
   * Infer node labels from header file path.
   */
  static inferNodeLabels(headerFile: string): string[] {
    const headerFileName = path.basename(headerFile);
    return CsvImportFileUtil.inferNodeLabelsFromFileName(headerFileName);
  }

  /**
   * Infer node labels from header filename.
   */
  static inferNodeLabelsFromFileName(headerFileName: string): string[] {
    // Remove "nodes_" prefix and "_header.csv" suffix, then split by "_"
    const nodeLabels = headerFileName
      .replace(/^nodes_/, '')
      .replace(/_?header\.csv$/, '')
      .split('_');

    return CsvImportFileUtil.noLabelFound(nodeLabels) ? [] : nodeLabels;
  }

  /**
   * Infer relationship type from header file path.
   */
  private static inferRelationshipType(headerFile: string): string {
    const headerFileName = path.basename(headerFile);
    return headerFileName.replace(/relationships_|_header\.csv/g, '');
  }

  /**
   * Check if no valid labels were found.
   */
  private static noLabelFound(nodeLabels: string[]): boolean {
    return nodeLabels.length === 1 && nodeLabels[0] === '';
  }

  /**
   * Format string with locale (simplified version of Java formatWithLocale).
   */
  private static formatWithLocale(template: string, ...args: string[]): string {
    let result = template;
    for (const arg of args) {
      result = result.replace('%s', arg);
    }
    return result;
  }
}
