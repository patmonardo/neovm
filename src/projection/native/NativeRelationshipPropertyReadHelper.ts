import { Aggregation } from "@/core/aggregation";
import { formatWithLocale } from "@/utils";

/**
 * SHOCKING REVELATION: Neo4j GDS Relationship Property Restrictions
 *
 * GDS relationships can ONLY have:
 * ❌ Single numeric property per relationship type
 * ❌ Always converted to double values
 * ❌ Must support aggregation (for parallel edges)
 * ❌ NO strings, objects, arrays, or multiple properties!
 *
 * This is INCREDIBLY restrictive compared to what relationships could store!
 */
export class NativeRelationshipPropertyReadHelper {

  private constructor() {
    throw new Error("No instances - utility class");
  }

  /**
   * THE CORE RESTRICTION: Only reads SINGLE DOUBLE properties!
   *
   * @param propertyIds - Array of property IDs to read (but typically just ONE!)
   * @param defaultValues - Default values for missing properties
   * @param aggregations - How to combine multiple edges (SUM, MAX, MIN, etc.)
   * @param properties - Output array (same length as propertyIds)
   */
  static readProperties(
    propertyCursor: PropertyCursor,
    propertyIds: number[],
    defaultValues: number[],
    aggregations: Aggregation[],
    properties: number[]  // ← OUTPUT: Always numbers!
  ): void {

    // Initialize with default/empty values
    for (let i = 0; i < properties.length; i++) {
      const defaultValue = defaultValues[i];
      const aggregation = aggregations[i];

      if (propertyIds[i] === NO_SUCH_PROPERTY_KEY) {
        // Special case: count(*) mode - counting relationships
        properties[i] = aggregation.normalizePropertyValue(defaultValue);
      } else {
        // Normal case: expecting a numeric property
        properties[i] = aggregation.emptyValue(defaultValue);
      }
    }

    // Read actual property values from Neo4j cursor
    while (propertyCursor.next()) {
      // Linear search through property IDs (usually just 1!)
      for (let indexOfPropertyId = 0; indexOfPropertyId < propertyIds.length; indexOfPropertyId++) {

        if (propertyIds[indexOfPropertyId] === propertyCursor.propertyKey()) {
          const aggregation = aggregations[indexOfPropertyId];
          const value = propertyCursor.propertyValue();
          const defaultValue = defaultValues[indexOfPropertyId];

          // ⚠️ THE RESTRICTION: Extract as double only!
          const propertyValue = this.extractValue(aggregation, value, defaultValue);
          properties[indexOfPropertyId] = propertyValue;
        }
      }
    }
  }

  /**
   * THE SHOCKING RESTRICTION: Only numeric values allowed!
   */
  static extractValue(value: any, defaultValue: number): number {
    return this.extractValue(Aggregation.NONE, value, defaultValue);
  }

  /**
   * CORE VALUE EXTRACTION - Reveals the brutal restrictions
   */
  static extractValue(aggregation: Aggregation, value: any, defaultValue: number): number {

    // ✅ ONLY NUMERIC VALUES ALLOWED
    if (this.isNumberValue(value)) {
      const propertyValue = this.toDouble(value);
      return aggregation.normalizePropertyValue(propertyValue);
    }

    // ✅ HANDLE MISSING VALUES
    if (this.isNoValue(value)) {
      return aggregation.emptyValue(defaultValue);
    }

    // ❌ EVERYTHING ELSE IS REJECTED!
    throw new Error(formatWithLocale(
      "Unsupported type [%s] of value %s. Please use a numeric property. " +
      "GDS relationships can ONLY store single numeric properties!",
      typeof value,
      value
    ));
  }

  // ====================================================================
  // UTILITY METHODS - Type checking and conversion
  // ====================================================================

  private static isNumberValue(value: any): boolean {
    return typeof value === 'number' || typeof value === 'bigint';
  }

  private static toDouble(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    throw new Error(`Cannot convert ${typeof value} to number`);
  }

  private static isNoValue(value: any): boolean {
    return value === null || value === undefined;
  }
}

// ====================================================================
// SUPPORTING TYPES AND CONSTANTS
// ====================================================================

const NO_SUCH_PROPERTY_KEY = -1;

interface PropertyCursor {
  next(): boolean;
  propertyKey(): number;
  propertyValue(): any;
}
