import { AdjacencyProperties } from '@/api/AdjacencyProperties';

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
 * Implementation of the Properties interface.
 */
export class Properties implements Properties {
  /**
   * Creates a new Properties implementation.
   *
   * @param propertiesList The adjacency properties
   * @param elementCount The element count
   * @param defaultPropertyValue The default property value
   */
  constructor(
    private readonly _propertiesList: AdjacencyProperties,
    private readonly _elementCount: number,
    private readonly _defaultPropertyValue: number
  ) {}

  propertiesList(): AdjacencyProperties {
    return this._propertiesList;
  }

  elementCount(): number {
    return this._elementCount;
  }

  defaultPropertyValue(): number {
    return this._defaultPropertyValue;
  }
}

/**
 * Namespace providing factory methods for Properties.
 */
export namespace Properties {
  /**
   * Creates a new Properties instance.
   *
   * @param propertiesList The adjacency properties
   * @param elementCount The element count
   * @param defaultPropertyValue The default property value
   * @returns A new Properties instance
   */
  export function of(
    propertiesList: AdjacencyProperties,
    elementCount: number,
    defaultPropertyValue: number
  ): Properties {
    return new Properties(propertiesList, elementCount, defaultPropertyValue);
  }
}
