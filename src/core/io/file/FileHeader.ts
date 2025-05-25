import { PropertySchema } from '@/api/schema';

/**
 * Interface for file headers in the GDS IO system.
 * Defines the contract for mapping properties and schemas when reading/writing graph files.
 *
 * @template SCHEMA The type of schema (e.g., NodeSchema, RelationshipSchema)
 * @template PROPERTY_SCHEMA The type of property schema that extends PropertySchema
 */
export interface FileHeader<SCHEMA, PROPERTY_SCHEMA extends PropertySchema> {
  /**
   * Returns the set of property mappings defined in this file header.
   * These mappings describe how properties are stored and accessed in the file.
   *
   * @returns Set of HeaderProperty objects describing property mappings
   */
  propertyMappings(): Set<HeaderProperty>;

  /**
   * Returns a map of property schemas for the given schema identifier.
   * This allows looking up specific property schemas by their string identifiers.
   *
   * @param schema The schema to extract property schemas from
   * @returns Map from property identifier strings to their corresponding property schemas
   */
  schemaForIdentifier(schema: SCHEMA): Map<string, PROPERTY_SCHEMA>;
}
