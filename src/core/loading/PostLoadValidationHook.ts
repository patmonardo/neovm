import { Graph } from "@/api";
import { GraphStore } from "@/api";

/**
 * Defines hooks for performing additional validation after a graph and its
 * corresponding GraphStore have been loaded. This allows for use-case specific
 * checks, such as those required by algorithms like GraphSage.
 */
export interface PostLoadValidationHook {
  /**
   * Called after the GraphStore has been successfully loaded or initialized.
   * Implementations can perform validation checks on the GraphStore itself.
   *
   * @param graphStore The GraphStore instance that has been loaded.
   */
  onGraphStoreLoaded(graphStore: GraphStore): void;

  /**
   * Called after a specific Graph instance has been successfully loaded
   * (typically retrieved from a GraphStore).
   * Implementations can perform validation checks on the Graph instance.
   *
   * @param graph The Graph instance that has been loaded.
   */
  onGraphLoaded(graph: Graph): void;
}
