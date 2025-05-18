import { AdjacencyProperties } from "@/api/AdjacencyProperties";

/**
 * Represents properties of relationships in a graph.
 * Provides access to relationship property values and metadata.
 */
export interface Properties {
  /**
   * Returns the adjacency properties containing the relationship property values.
   *
   * @returns The adjacency properties
   */
  propertiesList(): AdjacencyProperties;

  /**
   * Returns the number of relationship elements with properties.
   *
   * @returns The element count
   */
  elementCount(): number;

  /**
   * Returns the default property value used when a relationship has no property.
   *
   * @returns The default property value
   */
  defaultPropertyValue(): number;
}

/**
 * Namespace containing Properties-related factories.
 */
export namespace Properties {
  export function of(
    propertiesList: AdjacencyProperties,
    elementCount: number,
    defaultPropertyValue: number
  ): Properties {
    return Object.freeze({
      propertiesList: () => propertiesList,
      elementCount: () => elementCount,
      defaultPropertyValue: () => defaultPropertyValue,
    });
  }

}

/**
 * Alias for immutable Properties.
 */
export type ImmutableProperties = Properties;

export namespace ImmutableProperties {
  export function of(
    propertiesList: AdjacencyProperties,
    elementCount: number,
    defaultPropertyValue: number
  ): ImmutableProperties {
    return Properties.of(propertiesList, elementCount, defaultPropertyValue);
  }
}
