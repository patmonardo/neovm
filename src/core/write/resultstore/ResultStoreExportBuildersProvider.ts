import { ExportBuildersProvider } from '@/core/write/ExportBuildersProvider';
import { ExporterContext } from '@/core/write/ExporterContext';
import { NodeLabelExporterBuilder } from '@/core/write/NodeLabelExporterBuilder';
import { NodePropertyExporterBuilder } from '@/core/write/NodePropertyExporterBuilder';
import { RelationshipExporterBuilder } from '@/core/write/RelationshipExporterBuilder';
import { RelationshipPropertiesExporterBuilder } from '@/core/write/RelationshipPropertiesExporterBuilder';
import { RelationshipStreamExporterBuilder } from '@/core/write/RelationshipStreamExporterBuilder';

import { ResultStoreNodePropertyExporterBuilder } from './ResultStoreNodePropertyExporterBuilder';
import { ResultStoreRelationshipStreamExporterBuilder } from './ResultStoreRelationshipStreamExporterBuilder';
import { ResultStoreRelationshipExporterBuilder } from './ResultStoreRelationshipExporterBuilder';
import { ResultStoreRelationshipPropertiesExporterBuilder } from './ResultStoreRelationshipPropertiesExporterBuilder';
import { ResultStoreNodeLabelExporterBuilder } from './ResultStoreNodeLabelExporterBuilder';

/**
 * Provider implementation that creates export builders for result store-based exports.
 *
 * This provider creates exporters that write algorithm results and graph data
 * **directly to in-memory result stores** rather than external storage systems.
 * Result store exports are essential for graph analytics pipelines where computed
 * results need to be immediately available for further processing or analysis.
 *
 * **Design Philosophy:**
 * - **Memory-first**: Store results in memory for immediate access
 * - **Pipeline-optimized**: Enable seamless chaining of graph algorithms
 * - **Development-friendly**: Provide immediate access to results for testing and debugging
 * - **Performance-focused**: Eliminate I/O overhead for intermediate results
 *
 * **Result Store Export Benefits:**
 *
 * **Algorithm Chaining:**
 * ```typescript
 * // Algorithm pipeline with intermediate result storage
 * const provider = new ResultStoreExportBuildersProvider();
 *
 * // Step 1: Compute PageRank and store in memory
 * const pageRankExporter = provider.nodePropertyExporterBuilder(context).build();
 * pageRankExporter.write('pagerank', pageRankResults);
 *
 * // Step 2: Use stored PageRank for community detection
 * const communityAlgorithm = new CommunityDetection(resultStore.getNodeProperty('pagerank'));
 * const communityExporter = provider.nodePropertyExporterBuilder(context).build();
 * communityExporter.write('community', communityResults);
 *
 * // Step 3: Export final results to external storage
 * const fileExporter = fileProvider.nodePropertyExporterBuilder(context).build();
 * fileExporter.write([
 *   resultStore.getNodeProperty('pagerank'),
 *   resultStore.getNodeProperty('community')
 * ]);
 * ```
 *
 * **Development and Testing:**
 * ```typescript
 * // Quick access to algorithm results for validation
 * const provider = new ResultStoreExportBuildersProvider();
 * const exporter = provider.nodePropertyExporterBuilder(context).build();
 *
 * algorithm.compute().forEach(property => exporter.write(property));
 *
 * // Immediate validation of results
 * const pageRankValues = resultStore.getNodeProperty('pagerank');
 * assert(pageRankValues.get(nodeId) > 0, 'PageRank must be positive');
 * ```
 *
 * **Performance Analysis:**
 * ```typescript
 * // Store intermediate results for performance comparison
 * const baselineExporter = provider.nodePropertyExporterBuilder(context).build();
 * baselineExporter.write('baseline_centrality', baselineResults);
 *
 * const optimizedExporter = provider.nodePropertyExporterBuilder(context).build();
 * optimizedExporter.write('optimized_centrality', optimizedResults);
 *
 * // Compare results directly from memory
 * const comparison = compareResults(
 *   resultStore.getNodeProperty('baseline_centrality'),
 *   resultStore.getNodeProperty('optimized_centrality')
 * );
 * ```
 *
 * **Use Cases:**
 * - **Algorithm pipelines**: Multi-step graph analytics workflows
 * - **Interactive analysis**: Jupyter notebooks and exploratory data analysis
 * - **Testing frameworks**: Unit and integration tests for graph algorithms
 * - **Development workflows**: Quick iteration and result validation
 * - **Hybrid exports**: Memory storage + eventual persistence to external systems
 *
 * **Memory Management Considerations:**
 * - Result stores can consume significant memory for large graphs
 * - Consider implementing memory limits and eviction policies
 * - Monitor memory usage in production environments
 * - Use result stores judiciously for large-scale deployments
 */
export class ResultStoreExportBuildersProvider implements ExportBuildersProvider {
  /**
   * Creates a builder for node property exporters that write to result stores.
   *
   * Node property exports to result stores enable **immediate access** to computed
   * node-level algorithm results like PageRank scores, centrality measures,
   * community assignments, or node embeddings.
   *
   * **Common Node Property Export Scenarios:**
   * - **Centrality algorithms**: PageRank, betweenness, closeness centrality
   * - **Community detection**: Louvain, label propagation results
   * - **Node classification**: ML predictions, node categories
   * - **Graph embeddings**: Node2Vec, GraphSAGE embeddings
   *
   * @param ctx The exporter context (may contain result store configuration)
   * @returns A builder configured for result store node property export
   */
  public nodePropertyExporterBuilder(ctx: ExporterContext): NodePropertyExporterBuilder {
    return new ResultStoreNodePropertyExporterBuilder();
  }

  /**
   * Creates a builder for relationship stream exporters that write to result stores.
   *
   * Relationship stream exports to result stores enable **real-time accumulation**
   * of computed relationship data while maintaining streaming performance benefits.
   * This is particularly useful for algorithms that generate relationships on-demand.
   *
   * **Common Relationship Streaming Scenarios:**
   * - **Similarity computations**: Node similarity algorithms that generate pairs dynamically
   * - **Recommendation systems**: Real-time recommendation generation
   * - **Link prediction**: ML-based edge prediction results
   * - **Graph construction**: Dynamic graph building from data streams
   *
   * @param ctx The exporter context (may contain streaming configuration)
   * @returns A builder configured for result store relationship streaming export
   */
  public relationshipStreamExporterBuilder(ctx: ExporterContext): RelationshipStreamExporterBuilder {
    return new ResultStoreRelationshipStreamExporterBuilder();
  }

  /**
   * Creates a builder for relationship exporters that write to result stores.
   *
   * Relationship exports to result stores provide **immediate access** to computed
   * graph topology and relationship properties. This is essential for algorithms
   * that transform the graph structure or compute relationship-level metrics.
   *
   * **Common Relationship Export Scenarios:**
   * - **Graph transformation**: Filtered or projected graph topologies
   * - **Weighted graphs**: Edge weights from similarity or distance calculations
   * - **Temporal graphs**: Time-stamped relationships for temporal analysis
   * - **Subgraph extraction**: Specific relationship types or patterns
   *
   * @param ctx The exporter context (may contain graph configuration)
   * @returns A builder configured for result store relationship export
   */
  public relationshipExporterBuilder(ctx: ExporterContext): RelationshipExporterBuilder {
    return new ResultStoreRelationshipExporterBuilder();
  }

  /**
   * Creates a builder for relationship properties exporters that write to result stores.
   *
   * Multi-property relationship exports to result stores enable **efficient storage**
   * of algorithms that compute multiple relationship-level metrics simultaneously.
   * This avoids the overhead of multiple separate exports for related properties.
   *
   * **Common Multi-Property Relationship Scenarios:**
   * - **Similarity algorithms**: Multiple similarity metrics (Jaccard, cosine, overlap)
   * - **Path analysis**: Path length, weight, intermediate nodes
   * - **Social network analysis**: Relationship strength, frequency, recency
   * - **Financial networks**: Transaction amount, risk score, compliance status
   *
   * @param ctx The exporter context (may contain property configuration)
   * @returns A builder configured for result store relationship properties export
   */
  public relationshipPropertiesExporterBuilder(ctx: ExporterContext): RelationshipPropertiesExporterBuilder {
    return new ResultStoreRelationshipPropertiesExporterBuilder();
  }

  /**
   * Creates a builder for node label exporters that write to result stores.
   *
   * Node label exports to result stores enable **immediate access** to computed
   * node classifications, clusters, or type assignments. This is particularly
   * useful for algorithms that categorize or classify nodes in the graph.
   *
   * **Common Node Label Export Scenarios:**
   * - **Community detection**: Cluster or community assignments
   * - **Node classification**: ML-based node type predictions
   * - **Graph partitioning**: Partition assignments for distributed processing
   * - **Anomaly detection**: Normal vs. anomalous node classifications
   *
   * @param ctx The exporter context (may contain labeling configuration)
   * @returns A builder configured for result store node label export
   */
  public nodeLabelExporterBuilder(ctx: ExporterContext): NodeLabelExporterBuilder {
    return new ResultStoreNodeLabelExporterBuilder();
  }
}
