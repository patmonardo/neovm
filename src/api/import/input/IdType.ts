/**
 * ID TYPE - INPUT ID CLASSIFICATION
 *
 * Defines different types that input IDs can come in during batch imports.
 * Enum names are user-facing and match Neo4j conventions.
 */

export enum IdType {
  /**
   * Used when node IDs in input data are any string identifier.
   * Most flexible but requires string-to-long mapping.
   */
  STRING = "STRING",

  /**
   * Used when node IDs in input data are any integer identifier.
   * Uses 8-byte longs for storage, but user-facing name is "integer".
   */
  INTEGER = "INTEGER",

  /**
   * Used when node IDs in input data are specified as long values
   * and point to actual record IDs.
   * ADVANCED usage - performance advantage but requires carefully planned input data.
   */
  ACTUAL = "ACTUAL"
}

export namespace IdType {
  /**
   * Get the default ID type for most use cases.
   */
  export function getDefault(): IdType {
    return IdType.STRING;
  }

  /**
   * Check if this ID type requires mapping from input to internal IDs.
   */
  export function requiresMapping(idType: IdType): boolean {
    return idType === IdType.STRING || idType === IdType.INTEGER;
  }

  /**
   * Check if this ID type uses actual internal record IDs.
   */
  export function isActual(idType: IdType): boolean {
    return idType === IdType.ACTUAL;
  }
}
