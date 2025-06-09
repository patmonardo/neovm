import { PropertySchema } from "@/api/schema";
import { FileHeader } from "./FileHeader";
import { HeaderProperty } from "./HeaderProperty";

/**
 * GRAPH PROPERTY FILE HEADER - CSV GRAPH PROPERTY FILE STRUCTURE
 *
 * Defines the structure and schema for CSV graph property files.
 * Graph properties are key-value pairs that apply to the graph.
 *
 * CSV Format: propertyName:type
 * Example: "totalNodes:long" or "createdAt:string"
 */

export interface GraphPropertyFileHeader
  extends FileHeader<Map<string, PropertySchema>, PropertySchema> {
  /**
   * The single property mapping for this graph property file.
   * Graph property files contain exactly one property per file.
   */
  propertyMapping(): HeaderProperty;

  /**
   * Returns a set containing the single property mapping.
   * Override of FileHeader.propertyMappings() for graph properties.
   */
  propertyMappings(): Array<HeaderProperty>;

  /**
   * Extract property schema for this graph property from the overall schema.
   * Returns a map with the single property schema.
   */
  schemaForIdentifier(
    propertySchema: Map<string, PropertySchema>
  ): Map<string, PropertySchema>;
}

export namespace GraphPropertyFileHeader {
  /**
   * Create GraphPropertyFileHeader from CSV column header.
   *
   * @param headerLine Array containing exactly one property column header
   * @returns GraphPropertyFileHeader instance
   * @throws Error if header doesn't contain exactly one property column
   */
  export function of(headerLine: string[]): GraphPropertyFileHeader {
    if (headerLine.length !== 1) {
      throw new Error(
        `Graph property headers should contain exactly one property column, but got: [${headerLine.join(
          ", "
        )}]`
      );
    }

    const propertyMapping = HeaderProperty.parse(0, headerLine[0]);
    return new DefaultGraphPropertyFileHeader(propertyMapping);
  }
}

/**
 * Implementation of GraphPropertyFileHeader interface.
 */
class DefaultGraphPropertyFileHeader implements GraphPropertyFileHeader {
  constructor(private readonly _propertyMapping: HeaderProperty) {}

  propertyMapping(): HeaderProperty {
    return this._propertyMapping;
  }

  propertyMappings(): Array<HeaderProperty> {
    return [this._propertyMapping];
  }

  schemaForIdentifier(
    propertySchema: Map<string, PropertySchema>
  ): Map<string, PropertySchema> {
    const graphPropertySchema = propertySchema.get(
      this._propertyMapping.propertyKey()
    );
    if (!graphPropertySchema) {
      throw new Error(
        `Property schema not found for key: ${this._propertyMapping.propertyKey()}`
      );
    }
    return new Map([[graphPropertySchema.key(), graphPropertySchema]]);
  }
}
