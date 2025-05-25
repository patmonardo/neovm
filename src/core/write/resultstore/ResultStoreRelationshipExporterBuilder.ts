import { RelationshipExporter } from '@/core/write/RelationshipExporter';
import { RelationshipExporterBuilder } from '@/core/write/RelationshipExporterBuilder';
import { ResultStoreRelationshipExporter } from './ResultStoreRelationshipExporter';

/**
 * Builder for creating ResultStoreRelationshipExporter instances.
 *
 * This builder extends the abstract RelationshipExporterBuilder to provide a concrete
 * implementation that creates exporters for **in-memory result store storage**.
 * It represents the simplest possible relationship exporter builder since result store
 * exporters require no external configuration or setup.
 *
 * **Design Philosophy:**
 * - **Minimal configuration**: Result stores need no external connections or paths
 * - **Graph-centric**: Built around existing graph instances for reference-based storage
 * - **Immediate availability**: Exported relationships instantly accessible via result store
 * - **Memory-efficient**: Uses graph references rather than data duplication
 * - **Pipeline integration**: Perfect for algorithm chaining and composition workflows
 *
 * **Inheritance Benefits:**
 * By extending RelationshipExporterBuilder, this class automatically inherits:
 * - **Graph management**: Source graph containing relationships to export
 * - **ID mapping**: From toOriginalId function for node ID conversion
 * - **Progress tracking**: Optional progress monitoring support
 * - **Cancellation support**: Cooperative termination via TerminationFlag
 * - **Result store integration**: Result store configuration for storage
 * - **Job tracking**: Job ID for operational correlation and auditing
 *
 * **Why Result Store is Required:**
 * Unlike the parent class where result store is optional (for file/database exporters),
 * this builder requires a result store because that's the fundamental storage mechanism.
 * The `.orElseThrow()` ensures fail-fast behavior if no result store is configured,
 * preventing runtime failures during export operations.
 *
 * **Graph Reference Strategy:**
 * The created exporter stores **references to the graph** rather than copying relationship
 * data. This approach provides:
 * - **Memory efficiency**: No data duplication between graph and result store
 * - **Consistency**: Exported data reflects current graph state
 * - **Performance**: Constant-time exports regardless of relationship count
 * - **Scalability**: Supports very large graphs without memory concerns
 *
 * **Common Usage Patterns:**
 *
 * **Algorithm Result Export:**
 * ```typescript
 * const builder = new ResultStoreRelationshipExporterBuilder()
 *   .withGraph(similarityGraph)
 *   .withToOriginalId(node => graph.toOriginalNodeId(node))
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('similarity-computation'));
 *
 * const exporter = builder.build();
 *
 * // Export computed similarities
 * exporter.write('SIMILAR_TO', 'similarity_score');
 *
 * // Results immediately available for downstream algorithms
 * const similarities = resultStore.getRelationshipsWithProperty('SIMILAR_TO', 'similarity_score');
 * ```
 *
 * **Subgraph Extraction:**
 * ```typescript
 * const filteredGraph = graph.subgraph(importantNodes);
 * const builder = new ResultStoreRelationshipExporterBuilder()
 *   .withGraph(filteredGraph)
 *   .withToOriginalId(filteredGraph.toOriginalNodeId)
 *   .withResultStore(Optional.of(resultStore));
 *
 * const exporter = builder.build();
 *
 * // Export filtered relationships
 * exporter.write('IMPORTANT_CONNECTION');
 * exporter.write('COLLABORATION', 'strength');
 *
 * // Subgraph topology available for analysis
 * const importantConnections = resultStore.getRelationshipTopology('IMPORTANT_CONNECTION');
 * ```
 *
 * **Multi-Layer Network Analysis:**
 * ```typescript
 * // Export different relationship layers from the same graph
 * const exporter = new ResultStoreRelationshipExporterBuilder()
 *   .withGraph(multiLayerGraph)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('network-layer-analysis'))
 *   .build();
 *
 * // Export each layer separately
 * exporter.write('FRIENDSHIP');           // Social layer
 * exporter.write('COLLABORATION', 'intensity'); // Work layer
 * exporter.write('COMMUNICATION', 'frequency'); // Communication layer
 *
 * // Each layer immediately available for specialized analysis
 * const socialNetwork = resultStore.getRelationshipTopology('FRIENDSHIP');
 * const workNetwork = resultStore.getRelationshipsWithProperty('COLLABORATION', 'intensity');
 * const commNetwork = resultStore.getRelationshipsWithProperty('COMMUNICATION', 'frequency');
 * ```
 *
 * **Interactive Exploration:**
 * ```typescript
 * // Quick setup for notebook/REPL usage
 * const exporter = new ResultStoreRelationshipExporterBuilder()
 *   .withGraph(graph)
 *   .withToOriginalId(id => id) // Identity mapping for simple cases
 *   .withResultStore(Optional.of(new InMemoryResultStore()))
 *   .build();
 *
 * // Export for immediate analysis
 * exporter.write('INFLUENCES', 'influence_weight');
 *
 * const influences = resultStore.getRelationshipsWithProperty('INFLUENCES', 'influence_weight');
 * const networkMetrics = calculateNetworkMetrics(influences);
 * console.log(`Network density: ${networkMetrics.density}, Average weight: ${networkMetrics.avgWeight}`);
 * ```
 *
 * **Algorithm Pipeline:**
 * ```typescript
 * // Step 1: Compute relationship weights
 * const weightedGraph = weightCalculationAlgorithm.compute(graph);
 * const exporter1 = new ResultStoreRelationshipExporterBuilder()
 *   .withGraph(weightedGraph)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('weight-calculation'))
 *   .build();
 *
 * exporter1.write('WEIGHTED_EDGE', 'weight');
 *
 * // Step 2: Use weighted relationships for community detection
 * const weightedRelationships = resultStore.getRelationshipsWithProperty('WEIGHTED_EDGE', 'weight');
 * const communities = communityDetection.run(weightedRelationships);
 *
 * // Step 3: Export community-filtered relationships
 * const communityGraph = graph.subgraph(communities.get('community_1'));
 * const exporter2 = new ResultStoreRelationshipExporterBuilder()
 *   .withGraph(communityGraph)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('community-analysis'))
 *   .build();
 *
 * exporter2.write('COMMUNITY_EDGE', 'intra_community_strength');
 * ```
 */
export class ResultStoreRelationshipExporterBuilder extends RelationshipExporterBuilder {
  /**
   * Creates a ResultStoreRelationshipExporter with the configured parameters.
   *
   * This method implements the abstract build() method from RelationshipExporterBuilder
   * by creating a concrete ResultStoreRelationshipExporter instance. It performs
   * essential validation and creates the exporter with appropriate dependencies.
   *
   * **Configuration Validation:**
   * The method performs both inherited and explicit validation:
   *
   * **Inherited Validation (from parent class):**
   * - Graph instance is not null (required for relationship source)
   * - toOriginalId function is present (for node ID conversion)
   * - Job ID is valid (defaults to EMPTY if not explicitly set)
   *
   * **Result Store Validation (this class):**
   * - `resultStore.orElseThrow()` ensures a result store is configured
   * - Throws descriptive error if no result store is available
   * - Prevents runtime failures during export operations
   *
   * **Why Result Store is Required:**
   * Result store relationship exporters have no alternative storage mechanism.
   * Unlike file exporters that could write to default locations or database
   * exporters that could use default connections, result store exporters
   * require an explicit result store instance as their storage destination.
   *
   * **Created Exporter Characteristics:**
   * The resulting exporter will provide:
   * - **Reference-based storage**: Uses graph references, not data copies
   * - **Constant-time exports**: O(1) write operations regardless of relationship count
   * - **Immediate availability**: Exported data instantly accessible via result store
   * - **Memory efficiency**: Minimal memory overhead beyond metadata storage
   * - **Type flexibility**: Supports both topology-only and property exports
   *
   * **Error Scenarios:**
   * ```typescript
   * // Missing result store - will throw
   * const exporter = new ResultStoreRelationshipExporterBuilder()
   *   .withGraph(graph)
   *   .withToOriginalId(graph.toOriginalNodeId)
   *   .build(); // Throws: "Result store is required"
   *
   * // Missing graph - will throw (likely from parent class validation)
   * const exporter = new ResultStoreRelationshipExporterBuilder()
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // Throws: Graph-related validation error
   *
   * // Missing ID mapping - behavior depends on parent class defaults
   * const exporter = new ResultStoreRelationshipExporterBuilder()
   *   .withGraph(graph)
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // May succeed with identity function or throw
   * ```
   *
   * **Successful Configuration:**
   * ```typescript
   * const exporter = new ResultStoreRelationshipExporterBuilder()
   *   .withGraph(graph)                                   // Required: relationship source
   *   .withToOriginalId(graph.toOriginalNodeId)           // Required: ID conversion
   *   .withResultStore(Optional.of(resultStore))          // Required: storage destination
   *   .withJobId(JobId.of('relationship-export'))         // Optional: operation tracking
   *   .withProgressTracker(progressTracker)               // Optional: progress monitoring
   *   .withTerminationFlag(cancellationFlag)              // Optional: cancellation support
   *   .build(); // Success: creates fully configured exporter
   * ```
   *
   * **Performance Characteristics:**
   * The created exporter will have:
   * - **Zero I/O overhead**: All operations are in-memory
   * - **Constant memory usage**: Memory independent of relationship count
   * - **Immediate queries**: Results available instantly after export
   * - **Reference consistency**: Exported data reflects current graph state
   *
   * @returns A fully configured ResultStoreRelationshipExporter
   * @throws Error if no result store is configured via withResultStore()
   * @throws Error if required graph or ID mapping configuration is missing
   */
  public build(): RelationshipExporter {
    return new ResultStoreRelationshipExporter(
      this.jobId,
      this.resultStore.orElseThrow(() => new Error('Result store is required for ResultStoreRelationshipExporter')),
      this.graph,
      this.toOriginalId
    );
  }
}
