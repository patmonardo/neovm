import { NodeLabel } from '@/api/NodeLabel';
import { NodePropertyExporter } from '@/core/write/NodePropertyExporter';
import { NodePropertyExporterBuilder } from '@/core/write/NodePropertyExporterBuilder';
import { ResultStoreNodePropertyExporter } from './ResultStoreNodePropertyExporter';

/**
 * Builder for creating ResultStoreNodePropertyExporter instances.
 *
 * This builder extends the abstract NodePropertyExporterBuilder to provide a concrete
 * implementation that creates exporters for **in-memory result store storage**.
 * It represents one of the simplest builder implementations since result store
 * exporters require minimal external configuration.
 *
 * **Design Philosophy:**
 * - **Minimal configuration**: Result stores need no external setup or connections
 * - **Immediate availability**: Properties stored in memory are instantly accessible
 * - **Pipeline integration**: Designed for algorithm chaining and result composition
 * - **Multi-label support**: Handles complex node labeling schemes efficiently
 * - **Development-friendly**: Perfect for testing, debugging, and interactive analysis
 *
 * **Inheritance Benefits:**
 * By extending NodePropertyExporterBuilder, this class automatically inherits:
 * - **Node label management**: Support for multi-label node configurations
 * - **ID mapping**: From nodeIdFunction for converting internal to original IDs
 * - **Progress tracking**: Optional progress monitoring support
 * - **Cancellation support**: Cooperative termination via TerminationFlag
 * - **Result store integration**: Optional result store configuration
 * - **Job tracking**: Job ID for operational correlation and auditing
 *
 * **Why Result Store is Required:**
 * Unlike the parent class where result store is optional (for file/database exporters),
 * this builder requires a result store because that's the fundamental storage mechanism.
 * The `.orElseThrow()` ensures fail-fast behavior if no result store is configured.
 *
 * **Node Label Processing:**
 * The builder converts NodeLabel objects to string names for the exporter constructor.
 * This transformation:
 * - **Simplifies storage**: Stores semantic names rather than complex label objects
 * - **Enables queries**: Result store can efficiently index by label names
 * - **Reduces dependencies**: Exporter doesn't need to understand NodeLabel internals
 * - **Supports serialization**: String names are easily serializable if needed
 *
 * **Common Usage Patterns:**
 *
 * **Single Algorithm Results:**
 * ```typescript
 * const builder = new ResultStoreNodePropertyExporterBuilder()
 *   .withNodeLabels([NodeLabel.of('Person')])
 *   .withNodeIdFunction(graph.toOriginalNodeId)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('pagerank-computation'));
 *
 * const exporter = builder.build();
 * exporter.write('pagerank', pageRankResults);
 *
 * // Results immediately available
 * const pageRankValues = resultStore.getNodeProperty('pagerank');
 * ```
 *
 * **Multi-Label Graph Analysis:**
 * ```typescript
 * const builder = new ResultStoreNodePropertyExporterBuilder()
 *   .withNodeLabels([
 *     NodeLabel.of('Person'),
 *     NodeLabel.of('Organization'),
 *     NodeLabel.of('Location')
 *   ])
 *   .withNodeIdFunction(graph.toOriginalNodeId)
 *   .withResultStore(Optional.of(resultStore));
 *
 * const exporter = builder.build();
 *
 * // Properties apply to all specified node types
 * exporter.write('influence_score', influenceResults);
 * ```
 *
 * **Algorithm Pipeline:**
 * ```typescript
 * // Step 1: Compute centrality measures
 * const centralityExporter = new ResultStoreNodePropertyExporterBuilder()
 *   .withNodeLabels([NodeLabel.of('User')])
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('centrality-analysis'))
 *   .build();
 *
 * centralityExporter.write([
 *   NodeProperty.of('pagerank', pageRankResults),
 *   NodeProperty.of('betweenness', betweennessResults)
 * ]);
 *
 * // Step 2: Use centrality for community detection
 * const pageRankValues = resultStore.getNodeProperty('pagerank');
 * const communityAlgorithm = new WeightedCommunityDetection(pageRankValues);
 * const communities = communityAlgorithm.compute();
 *
 * // Step 3: Store community results
 * const communityExporter = new ResultStoreNodePropertyExporterBuilder()
 *   .withNodeLabels([NodeLabel.of('User')])
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('community-detection'))
 *   .build();
 *
 * communityExporter.write('community', communities);
 * ```
 *
 * **Interactive Analysis:**
 * ```typescript
 * // Quick setup for notebook/REPL usage
 * const exporter = new ResultStoreNodePropertyExporterBuilder()
 *   .withNodeLabels([NodeLabel.of('Node')]) // Generic label
 *   .withNodeIdFunction(id => id) // Identity mapping for simple graphs
 *   .withResultStore(Optional.of(new InMemoryResultStore()))
 *   .build();
 *
 * // Export and immediately analyze
 * exporter.write('clustering_coefficient', clusteringResults);
 *
 * const coefficients = resultStore.getNodeProperty('clustering_coefficient');
 * const stats = calculateStatistics(coefficients);
 * console.log(`Average clustering: ${stats.mean}, Max: ${stats.max}`);
 * ```
 */
export class ResultStoreNodePropertyExporterBuilder extends NodePropertyExporterBuilder {
  /**
   * Creates a ResultStoreNodePropertyExporter with the configured parameters.
   *
   * This method implements the abstract build() method from NodePropertyExporterBuilder
   * by creating a concrete ResultStoreNodePropertyExporter instance. It performs
   * necessary validation and data transformations to create a properly configured exporter.
   *
   * **Configuration Validation:**
   * The method performs both implicit and explicit validation:
   *
   * **Inherited Validation (from parent class):**
   * - Node labels collection is not null (implicit via nodeLabels.stream())
   * - Node ID function is present (toOriginalId from parent class)
   * - Job ID is valid (defaults to EMPTY if not explicitly set)
   *
   * **Result Store Validation (this class):**
   * - `resultStore.orElseThrow()` ensures a result store is configured
   * - Throws with descriptive error if no result store is available
   *
   * **Node Label Transformation:**
   * Converts NodeLabel objects to string names via `.map(NodeLabel::name)`:
   * - **Simplifies interface**: Exporter works with strings rather than complex objects
   * - **Reduces coupling**: Exporter doesn't depend on NodeLabel implementation details
   * - **Enables efficient storage**: String names are more efficient for indexing and queries
   * - **Supports serialization**: String names are easily serializable if needed
   *
   * **Why Result Store is Required:**
   * Result store exporters have no alternative storage mechanism. Unlike file exporters
   * that could write to default locations or database exporters that could use default
   * connections, result store exporters require an explicit result store instance.
   *
   * **Error Scenarios:**
   * ```typescript
   * // Missing result store - will throw
   * const exporter = new ResultStoreNodePropertyExporterBuilder()
   *   .withNodeLabels([NodeLabel.of('Person')])
   *   .withNodeIdFunction(graph.toOriginalNodeId)
   *   .build(); // Throws: "Result store is required"
   *
   * // Missing node labels - will throw (likely NullPointerException)
   * const exporter = new ResultStoreNodePropertyExporterBuilder()
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // Throws during nodeLabels.stream() processing
   *
   * // Missing node ID function - behavior depends on parent class defaults
   * const exporter = new ResultStoreNodePropertyExporterBuilder()
   *   .withNodeLabels([NodeLabel.of('Person')])
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // May succeed with identity function or throw
   * ```
   *
   * **Successful Configuration:**
   * ```typescript
   * const exporter = new ResultStoreNodePropertyExporterBuilder()
   *   .withNodeLabels([NodeLabel.of('Person'), NodeLabel.of('Organization')])
   *   .withNodeIdFunction(graph.toOriginalNodeId)
   *   .withResultStore(Optional.of(resultStore))
   *   .withJobId(JobId.of('centrality-analysis'))
   *   .withProgressTracker(progressTracker)
   *   .build(); // Success: creates fully configured exporter
   * ```
   *
   * **Performance Characteristics:**
   * The created exporter will provide:
   * - **Zero I/O latency**: All operations are in-memory
   * - **Immediate availability**: Properties accessible instantly after writing
   * - **Efficient batch operations**: Optimized for multi-property writes
   * - **Memory-proportional scaling**: Memory usage scales with property count and graph size
   *
   * @returns A fully configured ResultStoreNodePropertyExporter
   * @throws Error if no result store is configured via withResultStore()
   * @throws Error if required node labels or ID mapping configuration is missing
   */
  public build(): NodePropertyExporter {
    return new ResultStoreNodePropertyExporter(
      this.jobId,
      this.resultStore.orElseThrow(() => new Error('Result store is required for ResultStoreNodePropertyExporter')),
      this.nodeLabels.map(nodeLabel => nodeLabel.name),
      this.toOriginalId
    );
  }
}
