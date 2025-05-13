/**
 * Event fired when a graph store is removed from the catalog.
 * Contains information about the removed graph and freed memory resources.
 */
export class GraphStoreRemovedEvent {
  /**
   * Creates a new GraphStoreRemovedEvent.
   *
   * @param user Username of the user who removed the graph
   * @param database Name of the database where the graph was stored
   * @param graphName Name of the graph that was removed
   * @param memoryInBytes Memory freed by removing the graph, in bytes
   */
  constructor(
    readonly user: string,
    readonly database: string,
    readonly graphName: string,
    readonly memoryInBytes: number
  ) {}
}

/**
 * Namespace for GraphStoreRemovedEvent utilities.
 */
export namespace GraphStoreRemovedEvent {
  /**
   * Creates a new GraphStoreRemovedEvent.
   *
   * @param user Username of the user who removed the graph
   * @param database Name of the database where the graph was stored
   * @param graphName Name of the graph that was removed
   * @param memoryInBytes Memory freed by removing the graph, in bytes
   * @returns A new GraphStoreRemovedEvent
   */
  export function of(
    user: string,
    database: string,
    graphName: string,
    memoryInBytes: number
  ): GraphStoreRemovedEvent {
    return new GraphStoreRemovedEvent(user, database, graphName, memoryInBytes);
  }
}
