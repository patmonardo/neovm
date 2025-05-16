import { RelationshipType } from "@/projection/RelationshipType";
import { Graph } from "./Graph";
import { Topology } from "./Topology";

/**
 * A subtype of {@link Graph} which exposes data structures specific to the
 * Compressed Sparse Row (CSR) graph representation, such as {@link AdjacencyList}.
 * (Note: AdjacencyList itself is not directly returned by methods here, but Topology implies it)
 */
export interface CSRGraph extends Graph {
  /**
   * Provides access to the underlying topologies for each relationship type.
   * In a CSR graph, the Topology would contain the CSR-specific data structures
   * (like offset arrays and adjacency arrays).
   *
   * @returns A Map where keys are RelationshipTypes and values are their corresponding Topologies.
   */
  relationshipTopologies(): Map<RelationshipType, Topology>;

  /**
   * Creates a concurrent copy of this CSRGraph.
   * The `@Override` annotation indicates this method is also part of the base `Graph` interface,
   * but here it's specified to return a `CSRGraph`.
   *
   * @returns A new CSRGraph instance that is a concurrent copy.
   */
  concurrentCopy(): CSRGraph;
}
