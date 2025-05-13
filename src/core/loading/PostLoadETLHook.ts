import { GraphStore } from "../../api/GraphStore"; // Adjust path as needed

/**
 * Defines a hook that can be used to perform actions or transformations
 * after a GraphStore has been loaded. This allows for post-load
 * Extract-Transform-Load (ETL) operations.
 */
export interface PostLoadETLHook {
  /**
   * Called when a GraphStore has been successfully loaded.
   * Implementations can use this hook to alter the graphStore or perform
   * other side effects.
   *
   * @param graphStore The GraphStore instance that has just been loaded.
   */
  onGraphStoreLoaded(graphStore: GraphStore): void;
}
