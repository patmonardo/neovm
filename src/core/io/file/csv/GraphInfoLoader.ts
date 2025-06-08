import { RelationshipType } from "@/projection";
import { DatabaseId } from "@/api/DatabaseId";
import { DatabaseInfo, DatabaseLocation } from "@/api/DatabaseInfo";
import { IdMap } from "@/api";
import { GraphInfo } from "@/core/io/file";
import { CsvGraphInfoVisitor } from "./CsvGraphInfoVisitor";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

/**
 * Enhanced GraphInfoLoader using Papa Parse for robust CSV parsing.
 * Loads existing single GraphInfo structure - no multi-graph complexity.
 */
export class GraphInfoLoader {
  private readonly graphInfoPath: string;

  constructor(csvDirectory: string) {
    this.graphInfoPath = path.join(
      csvDirectory,
      CsvGraphInfoVisitor.GRAPH_INFO_FILE_NAME
    );
  }

  /**
   * Load GraphInfo from CSV file using Papa Parse.
   * Handles the exact format produced by CsvGraphInfoVisitor.
   */
  load(): GraphInfo {
    try {
      if (!fs.existsSync(this.graphInfoPath)) {
        throw new Error(`Graph info file not found: ${this.graphInfoPath}`);
      }

      const csvContent = fs.readFileSync(this.graphInfoPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true, // Use column names from CsvGraphInfoVisitor
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false, // Keep all as strings for consistent parsing
      });

      if (result.errors.length > 0) {
        console.warn(
          `CSV parsing errors in ${this.graphInfoPath}:`,
          result.errors
        );
      }

      const data = result.data as GraphInfoRow[];

      if (data.length === 0) {
        throw new Error("No graph info data found");
      }

      // Use first row (single graph)
      const row = data[0];
      this.validateGraphInfoRow(row);

      return this.buildGraphInfo(row);
    } catch (error) {
      throw new Error(`Failed to load graph info: ${(error as Error).message}`);
    }
  }

  /**
   * 🧪 Debug method for development tools.
   * Shows exactly what Papa Parse extracts from the CSV.
   */
  debug(): void {
    console.log("🌐 === GraphInfoLoader Debug Report ===");

    try {
      console.log(`📁 File path: ${this.graphInfoPath}`);
      console.log(`📄 File exists: ${fs.existsSync(this.graphInfoPath)}`);

      if (!fs.existsSync(this.graphInfoPath)) {
        console.log("❌ Cannot debug - file does not exist");
        return;
      }

      // Raw file content
      const rawContent = fs.readFileSync(this.graphInfoPath, "utf-8");
      console.log(`📏 File size: ${rawContent.length} characters`);
      console.log(`📄 Raw content: "${rawContent}"`);

      // Papa Parse analysis
      console.log("\n🎯 Papa Parse Analysis:");
      const result = Papa.parse(rawContent, {
        header: true,
        skipEmptyLines: true,
      });

      console.log(`📊 Parsed rows: ${result.data.length}`);
      console.log(
        `📋 Headers detected: ${result.meta.fields?.join(", ") || "none"}`
      );
      console.log(`⚠️ Parse errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        result.errors.forEach((error, index) => {
          console.log(
            `  Error ${index + 1}: ${error.message} (row: ${error.row})`
          );
        });
      }

      // Show parsed data structure
      if (result.data.length > 0) {
        console.log("\n📊 Parsed GraphInfo Data:");
        (result.data as GraphInfoRow[]).forEach((row, index) => {
          console.log(`  Row ${index + 1}:`);
          console.log(`    databaseName: "${row.databaseName}"`);
          console.log(`    databaseLocation: "${row.databaseLocation}"`);
          console.log(`    nodeCount: "${row.nodeCount}"`);
          console.log(`    maxOriginalId: "${row.maxOriginalId}"`);
          console.log(`    relTypeCounts: "${row.relTypeCounts}"`);
          console.log(
            `    inverseIndexedRelTypes: "${row.inverseIndexedRelTypes}"`
          );
        });
      }

      // Test the actual loading
      console.log("\n🔄 Loading Test:");
      try {
        const graphInfo = this.load();
        console.log(`✅ GraphInfo loaded successfully`);
        console.log(
          `🌐 Database name: "${graphInfo
            .databaseInfo()
            .databaseId()
            .databaseName()}"`
        );
        console.log(
          `📍 Database location: ${graphInfo.databaseInfo().databaseLocation()}`
        );
        console.log(`📊 Node count: ${graphInfo.nodeCount()}`);
        console.log(`🔢 Max original ID: ${graphInfo.maxOriginalId()}`);
        console.log(`🗂️ ID map type: ${graphInfo.idMapBuilderType()}`);

        const relTypeCounts = graphInfo.relationshipTypeCounts();
        console.log(`🔗 Relationship types: ${relTypeCounts.size} types`);
        for (const [type, count] of relTypeCounts.entries()) {
          console.log(`  ${type.name()}: ${count} relationships`);
        }

        const inverseTypes = graphInfo.inverseIndexedRelationshipTypes();
        console.log(
          `📇 Inverse indexed types: ${inverseTypes
            .map((t) => t.name())
            .join(", ")}`
        );
      } catch (error) {
        console.log(`❌ Loading test failed: ${(error as Error).message}`);
      }
    } catch (error) {
      console.log(`❌ Debug failed: ${(error as Error).message}`);
    }

    console.log("🌐 === End GraphInfoLoader Debug ===\n");
  }

  /**
   * 🔧 Validate that required fields are present.
   */
  private validateGraphInfoRow(row: GraphInfoRow): void {
    if (!row.databaseName || row.databaseName.trim() === "") {
      throw new Error("Missing required field: databaseName");
    }
    if (!row.databaseLocation || row.databaseLocation.trim() === "") {
      throw new Error("Missing required field: databaseLocation");
    }
  }

  /**
   * 🏗️ Build GraphInfo from parsed CSV row.
   * Uses the exact same logic as before, just with Papa Parse input.
   */
  private buildGraphInfo(row: GraphInfoRow): GraphInfo {
    // Build DatabaseInfo
    const databaseId = DatabaseId.of(row.databaseName);
    const databaseLocation = this.parseDatabaseLocation(row.databaseLocation);

    let databaseInfo: DatabaseInfo;
    if (databaseLocation === DatabaseLocation.REMOTE && row.remoteDatabaseId) {
      const remoteDatabaseId = DatabaseId.of(row.remoteDatabaseId);
      databaseInfo = DatabaseInfo.of(
        databaseId,
        databaseLocation,
        remoteDatabaseId
      );
    } else {
      databaseInfo = DatabaseInfo.of(databaseId, databaseLocation);
    }

    // Parse relationship type counts (using existing format)
    const relTypeCounts = this.parseRelationshipTypeCounts(
      row.relTypeCounts || ""
    );

    // Parse inverse indexed types (using existing format)
    const inverseIndexedRelTypes = this.parseInverseIndexedRelTypes(
      row.inverseIndexedRelTypes || ""
    );

    // Build GraphInfo using existing builder pattern
    return GraphInfo.builder()
      .databaseInfo(databaseInfo)
      .idMapBuilderType(row.idMapBuilderType || IdMap.NO_TYPE)
      .nodeCount(parseInt(row.nodeCount?.toString() || "0") || 0)
      .maxOriginalId(parseInt(row.maxOriginalId?.toString() || "0") || 0)
      .relationshipTypeCounts(relTypeCounts)
      .inverseIndexedRelationshipTypes(inverseIndexedRelTypes)
      .build();
  }

  /**
   * 🔧 Parse database location from string.
   */
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
   * 🔗 Parse relationship type counts from CSV string.
   * Format: "TYPE1=count1;TYPE2=count2" (same as CsvMapUtil format)
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
   * 📇 Parse inverse indexed relationship types from CSV string.
   * Format: "TYPE1;TYPE2;TYPE3" (same as CsvGraphInfoVisitor format)
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
 * 🧩 Interface matching the CSV columns from CsvGraphInfoVisitor.
 * Maps directly to the column names defined in the visitor.
 */
interface GraphInfoRow {
  databaseName: string; // DATABASE_NAME_COLUMN_NAME
  databaseLocation: string; // DATABASE_LOCATION_COLUMN_NAME
  remoteDatabaseId?: string; // REMOTE_DATABASE_ID_COLUMN_NAME
  idMapBuilderType?: string; // ID_MAP_BUILDER_TYPE_COLUMN_NAME
  nodeCount?: string | number; // NODE_COUNT_COLUMN_NAME
  maxOriginalId?: string | number; // MAX_ORIGINAL_ID_COLUMN_NAME
  relTypeCounts?: string; // REL_TYPE_COUNTS_COLUMN_NAME
  inverseIndexedRelTypes?: string; // INVERSE_INDEXED_REL_TYPES
}
