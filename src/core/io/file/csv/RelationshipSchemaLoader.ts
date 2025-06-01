/**
 * RELATIONSHIP SCHEMA LOADER - CSV RELATIONSHIP SCHEMA PARSER
 *
 * Simple loader with single load() method that reads CSV relationship schema files.
 * Parses schema lines and builds MutableRelationshipSchema using visitor pattern.
 */

import { RelationshipType } from "@/projection";
import { PropertyState } from "@/api";
import { ValueType } from "@/api";
import { Direction } from "@/api/schema";
import { MutableRelationshipSchema } from "@/api/schema";
import { Aggregation } from "@/core/Aggregation";
import { RelationshipSchemaBuilderVisitor } from "@/core/io/schema";
import { CsvRelationshipSchemaVisitor } from "./CsvRelationshipSchemaVisitor";
import { DefaultValueIOHelper } from "./DefaultValueIOHelper";
import * as fs from "fs";
import * as path from "path";

export class RelationshipSchemaLoader {
  private readonly relationshipSchemaPath: string;

  constructor(csvDirectory: string) {
    this.relationshipSchemaPath = path.join(
      csvDirectory,
      CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load MutableRelationshipSchema from CSV file.
   *
   * @returns MutableRelationshipSchema built from CSV schema file
   * @throws Error if file cannot be read or parsed
   */
  load(): MutableRelationshipSchema {
    const schemaBuilder = new RelationshipSchemaBuilderVisitor();

    try {
      // Read CSV file line by line
      const fileContent = fs.readFileSync(this.relationshipSchemaPath, "utf-8");
      const lines = fileContent.trim().split("\n");

      if (lines.length === 0) {
        throw new Error("Relationship schema file is empty");
      }

      // Parse header line
      const header = lines[0].split(",").map((col) => col.trim());
      const relationshipTypeIndex = header.indexOf("relationshipType");
      const directionIndex = header.indexOf("direction");
      const propertyKeyIndex = header.indexOf("propertyKey");
      const valueTypeIndex = header.indexOf("valueType");
      const defaultValueIndex = header.indexOf("defaultValue");
      const aggregationIndex = header.indexOf("aggregation");
      const stateIndex = header.indexOf("state");

      if (relationshipTypeIndex === -1) {
        throw new Error(
          'Missing required "relationshipType" column in relationship schema'
        );
      }

      // Process each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        const schemaLine = this.parseSchemaLine(line, {
          relationshipTypeIndex,
          directionIndex,
          propertyKeyIndex,
          valueTypeIndex,
          defaultValueIndex,
          aggregationIndex,
          stateIndex,
        });

        // Build schema using visitor pattern
        schemaBuilder.relationshipType(schemaLine.relationshipType);
        schemaBuilder.direction(schemaLine.direction);

        if (schemaLine.propertyKey !== null) {
          schemaBuilder.key(schemaLine.propertyKey);
          schemaBuilder.valueType(schemaLine.valueType!);
          schemaBuilder.defaultValue(
            DefaultValueIOHelper.deserialize(
              schemaLine.defaultValue,
              schemaLine.valueType!,
              true
            )
          );
          schemaBuilder.state(schemaLine.state!);
          schemaBuilder.aggregation(schemaLine.aggregation!);
        }

        schemaBuilder.endOfEntity();
      }
    } catch (error) {
      throw new Error(
        `Failed to load relationship schema: ${(error as Error).message}`
      );
    }

    schemaBuilder.close();
    return schemaBuilder.schema();
  }

  /**
   * Parse a single CSV line into a SchemaLine object.
   */
  private parseSchemaLine(line: string, indices: ColumnIndices): SchemaLine {
    const columns = line.split(",").map((col) => col.trim());

    const relationshipType = RelationshipType.of(
      columns[indices.relationshipTypeIndex] || ""
    );

    const direction =
      indices.directionIndex >= 0 && columns[indices.directionIndex]
        ? this.parseDirection(columns[indices.directionIndex])
        : Direction.DIRECTED; // Default value from Java

    const propertyKey =
      indices.propertyKeyIndex >= 0 && columns[indices.propertyKeyIndex]
        ? columns[indices.propertyKeyIndex]
        : null;

    const valueType =
      indices.valueTypeIndex >= 0 && columns[indices.valueTypeIndex]
        ? this.parseValueType(columns[indices.valueTypeIndex])
        : null;

    const defaultValue =
      indices.defaultValueIndex >= 0 && columns[indices.defaultValueIndex]
        ? columns[indices.defaultValueIndex]
        : null;

    const aggregation =
      indices.aggregationIndex >= 0 && columns[indices.aggregationIndex]
        ? this.parseAggregation(columns[indices.aggregationIndex])
        : null;

    const state =
      indices.stateIndex >= 0 && columns[indices.stateIndex]
        ? this.parsePropertyState(columns[indices.stateIndex])
        : null;

    return new SchemaLine(
      relationshipType,
      direction,
      propertyKey,
      valueType,
      defaultValue,
      aggregation,
      state
    );
  }

  private parseDirection(directionStr: string): Direction {
    switch (directionStr.toUpperCase()) {
      case "DIRECTED":
        return Direction.DIRECTED;
      case "UNDIRECTED":
        return Direction.UNDIRECTED;
      default:
        throw new Error(`Unknown Direction: ${directionStr}`);
    }
  }

  private parseValueType(valueTypeStr: string): ValueType {
    switch (valueTypeStr.toUpperCase()) {
      case "LONG":
        return ValueType.LONG;
      case "DOUBLE":
        return ValueType.DOUBLE;
      case "STRING":
        return ValueType.STRING;
      case "BOOLEAN":
        return ValueType.BOOLEAN;
      case "LONG_ARRAY":
        return ValueType.LONG_ARRAY;
      case "DOUBLE_ARRAY":
        return ValueType.DOUBLE_ARRAY;
      case "STRING_ARRAY":
        return ValueType.STRING_ARRAY;
      default:
        throw new Error(`Unknown ValueType: ${valueTypeStr}`);
    }
  }

  private parseAggregation(aggregationStr: string): Aggregation {
    switch (aggregationStr.toUpperCase()) {
      case "NONE":
        return Aggregation.NONE;
      case "SUM":
        return Aggregation.SUM;
      case "MIN":
        return Aggregation.MIN;
      case "MAX":
        return Aggregation.MAX;
      case "COUNT":
        return Aggregation.COUNT;
      default:
        throw new Error(`Unknown Aggregation: ${aggregationStr}`);
    }
  }

  private parsePropertyState(stateStr: string): PropertyState {
    switch (stateStr.toUpperCase()) {
      case "PERSISTENT":
        return PropertyState.PERSISTENT;
      case "TRANSIENT":
        return PropertyState.TRANSIENT;
      default:
        throw new Error(`Unknown PropertyState: ${stateStr}`);
    }
  }
}

/**
 * Schema line data structure.
 */
class SchemaLine {
  constructor(
    public readonly relationshipType: RelationshipType,
    public readonly direction: Direction,
    public readonly propertyKey: string | null,
    public readonly valueType: ValueType | null,
    public readonly defaultValue: string | null,
    public readonly aggregation: Aggregation | null,
    public readonly state: PropertyState | null
  ) {}
}

/**
 * Column indices for CSV parsing.
 */
interface ColumnIndices {
  relationshipTypeIndex: number;
  directionIndex: number;
  propertyKeyIndex: number;
  valueTypeIndex: number;
  defaultValueIndex: number;
  aggregationIndex: number;
  stateIndex: number;
}
