/**
 * Functional interface for translating relationship property values during export.
 *
 * This interface defines a **value transformation contract** for converting internal
 * relationship property representations to formats suitable for external storage systems.
 * It's a key component in the export pipeline that ensures data compatibility between
 * the internal graph processing engine and various export targets.
 *
 * **Design Philosophy:**
 * - **Functional interface**: Single method for maximum flexibility and composability
 * - **Type conversion**: Bridge between internal numeric types and external value systems
 * - **Export-oriented**: Specifically designed for the export pipeline requirements
 * - **Composable**: Can be combined with other translators for complex transformations
 *
 * **Core Use Cases:**
 *
 * **Type System Bridging:**
 * The internal graph processing engine works primarily with doubles for relationship
 * properties (weights, scores, distances), but export targets may require different
 * value representations:
 * - **File exports**: Convert to strings, formatted numbers, or JSON values
 * - **Database exports**: Convert to database-specific value types
 * - **Stream exports**: Convert to serializable formats for network transmission
 *
 * **Value Transformation Patterns:**
 * ```typescript
 * // Simple type conversion
 * const stringTranslator: RelationshipPropertyTranslator =
 *   (value) => String(value);
 *
 * // Scaled value transformation
 * const percentageTranslator: RelationshipPropertyTranslator =
 *   (value) => Math.round(value * 100);
 *
 * // Categorical transformation
 * const categoryTranslator: RelationshipPropertyTranslator =
 *   (value) => value > 0.8 ? 'HIGH' : value > 0.5 ? 'MEDIUM' : 'LOW';
 *
 * // Precision control
 * const precisionTranslator: RelationshipPropertyTranslator =
 *   (value) => Math.round(value * 1000) / 1000; // 3 decimal places
 * ```
 *
 * **Export Pipeline Integration:**
 * This translator is typically used within export builders and exporters to ensure
 * that relationship property values are correctly formatted for the target system:
 * ```typescript
 * const exporter = builder
 *   .withRelationPropertyTranslator(customTranslator)
 *   .build();
 *
 * // The translator is applied to every relationship property value during export
 * exporter.write('SIMILAR_TO', 'similarity_score');
 * ```
 *
 * **Performance Considerations:**
 * - Called for **every relationship property value** during export
 * - Should be **lightweight** to avoid becoming a bottleneck
 * - Avoid expensive operations like I/O, network calls, or complex computations
 * - Consider caching results for frequently repeated values
 *
 * **Common Implementations:**
 * - **Identity translator**: Returns values unchanged
 * - **Type converters**: Convert between numeric types, strings, etc.
 * - **Format adapters**: Adapt values to specific export format requirements
 * - **Business logic**: Apply domain-specific transformations
 */
export interface RelationshipPropertyTranslator {
  /**
   * Translates a relationship property value from internal representation to export format.
   *
   * This method is the **core transformation point** in the export pipeline. It receives
   * the internal double value (as used by graph algorithms) and must return a value
   * suitable for the target export system.
   *
   * **Input Characteristics:**
   * - Always a double value from the internal graph representation
   * - May represent weights, scores, distances, similarities, or other numeric properties
   * - Can include special values like NaN, Infinity, or very large/small numbers
   * - Range and distribution depend on the specific algorithm that computed the values
   *
   * **Output Requirements:**
   * - Must be compatible with the target export system
   * - Should handle edge cases gracefully (NaN, Infinity, etc.)
   * - Should maintain semantic meaning of the original value when possible
   * - Must be consistent for the same input value (deterministic)
   *
   * **Implementation Guidelines:**
   *
   * **Handle Special Values:**
   * ```typescript
   * toValue(relationshipProperty: number): any {
   *   if (!isFinite(relationshipProperty)) {
   *     return null; // or appropriate default for target system
   *   }
   *   return relationshipProperty;
   * }
   * ```
   *
   * **Type-Safe Conversion:**
   * ```typescript
   * toValue(relationshipProperty: number): string {
   *   return relationshipProperty.toFixed(3); // Consistent precision
   * }
   * ```
   *
   * **Business Logic Integration:**
   * ```typescript
   * toValue(relationshipProperty: number): string {
   *   // Convert similarity scores to confidence levels
   *   if (relationshipProperty >= 0.9) return 'VERY_HIGH';
   *   if (relationshipProperty >= 0.7) return 'HIGH';
   *   if (relationshipProperty >= 0.5) return 'MEDIUM';
   *   if (relationshipProperty >= 0.3) return 'LOW';
   *   return 'VERY_LOW';
   * }
   * ```
   *
   * **Error Handling:**
   * Implementations should handle error conditions gracefully:
   * - Invalid input values (NaN, Infinity)
   * - Out-of-range values for the target system
   * - Type conversion failures
   * - Precision loss or overflow issues
   *
   * @param relationshipProperty The internal double value to be translated
   * @returns The translated value suitable for the target export system
   * @throws Should avoid throwing exceptions; return appropriate defaults instead
   */
  toValue(relationshipProperty: number): any;
}

/**
 * Common pre-built relationship property translators for typical use cases.
 *
 * These implementations provide **ready-to-use translators** for common scenarios,
 * reducing boilerplate code and ensuring consistent behavior across different
 * parts of the export pipeline.
 */
export namespace RelationshipPropertyTranslators {
  /**
   * Identity translator that returns the value unchanged.
   *
   * Useful when the target system can handle double values directly,
   * or as a base case for testing and development.
   */
  export const IDENTITY: RelationshipPropertyTranslator = {
    toValue: (relationshipProperty: number) => relationshipProperty
  };

  /**
   * String translator that converts values to string representation.
   *
   * Uses JavaScript's default string conversion, which handles special
   * values (NaN, Infinity) appropriately for most text-based export formats.
   */
  export const TO_STRING: RelationshipPropertyTranslator = {
    toValue: (relationshipProperty: number) => String(relationshipProperty)
  };

  /**
   * Integer translator that rounds values to the nearest integer.
   *
   * Useful for properties that represent counts, ranks, or other
   * naturally integer values.
   */
  export const TO_INTEGER: RelationshipPropertyTranslator = {
    toValue: (relationshipProperty: number) => Math.round(relationshipProperty)
  };

  /**
   * Fixed-precision translator that formats values with specific decimal places.
   *
   * @param decimals Number of decimal places to include
   * @returns Translator that formats values with fixed precision
   */
  export function withPrecision(decimals: number): RelationshipPropertyTranslator {
    return {
      toValue: (relationshipProperty: number) => {
        if (!isFinite(relationshipProperty)) {
          return null;
        }
        return Number(relationshipProperty.toFixed(decimals));
      }
    };
  }

  /**
   * Scaling translator that multiplies values by a constant factor.
   *
   * Useful for converting between different units or scaling ranges.
   *
   * @param factor The scaling factor to apply
   * @returns Translator that scales values by the given factor
   */
  export function withScaling(factor: number): RelationshipPropertyTranslator {
    return {
      toValue: (relationshipProperty: number) => relationshipProperty * factor
    };
  }

  /**
   * Range clamping translator that constrains values to a specific range.
   *
   * @param min Minimum allowed value
   * @param max Maximum allowed value
   * @returns Translator that clamps values to the specified range
   */
  export function withClamping(min: number, max: number): RelationshipPropertyTranslator {
    return {
      toValue: (relationshipProperty: number) => Math.max(min, Math.min(max, relationshipProperty))
    };
  }

  /**
   * Null-safe translator that converts special values to null.
   *
   * Useful for export systems that can't handle NaN or Infinity values.
   */
  export const NULL_SAFE: RelationshipPropertyTranslator = {
    toValue: (relationshipProperty: number) => {
      return isFinite(relationshipProperty) ? relationshipProperty : null;
    }
  };
}
