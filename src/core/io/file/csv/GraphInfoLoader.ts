/**
 * GRAPH INFO LOADER - CSV GRAPH INFO PARSER
 *
 * Simple loader with single load() method that reads CSV graph info files.
 * Parses graph metadata without Jackson dependency.
 */

import { RelationshipType } from "@/projection";
import { DatabaseId } from "@/api/DatabaseId";
import { DatabaseInfo, DatabaseLocation } from "@/api/DatabaseInfo";
import { IdMap } from "@/api";
import { GraphInfo } from "@/core/io/file";
import { CsvGraphInfoVisitor } from "./CsvGraphInfoVisitor";
import * as fs from "fs";
import * as path from "path";

export class GraphInfoLoader {
  private readonly graphInfoPath: string;

  constructor(csvDirectory: string) {
    this.graphInfoPath = path.join(
      csvDirectory,
      CsvGraphInfoVisitor.GRAPH_INFO_FILE_NAME
    );
  }

  /**
   * Load GraphInfo from CSV file.
   *
   * @returns GraphInfo built from CSV file
   * @throws Error if file cannot be read or parsed
   */
  load(): GraphInfo {
    try {
      // Read CSV file
      const fileContent = fs.readFileSync(this.graphInfoPath, "utf-8");
      const lines = fileContent.trim().split("\n");

      if (lines.length < 2) {
        throw new Error("Graph info file must have header and data line");
      }

      // Parse header and data
      const header = lines[0].split(",").map((col) => col.trim());
      const data = lines[1].split(",").map((col) => col.trim());

      const line = this.parseGraphInfoLine(header, data);

      // Build DatabaseInfo using of() factory
      const databaseId = DatabaseId.of(line.databaseName);
      let databaseInfo: DatabaseInfo;

      if (
        line.databaseLocation === DatabaseLocation.REMOTE &&
        line.remoteDatabaseId
      ) {
        // Remote database - use 3-parameter overload
        const remoteDatabaseId = DatabaseId.of(line.remoteDatabaseId);
        databaseInfo = DatabaseInfo.of(
          databaseId,
          line.databaseLocation,
          remoteDatabaseId
        );
      } else {
        // Local or None database - use 2-parameter overload
        databaseInfo = DatabaseInfo.of(databaseId, line.databaseLocation);
      }

      // Build GraphInfo
      return GraphInfo.builder()
        .databaseInfo(databaseInfo)
        .idMapBuilderType(line.idMapBuilderType)
        .nodeCount(line.nodeCount)
        .maxOriginalId(line.maxOriginalId)
        .relationshipTypeCounts(line.relTypeCounts)
        .inverseIndexedRelationshipTypes(line.inverseIndexedRelTypes)
        .build();
    } catch (error) {
      throw new Error(`Failed to load graph info: ${(error as Error).message}`);
    }
  }

  /**
   * Parse CSV line into GraphInfoLine object.
   */
  private parseGraphInfoLine(header: string[], data: string[]): GraphInfoLine {
    const line = new GraphInfoLine();

    for (let i = 0; i < header.length && i < data.length; i++) {
      const column = header[i];
      const value = data[i];

      switch (column) {
        case "databaseName":
          line.databaseName = value;
          break;
        case "databaseLocation":
          line.databaseLocation = this.parseDatabaseLocation(value);
          break;
        case "remoteDatabaseId":
          line.remoteDatabaseId = value || null;
          break;
        case "idMapBuilderType":
          line.idMapBuilderType = value || IdMap.NO_TYPE;
          break;
        case "nodeCount":
          line.nodeCount = parseInt(value) || 0;
          break;
        case "maxOriginalId":
          line.maxOriginalId = parseInt(value) || 0;
          break;
        case "relTypeCounts":
          line.relTypeCounts = this.parseRelationshipTypeCounts(value);
          break;
        case "inverseIndexedRelTypes":
          line.inverseIndexedRelTypes = this.parseInverseIndexedRelTypes(value);
          break;
        // Ignore databaseId - backwards compatibility only
        case "databaseId":
          break;
      }
    }

    return line;
  }

  private parseDatabaseLocation(value: string): DatabaseLocation {
    switch (value.toUpperCase()) {
      case "LOCAL":
        return DatabaseLocation.LOCAL;
      case "REMOTE":
        return DatabaseLocation.REMOTE;
      default:
        console.warn(`Unknown DatabaseLocation: ${value}, using LOCAL`);
        return DatabaseLocation.LOCAL;
    }
  }

  /**
   * Parse relationship type counts from CSV string.
   * Format: "TYPE1=count1;TYPE2=count2"
   */
  private parseRelationshipTypeCounts(
    value: string
  ): Map<RelationshipType, number> {
    const counts = new Map<RelationshipType, number>();

    if (!value || value.trim() === "") {
      return counts;
    }

    const pairs = value.split(";").filter((s) => s.length > 0);
    for (const pair of pairs) {
      const [typeStr, countStr] = pair.split("=");
      if (typeStr && countStr) {
        const relType = RelationshipType.of(typeStr.trim());
        const count = parseInt(countStr.trim()) || 0;
        counts.set(relType, count);
      }
    }

    return counts;
  }

  /**
   * Parse inverse indexed relationship types from CSV string.
   * Format: "TYPE1;TYPE2;TYPE3"
   */
  private parseInverseIndexedRelTypes(value: string): RelationshipType[] {
    if (!value || value.trim() === "") {
      return [];
    }

    return value
      .split(";")
      .filter((s) => s.length > 0)
      .map((s) => RelationshipType.of(s.trim()));
  }
}

/**
 * Graph info line data structure.
 */
class GraphInfoLine {
  databaseName: string = "";
  databaseLocation: DatabaseLocation = DatabaseLocation.LOCAL;
  remoteDatabaseId: string | null = null;
  idMapBuilderType: string = IdMap.NO_TYPE;
  nodeCount: number = 0;
  maxOriginalId: number = 0;
  relTypeCounts: Map<RelationshipType, number> = new Map();
  inverseIndexedRelTypes: RelationshipType[] = [];
}
