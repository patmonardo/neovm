import { RelationshipType } from "@/projection";
import { NodePropertyContainer } from "./properties/nodes";
import { RelationshipIterator } from "./properties/relationships";
import { RelationshipProperties } from "./properties/relationships";
import { RelationshipConsumer } from "./properties/relationships";
import { GraphSchema } from "./schema";
import { GraphCharacteristics } from "./GraphCharacteristics";
import { IdMap } from "./IdMap";
import { FilteredIdMap } from "./FilteredIdMap";
import { Degrees } from "./Degrees";

/**
 * Core interface representing a graph with nodes, relationships, and their properties.
 * Combines capabilities for node/relationship access, property access, and graph traversal.
 */
export interface Graph
  extends IdMap,
    NodePropertyContainer,
    Degrees,
    RelationshipIterator,
    RelationshipProperties {
  /**
   * Returns the schema of this graph.
   */
  schema(): GraphSchema;

  /**
   * Returns the characteristics of this graph.
   */
  characteristics(): GraphCharacteristics;

  /**
   * Checks if the graph is empty.
   *
   * @returns true if the graph has no nodes
   */
  isEmpty(): boolean;

  /**
   * Returns the total number of relationships in the graph.
   *
   * @returns total relationship count
   */
  relationshipCount(): number;

  /**
   * Whether the graph is guaranteed to have no parallel relationships.
   * If this returns {@code false} it still may be parallel-free, but we don't know.
   *
   * @returns false if the graph has maximum one relationship between each pair of nodes
   */
  isMultiGraph(): boolean;

  /**
   * Returns a filtered view of this graph containing only the specified relationship types.
   *
   * @param relationshipTypes Set of relationship types to include
   * @returns A filtered graph
   */
  relationshipTypeFilteredGraph(
    relationshipTypes: Set<RelationshipType>
  ): Graph;

  /**
   * Checks if this graph has any relationship properties.
   *
   * @returns true if the graph has relationship properties
   */
  hasRelationshipProperty(): boolean;

  /**
   * Creates a thread-safe copy of this graph for concurrent use.
   *
   * @returns A concurrent copy of the graph
   */
  concurrentCopy(): Graph;

  /**
   * If this graph is created using a node label filter, this will return a NodeFilteredGraph
   * that represents the node set used in this graph.
   * Be aware that it is not guaranteed to contain all relationships of the graph.
   * Otherwise, it will return undefined.
   *
   * @returns The filtered graph representation if available
   */
  asNodeFilteredGraph(): FilteredIdMap | undefined;

  /**
   * Get the n-th target node id for a given source node id.
   *
   * The order of the targets is not defined and depends on the implementation of the graph,
   * but it is consistent across separate calls to this method on the same graph.
   *
   * @param sourceNodeId The source node ID
   * @param offset The n-th target to return (0-indexed)
   * @returns The target at the offset or -1 if there is no such target
   */
  nthTarget(sourceNodeId: number, offset: number): number;
}

/**
 * Utility functions for Graph operations.
 */
export namespace Graph {
  /**
   * Get the n-th target node id for a given source node in the specified graph.
   *
   * @param graph The graph to search in
   * @param sourceNodeId The source node ID
   * @param offset The n-th target to return (0-indexed)
   * @returns The target at the offset or -1 if there is no such target
   */
  export function nthTarget(
    graph: Graph,
    sourceNodeId: number,
    offset: number
  ): number {
    if (offset >= graph.degree(sourceNodeId)) {
      return IdMap.NOT_FOUND;
    }

    if (offset < 0) {
      throw new Error(`offset must be non-negative, got ${offset}`);
    }

    class FindNth implements RelationshipConsumer {
      private remaining = offset;
      private target: number = IdMap.NOT_FOUND;

      accept(sourceNodeId: number, targetNodeId: number): boolean {
        if (this.remaining-- === 0) {
          this.target = targetNodeId;
          return false;
        }
        return true;
      }

      getTarget(): number {
        return this.target;
      }
    }

    const findN = new FindNth();
    graph.forEachRelationship(sourceNodeId, findN);
    return findN.getTarget();
  }
}
