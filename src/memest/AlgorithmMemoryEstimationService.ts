import { GraphName } from '../api/GraphName';
import { User } from '../api/User';
import { AlgorithmConfiguration } from '@/config/AlgorithmConfiguration';
import { Concurrency } from '@/concurrency/Concurrency';
import { MemoryEstimateDefinition } from '../mem/MemoryEstimateDefinition';
import { MemoryEstimation } from '../mem/MemoryEstimation';
import { GraphDimensions } from '../core/GraphDimensions';
import { GraphMemoryEstimation } from './GraphMemoryEstimation';
import { MemoryTree } from '../mem/MemoryTree';
import { GraphMemoryEstimationService } from './GraphMemoryEstimationService';

/**
 * Service for estimating memory usage of graph algorithms.
 */
export class AlgorithmMemoryEstimationService {
  /**
   * The core memory estimation service.
   */
  private readonly memoryEstimationService: GraphMemoryEstimationService;

  /**
   * Creates a new AlgorithmMemoryEstimationService.
   *
   * @param memoryEstimationService The core memory estimation service
   */
  constructor(memoryEstimationService: GraphMemoryEstimationService) {
    this.memoryEstimationService = memoryEstimationService;
  }

  /**
   * Estimates memory usage for an algorithm on an existing graph.
   *
   * @param graphName Name of the graph in the catalog
   * @param algorithmDefinition Definition of the algorithm
   * @param config Configuration for the algorithm
   * @param user User requesting the estimation
   * @returns Memory estimation for the algorithm on the graph
   */
  public estimate(
    graphName: GraphName,
    algorithmDefinition: MemoryEstimateDefinition,
    config: AlgorithmConfiguration<any>,
    user: User
  ): GraphMemoryEstimation {
    const memoryEstimation = algorithmDefinition.memoryEstimation();

    return this.memoryEstimationService.estimateAlgorithmForGraph(
      graphName,
      memoryEstimation,
      user
    );
  }

  /**
   * Estimates memory usage for an algorithm with specified dimensions.
   *
   * @param algorithmDefinition Definition of the algorithm
   * @param graphDimensions The dimensions of the graph
   * @param concurrency Concurrency settings
   * @returns Memory estimation tree for the algorithm
   */
  public estimateWithDimensions(
    algorithmDefinition: MemoryEstimateDefinition,
    graphDimensions: GraphDimensions,
    concurrency: Concurrency
  ): MemoryTree {
    return algorithmDefinition.memoryEstimation().estimate(graphDimensions, concurrency);
  }

  /**
   * Estimates memory usage for multiple algorithms on the same graph.
   *
   * @param graphName Name of the graph in the catalog
   * @param definitions Array of algorithm definitions with their configs
   * @param user User requesting the estimation
   * @returns Memory estimation for the combined algorithms
   */
  public estimateMultiple(
    graphName: GraphName,
    definitions: Array<{
      definition: MemoryEstimateDefinition;
      config: AlgorithmConfiguration<any>;
    }>,
    user: User
  ): GraphMemoryEstimation {
    const estimations: MemoryEstimation[] = definitions.map(
      ({ definition }) => definition.memoryEstimation()
    );

    const combinedEstimation = GraphMemoryEstimationService.combinedEstimation(estimations);

    return this.memoryEstimationService.estimateAlgorithmForGraph(
      graphName,
      combinedEstimation,
      user
    );
  }
}
