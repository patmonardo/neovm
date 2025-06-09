import { ElementIdentifier } from "@/projection";
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
  abstract properties(): Map<string, PROPERTY_SCHEMA>;

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
    rightProperties: Map<string, PROPERTY_SCHEMA>
  ): Map<string, PROPERTY_SCHEMA> {
    const result = new Map<string, PROPERTY_SCHEMA>();
    const leftProperties = this.properties();

    // console.log("🔧 DEBUG unionProperties:");
    // displayPropertyMap(leftProperties, "Left Properties");
    // displayPropertyMap(rightProperties, "Right Properties");

    // First add all properties from this entry
    leftProperties.forEach((value, key) => {
      result.set(key, value);
    });

    // Then add all properties from the right map
    rightProperties.forEach((rightValue, key) => {
      if (result.has(key)) {
        const leftValue = result.get(key)!;
        console.log(
          `⚠️  Conflict on '${key}': ${leftValue.valueType()} vs ${rightValue.valueType()}`
        );
        if (leftValue.valueType() !== rightValue.valueType()) {
          throw new Error(
            `Property '${key}' has conflicting value types: ${leftValue.valueType()} vs ${rightValue.valueType()}`
          );
        }
        // Keep the left value if there's a conflict but types match
      } else {
        console.log(`➕ Adding '${key}': ${rightValue.valueType()}`);
        result.set(key, rightValue);
      }
    });

    // displayPropertyMap(result, "Result Properties");
    return result;
  }
}

/**
 * Debug utility to display Map contents
 */
export function displayMap<K, V>(map: Map<K, V>, mapName: string = "Map"): void {
  console.log(`\n🗺️ ${mapName} (size: ${map.size}):`);
  if (map.size === 0) {
    console.log("  (empty)");
    return;
  }

  map.forEach((value, key) => {
    console.log(`  ${String(key)} → ${String(value)}`);
  });
}

/**
 * Debug utility for property Maps specifically
 */
export function displayPropertyMap(
  map: Map<string, PropertySchema>,
  mapName: string = "Properties"
): void {
  console.log(`\n📋 ${mapName} (size: ${map.size}):`);
  if (map.size === 0) {
    console.log("  (empty)");
    return;
  }

  map.forEach((schema, key) => {
    console.log(`  ${key} → ${schema.valueType()} (${schema.state()})`);
  });
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

    propertySchemas.forEach((schema, key) => {
      properties[key] = {
        valueType: schema.valueType().toString(),
        defaultValue: schema.defaultValue().toString(),
        state: schema.state().toString(),
      };
    });

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

  /**
   * Debug utility to display Map contents
   */
  export function displayMap<K, V>(
    map: Map<K, V>,
    mapName: string = "Map"
  ): void {
    console.log(`\n🗺️ ${mapName} (size: ${map.size}):`);
    if (map.size === 0) {
      console.log("  (empty)");
      return;
    }

    map.forEach((value, key) => {
      console.log(`  ${String(key)} → ${String(value)}`);
    });
  }

  /**
   * Debug utility for property Maps specifically
   */
  export function displayPropertyMap(
    map: Map<string, PropertySchema>,
    mapName: string = "Properties"
  ): void {
    console.log(`\n📋 ${mapName} (size: ${map.size}):`);
    if (map.size === 0) {
      console.log("  (empty)");
      return;
    }

    map.forEach((schema, key) => {
      console.log(`  ${key} → ${schema.valueType()} (${schema.state()})`);
    });
  }
}
