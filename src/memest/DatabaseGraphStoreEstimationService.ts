import { GraphLoaderContext } from '../api/GraphLoaderContext';
import { User } from '../api/User';
import { GraphProjectConfig } from '../config/GraphProjectConfig';
import { GraphStoreFactorySupplier } from '../core/GraphStoreFactorySupplier';
import { GraphMemoryEstimation } from './GraphMemoryEstimation';

/**
 * Service for estimating memory usage of graphs to be loaded from a Neo4j database.
 */
export class DatabaseGraphStoreEstimationService {
  /**
   * Context for loading graphs from the database.
   */
  private readonly graphLoaderContext: GraphLoaderContext;
  
  /**
   * User requesting the estimation.
   */
  private readonly user: User;

  /**
   * Creates a new DatabaseGraphStoreEstimationService.
   * 
   * @param graphLoaderContext The graph loader context
   * @param user The user requesting the estimation
   */
  constructor(graphLoaderContext: GraphLoaderContext, user: User) {
    this.graphLoaderContext = graphLoaderContext;
    this.user = user;
  }

  /**
   * Estimates memory usage for a graph projection.
   * 
   * @param graphProjectConfig The graph projection configuration
   * @returns Memory estimation for the graph
   */
  public estimate(graphProjectConfig: GraphProjectConfig): GraphMemoryEstimation {
    const graphStoreFactory = GraphStoreFactorySupplier.supplier(graphProjectConfig)
      .get(this.graphLoaderContext);

    return new GraphMemoryEstimation(
      graphStoreFactory.dimensions(),
      graphStoreFactory.estimateMemoryUsageAfterLoading()
    );
  }
}