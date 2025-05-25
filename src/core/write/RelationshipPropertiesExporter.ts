import { Task } from '@/core/utils/progress/tasks';
import { Tasks } from '@/core/utils/progress/tasks';

/**
 * Interface for efficiently exporting multiple relationship properties in batch operations.
 *
 * RelationshipPropertiesExporter is a **specialized interface** designed for scenarios
 * where multiple relationship properties need to be exported together for the same
 * relationship type. This is more efficient than exporting each property individually
 * because it allows for optimized batch operations and reduces I/O overhead.
 *
 * **Design Philosophy:**
 * - **Batch-optimized**: Export multiple properties in a single operation
 * - **Type-specific**: Focus on one relationship type at a time for efficiency
 * - **Property-centric**: Designed specifically for property export scenarios
 * - **Storage-agnostic**: Works with any storage backend that supports structured data
 *
 * **Key Differences from RelationshipExporter:**
 * - **RelationshipExporter**: Focuses on topology + optional single property
 * - **RelationshipPropertiesExporter**: Focuses on multiple properties for same relationship type
 * - **Use case**: This interface is for algorithms that compute multiple relationship properties
 *
 * **Common Usage Scenarios:**
 *
 * **Multi-Property Algorithms:**
 * ```typescript
 * // Node similarity algorithm produces multiple similarity metrics
 * const properties = ['jaccard_similarity', 'cosine_similarity', 'overlap_coefficient'];
 * exporter.write('SIMILAR_TO', properties);
 *
 * // Shortest path algorithm with multiple path metrics
 * const pathProperties = ['distance', 'hop_count', 'path_weight'];
 * exporter.write('PATH_TO', pathProperties);
 *
 * // Recommendation algorithm with multiple scores
 * const recProperties = ['confidence', 'affinity_score', 'popularity_boost'];
 * exporter.write('RECOMMENDS', recProperties);
 * ```
 *
 * **Analytics Pipelines:**
 * ```typescript
 * // Export comprehensive relationship analytics
 * const analyticsProperties = [
 *   'strength',           // Connection strength
 *   'frequency',          // Interaction frequency
 *   'recency_score',      // How recent the connection is
 *   'mutual_connections', // Number of mutual connections
 *   'trust_score'         // Computed trust metric
 * ];
 * exporter.write('CONNECTED_TO', analyticsProperties);
 * ```
 *
 * **Performance Benefits:**
 * - **Reduced I/O**: Single write operation instead of multiple separate writes
 * - **Better caching**: Storage systems can optimize for multi-column operations
 * - **Transaction efficiency**: All properties written in single transaction
 * - **Memory optimization**: Can process all properties for a relationship simultaneously
 *
 * **Storage Format Examples:**
 * ```csv
 * source,target,type,jaccard_similarity,cosine_similarity,overlap_coefficient
 * 1,2,SIMILAR_TO,0.75,0.82,0.68
 * 1,3,SIMILAR_TO,0.91,0.87,0.94
 * 2,4,SIMILAR_TO,0.63,0.71,0.59
 * ```
 *
 * **Typical Implementations:**
 * - `FileRelationshipPropertiesExporter` - Multi-column CSV/JSON export
 * - `MemoryRelationshipPropertiesExporter` - In-memory structured storage
 * - `DatabaseRelationshipPropertiesExporter` - Multi-column database inserts
 * - `StreamRelationshipPropertiesExporter` - Structured streaming to external systems
 */
export interface RelationshipPropertiesExporter {
  /**
   * Exports multiple properties for all relationships of the specified type.
   *
   * This is the **core method** for efficient multi-property relationship export.
   * It processes all relationships of the given type and writes all specified
   * properties for each relationship in a single, optimized operation.
   *
   * **Method Behavior:**
   * - Iterates through all relationships of the specified type
   * - For each relationship, looks up values for all specified properties
   * - Writes all property values together in a single row/record
   * - Uses efficient batching internally for optimal performance
   *
   * **Property Lookup Strategy:**
   * The exporter will attempt to find values for each property key:
   * - If a property exists for a relationship, its value is included
   * - If a property doesn't exist, a default value (null, 0, empty) may be used
   * - Property type conversion is handled according to the target storage format
   *
   * **Performance Characteristics:**
   * - **Memory efficient**: Processes relationships in batches to control memory usage
   * - **I/O optimized**: Single write operation per relationship instead of multiple
   * - **Cache friendly**: Better locality of reference for property lookups
   * - **Transaction efficient**: All properties written atomically when possible
   *
   * **Error Handling:**
   * - Missing properties can be handled with defaults or skipped entirely
   * - Type conversion errors should be handled gracefully
   * - Individual relationship failures shouldn't stop the entire export
   *
   * **Usage Examples:**
   * ```typescript
   * // Similarity analysis results
   * exporter.write('SIMILAR_TO', [
   *   'jaccard_similarity',
   *   'cosine_similarity',
   *   'euclidean_distance'
   * ]);
   *
   * // Comprehensive social network metrics
   * exporter.write('KNOWS', [
   *   'interaction_frequency',
   *   'relationship_strength',
   *   'mutual_friends_count',
   *   'communication_recency',
   *   'trust_score'
   * ]);
   *
   * // Financial transaction properties
   * exporter.write('TRANSFERRED_TO', [
   *   'amount',
   *   'transaction_fee',
   *   'processing_time',
   *   'risk_score',
   *   'compliance_status'
   * ]);
   * ```
   *
   * **Implementation Considerations:**
   * - Validate that all property keys exist in the graph schema
   * - Handle type conversions gracefully for different storage formats
   * - Use appropriate batching to balance memory usage and performance
   * - Provide progress feedback for large relationship sets
   * - Consider parallel processing for very large graphs
   *
   * @param relationshipType The type of relationships to export (e.g., 'SIMILAR_TO', 'KNOWS')
   * @param propertyKeys List of property keys to export for each relationship
   * @throws Error if relationshipType is null/empty or propertyKeys list is null/empty
   */
  write(relationshipType: string, propertyKeys: string[]): void;
}

/**
 * Static utilities for creating progress tracking tasks.
 *
 * These helper methods provide standardized task creation for progress
 * monitoring during relationship properties export operations.
 */
export namespace RelationshipPropertiesExporter {
  /**
   * Creates a base-level task for tracking relationship properties export operations.
   *
   * This represents the **top-level progress** for multi-property relationship export
   * processes, typically shown to users as "Writing Relationship Properties" or
   * "Exporting Similarity Metrics".
   *
   * **Task Hierarchy Example:**
   * ```
   * NodeSimilarity :: Relationship Properties :: Write
   * ├── Scanning SIMILAR_TO relationships (sub-task)
   * ├── Looking up property values (sub-task)
   * ├── Converting to export format (sub-task)
   * ├── Writing to storage (sub-task)
   * └── Finalizing export (sub-task)
   * ```
   *
   * **Progress Calculation:**
   * The taskVolume should represent the total number of relationships expected
   * to be processed. Since this interface exports multiple properties per
   * relationship, the volume is based on relationships, not individual properties.
   *
   * **Volume Estimation Examples:**
   * ```typescript
   * // For a specific relationship type
   * const taskVolume = graph.relationshipCount('SIMILAR_TO');
   *
   * // For multiple relationship types (if exporter supports it)
   * const taskVolume = graph.relationshipCount('TYPE1') + graph.relationshipCount('TYPE2');
   *
   * // For dense graphs, may need estimation
   * const taskVolume = estimatedRelationshipCount;
   * ```
   *
   * @param operationName Name of the algorithm or operation producing the properties
   * @param taskVolume Expected number of relationships to be processed
   * @returns A leaf task for tracking overall relationship properties export progress
   */
  export function baseTask(operationName: string, taskVolume: number): Task {
    return Tasks.leaf(`${operationName} :: Relationship Properties :: Write`, taskVolume);
  }
}
