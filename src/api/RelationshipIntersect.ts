import { IntersectionConsumer } from './IntersectionConsumer';

/**
 * Interface for finding intersections between node relationships.
 */
export interface RelationshipIntersect {
  /**
   * Find all nodes that have relationships to both nodeIdA and some other node.
   *
   * @param nodeIdA The first node ID
   * @param consumer Consumer that processes each intersection found
   */
  intersectAll(nodeIdA: number, consumer: IntersectionConsumer): void;
}
