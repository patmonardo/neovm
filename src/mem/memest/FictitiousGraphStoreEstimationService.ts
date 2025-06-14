import { NodeLabel } from '../NodeLabel';
import { GraphLoaderContext } from '../../api/GraphLoaderContext';
import { GraphProjectConfig } from '../config/GraphProjectConfig';
import { GraphDimensions } from '../../core/GraphDimensions';
import { ImmutableGraphDimensions } from '../core/ImmutableGraphDimensions';
import { GraphStoreFactorySupplier } from '../../core/GraphStoreFactorySupplier';
import { MemoryEstimation } from '../MemoryEstimation';
import { GraphProjectFromStoreConfig } from '../projection/GraphProjectFromStoreConfig';
import { RelationshipType } from '../RelationshipType';
import { GraphMemoryEstimation } from './GraphMemoryEstimation';

/**
 * Service for estimating memory usage of graph projections with specified dimensions.
 * Unlike DatabaseGraphStoreEstimationService, this doesn't require a live database
 * and can be used for hypothetical graph projections.
 */
export class FictitiousGraphStoreEstimationService {
  /**
   * Estimates memory usage for a graph projection with specified dimensions.
   *
   * @param graphProjectConfig The graph projection configuration
   * @returns Memory estimation for the graph
   */
  public estimate(graphProjectConfig: GraphProjectConfig): GraphMemoryEstimation {
    const dimensions = this.graphDimensions(graphProjectConfig);
    const estimateMemoryUsageAfterLoading = this.estimateMemoryUsageAfterLoading(
      graphProjectConfig,
      dimensions
    );

    return new GraphMemoryEstimation(
      dimensions,
      estimateMemoryUsageAfterLoading
    );
  }

  /**
   * Creates graph dimensions from the graph project configuration.
   *
   * @param graphProjectConfig The graph project configuration
   * @returns Dimensions for the graph
   */
  private graphDimensions(graphProjectConfig: GraphProjectConfig): GraphDimensions {
    let labelCount = 0;

    if (graphProjectConfig instanceof GraphProjectFromStoreConfig) {
      const storeConfig = graphProjectConfig as GraphProjectFromStoreConfig;
      const nodeLabels = storeConfig.nodeProjections().projections().keys();

      // Check if all labels match ALL_NODES
      const allMatchAllNodes = Array.from(nodeLabels).every(
        label => label.equals(NodeLabel.ALL_NODES)
      );

      labelCount = allMatchAllNodes ? 0 : nodeLabels.size;
    }

    return ImmutableGraphDimensions.builder()
      .nodeCount(graphProjectConfig.nodeCount())
      .highestPossibleNodeCount(graphProjectConfig.nodeCount())
      .estimationNodeLabelCount(labelCount)
      .relationshipCounts(new Map([[RelationshipType.ALL_RELATIONSHIPS, graphProjectConfig.relationshipCount()]]))
      .relCountUpperBound(Math.max(graphProjectConfig.relationshipCount(), 0))
      .build();
  }

  /**
   * Estimates memory usage after loading the graph.
   *
   * @param graphProjectConfig The graph project configuration
   * @param graphDimensions The graph dimensions
   * @returns Memory estimation after loading
   */
  private estimateMemoryUsageAfterLoading(
    graphProjectConfig: GraphProjectConfig,
    graphDimensions: GraphDimensions
  ): MemoryEstimation {
    return GraphStoreFactorySupplier
      .supplier(graphProjectConfig)
      .getWithDimension(GraphLoaderContext.NULL_CONTEXT, graphDimensions)
      .estimateMemoryUsageAfterLoading();
  }
}
