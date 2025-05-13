import { AdjacencyList } from "../AdjacencyList"; // Adjust path as needed
import { AdjacencyProperties } from "../AdjacencyProperties"; // Adjust path as needed

/**
 * Represents a container holding an adjacency list, the total relationship count,
 * and a list of associated adjacency properties.
 *
 * The `@ValueClass` annotation in the Java version suggests this is intended
 * to be an immutable value object. In TypeScript, this interface defines the shape,
 * and implementations would ensure immutability if required.
 */
export interface AdjacencyListsWithProperties {
  /**
   * Gets the primary adjacency list.
   * @returns The AdjacencyList instance.
   */
  adjacency(): AdjacencyList;

  /**
   * Gets the total number of relationships represented in the adjacency list.
   * @returns The count of relationships as a number.
   */
  relationshipCount(): number;

  /**
   * Gets a list of properties associated with the adjacencies.
   * Each AdjacencyProperties object in the list typically corresponds to a specific property
   * (e.g., weight, type) for all relationships.
   * @returns An array of AdjacencyProperties instances.
   */
  properties(): AdjacencyProperties[];
}
