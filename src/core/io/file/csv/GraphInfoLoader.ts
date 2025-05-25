import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { RelationshipType } from '@/projection';
import { DatabaseId, DatabaseInfo, IdMap, GraphInfo } from '@/api';
import { CsvGraphInfoVisitor } from './CsvGraphInfoVisitor';
import { CsvMapUtil } from './CsvMapUtil';
import { StringUtils } from './StringUtils';

/**
 * Loader for graph information from CSV files.
 * Handles parsing of graph metadata including database info, node counts, and relationship type information.
 */
export class GraphInfoLoader {
  private readonly graphInfoPath: string;

  constructor(csvDirectory: string) {
    this.graphInfoPath = path.join(csvDirectory, CsvGraphInfoVisitor.GRAPH_INFO_FILE_NAME);
  }

  /**
   * Load graph info from CSV file.
   */
  async load(): Promise<GraphInfo> {
    try {
      const graphInfoLine = await this.parseGraphInfoFile();
      return this.buildGraphInfo(graphInfoLine);
    } catch (error) {
      throw new Error(`Failed to load graph info from ${this.graphInfoPath}: ${error}`);
    }
  }

  /**
   * Parse the CSV file and return the first line as GraphInfoLine.
   */
  private async parseGraphInfoFile(): Promise<GraphInfoLine> {
    return new Promise((resolve, reject) => {
      let lineProcessed = false;

      fs.createReadStream(this.graphInfoPath, { encoding: 'utf8' })
        .pipe(csv({
          headers: true,
          skipEmptyLines: true,
          strict: false, // Equivalent to Jackson's FAIL_ON_UNKNOWN_PROPERTIES = false
        }))
        .on('data', (row) => {
          if (!lineProcessed) {
            lineProcessed = true;
            const graphInfoLine = this.parseGraphInfoLine(row);
            resolve(graphInfoLine);
          }
        })
        .on('end', () => {
          if (!lineProcessed) {
            reject(new Error('Graph info file is empty or contains no valid data'));
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse a single CSV row into GraphInfoLine.
   */
  private parseGraphInfoLine(row: any): GraphInfoLine {
    return {
      databaseId: row.databaseId || undefined, // Legacy field, ignored
      databaseName: row.databaseName || '',
      databaseLocation: this.parseDatabaseLocation(row.databaseLocation),
      remoteDatabaseId: StringUtils.trimToNull(row.remoteDatabaseId),
      idMapBuilderType: row.idMapBuilderType || IdMap.NO_TYPE,
      nodeCount: this.parseLong(row.nodeCount, 0),
      maxOriginalId: this.parseLong(row.maxOriginalId, 0),
      relTypeCounts: row.relTypeCounts || '',
      inverseIndexedRelTypes: row.inverseIndexedRelTypes || ''
    };
  }

  /**
   * Build GraphInfo from parsed line.
   */
  private buildGraphInfo(line: GraphInfoLine): GraphInfo {
    // Parse database info
    const databaseId = DatabaseId.of(line.databaseName);
    const remoteDatabaseId = line.remoteDatabaseId
      ? DatabaseId.of(line.remoteDatabaseId)
      : undefined;

    const databaseInfo = DatabaseInfo.builder()
      .databaseId(databaseId)
      .databaseLocation(line.databaseLocation || DatabaseInfo.DatabaseLocation.LOCAL)
      .remoteDatabaseId(remoteDatabaseId)
      .build();

    // Parse relationship type counts
    const relationshipTypeCounts = this.parseRelationshipTypeCounts(line.relTypeCounts || '');

    // Parse inverse indexed relationship types
    const inverseIndexedRelationshipTypes = this.parseInverseIndexedRelTypes(line.inverseIndexedRelTypes || '');

    // Build and return GraphInfo
    return GraphInfo.builder()
      .databaseInfo(databaseInfo)
      .idMapBuilderType(line.idMapBuilderType || IdMap.NO_TYPE)
      .nodeCount(line.nodeCount)
      .maxOriginalId(line.maxOriginalId)
      .relationshipTypeCounts(relationshipTypeCounts)
      .inverseIndexedRelationshipTypes(inverseIndexedRelationshipTypes)
      .build();
  }

  /**
   * Parse database location from string.
   */
  private parseDatabaseLocation(location: string | undefined): DatabaseInfo.DatabaseLocation {
    if (!location) {
      return DatabaseInfo.DatabaseLocation.LOCAL;
    }

    const trimmed = location.trim().toUpperCase();

    switch (trimmed) {
      case 'LOCAL':
        return DatabaseInfo.DatabaseLocation.LOCAL;
      case 'REMOTE':
        return DatabaseInfo.DatabaseLocation.REMOTE;
      default:
        console.warn(`Unknown database location: ${location}, defaulting to LOCAL`);
        return DatabaseInfo.DatabaseLocation.LOCAL;
    }
  }

  /**
   * Parse relationship type counts from string format.
   * Format: "KNOWS=100;LIKES=50;FOLLOWS=25"
   */
  private parseRelationshipTypeCounts(mapString: string): Map<RelationshipType, number> {
    if (!mapString || mapString.trim() === '') {
      return new Map();
    }

    return CsvMapUtil.fromString(
      mapString,
      (keyStr: string) => RelationshipType.of(keyStr),
      (valueStr: string) => {
        const parsed = parseInt(valueStr, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid number: ${valueStr}`);
        }
        return parsed;
      }
    );
  }

  /**
   * Parse inverse indexed relationship types from string format.
   * Format: "KNOWS;LIKES;FOLLOWS"
   */
  private parseInverseIndexedRelTypes(listString: string): RelationshipType[] {
    if (!listString || listString.trim() === '') {
      return [];
    }

    return listString
      .split(';')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => RelationshipType.of(s));
  }

  /**
   * Parse long value with fallback.
   */
  private parseLong(value: any, fallback: number): number {
    if (typeof value === 'number') {
      return Math.floor(value);
    }

    if (typeof value === 'string') {
      const parsed = parseInt(value.trim(), 10);
      return isNaN(parsed) ? fallback : parsed;
    }

    return fallback;
  }
}
