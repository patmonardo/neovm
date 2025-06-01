/**
 * PROPERTY SIZE CALCULATOR - CSV IMPORT ADAPTATION
 *
 * Calculates memory size of property values during import.
 * Simplified version without Neo4j internal dependencies.
 */

export interface PropertySizeCalculator {
  /**
   * Calculate the memory size of property values.
   * Simplified signature for CSV import use cases.
   */
  calculateSize(values: any[]): number;
}

export namespace PropertySizeCalculator {
  /**
   * Simple calculator that estimates size based on JavaScript value types.
   * Good enough for CSV import memory estimation.
   */
  export const SIMPLE: PropertySizeCalculator = {
    calculateSize(values: any[]): number {
      let totalSize = 0;

      for (const value of values) {
        totalSize += calculateValueSize(value);
      }

      return totalSize;
    }
  };

  /**
   * Calculator that just counts number of properties.
   * Fastest option when you don't need accurate memory estimates.
   */
  export const COUNT_ONLY: PropertySizeCalculator = {
    calculateSize(values: any[]): number {
      return values.length * 16; // Assume 16 bytes per property on average
    }
  };

  /**
   * No-op calculator for when you don't care about size.
   * Perfect for development and testing.
   */
  export const IGNORE: PropertySizeCalculator = {
    calculateSize(values: any[]): number {
      return 0;
    }
  };
}

/**
 * Estimate size of a JavaScript value for memory calculations.
 */
function calculateValueSize(value: any): number {
  if (value === null || value === undefined) {
    return 8; // Reference size
  }

  switch (typeof value) {
    case 'boolean':
      return 1;

    case 'number':
      return 8; // Double precision

    case 'string':
      return value.length * 2 + 24; // UTF-16 + object overhead

    case 'object':
      if (Array.isArray(value)) {
        return value.reduce((sum, item) => sum + calculateValueSize(item), 24); // Array overhead
      }

      if (value instanceof Date) {
        return 16;
      }

      // Generic object
      return Object.keys(value).reduce((sum, key) =>
        sum + calculateValueSize(key) + calculateValueSize(value[key]), 24
      );

    default:
      return 16; // Default object size
  }
}
