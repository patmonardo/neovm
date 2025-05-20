import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { RelationshipCursor } from "@/api/properties/relationships"
import { Topology } from "./Topology";
import { CSRGraph } from "./CSRGraph";
import { GraphAdapter } from "./GraphAdapter";

/**
 * An abstract adapter for CSRGraph instances.
 * It extends GraphAdapter and implements CSRGraph, delegating CSR-specific
 * functionalities to an underlying CSRGraph instance.
 */
export abstract class CSRGraphAdapter extends GraphAdapter implements CSRGraph {
  /**
   * The underlying CSRGraph instance to which CSR-specific operations are delegated.
   */
  protected readonly csrGraph: CSRGraph;

  /**
   * Creates a new CSRGraphAdapter.
   * @param graph The CSRGraph instance to wrap and delegate to.
   */
  constructor(graph: CSRGraph) {
    super(graph); // Calls the constructor of GraphAdapter
    this.csrGraph = graph;
  }

  /**
   * Creates a concurrent copy of the underlying CSRGraph.
   * @returns A new CSRGraph instance that is a concurrent copy.
   */
  public concurrentCopy(): CSRGraph {
    return this.csrGraph.concurrentCopy();
  }

  /**
   * Retrieves the relationship topologies from the underlying CSRGraph.
   * @returns A Map where keys are RelationshipTypes and values are their corresponding Topologies.
   */
  public relationshipTopologies(): Map<RelationshipType, Topology> {
    return this.csrGraph.relationshipTopologies();
  }

  /**
   * Adds a node label to the underlying CSRGraph.
   * Note: This overrides the behavior from GraphAdapter to ensure it calls the method on the CSRGraph instance.
   * If GraphAdapter's addNodeLabel already correctly delegates to `this.graph.addNodeLabel`,
   * and `this.graph` is the `csrGraph`, this explicit override might not be strictly necessary
   * unless there's a specific reason or if GraphAdapter's implementation is different.
   * However, direct delegation as shown here is clear.
   * @param nodeLabel The NodeLabel to add.
   */
  public addNodeLabel(nodeLabel: NodeLabel): void {
    this.csrGraph.addNodeLabel(nodeLabel);
  }

  /**
   * Adds a node ID to a specific label in the underlying CSRGraph.
   * Similar to addNodeLabel, this ensures delegation to the CSRGraph instance.
   * @param nodeId The ID of the node.
   * @param nodeLabel The NodeLabel to associate with the node.
   */
  public addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.csrGraph.addNodeIdToLabel(nodeId, nodeLabel);
  }

  isEmpty(): boolean {
    // Implement logic to check if the graph is empty
    return this.nodeCount() === 0;
  }

  safeToMappedNodeId(nodeId: number): number {
    // Implement logic to safely map a node ID
    // For now, just return the input (replace with real logic)
    return nodeId;
  }

  iterateRelationships(nodeId: number, fallbackValue: number): Iterable<RelationshipCursor> {
    return {
      [Symbol.iterator](): Iterator<RelationshipCursor> {
        return {
          next(): IteratorResult<RelationshipCursor> {
            return { done: true, value: undefined as any };
          }
        };
      }
    };
  }
}
