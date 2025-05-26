import { Graph } from "@/api";
import { GraphStore } from "@/api";
import { ResultStore } from "@/api";

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
