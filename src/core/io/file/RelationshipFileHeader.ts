/**
 * RELATIONSHIP FILE HEADER - CSV RELATIONSHIP FILE STRUCTURE
 *
 * Defines the structure and schema for CSV relationship files.
 * Maps CSV columns to relationship properties and validates header format.
 *
 * CSV Format: :START_ID | :END_ID | property1:type | property2:type | ...
 * Example: ":START_ID,:END_ID,weight:double,timestamp:long"
 */

import { RelationshipType } from "@/projection";
import { MutableRelationshipSchema } from "@/api/schema";
import { RelationshipPropertySchema } from "@/api/schema";
import { FileHeader } from "./FileHeader";
import { HeaderProperty } from "./HeaderProperty";

export interface RelationshipFileHeader
  extends FileHeader<MutableRelationshipSchema, RelationshipPropertySchema> {
  /**
   * The relationship type that this CSV file contains.
   */
  relationshipType(): string;

  /**
   * Extract property schema for this relationship type from the overall schema.
   */
  schemaForIdentifier(
    schema: MutableRelationshipSchema
  ): Map<string, RelationshipPropertySchema>;
}

export namespace RelationshipFileHeader {
  /**
   * Create RelationshipFileHeader from CSV column headers and relationship type.
   *
   * @param csvColumns Array of CSV column headers (first two must be :START_ID, :END_ID)
   * @param relationshipType Name of the relationship type for this file
   * @returns RelationshipFileHeader instance
   * @throws Error if first column is not :START_ID or second column is not :END_ID
   */
  export function of(
    csvColumns: string[],
    relationshipType: string
  ): RelationshipFileHeader {
    // Validate first column is START_ID
    if (csvColumns.length === 0 || csvColumns[0] !== CSV_START_ID_COLUMN) {
      throw new Error(`First column of header must be ${CSV_START_ID_COLUMN}.`);
    }

    // Validate second column is END_ID
    if (csvColumns.length === 1 || csvColumns[1] !== CSV_END_ID_COLUMN) {
      throw new Error(`Second column of header must be ${CSV_END_ID_COLUMN}.`);
    }

    // Parse property columns (skip first two ID columns)
    const propertyMappings: HeaderProperty[] = [];
    for (let i = 2; i < csvColumns.length; i++) {
      propertyMappings.push(HeaderProperty.parse(i, csvColumns[i]));
    }

    return new RelationshipFileHeaderImpl(propertyMappings, relationshipType);
  }
}

/**
 * CSV relationship column name constants.
 * Must be the first two columns in every relationship CSV file.
 */
export const CSV_START_ID_COLUMN = ":START_ID";
export const CSV_END_ID_COLUMN = ":END_ID";

/**
 * Implementation of RelationshipFileHeader interface.
 */
class RelationshipFileHeaderImpl implements RelationshipFileHeader {
  constructor(
    private readonly _propertyMappings: HeaderProperty[],
    private readonly _relationshipType: string
  ) {}

  relationshipType(): string {
    return this._relationshipType;
  }

  propertyMappings(): HeaderProperty[] {
    return [...this._propertyMappings]; // Return copy to prevent mutation
  }

  schemaForIdentifier(
    schema: MutableRelationshipSchema
  ): Map<string, RelationshipPropertySchema> {
    // Filter schema by this relationship type and get its properties
    const relType = RelationshipType.of(this._relationshipType);
    const relationshipTypes = new Set([relType]);
    return schema.filter(relationshipTypes).unionProperties();
  }
}
