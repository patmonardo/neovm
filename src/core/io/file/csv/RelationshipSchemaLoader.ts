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
import Papa from "papaparse";

/**
 * RelationshipSchemaLoader using Papa Parse for robust CSV parsing.
 */
export class RelationshipSchemaLoader {
  private readonly relationshipSchemaPath: string;

  constructor(csvDirectory: string) {
    this.relationshipSchemaPath = path.join(
      csvDirectory,
      CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME
    );
  }

  /**
   * Load MutableRelationshipSchema from CSV file using Papa Parse.
   */
  load(): MutableRelationshipSchema {
    try {
      if (!fs.existsSync(this.relationshipSchemaPath)) {
        throw new Error(`Relationship schema file not found: ${this.relationshipSchemaPath}`);
      }

      const csvContent = fs.readFileSync(this.relationshipSchemaPath, "utf-8");

      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim(),
        dynamicTyping: false,
      });

      if (result.errors.length > 0) {
        console.warn(`CSV parsing errors in ${this.relationshipSchemaPath}:`, result.errors);
      }

      const rows = result.data as RelationshipSchemaRow[];

      if (rows.length === 0) {
        throw new Error("Relationship schema file is empty or contains only headers");
      }

      return this.buildRelationshipSchema(rows);
    } catch (error) {
      throw new Error(`Failed to load relationship schema: ${(error as Error).message}`);
    }
  }

  /**
   * 🧪 Simple debug method for basic file checking.
   */
  debug(): void {
    console.log("🔗 === RelationshipSchemaLoader Debug ===");
    console.log(`📁 File: ${this.relationshipSchemaPath}`);
    console.log(`📄 Exists: ${fs.existsSync(this.relationshipSchemaPath)}`);

    if (fs.existsSync(this.relationshipSchemaPath)) {
      try {
        const relSchema = this.load();
        const types = Array.from(relSchema.availableTypes());
        console.log(`✅ Loaded ${types.length} relationship types: ${types.map(t => t.name()).join(", ")}`);
      } catch (error) {
        console.log(`❌ Load failed: ${(error as Error).message}`);
      }
    }
    console.log("🔗 === End Debug ===\n");
  }

  /**
   * 🏗️ Build MutableRelationshipSchema from parsed CSV rows.
   */
  private buildRelationshipSchema(rows: RelationshipSchemaRow[]): MutableRelationshipSchema {
    const schemaBuilder = new RelationshipSchemaBuilderVisitor();

    try {
      for (const row of rows) {
        this.validateRow(row);

        const relationshipType = RelationshipType.of(row.relationshipType);
        const direction = this.parseDirection(row.direction || "DIRECTED");

        schemaBuilder.relationshipType(relationshipType);
        schemaBuilder.direction(direction);

        if (row.propertyKey && row.propertyKey.trim() !== "") {
          schemaBuilder.key(row.propertyKey);
          schemaBuilder.valueType(this.parseValueType(row.valueType));
          schemaBuilder.state(this.parsePropertyState(row.state));
          schemaBuilder.aggregation(this.parseAggregation(row.aggregation || "NONE"));

          if (row.defaultValue && row.defaultValue.trim() !== "") {
            const valueType = this.parseValueType(row.valueType);
            const isArray = this.isArrayType(valueType);
            const defaultValue = DefaultValueIOHelper.deserialize(
              row.defaultValue,
              valueType,
              isArray
            );
            schemaBuilder.defaultValue(defaultValue);
          }
        }

        schemaBuilder.endOfEntity();
      }

      schemaBuilder.close();
      return schemaBuilder.schema();
    } catch (error) {
      throw new Error(`Failed to build relationship schema: ${(error as Error).message}`);
    }
  }

  private validateRow(row: RelationshipSchemaRow): void {
    if (!row.relationshipType || row.relationshipType.trim() === "") {
      throw new Error("Missing required field: relationshipType");
    }

    if (row.propertyKey && row.propertyKey.trim() !== "") {
      if (!row.valueType || row.valueType.trim() === "") {
        throw new Error(`Missing valueType for property ${row.propertyKey} in relationship ${row.relationshipType}`);
      }
      if (!row.state || row.state.trim() === "") {
        throw new Error(`Missing state for property ${row.propertyKey} in relationship ${row.relationshipType}`);
      }
    }
  }

  private parseDirection(directionStr: string): Direction {
    switch (directionStr.toUpperCase()) {
      case "DIRECTED": return Direction.DIRECTED;
      case "UNDIRECTED": return Direction.UNDIRECTED;
      default:
        throw new Error(`Unknown Direction: ${directionStr}`);
    }
  }

  private parseValueType(valueTypeStr: string): ValueType {
    if (!valueTypeStr || valueTypeStr.trim() === "") {
      throw new Error("ValueType string is undefined or empty");
    }

    switch (valueTypeStr.toUpperCase()) {
      case "LONG": return ValueType.LONG;
      case "DOUBLE": return ValueType.DOUBLE;
      case "STRING": return ValueType.STRING;
      case "BOOLEAN": return ValueType.BOOLEAN;
      case "LONG_ARRAY": return ValueType.LONG_ARRAY;
      case "DOUBLE_ARRAY": return ValueType.DOUBLE_ARRAY;
      case "STRING_ARRAY": return ValueType.STRING_ARRAY;
      case "FLOAT_ARRAY": return ValueType.FLOAT_ARRAY;
      default:
        throw new Error(`Unknown ValueType: ${valueTypeStr}`);
    }
  }

  private parseAggregation(aggregationStr: string): Aggregation {
    switch (aggregationStr.toUpperCase()) {
      case "NONE": return Aggregation.NONE;
      case "SUM": return Aggregation.SUM;
      case "MIN": return Aggregation.MIN;
      case "MAX": return Aggregation.MAX;
      case "COUNT": return Aggregation.COUNT;
      default:
        throw new Error(`Unknown Aggregation: ${aggregationStr}`);
    }
  }

  private parsePropertyState(stateStr: string): PropertyState {
    if (!stateStr || stateStr.trim() === "") {
      throw new Error("PropertyState string is undefined or empty");
    }

    switch (stateStr.toUpperCase()) {
      case "PERSISTENT": return PropertyState.PERSISTENT;
      case "TRANSIENT": return PropertyState.TRANSIENT;
      default:
        throw new Error(`Unknown PropertyState: ${stateStr}`);
    }
  }

  private isArrayType(valueType: ValueType): boolean {
    switch (valueType) {
      case ValueType.LONG_ARRAY:
      case ValueType.DOUBLE_ARRAY:
      case ValueType.STRING_ARRAY:
      case ValueType.FLOAT_ARRAY:
        return true;
      default:
        return false;
    }
  }
}

interface RelationshipSchemaRow {
  relationshipType: string;
  direction: string;
  propertyKey: string;
  valueType: string;
  defaultValue: string;
  aggregation: string;
  state: string;
}
