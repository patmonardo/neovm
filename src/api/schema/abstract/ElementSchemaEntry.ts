import { ElementIdentifier } from "@/projection/abstract/ElementIdentifier";
import { PropertySchema } from "./PropertySchema";

/**
 * Abstract base class for schema entries of graph elements (nodes or relationships).
 *
 * @typeParam SELF - Self-referential type for fluent interface pattern
 * @typeParam ELEMENT_IDENTIFIER - Type of element identifier (e.g., node label, relationship type)
 * @typeParam PROPERTY_SCHEMA - Type of property schema
 */
export abstract class ElementSchemaEntry<
  SELF extends ElementSchemaEntry<SELF, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>,
  ELEMENT_IDENTIFIER extends ElementIdentifier,
  PROPERTY_SCHEMA extends PropertySchema
> {
  /**
   * Returns the identifier for this element.
   */
  abstract identifier(): ELEMENT_IDENTIFIER;

  /**
   * Returns the properties associated with this element.
   */
  abstract properties(): Record<string, PROPERTY_SCHEMA>;

  /**
   * Creates a union of this entry with another entry.
   */
  abstract union(other: SELF): SELF;

  /**
   * Converts this entry to a map representation.
   */
  abstract toMap(): Record<string, any>;

  /**
   * Creates a union of property maps.
   *
   * @param rightProperties Properties to be merged with this entry's properties
   * @returns A new map containing properties from both sources
   */
  unionProperties(
    rightProperties: Record<string, PROPERTY_SCHEMA>
  ): Record<string, PROPERTY_SCHEMA> {
    const result: Record<string, PROPERTY_SCHEMA> = {};
    const leftProperties = this.properties();

    // First add all properties from this entry
    Object.entries(leftProperties).forEach(([key, value]) => {
      result[key] = value;
    });

    // Then add all properties from the right map, checking for conflicts
    Object.entries(rightProperties).forEach(([key, rightValue]) => {
      if (key in result) {
        const leftValue = result[key];
        if (leftValue.valueType() !== rightValue.valueType()) {
          throw new Error(
            `Combining schema entries with value type ${JSON.stringify(
              Object.entries(leftProperties).reduce((acc, [k, v]) => {
                acc[k] = v.valueType();
                return acc;
              }, {} as Record<string, any>)
            )} and ${JSON.stringify(
              Object.entries(rightProperties).reduce((acc, [k, v]) => {
                acc[k] = v.valueType();
                return acc;
              }, {} as Record<string, any>)
            )} is not supported.`
          );
        }
        // Keep the left value if there's a conflict but types match
      } else {
        result[key] = rightValue;
      }
    });

    return result;
  }
}

/**
 * Static helper methods for ElementSchemaEntry
 */
export namespace ElementSchemaEntry {
  /**
   * Creates a map representation of an ElementSchemaEntry
   */
  export function toMap<
    SELF extends ElementSchemaEntry<SELF, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>,
    ELEMENT_IDENTIFIER extends ElementIdentifier,
    PROPERTY_SCHEMA extends PropertySchema
  >(
    entry: ElementSchemaEntry<SELF, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>
  ): Record<string, any> {
    const propertySchemas = entry.properties();
    const properties: Record<string, any> = {};

    for (const [key, schema] of Object.entries(propertySchemas)) {
      properties[key] = {
        valueType: schema.valueType().toString(),
        defaultValue: schema.defaultValue().toString(),
        state: schema.state().toString(),
      };
    }

    return {
      properties: properties,
    };
  }

  /**
   * Creates a union of two ElementSchemaEntry instances
   */
  export function union<
    SELF extends ElementSchemaEntry<SELF, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>,
    ELEMENT_IDENTIFIER extends ElementIdentifier,
    PROPERTY_SCHEMA extends PropertySchema
  >(left: SELF, right: SELF): SELF {
    // Type safety check
    if (!left.identifier().equals(right.identifier())) {
      throw new Error(
        `Cannot union entries with different identifiers: ${left
          .identifier()
          .name()} and ${right.identifier().name()}`
      );
    }

    return left.union(right);
  }
}
