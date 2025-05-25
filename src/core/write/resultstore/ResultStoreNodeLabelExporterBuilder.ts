import { NodeLabelExporter } from '@/core/write/NodeLabelExporter';
import { NodeLabelExporterBuilder } from '@/core/write/NodeLabelExporterBuilder';
import { ResultStoreNodeLabelExporter } from './ResultStoreNodeLabelExporter';

/**
 * Builder for creating ResultStoreNodeLabelExporter instances.
 *
 * This builder extends the abstract NodeLabelExporterBuilder to provide a concrete
 * implementation that creates exporters for **in-memory result store storage**.
 * It represents the simplest possible builder implementation since result store
 * exporters require no external configuration (no file paths, connection strings, etc.).
 *
 * **Design Philosophy:**
 * - **Minimal configuration**: Result stores need no external setup
 * - **Immediate availability**: Labels stored in memory are instantly accessible
 * - **Pipeline integration**: Designed for algorithm chaining and composition
 * - **Development-friendly**: Perfect for testing and interactive analysis
 *
 * **Inheritance Benefits:**
 * By extending NodeLabelExporterBuilder, this class automatically inherits:
 * - **Node count management**: From IdMap configuration
 * - **ID mapping**: From IdMap's toOriginalNodeId function
 * - **Progress tracking**: Optional progress monitoring support
 * - **Cancellation support**: Cooperative termination via TerminationFlag
 * - **Result store integration**: Optional result store configuration
 * - **Job tracking**: Job ID for operational correlation
 *
 * **Why Result Store is Required:**
 * Unlike the parent class where result store is optional, this builder requires
 * a result store because that's the entire purpose - to store labels in memory
 * for immediate access. The `.orElseThrow()` ensures the builder fails fast
 * if no result store is configured.
 *
 * **Common Usage Patterns:**
 *
 * **Community Detection Pipeline:**
 * ```typescript
 * const builder = new ResultStoreNodeLabelExporterBuilder()
 *   .withIdMap(graph.idMap())
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('community-detection'));
 *
 * const exporter = builder.build();
 *
 * // Export community assignments
 * communityAlgorithm.computeCommunities().forEach(community => {
 *   exporter.write(`Community_${community.id}`);
 * });
 *
 * // Immediately access results for next algorithm
 * const communities = resultStore.getNodeLabels();
 * ```
 *
 * **Node Classification Workflow:**
 * ```typescript
 * const builder = new ResultStoreNodeLabelExporterBuilder()
 *   .withIdMap(graph.idMap())
 *   .withResultStore(Optional.of(resultStore))
 *   .withProgressTracker(progressTracker);
 *
 * const exporter = builder.build();
 *
 * // Export ML predictions as labels
 * nodeClassifier.predict(features).forEach(prediction => {
 *   exporter.write(prediction.label);
 * });
 * ```
 *
 * **Interactive Analysis:**
 * ```typescript
 * // Quick setup for notebook/REPL usage
 * const exporter = new ResultStoreNodeLabelExporterBuilder()
 *   .withIdMap(graph.idMap())
 *   .withResultStore(Optional.of(new InMemoryResultStore()))
 *   .build();
 *
 * // Export and immediately analyze
 * exporter.write('HighDegreeNodes');
 * const highDegreeNodes = resultStore.getNodeLabel('HighDegreeNodes');
 * console.log(`Found ${highDegreeNodes.size} high-degree nodes`);
 * ```
 *
 * **Algorithm Composition:**
 * ```typescript
 * // Chain multiple algorithms with label-based filtering
 * const exporter = new ResultStoreNodeLabelExporterBuilder()
 *   .withIdMap(graph.idMap())
 *   .withResultStore(Optional.of(resultStore))
 *   .build();
 *
 * // Step 1: Find influential nodes
 * influentialNodeDetector.run().forEach(nodeId => {
 *   exporter.write('Influential');
 * });
 *
 * // Step 2: Run community detection only on influential nodes
 * const influentialNodes = resultStore.getNodeLabel('Influential');
 * const subgraph = graph.subgraph(influentialNodes);
 * const communities = communityDetection.run(subgraph);
 * ```
 */
export class ResultStoreNodeLabelExporterBuilder extends NodeLabelExporterBuilder {
  /**
   * Creates a ResultStoreNodeLabelExporter with the configured parameters.
   *
   * This method implements the abstract build() method from NodeLabelExporterBuilder
   * by creating a concrete ResultStoreNodeLabelExporter instance. It validates that
   * all required configuration is present and creates the exporter with the
   * appropriate dependencies.
   *
   * **Required Configuration Validation:**
   * The method performs implicit validation by relying on the parent class's
   * configuration validation and adding result store requirement:
   *
   * **Parent Class Validation (inherited):**
   * - `nodeCount` > 0 (from IdMap configuration)
   * - `toOriginalId` function is present (from IdMap configuration)
   * - Valid JobId (defaults to EMPTY if not set)
   *
   * **Result Store Validation (this class):**
   * - `resultStore.orElseThrow()` ensures a result store is configured
   * - Throws an exception if no result store is available
   *
   * **Why Result Store is Required:**
   * Unlike file or database exporters that could theoretically write to default
   * locations, result store exporters have no meaningful default storage location.
   * The result store IS the storage mechanism, so it must be explicitly provided.
   *
   * **Failure Scenarios:**
   * ```typescript
   * // This will throw - no result store configured
   * const exporter = new ResultStoreNodeLabelExporterBuilder()
   *   .withIdMap(graph.idMap())
   *   .build(); // Throws: "No result store available"
   *
   * // This will throw - no IdMap configured
   * const exporter = new ResultStoreNodeLabelExporterBuilder()
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // Throws: "IdMap cannot be null"
   * ```
   *
   * **Successful Configuration:**
   * ```typescript
   * const exporter = new ResultStoreNodeLabelExporterBuilder()
   *   .withIdMap(graph.idMap())                    // Required: provides nodeCount and toOriginalId
   *   .withResultStore(Optional.of(resultStore))   // Required: storage destination
   *   .withJobId(JobId.of('my-operation'))         // Optional: defaults to EMPTY
   *   .withProgressTracker(progressTracker)        // Optional: defaults to NULL_TRACKER
   *   .build(); // Success: creates configured exporter
   * ```
   *
   * **Performance Characteristics:**
   * The created exporter will have:
   * - **Immediate writes**: No I/O overhead, all operations are in-memory
   * - **Constant time storage**: O(1) label storage regardless of labeled node count
   * - **Zero serialization cost**: No data conversion or encoding required
   * - **Instant availability**: Labels accessible immediately after writing
   *
   * @returns A fully configured ResultStoreNodeLabelExporter
   * @throws Error if no result store is configured via withResultStore()
   * @throws Error if required IdMap configuration is missing
   */
  public build(): NodeLabelExporter {
    return new ResultStoreNodeLabelExporter(
      this.jobId,
      this.resultStore.orElseThrow(() => new Error('Result store is required for ResultStoreNodeLabelExporter')),
      this.nodeCount,
      this.toOriginalId
    );
  }
}
