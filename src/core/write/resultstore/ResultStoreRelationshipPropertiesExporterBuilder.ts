import { RelationshipPropertiesExporter } from '@/core/write/RelationshipPropertiesExporter';
import { RelationshipPropertiesExporterBuilder } from '@/core/write/RelationshipPropertiesExporterBuilder';
import { ResultStoreRelationshipPropertiesExporter } from './ResultStoreRelationshipPropertiesExporter';

/**
 * Builder for creating ResultStoreRelationshipPropertiesExporter instances.
 *
 * This builder extends the abstract RelationshipPropertiesExporterBuilder to provide
 * a concrete implementation that creates exporters for **in-memory result store storage**
 * of relationships with multiple properties. It represents the simplest possible builder
 * implementation since result store exporters require no external configuration.
 *
 * **Design Philosophy:**
 * - **Minimal configuration**: Result stores need no external setup or connections
 * - **GraphStore-centric**: Built around GraphStore instances for advanced property access
 * - **Multi-property optimization**: Designed for efficient multi-property relationship exports
 * - **Immediate availability**: Exported data instantly accessible via result store
 * - **Adaptive storage**: Automatically optimizes storage strategy based on property count
 *
 * **Inheritance Benefits:**
 * By extending RelationshipPropertiesExporterBuilder, this class automatically inherits:
 * - **GraphStore management**: Source GraphStore containing relationship data
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
 * **GraphStore vs Graph:**
 * This builder works with GraphStore (not just Graph) because relationship properties
 * exporters need advanced capabilities:
 * - **Multi-property access**: Efficient access to relationships with multiple properties
 * - **Composite iterators**: Specialized iterators for complex property combinations
 * - **Property optimization**: GraphStore can optimize property access patterns
 * - **Memory efficiency**: Better memory management for large multi-property datasets
 *
 * **Common Usage Patterns:**
 *
 * **Complex Relationship Analysis:**
 * ```typescript
 * const builder = new ResultStoreRelationshipPropertiesExporterBuilder()
 *   .withGraphStore(graphStore)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('social-network-analysis'));
 *
 * const exporter = builder.build();
 *
 * // Export social relationships with multiple attributes
 * exporter.write('FRIENDSHIP', [
 *   'closeness_score',
 *   'interaction_frequency',
 *   'relationship_duration',
 *   'mutual_connections'
 * ]);
 *
 * // Multi-dimensional analysis immediately available
 * const friendshipData = resultStore.getRelationshipIterators('FRIENDSHIP');
 * ```
 *
 * **Financial Network Analysis:**
 * ```typescript
 * const builder = new ResultStoreRelationshipPropertiesExporterBuilder()
 *   .withGraphStore(financialGraphStore)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('risk-assessment'));
 *
 * const exporter = builder.build();
 *
 * // Export transaction relationships with risk metrics
 * exporter.write('TRANSACTION', [
 *   'amount',
 *   'risk_score',
 *   'compliance_status',
 *   'timestamp',
 *   'transaction_type'
 * ]);
 *
 * // Complex financial analysis available immediately
 * const transactions = resultStore.getRelationshipIterators('TRANSACTION');
 * const riskProfile = analyzeTransactionRisk(transactions);
 * ```
 *
 * **Recommendation System Development:**
 * ```typescript
 * const builder = new ResultStoreRelationshipPropertiesExporterBuilder()
 *   .withGraphStore(recommendationGraphStore)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('recommendation-computation'));
 *
 * const exporter = builder.build();
 *
 * // Export recommendations with multiple confidence metrics
 * exporter.write('RECOMMENDS', [
 *   'content_similarity',
 *   'behavioral_similarity',
 *   'collaborative_score',
 *   'confidence_level',
 *   'explanation_type'
 * ]);
 *
 * // Multi-factor recommendation analysis
 * const recommendations = resultStore.getRelationshipIterators('RECOMMENDS');
 * const rankedResults = rankByMultipleFactors(recommendations);
 * ```
 *
 * **Algorithm Pipeline Integration:**
 * ```typescript
 * // Step 1: Compute relationship metrics
 * const metricsExporter = new ResultStoreRelationshipPropertiesExporterBuilder()
 *   .withGraphStore(baseGraphStore)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('metric-computation'))
 *   .build();
 *
 * metricsExporter.write('CONNECTED', [
 *   'shortest_path_length',
 *   'betweenness_importance',
 *   'clustering_coefficient'
 * ]);
 *
 * // Step 2: Use metrics for community detection
 * const connectionMetrics = resultStore.getRelationshipIterators('CONNECTED');
 * const communities = communityDetection.runWithMetrics(connectionMetrics);
 *
 * // Step 3: Export community-aware relationships
 * const communityExporter = new ResultStoreRelationshipPropertiesExporterBuilder()
 *   .withGraphStore(communityGraphStore)
 *   .withResultStore(Optional.of(resultStore))
 *   .withJobId(JobId.of('community-analysis'))
 *   .build();
 *
 * communityExporter.write('COMMUNITY_LINK', [
 *   'intra_community_strength',
 *   'inter_community_bridge_value',
 *   'community_influence_score'
 * ]);
 * ```
 *
 * **Interactive Analysis and Development:**
 * ```typescript
 * // Quick setup for notebook/REPL usage
 * const exporter = new ResultStoreRelationshipPropertiesExporterBuilder()
 *   .withGraphStore(graphStore)
 *   .withResultStore(Optional.of(new InMemoryResultStore()))
 *   .build();
 *
 * // Export for immediate multi-property analysis
 * exporter.write('INFLUENCE', [
 *   'direct_influence',
 *   'indirect_influence',
 *   'influence_decay_rate',
 *   'influence_domain'
 * ]);
 *
 * const influences = resultStore.getRelationshipIterators('INFLUENCE');
 * const networkMetrics = calculateNetworkInfluenceMetrics(influences);
 * console.log(`Network influence patterns:`, networkMetrics);
 * ```
 */
export class ResultStoreRelationshipPropertiesExporterBuilder extends RelationshipPropertiesExporterBuilder {
  /**
   * Creates a ResultStoreRelationshipPropertiesExporter with the configured parameters.
   *
   * This method implements the abstract build() method from RelationshipPropertiesExporterBuilder
   * by creating a concrete ResultStoreRelationshipPropertiesExporter instance. It performs
   * essential validation and creates the exporter with appropriate dependencies.
   *
   * **Configuration Validation:**
   * The method performs both inherited and explicit validation:
   *
   * **Inherited Validation (from parent class):**
   * - GraphStore instance is not null (required for relationship and property access)
   * - Job ID is valid (defaults to EMPTY if not explicitly set)
   * - Optional progress tracking and termination flag configurations
   *
   * **Result Store Validation (this class):**
   * - `resultStore.orElseThrow()` ensures a result store is configured
   * - Throws `IllegalStateException` with descriptive message if no result store is available
   * - Prevents runtime failures during export operations
   *
   * **Why Result Store is Required:**
   * Result store relationship properties exporters have no alternative storage mechanism.
   * Unlike file exporters that could write to default locations or database exporters
   * that could use default connections, result store exporters require an explicit
   * result store instance as their storage destination.
   *
   * **GraphStore Requirement:**
   * The exporter requires a GraphStore (not just Graph) because:
   * - **Multi-property support**: Needs advanced property access capabilities
   * - **Composite iterators**: Requires specialized iterators for multiple properties
   * - **Memory optimization**: GraphStore provides better memory management for large datasets
   * - **Property combinations**: Supports efficient access to various property combinations
   *
   * **Created Exporter Characteristics:**
   * The resulting exporter will provide:
   * - **Adaptive storage**: Automatically selects optimal storage strategy based on property count
   * - **Memory efficiency**: Uses iterators for multi-property scenarios to avoid memory issues
   * - **Immediate availability**: All exported data instantly accessible via result store
   * - **Type-appropriate access**: Different result store entry types for different use cases
   *
   * **Error Scenarios:**
   * ```typescript
   * // Missing result store - will throw IllegalStateException
   * const exporter = new ResultStoreRelationshipPropertiesExporterBuilder()
   *   .withGraphStore(graphStore)
   *   .build(); // Throws: "A result store must be present"
   *
   * // Missing GraphStore - will throw (likely from parent class validation)
   * const exporter = new ResultStoreRelationshipPropertiesExporterBuilder()
   *   .withResultStore(Optional.of(resultStore))
   *   .build(); // Throws: GraphStore-related validation error
   * ```
   *
   * **Successful Configuration:**
   * ```typescript
   * const exporter = new ResultStoreRelationshipPropertiesExporterBuilder()
   *   .withGraphStore(graphStore)                      // Required: data source
   *   .withResultStore(Optional.of(resultStore))       // Required: storage destination
   *   .withJobId(JobId.of('multi-property-export'))    // Optional: operation tracking
   *   .withProgressTracker(progressTracker)            // Optional: progress monitoring
   *   .withTerminationFlag(cancellationFlag)           // Optional: cancellation support
   *   .build(); // Success: creates fully configured exporter
   * ```
   *
   * **Performance Characteristics:**
   * The created exporter will have:
   * - **Zero I/O overhead**: All operations are in-memory
   * - **Adaptive memory usage**: Optimizes memory usage based on property count
   * - **Iterator efficiency**: Uses memory-efficient iterators for large multi-property datasets
   * - **Immediate queries**: Results available instantly after export
   *
   * @returns A fully configured ResultStoreRelationshipPropertiesExporter
   * @throws IllegalStateException if no result store is configured via withResultStore()
   * @throws Error if required GraphStore configuration is missing
   */
  public build(): RelationshipPropertiesExporter {
    const resultStore = this.resultStore.orElseThrow(() =>
      new Error('A result store must be present')
    );

    return new ResultStoreRelationshipPropertiesExporter(
      this.jobId,
      this.graphStore,
      resultStore
    );
  }
}
