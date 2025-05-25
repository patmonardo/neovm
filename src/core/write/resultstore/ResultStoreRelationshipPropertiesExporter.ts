import { RelationshipType } from '@/api/RelationshipType';
import { GraphStore } from '@/api/GraphStore';
import { ResultStore } from '@/api/ResultStore';
import { ResultStoreEntry } from '@/api/ResultStoreEntry';
import { JobId } from '@/core/utils/progress/JobId';
import { RelationshipPropertiesExporter } from '@/core/write/RelationshipPropertiesExporter';
import { Optional } from '@/utils/Optional';

/**
 * Result store implementation of RelationshipPropertiesExporter.
 *
 * This exporter stores relationship data with multiple properties **directly in memory**
 * via the result store, making them immediately available for subsequent graph operations.
 * Unlike single-property relationship exporters, this implementation optimizes for
 * **multi-property scenarios** where relationships have multiple attributes that need
 * to be exported and accessed together.
 *
 * **Design Philosophy:**
 * - **Multi-property optimization**: Efficient handling of relationships with multiple attributes
 * - **Adaptive storage**: Uses different storage strategies based on property count
 * - **GraphStore integration**: Leverages GraphStore capabilities for efficient data access
 * - **Immediate availability**: All exported data instantly accessible via result store
 * - **Memory-efficient**: Uses references and iterators to minimize memory overhead
 *
 * **Key Architectural Features:**
 *
 * **Adaptive Storage Strategy:**
 * The exporter uses different result store entry types based on the number of properties:
 *
 * **Zero Properties (Topology Only):**
 * - Uses `ResultStoreEntry.RelationshipTopology`
 * - Pure graph structure without any property data
 * - Most memory-efficient option for structural analysis
 *
 * **Single Property:**
 * - Uses `ResultStoreEntry.RelationshipsFromGraph`
 * - Optimized for single-property access patterns
 * - Leverages graph's native single-property iteration
 *
 * **Multiple Properties:**
 * - Uses `ResultStoreEntry.RelationshipIterators`
 * - Supports complex multi-property access patterns
 * - Uses composite relationship iterators for efficiency
 *
 * **GraphStore vs Graph Integration:**
 * This exporter uses GraphStore (not just Graph) to support:
 * - **Multi-property queries**: Efficient access to relationships with multiple properties
 * - **Composite iterators**: Specialized iterators for multi-property scenarios
 * - **Property combinations**: Access to different property combinations on demand
 * - **Storage optimization**: GraphStore can optimize property access patterns
 *
 * **Use Cases:**
 *
 * **Complex Relationship Analysis:**
 * ```typescript
 * // Export social relationships with multiple attributes
 * const exporter = new ResultStoreRelationshipPropertiesExporter(jobId, graphStore, resultStore);
 *
 * exporter.write('FRIENDSHIP', [
 *   'closeness_score',
 *   'interaction_frequency',
 *   'relationship_duration',
 *   'mutual_friends_count'
 * ]);
 *
 * // Multi-dimensional analysis immediately available
 * const friendshipData = resultStore.getRelationshipIterators('FRIENDSHIP');
 * const socialMetrics = analyzeSocialRelationships(friendshipData);
 * ```
 *
 * **Financial Network Analysis:**
 * ```typescript
 * // Export transaction relationships with risk and business metrics
 * exporter.write('TRANSACTION', [
 *   'amount',
 *   'risk_score',
 *   'transaction_type',
 *   'timestamp',
 *   'compliance_status'
 * ]);
 *
 * // Complex financial analysis
 * const transactions = resultStore.getRelationshipIterators('TRANSACTION');
 * const riskAssessment = performRiskAnalysis(transactions);
 * const patterns = detectSuspiciousPatterns(transactions);
 * ```
 *
 * **Recommendation Systems:**
 * ```typescript
 * // Export recommendation relationships with multiple confidence metrics
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
 * const rankedRecommendations = rankRecommendations(recommendations);
 * ```
 *
 * **Temporal Network Analysis:**
 * ```typescript
 * // Export temporal relationships with time-based properties
 * exporter.write('TEMPORAL_CONNECTION', [
 *   'start_time',
 *   'end_time',
 *   'duration',
 *   'strength_over_time',
 *   'event_count'
 * ]);
 *
 * // Temporal pattern analysis
 * const temporalData = resultStore.getRelationshipIterators('TEMPORAL_CONNECTION');
 * const patterns = analyzeTemporalPatterns(temporalData);
 * ```
 *
 * **Performance Characteristics:**
 * - **Adaptive efficiency**: Uses most efficient storage strategy for each property count
 * - **Iterator-based**: Large multi-property datasets use memory-efficient iterators
 * - **Reference-based**: Leverages existing GraphStore data without duplication
 * - **Immediate access**: All results available instantly for subsequent operations
 */
export class ResultStoreRelationshipPropertiesExporter implements RelationshipPropertiesExporter {
  /**
   * Job identifier for correlating this export operation with other system activities.
   * Enables tracking, auditing, and grouping of related result store entries.
   */
  private readonly jobId: JobId;

  /**
   * The graph store containing relationship data and properties to be exported.
   * GraphStore provides more sophisticated property access capabilities than Graph,
   * including composite relationship iterators for multi-property scenarios.
   */
  private readonly graphStore: GraphStore;

  /**
   * The result store where relationship property data will be stored.
   * Provides immediate access to exported relationships and their properties
   * for subsequent operations and analysis.
   */
  private readonly resultStore: ResultStore;

  /**
   * Creates a new result store relationship properties exporter.
   *
   * @param jobId Job identifier for tracking this export operation
   * @param graphStore The graph store containing relationship data to export
   * @param resultStore The result store for immediate data access
   */
  constructor(
    jobId: JobId,
    graphStore: GraphStore,
    resultStore: ResultStore
  ) {
    this.jobId = jobId;
    this.graphStore = graphStore;
    this.resultStore = resultStore;
  }

  /**
   * Writes relationships with specified properties to the result store.
   *
   * This method implements an **adaptive storage strategy** that optimizes the result
   * store entry type based on the number of properties being exported. This approach
   * provides the best performance and memory efficiency for each specific use case.
   *
   * **Storage Strategy Selection:**
   *
   * **Case 1: No Properties (Empty List)**
   * ```typescript
   * exporter.write('FRIENDSHIP', []); // Topology only
   * ```
   * - Creates `ResultStoreEntry.RelationshipTopology`
   * - Stores pure graph structure without property data
   * - Most memory-efficient for structural analysis
   * - Perfect for algorithms that only need connectivity information
   *
   * **Case 2: Single Property**
   * ```typescript
   * exporter.write('WEIGHTED_EDGE', ['weight']); // Single property
   * ```
   * - Creates `ResultStoreEntry.RelationshipsFromGraph`
   * - Optimized for single-property access patterns
   * - Leverages GraphStore's single-property graph capabilities
   * - Efficient for weighted graph algorithms
   *
   * **Case 3: Multiple Properties**
   * ```typescript
   * exporter.write('SOCIAL_LINK', ['strength', 'frequency', 'type']); // Multi-property
   * ```
   * - Creates `ResultStoreEntry.RelationshipIterators`
   * - Uses composite relationship iterators for efficient multi-property access
   * - Supports complex property combination queries
   * - Memory-efficient for large datasets with many properties
   *
   * **GraphStore Integration Details:**
   *
   * **Topology Export:**
   * - Uses `graphStore.getGraph(relationshipType)` for structure-only access
   * - Provides pure topology without property overhead
   * - Maintains all graph query capabilities without property data
   *
   * **Single Property Export:**
   * - Uses `graphStore.getGraph(relationshipType, Optional.of(propertyKey))`
   * - Creates graph view optimized for single property access
   * - Balances memory efficiency with property access capabilities
   *
   * **Multi-Property Export:**
   * - Uses `graphStore.getCompositeRelationshipIterator(relationshipType, propertyKeys)`
   * - Provides iterator-based access to avoid loading all data into memory
   * - Supports efficient iteration over relationships with multiple properties
   * - Includes node count for progress tracking and validation
   *
   * **Memory Efficiency Considerations:**
   * - **Topology**: Minimal memory overhead, references existing graph structure
   * - **Single property**: Moderate overhead, single property per relationship
   * - **Multiple properties**: Iterator-based to avoid memory multiplication
   *
   * **Query Performance:**
   * After export, data is accessible via different result store query methods:
   * ```typescript
   * // Topology queries
   * const topology = resultStore.getRelationshipTopology('FRIENDSHIP');
   *
   * // Single property queries
   * const weightedEdges = resultStore.getRelationshipsFromGraph('WEIGHTED_EDGE');
   *
   * // Multi-property queries
   * const socialData = resultStore.getRelationshipIterators('SOCIAL_LINK');
   * socialData.forEachRelationship((source, target, properties) => {
   *   const strength = properties[0]; // 'strength'
   *   const frequency = properties[1]; // 'frequency'
   *   const type = properties[2]; // 'type'
   *   // Process multi-property relationship
   * });
   * ```
   *
   * **Use Case Examples:**
   * ```typescript
   * // Financial risk analysis - multiple risk factors
   * exporter.write('TRANSACTION', [
   *   'amount', 'risk_score', 'compliance_flag', 'timestamp'
   * ]);
   *
   * // Social network analysis - relationship attributes
   * exporter.write('KNOWS', [
   *   'closeness', 'frequency', 'duration', 'context'
   * ]);
   *
   * // Recommendation system - multiple similarity metrics
   * exporter.write('SIMILAR_TO', [
   *   'content_similarity', 'behavioral_similarity', 'confidence'
   * ]);
   * ```
   *
   * @param relationshipType The type/label of relationships to export
   * @param propertyKeys List of property keys to include (empty for topology-only)
   */
  public write(relationshipType: string, propertyKeys: string[]): void {
    const relType = RelationshipType.of(relationshipType);

    if (propertyKeys.length === 0) {
      // Case 1: Topology-only export
      // Most efficient for structural analysis without property overhead
      const graph = this.graphStore.getGraph(relType);
      const topologyEntry = new ResultStoreEntry.RelationshipTopology(
        relationshipType,
        graph,
        graph.toOriginalNodeId
      );
      this.resultStore.add(this.jobId, topologyEntry);

    } else if (propertyKeys.length === 1) {
      // Case 2: Single property export
      // Optimized for single-property algorithms and weighted graph analysis
      const propertyKey = propertyKeys[0];
      const graph = this.graphStore.getGraph(relType, Optional.of(propertyKey));
      const relationshipsEntry = new ResultStoreEntry.RelationshipsFromGraph(
        relationshipType,
        propertyKey,
        graph,
        graph.toOriginalNodeId
      );
      this.resultStore.add(this.jobId, relationshipsEntry);

    } else {
      // Case 3: Multiple properties export
      // Uses iterator-based approach for memory efficiency with complex property sets
      const relationshipIterator = this.graphStore.getCompositeRelationshipIterator(
        relType,
        propertyKeys
      );
      const iteratorsEntry = new ResultStoreEntry.RelationshipIterators(
        relationshipType,
        propertyKeys,
        relationshipIterator,
        this.graphStore.nodes().toOriginalNodeId,
        this.graphStore.nodeCount()
      );
      this.resultStore.add(this.jobId, iteratorsEntry);
    }
  }
}
