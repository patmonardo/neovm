/**
 * CSV IMPORT FILE UTILITY - FILE DISCOVERY AND HEADER PARSING
 *
 * Complex utility for discovering CSV files in directories and parsing headers.
 * Handles pattern matching for nodes, relationships, and graph properties.
 */

import { GraphPropertyFileHeader } from '@/core/io/file';
import { NodeFileHeader } from '@/core/io/file';
import { RelationshipFileHeader } from '@/core/io/file';
import * as fs from 'fs';
import * as path from 'path';

export class CsvImportFileUtil {
  private constructor() {} // Static utility class

  // HEADER PARSING METHODS

  static parseNodeHeader(headerFile: string, labelMapping: (label: string) => string): NodeFileHeader {
    try {
      const headerContent = fs.readFileSync(headerFile, 'utf-8').trim();
      const headerLine = headerContent.split('\n')[0];

      if (!headerLine) {
        throw new Error('Header line was null');
      }

      const headerColumns = headerLine.split(',').map(col => col.trim());
      const nodeLabels = this.inferNodeLabels(headerFile)
        .map(label => labelMapping(label));

      return NodeFileHeader.of(headerColumns, nodeLabels);
    } catch (error) {
      throw new Error(`Failed to parse node header: ${(error as Error).message}`);
    }
  }

  static parseRelationshipHeader(headerFile: string, typeMapping: (type: string) => string): RelationshipFileHeader {
    try {
      const headerContent = fs.readFileSync(headerFile, 'utf-8').trim();
      const headerLine = headerContent.split('\n')[0];

      if (!headerLine) {
        throw new Error('Header line was null');
      }

      const headerColumns = headerLine.split(',').map(col => col.trim());
      const relationshipType = typeMapping(this.inferRelationshipType(headerFile));

      return RelationshipFileHeader.of(headerColumns, relationshipType);
    } catch (error) {
      throw new Error(`Failed to parse relationship header: ${(error as Error).message}`);
    }
  }

  static parseGraphPropertyHeader(headerFile: string): GraphPropertyFileHeader {
    try {
      const headerContent = fs.readFileSync(headerFile, 'utf-8').trim();
      const headerLine = headerContent.split('\n')[0];

      if (!headerLine) {
        throw new Error('Header line was null');
      }

      const headerColumns = headerLine.split(',').map(col => col.trim());
      return GraphPropertyFileHeader.of(headerColumns);
    } catch (error) {
      throw new Error(`Failed to parse graph property header: ${(error as Error).message}`);
    }
  }

  // FILE MAPPING METHODS

  static nodeHeaderToFileMapping(csvDirectory: string, identifiers?: string[]): Map<string, string[]> {
    if (identifiers) {
      const files = identifiers.map(id => `nodes_${id}_header.csv`);
      return this.headerToFileMapping(csvDirectory, (dir) => this.getFilesByList(dir, files));
    } else {
      return this.headerToFileMapping(csvDirectory, this.getNodeHeaderFiles);
    }
  }

  static relationshipHeaderToFileMapping(csvDirectory: string): Map<string, string[]> {
    return this.headerToFileMapping(csvDirectory, this.getRelationshipHeaderFiles);
  }

  static graphPropertyHeaderToFileMapping(csvDirectory: string): Map<string, string[]> {
    return this.headerToFileMapping(csvDirectory, this.getGraphPropertyHeaderFiles);
  }

  // FILE DISCOVERY METHODS

  static getNodeHeaderFiles(csvDirectory: string): string[] {
    const nodeFilesPattern = /^nodes(_\w+)*_header\.csv$/;
    return this.getFilesByRegex(csvDirectory, nodeFilesPattern);
  }

  static getRelationshipHeaderFiles(csvDirectory: string): string[] {
    const relationshipFilesPattern = /^relationships(_\w+)+_header\.csv$/;
    return this.getFilesByRegex(csvDirectory, relationshipFilesPattern);
  }

  static getGraphPropertyHeaderFiles(csvDirectory: string): string[] {
    const graphPropertyFilesPattern = /^graph_property(_\w+)+_header\.csv$/;
    return this.getFilesByRegex(csvDirectory, graphPropertyFilesPattern);
  }

  // LABEL/TYPE INFERENCE METHODS

  static inferNodeLabels(headerFile: string): string[] {
    const fileName = path.basename(headerFile);
    return this.inferNodeLabelsFromFileName(fileName);
  }

  static inferNodeLabelsFromFileName(headerFileName: string): string[] {
    // Remove "nodes_" prefix and "_header.csv" suffix, then split by "_"
    const nodeLabels = headerFileName
      .replace(/^nodes_/, '')
      .replace(/_?header\.csv$/, '')
      .split('_');

    return this.noLabelFound(nodeLabels) ? [] : nodeLabels;
  }

  // PRIVATE HELPER METHODS

  private static headerToFileMapping(
    csvDirectory: string,
    headerPathsFn: (dir: string) => string[]
  ): Map<string, string[]> {
    const headerToDataFileMapping = new Map<string, string[]>();

    for (const headerFile of headerPathsFn(csvDirectory)) {
      const headerFileName = path.basename(headerFile);
      const dataFilePattern = new RegExp(
        headerFileName.replace('_header', '(_\\d+)').replace(/\./g, '\\.')
      );

      const dataPaths = headerToDataFileMapping.get(headerFile) || [];
      dataPaths.push(...this.getFilesByRegex(csvDirectory, dataFilePattern));
      headerToDataFileMapping.set(headerFile, dataPaths);
    }

    return headerToDataFileMapping;
  }

  private static getFilesByRegex(csvDirectory: string, pattern: RegExp): string[] {
    try {
      const files = fs.readdirSync(csvDirectory);
      return files
        .filter(file => pattern.test(file))
        .map(file => path.join(csvDirectory, file));
    } catch (error) {
      throw new Error(`Failed to read directory: ${(error as Error).message}`);
    }
  }

  private static getFilesByList(csvDirectory: string, fileNames: string[]): string[] {
    try {
      const files = fs.readdirSync(csvDirectory);
      return files
        .filter(file => fileNames.includes(file))
        .map(file => path.join(csvDirectory, file));
    } catch (error) {
      throw new Error(`Failed to read directory: ${(error as Error).message}`);
    }
  }

  private static inferRelationshipType(headerFile: string): string {
    const headerFileName = path.basename(headerFile);
    return headerFileName.replace(/relationships_|_header\.csv/g, '');
  }

  private static noLabelFound(nodeLabels: string[]): boolean {
    return nodeLabels.length === 1 && nodeLabels[0] === '';
  }
}
