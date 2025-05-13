/**
 * Represents the state/origin of a property in the graph.
 */
export enum PropertyState {
  /**
   * The property is projected from a source graph.
   */
  PERSISTENT,

  /**
   * The property is only present in the in-memory graph,
   * e.g. as a result of a mutate operation.
   */
  TRANSIENT,

  /**
   * The property is projected from a remote source graph.
   */
  REMOTE
}