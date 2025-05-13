import { GraphName } from '../api/GraphName';
import { GraphStoreCatalog } from '../api/GraphStoreCatalog';
import { User } from '../api/User';
import { GraphProjectConfig } from '../config/GraphProjectConfig';
import { GraphDimensions } from '../core/GraphDimensions';
import { MemoryEstimation } from '../mem/MemoryEstimation';
import { MemoryEstimations } from '../mem/MemoryEstimations';
import { GraphMemoryEstimation } from './GraphMemoryEstimation';

/**
 * Core service for estimating memory usage of graph algorithms and projections.
 */
export class GraphMemoryEstimationService {
  /**
   * Estimates memory usage for an algorithm on an existing graph.
   * 
   * @param graphName Name of the graph in the catalog
   * @param memoryEstimation Memory estimation for the algorithm
   * @param user User requesting the estimation
   * @returns Memory estimation for the algorithm on the graph
   */
  public estimateAlgorithmForGraph(
    graphName: GraphName,
    memoryEstimation: MemoryEstimation,
    user: User
  ): GraphMemoryEstimation {
    const graphStore = GraphStoreCatalog.get(user.getUsername(), graphName).graphStore();
    
    const estimationTree = memoryEstimation.estimate(
      graphStore.dimensions(),
      graphStore.concurrency()
    );
    
    return new GraphMemoryEstimation(graphStore.dimensions(), estimationTree);
  }

  /**
   * Estimates memory usage for a new graph projection.
   * 
   * @param graphProjectConfig Configuration for the graph projection
   * @param estimationService Service for estimating database graph memory
   * @returns Memory estimation for the graph projection
   */
  public estimateNativeProjection(
    graphProjectConfig: GraphProjectConfig,
    estimationService: DatabaseGraphStoreEstimationService
  ): GraphMemoryEstimation {
    return estimationService.estimate(graphProjectConfig);
  }

  /**
   * Creates a composite memory estimation for multiple algorithms.
   * 
   * @param estimations List of algorithm estimations
   * @returns Combined memory estimation
   */
  public static combinedEstimation(estimations: MemoryEstimation[]): MemoryEstimation {
    return MemoryEstimations.maxEstimation("Maximum algorithm memory", estimations);
  }
}