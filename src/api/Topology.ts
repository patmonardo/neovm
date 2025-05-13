import { AdjacencyList } from './AdjacencyList';

/**
 * Represents the topology (connection structure) of a graph.
 * Provides access to relationship data structures and metadata.
 */
export interface Topology {
  /**
   * Returns the adjacency list representing the graph's relationships.
   *
   * @returns The adjacency list
   */
  adjacencyList(): AdjacencyList;

  /**
   * Returns the number of elements (typically relationships) in the topology.
   *
   * @returns Count of elements
   */
  elementCount(): number;

  /**
   * Returns whether this topology represents a multi-graph (can have multiple
   * relationships between the same pair of nodes).
   *
   * @returns True if this is a multi-graph
   */
  isMultiGraph(): boolean;
}

/**
 * Namespace containing Topology-related constants and factories.
 */
export namespace Topology {
  /**
   * A topology with no relationships.
   */
  export const EMPTY: Topology = {
    adjacencyList(): AdjacencyList {
      return AdjacencyList.EMPTY;
    },

    elementCount(): number {
      return 0;
    },

    isMultiGraph(): boolean {
      return false;
    }
  };

  /**
   * Creates a new topology instance.
   *
   * @param adjacencyList The adjacency list for this topology
   * @param elementCount Number of elements in this topology
   * @param isMultiGraph Whether this represents a multi-graph
   * @returns A new Topology instance
   */
  export function of(
    adjacencyList: AdjacencyList,
    elementCount: number,
    isMultiGraph: boolean
  ): Topology {
    return {
      adjacencyList: () => adjacencyList,
      elementCount: () => elementCount,
      isMultiGraph: () => isMultiGraph
    };
  }
}
