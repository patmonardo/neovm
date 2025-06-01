import { PropertyCursor } from '@/api/properties/relationships';

/**
 * The properties for a mono-partite graph for a single relationship property.
 * Provides access to the target properties for any given source node.
 */
export interface AdjacencyProperties {
  /**
   * Create a new cursor for the properties of the relationships of a given node.
   * If the cursor cannot produce property values, it will yield the provided fallbackValue.
   *
   * NOTE: Fallback behavior is not widely available and will be part of the next episode.
   *
   * Undefined behavior if the node does not exist.
   *
   * @param node The source node ID
   * @param fallbackValue The fallback value if properties can't be produced
   * @returns A cursor for the relationship properties
   */
  propertyCursor(node: number, fallbackValue: number): PropertyCursor;

  /**
   * Create a new cursor for the properties of the relationships of a given node.
   * If the cursor cannot produce property values, it will yield the provided fallbackValue.
   *
   * NOTE: Fallback behavior is not widely available and will be part of the next episode.
   *
   * The Implementation might try to reuse the provided reuse cursor, if possible.
   * That is not guaranteed, however, implementation may choose to ignore the reuse cursor for any reason.
   *
   * Undefined behavior if the node does not exist.
   *
   * @param reuse A cursor to potentially reuse
   * @param node The source node ID
   * @param fallbackValue The fallback value if properties can't be produced
   * @returns A cursor for the relationship properties
   */
  propertyCursor(reuse: PropertyCursor | null, node: number, fallbackValue: number): PropertyCursor;

  /**
   * Create a new uninitialized cursor.
   *
   * NOTE: In order to use the returned cursor PropertyCursor.init must be called.
   *
   * @returns An uninitialized property cursor
   */
  rawPropertyCursor(): PropertyCursor;
}

/**
 * Extension methods for AdjacencyProperties.
 */
export namespace AdjacencyProperties {
  /**
   * Create a new cursor for the properties of the relationships of a given node.
   * The cursor is expected to produce property values.
   *
   * Undefined behavior if the node does not exist.
   * Undefined behavior if this list does not have properties.
   *
   * @param properties The adjacency properties
   * @param node The source node ID
   * @returns A cursor for the relationship properties
   */
  export function propertyCursor(properties: AdjacencyProperties, node: number): PropertyCursor {
    return properties.propertyCursor(node, Number.NaN);
  }

  /**
   * Create a new cursor for the properties of the relationships of a given node.
   * The cursor is expected to produce property values.
   *
   * The Implementation might try to reuse the provided reuse cursor, if possible.
   * That is not guaranteed, however, implementation may choose to ignore the reuse cursor for any reason.
   *
   * Undefined behavior if the node does not exist.
   * Undefined behavior if this list does not have properties.
   *
   * @param properties The adjacency properties
   * @param reuse A cursor to potentially reuse
   * @param node The source node ID
   * @returns A cursor for the relationship properties
   */
  export function propertyCursorWithReuse(
    properties: AdjacencyProperties,
    reuse: PropertyCursor | null,
    node: number
  ): PropertyCursor {
    return properties.propertyCursor(reuse, node, Number.NaN);
  }

  /**
   * An empty implementation of AdjacencyProperties.
   */
  export const EMPTY: AdjacencyProperties = {
    propertyCursor(
      nodeOrReuse: number | PropertyCursor | null,
      nodeOrFallback: number | number,
      fallbackValue?: number
    ): PropertyCursor {
      // Handle both function signatures
      if (typeof nodeOrReuse === 'number') {
        return PropertyCursor.empty();
      } else {
        return PropertyCursor.empty();
      }
    },

    rawPropertyCursor(): PropertyCursor {
      return PropertyCursor.empty();
    }
  };
}

/**
 * Helper function to create a property cursor with default settings.
 *
 * @param properties The adjacency properties
 * @param node The node ID
 * @returns A property cursor
 */
export function createPropertyCursor(properties: AdjacencyProperties, node: number): PropertyCursor {
  return properties.propertyCursor(node, Number.NaN);
}

/**
 * Helper function to create a property cursor with a reusable cursor.
 *
 * @param properties The adjacency properties
 * @param reuse The cursor to reuse
 * @param node The node ID
 * @returns A property cursor
 */
export function createPropertyCursorWithReuse(
  properties: AdjacencyProperties,
  reuse: PropertyCursor | null,
  node: number
): PropertyCursor {
  return properties.propertyCursor(reuse, node, Number.NaN);
}
