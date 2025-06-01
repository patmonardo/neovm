import { ElementIdentifier } from "@/projection/abstract/ElementIdentifier";
import { ElementSchemaEntry } from "./ElementSchemaEntry";
import { PropertySchema } from "./PropertySchema";

/**
 * Generic schema abstract class for graph elements (nodes or relationships).
 * Provides methods to access and manipulate element schema entries.
 *
 * @typeParam SELF - Self-referential type for fluent interface pattern
 * @typeParam ELEMENT_IDENTIFIER - Type of element identifier (e.g., node label, relationship type)
 * @typeParam ENTRY - Type of schema entry
 * @typeParam PROPERTY_SCHEMA - Type of property schema
 */
export abstract class ElementSchema<
  SELF extends ElementSchema<SELF, ELEMENT_IDENTIFIER, ENTRY, PROPERTY_SCHEMA>,
  ELEMENT_IDENTIFIER extends ElementIdentifier,
  ENTRY extends ElementSchemaEntry<ENTRY, ELEMENT_IDENTIFIER, PROPERTY_SCHEMA>,
  PROPERTY_SCHEMA extends PropertySchema
> {
  /**
   * Creates a filtered version of this schema containing only the specified elements.
   *
   * @param elementIdentifiersToKeep Set of element identifiers to include
   * @returns A new schema containing only the specified elements
   */
  abstract filter(elementIdentifiersToKeep: Set<ELEMENT_IDENTIFIER>): SELF;

  /**
   * Combines this schema with another schema.
   *
   * @param other The schema to merge with this one
   * @returns A new schema containing elements from both schemas
   */
  abstract union(other: SELF): SELF;

  /**
   * Returns all schema entries.
   *
   * @returns Array of schema entries
   */
  abstract entries(): ENTRY[];

  /**
   * Gets a schema entry by its identifier.
   *
   * @param identifier The element identifier
   * @returns The schema entry for the given identifier, or undefined if not found
   */
  abstract get(identifier: ELEMENT_IDENTIFIER): ENTRY | undefined;

  /**
   * Returns all unique property keys across all schema entries.
   *
   * @returns Set of all property keys
   */
  allProperties(): Set<string>;

  /**
   * Returns all property keys for a specific element identifier.
   *
   * @param elementIdentifier The element identifier
   * @returns Set of property keys for the specified element
   */
  allProperties(elementIdentifier: ELEMENT_IDENTIFIER): Set<string>;

  // Implementation that handles both overloads
  allProperties(elementIdentifier?: ELEMENT_IDENTIFIER): Set<string> {
    // If elementIdentifier is provided, return properties for that element only
    if (elementIdentifier !== undefined) {
      const entry = this.get(elementIdentifier);
      return entry ? new Set(Object.keys(entry.properties())) : new Set();
    }

    // Otherwise return properties for all elements
    const properties = new Set<string>();
    for (const entry of this.entries()) {
      for (const key of Object.keys(entry.properties())) {
        properties.add(key);
      }
    }
    return properties;
  }

  /**
   * Checks if the schema has any properties across all entries.
   *
   * @returns True if any entries have properties
   */
  hasProperties(): boolean {
    return this.entries().some(entry => Object.keys(entry.properties()).length > 0);
  }

  /**
   * Checks if a specific element has a specific property.
   *
   * @param elementIdentifier The element identifier
   * @param propertyKey The property key to check
   * @returns True if the element has the specified property
   */
  hasProperty(elementIdentifier: ELEMENT_IDENTIFIER, propertyKey: string): boolean {
    const entry = this.get(elementIdentifier);
    return entry ? entry.properties().hasOwnProperty(propertyKey) : false;
  }

  /**
   * Returns all property schemas for a specific element.
   *
   * @param elementIdentifier The element identifier
   * @returns List of property schemas for the specified element
   */
  propertySchemasFor(elementIdentifier: ELEMENT_IDENTIFIER): PROPERTY_SCHEMA[] {
    const entry = this.get(elementIdentifier);
    return entry ? Object.values(entry.properties()) : [];
  }

  /**
   * Returns a union of all properties across all elements.
   *
   * @returns Map of property keys to their schemas
   */
  unionProperties(): Map<string, PROPERTY_SCHEMA> {
    const result = new Map<string, PROPERTY_SCHEMA>();

    for (const entry of this.entries()) {
      for (const [key, propertySchema] of Object.entries(entry.properties())) {
        if (!result.has(key)) {
          result.set(key, propertySchema as PROPERTY_SCHEMA);
        }
      }
    }

    return result;
  }

  /**
   * Converts the schema to a map representation.
   *
   * @returns Map representation of the schema
   */
  toMap(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const entry of this.entries()) {
      result[entry.identifier().name()] = ElementSchemaEntry.toMap(entry);
    }

    return result;
  }

  /**
   * Creates a union of entries from two schemas.
   *
   * @param other The schema to merge with
   * @returns Map of element identifiers to merged entries
   */
  protected unionEntries(other: SELF): Map<ELEMENT_IDENTIFIER, ENTRY> {
    const result = new Map<ELEMENT_IDENTIFIER, ENTRY>();

    // Add entries from this schema
    for (const entry of this.entries()) {
      result.set(entry.identifier(), entry);
    }

    // Add or merge entries from the other schema
    for (const entry of other.entries()) {
      const identifier = entry.identifier();
      if (result.has(identifier)) {
        const existing = result.get(identifier)!;
        result.set(identifier, ElementSchemaEntry.union(existing, entry));
      } else {
        result.set(identifier, entry);
      }
    }

    return result;
  }
}
