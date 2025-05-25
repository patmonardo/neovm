import { Task } from '@/core/utils/progress/tasks/Task';
import { Tasks } from '@/core/utils/progress/tasks/Tasks';

/**
 * Consumer function type for processing relationships after they are written.
 *
 * This callback is invoked for each relationship after it has been successfully
 * written to the target storage system, allowing for post-write processing
 * such as validation, logging, or triggering downstream operations.
 *
 * @param sourceNodeId The source node ID (original graph ID)
 * @param targetNodeId The target node ID (original graph ID)
 * @param property The property value written with the relationship (if any)
 */
export type RelationshipWithPropertyConsumer = (
  sourceNodeId: number,
  targetNodeId: number,
  property?: any
) => void;

/**
 * Interface for exporting graph relationships to storage systems.
 *
 * RelationshipExporter is the **core interface** for writing graph topology
 * and relationship properties to persistent storage. This handles the export
 * of the fundamental graph structure - the connections between nodes.
 *
 * **Design Philosophy:**
 * - **Type-specific exports**: Relationships are grouped by type for efficient storage
 * - **Property-aware**: Support for both topology-only and property-enriched exports
 * - **Callback-driven**: Optional post-write processing for each relationship
 * - **Storage-agnostic**: Works with files, databases, streams, or memory stores
 * - **Batch-optimized**: Designed for efficient bulk export operations
 *
 * **Common Usage Patterns:**
 * ```typescript
 * // Export topology only
 * exporter.write('KNOWS');
 * exporter.write('FOLLOWS');
 *
 * // Export with properties
 * exporter.write('SIMILAR_TO', 'similarity_score');
 * exporter.write('CONNECTED_TO', 'weight');
 *
 * // Export with post-processing
 * exporter.write('RECOMMENDS', 'confidence', (src, tgt, conf) => {
 *   console.log(`${src} recommends ${tgt} with confidence ${conf}`);
 *   sendToRecommendationEngine(src, tgt, conf);
 * });
 * ```
 *
 * **Export Scenarios:**
 * - **Graph serialization**: Full graph topology for backup or migration
 * - **Algorithm results**: Computed relationships like recommendations or similarities
 * - **Filtered exports**: Subgraphs or specific relationship types only
 * - **Format conversion**: Converting between different graph file formats
 * - **Real-time streaming**: Live export of relationship updates
 *
 * **Storage Implementations:**
 * - `FileRelationshipExporter` - CSV, GraphML, JSON edge lists
 * - `MemoryRelationshipExporter` - In-memory graph structures
 * - `StreamRelationshipExporter` - Real-time streaming to external systems
 * - `DatabaseRelationshipExporter` - SQL/NoSQL database storage
 * - `CloudRelationshipExporter` - Cloud storage services
 */
export interface RelationshipExporter {
  /**
   * Exports all relationships of the specified type without properties.
   *
   * This is the **simplest export method** for writing pure graph topology.
   * Only the source and target node IDs are written, without any associated
   * property values. This is ideal for:
   *
   * - **Topology analysis**: Graph structure analysis algorithms
   * - **Format conversion**: Converting between graph file formats
   * - **Backup/restore**: Preserving graph structure for disaster recovery
   * - **Subgraph extraction**: Exporting specific relationship types
   *
   * **Performance Characteristics:**
   * - Fastest export method since no property lookup/conversion is needed
   * - Minimal memory usage as only node ID pairs are processed
   * - Optimal for large-scale topology exports
   *
   * **Output Format Examples:**
   * ```csv
   * source,target,type
   * 1,2,KNOWS
   * 1,3,KNOWS
   * 2,4,KNOWS
   * ```
   *
   * @param relationshipType The type of relationships to export (e.g., 'KNOWS', 'FOLLOWS')
   */
  write(relationshipType: string): void;

  /**
   * Exports relationships of the specified type along with their properties.
   *
   * This method exports both the **topology and properties** for relationships,
   * providing richer data for downstream analysis. The property values are
   * looked up and converted to the appropriate format for the target storage system.
   *
   * **Use Cases:**
   * - **Weighted graphs**: Exporting edge weights for shortest path algorithms
   * - **Algorithm results**: Similarity scores, recommendation confidence, etc.
   * - **Analytics data**: Relationship metadata for business intelligence
   * - **Machine learning**: Feature-enriched graphs for ML pipelines
   *
   * **Performance Considerations:**
   * - Slower than topology-only export due to property lookup overhead
   * - Memory usage depends on property value types and sizes
   * - Consider batching for large graphs with complex properties
   *
   * **Output Format Examples:**
   * ```csv
   * source,target,type,weight
   * 1,2,SIMILAR_TO,0.85
   * 1,3,SIMILAR_TO,0.72
   * 2,4,SIMILAR_TO,0.91
   * ```
   *
   * @param relationshipType The type of relationships to export
   * @param propertyKey The property key to export with each relationship
   */
  write(relationshipType: string, propertyKey: string): void;

  /**
   * Exports relationships with optional properties and post-write processing.
   *
   * This is the **most flexible export method**, providing full control over
   * what gets exported and what happens after each relationship is written.
   * The callback function is invoked for every relationship, enabling:
   *
   * **Post-Write Processing:**
   * - **Validation**: Verify that relationships were written correctly
   * - **Logging**: Record export progress and statistics
   * - **Triggering**: Initiate downstream processes for each relationship
   * - **Transformation**: Convert exported data to other formats
   * - **Notification**: Send real-time updates about export progress
   *
   * **Advanced Use Cases:**
   * ```typescript
   * // Real-time recommendation streaming
   * exporter.write('RECOMMENDS', 'score', (src, tgt, score) => {
   *   if (score > 0.8) {
   *     sendHighConfidenceRecommendation(src, tgt, score);
   *   }
   * });
   *
   * // Export validation
   * let exportedCount = 0;
   * exporter.write('CONNECTS', 'weight', (src, tgt, weight) => {
   *   exportedCount++;
   *   if (weight < 0) {
   *     console.warn(`Negative weight detected: ${src}->${tgt}: ${weight}`);
   *   }
   * });
   *
   * // Progress monitoring
   * exporter.write('FOLLOWS', null, (src, tgt) => {
   *   progressTracker.logProgress();
   *   updateExportDashboard(src, tgt);
   * });
   * ```
   *
   * **Performance Notes:**
   * - The callback adds per-relationship overhead
   * - Keep callback logic lightweight to avoid export bottlenecks
   * - Consider async processing for heavy callback operations
   *
   * @param relationshipType The type of relationships to export
   * @param propertyKey Optional property key to export (null for topology only)
   * @param afterWriteConsumer Optional callback invoked after each relationship is written
   */
  write(
    relationshipType: string,
    propertyKey?: string | null,
    afterWriteConsumer?: RelationshipWithPropertyConsumer | null
  ): void;
}

/**
 * Static utilities for creating progress tracking tasks.
 *
 * These helper methods provide standardized task creation for progress
 * monitoring during relationship export operations, ensuring consistent
 * user experience across different export scenarios.
 */
export namespace RelationshipExporter {
  /**
   * Creates a base-level task for tracking relationship export operations.
   *
   * This represents the **top-level progress** for relationship export processes,
   * typically shown to users as "Writing Relationships" or "Exporting Graph Topology".
   *
   * **Task Hierarchy Example:**
   * ```
   * PageRank :: Relationships :: Write
   * ├── Scanning Relationships (sub-task)
   * ├── Converting Properties (sub-task)
   * ├── Writing to Storage (sub-task)
   * └── Finalizing Export (sub-task)
   * ```
   *
   * **Progress Calculation:**
   * The taskVolume should represent the total number of relationships expected
   * to be written. This enables accurate progress percentage calculations and
   * estimated completion time predictions.
   *
   * @param operationName Name of the algorithm or operation producing relationships
   * @param taskVolume Expected number of relationships to be written
   * @returns A leaf task for tracking overall relationship export progress
   */
  export function baseTask(operationName: string, taskVolume: number): Task {
    return Tasks.leaf(`${operationName} :: Relationships :: Write`, taskVolume);
  }
}
