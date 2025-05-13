import { GraphStore } from "../../api/GraphStore"; // Adjust path as needed
import { GraphProjectConfig } from "../../config/GraphProjectConfig"; // Adjust path as needed
import { ResultStore } from "../../api/ResultStore"; // Adjust path as needed

/**
 * Represents an entry in a graph store catalog.
 * Equivalent to the Java record GraphStoreCatalogEntry.
 */
export class GraphStoreCatalogEntry {
  public readonly graphStore: GraphStore;
  public readonly config: GraphProjectConfig;
  public readonly resultStore: ResultStore;

  constructor(
    graphStore: GraphStore,
    config: GraphProjectConfig,
    resultStore: ResultStore
  ) {
    this.graphStore = graphStore;
    this.config = config;
    this.resultStore = resultStore;
  }
}
