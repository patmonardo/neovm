import { Graph } from "../../api/Graph"; // Adjust path as needed
import { GraphStore } from "../../api/GraphStore"; // Adjust path as needed
import { ResultStore } from "../../api/ResultStore"; // Adjust path as needed

/**
 * A container for graph-related resources.
 * Equivalent to the Java record GraphResources.
 */
export class GraphResources {
  public readonly graphStore: GraphStore;
  public readonly graph: Graph;
  public readonly resultStore: ResultStore;

  constructor(graphStore: GraphStore, graph: Graph, resultStore: ResultStore) {
    this.graphStore = graphStore;
    this.graph = graph;
    this.resultStore = resultStore;
  }
}
