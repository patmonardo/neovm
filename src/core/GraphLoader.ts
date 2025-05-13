import { Graph } from "../api/Graph";
import { GraphStore } from "../api/GraphStore";
import { GraphStoreFactory } from "../api/GraphStoreFactory";
import { GraphProjectConfig } from "../config/GraphProjectConfig"; // Adjust path as needed

/**
 * Responsible for loading a graph using a specified configuration and factory.
 *
 * @template STORE The specific type of GraphStore that will be built.
 * @template CONFIG The specific type of GraphProjectConfig used.
 */
export class GraphLoader<
  STORE extends GraphStore,
  CONFIG extends GraphProjectConfig
> {
  private readonly projectConfig: CONFIG;
  private readonly graphStoreFactory: GraphStoreFactory<STORE, CONFIG>;

  /**
   * Constructs a GraphLoader.
   * @param projectConfig The configuration for the graph projection.
   * @param graphStoreFactory The factory responsible for creating the GraphStore.
   */
  constructor(
    projectConfig: CONFIG,
    graphStoreFactory: GraphStoreFactory<STORE, CONFIG>
  ) {
    this.projectConfig = projectConfig;
    this.graphStoreFactory = graphStoreFactory;
  }

  /**
   * Gets the loaded graph, typically the union graph from the graph store.
   * @returns The Graph instance.
   */
  public getGraph(): Graph {
    return this.getGraphStore().getUnion();
  }

  /**
   * Builds and returns the GraphStore instance.
   * This method will call the `build` method on the underlying factory.
   * @returns The GraphStore instance of type STORE.
   */
  public getGraphStore(): STORE {
    return this.graphStoreFactory.build();
  }

  /**
   * Gets the project configuration used by this loader.
   * @returns The GraphProjectConfig instance of type CONFIG.
   */
  public getProjectConfig(): CONFIG {
    return this.projectConfig;
  }

  /**
   * Gets the GraphStoreFactory used by this loader.
   * @returns The GraphStoreFactory instance.
   */
  public getGraphStoreFactory(): GraphStoreFactory<STORE, CONFIG> {
    return this.graphStoreFactory;
  }
}
