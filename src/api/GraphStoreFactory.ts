import { GraphStore } from "./GraphStore";
import { GraphProjectConfig } from "@/config/GraphProjectConfig";
import { GraphDimensions } from "@/core/GraphDimensions";
import { Capabilities } from "@/core/loading/Capabilities";
import { MemoryEstimation } from "@/mem/MemoryEstimation";
import { GraphLoaderContext } from "./GraphLoaderContext";

/**
 * Defines the contract for a supplier of GraphStoreFactory instances.
 */
export interface GraphStoreFactorySupplier {
  get(
    loaderContext: GraphLoaderContext
  ): GraphStoreFactory<GraphStore, GraphProjectConfig>;

  /**
   * Gets a GraphStoreFactory, potentially using specific graph dimensions.
   * In TypeScript, default implementation logic from Java interfaces
   * is typically handled by the implementing class or by making the method optional
   * and providing a utility function if a default behavior is common.
   * Here, we'll define it as a required method, and implementers can choose
   * to simply call their 'get' method if dimensions are not used.
   */
  getWithDimension(
    loaderContext: GraphLoaderContext,
    graphDimensions: GraphDimensions
  ): GraphStoreFactory<GraphStore, GraphProjectConfig>;
}

/**
 * The Abstract Factory defines the construction of the graph store.
 *
 * @template STORE The type of GraphStore this factory builds.
 * @template CONFIG The type of GraphProjectConfig this factory uses.
 */
export abstract class GraphStoreFactory<
  STORE extends GraphStore,
  CONFIG extends GraphProjectConfig
> {
  protected readonly graphProjectConfig: CONFIG;
  protected readonly capabilities: Capabilities;
  protected readonly loadingContext: GraphLoaderContext;
  protected readonly dimensions: GraphDimensions;

  constructor(
    graphProjectConfig: CONFIG,
    capabilities: Capabilities,
    loadingContext: GraphLoaderContext,
    dimensions: GraphDimensions
  ) {
    this.graphProjectConfig = graphProjectConfig;
    this.capabilities = capabilities;
    this.loadingContext = loadingContext;
    this.dimensions = dimensions;
  }

  /**
   * Builds the GraphStore instance.
   */
  abstract build(): STORE;

  /**
   * Estimates the memory usage during the graph loading process.
   */
  abstract estimateMemoryUsageDuringLoading(): MemoryEstimation;

  /**
   * Estimates the memory usage after the graph has been loaded.
   */
  abstract estimateMemoryUsageAfterLoading(): MemoryEstimation;

  /**
   * Gets the graph dimensions used by this factory.
   */
  public getDimensions(): GraphDimensions {
    return this.dimensions;
  }

  /**
   * Gets the graph dimensions used for estimation purposes.
   * In the Java version, this directly returns `dimensions`.
   */
  public getEstimationDimensions(): GraphDimensions {
    return this.dimensions;
  }

  /**
   * Gets the graph project configuration used by this factory.
   */
  public getGraphProjectConfig(): CONFIG {
    return this.graphProjectConfig;
  }
}
