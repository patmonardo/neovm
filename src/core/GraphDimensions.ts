import { RelationshipType } from '@/projection/RelationshipType';
import { DimensionsMap } from './DimensionsMap';

/**
 * Interface for describing the dimensions of a graph.
 * This includes node and relationship counts as well as other metrics.
 */
export interface GraphDimensions {
  /**
   * Returns the number of nodes in the graph.
   *
   * @returns Node count
   */
  nodeCount(): number;

  /**
   * Returns the highest possible node ID in the graph.
   *
   * @returns Highest possible node ID
   */
  highestNeoId(): number;

  /**
   * Returns the estimated number of relationships in the graph.
   *
   * @returns Relationship count
   */
  relCountUpperBound(): number;

  /**
   * Returns the total relationship count.
   *
   * @returns Relationship count
   */
  relationshipCount(): number;

  /**
   * Returns the relationship count for a specific relationship type.
   *
   * @param relationshipType The relationship type
   * @returns Relationship count for the type, or 0 if not found
   */
  relationshipCount(relationshipType: RelationshipType): number;

  /**
   * Returns a map of relationship types to their counts.
   *
   * @returns Map of relationship types to counts
   */
  relationshipCounts(): Map<RelationshipType, number>;

  /**
   * Returns all available relationship types in the graph.
   *
   * @returns Set of relationship types
   */
  relationshipTypes(): Set<RelationshipType>;

  /**
   * Returns the total number of different relationship types.
   *
   * @returns Relationship type count
   */
  relationshipTypeCount(): number;

  /**
   * Returns the node property dimensions.
   *
   * @returns Node property dimensions map
   */
  nodeDimensions(): DimensionsMap;

  /**
   * Returns the estimated node label count.
   *
   * @returns Estimated node label count
   */
  estimationNodeLabelCount(): number;
}
