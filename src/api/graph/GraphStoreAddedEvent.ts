/**
 * Event fired when a graph store is added to the catalog.
 * Contains information about the graph and its resource usage.
 */
export class GraphStoreAddedEvent {
  /**
   * Creates a new GraphStoreAddedEvent.
   *
   * @param user Username of the user who added the graph
   * @param database Name of the database where the graph was added
   * @param graphName Name of the graph
   * @param memoryInBytes Memory usage of the graph in bytes
   */
  constructor(
    readonly user: string,
    readonly database: string,
    readonly graphName: string,
    readonly memoryInBytes: number
  ) {}
}

/**
 * Namespace for GraphStoreAddedEvent utilities.
 */
export namespace GraphStoreAddedEvent {
  /**
   * Creates a new GraphStoreAddedEvent.
   *
   * @param user Username of the user who added the graph
   * @param database Name of the database where the graph was added
   * @param graphName Name of the graph
   * @param memoryInBytes Memory usage of the graph in bytes
   * @returns A new GraphStoreAddedEvent
   */
  export function of(
    user: string,
    database: string,
    graphName: string,
    memoryInBytes: number
  ): GraphStoreAddedEvent {
    return new GraphStoreAddedEvent(user, database, graphName, memoryInBytes);
  }
}
