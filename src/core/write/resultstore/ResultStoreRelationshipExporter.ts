import { Graph } from '@/api/Graph';
import { ResultStore } from '@/api/ResultStore';
import { ResultStoreEntry } from '@/api/ResultStoreEntry';
import { RelationshipWithPropertyConsumer } from '@/api/properties/relationships/RelationshipWithPropertyConsumer';
import { JobId } from '@/core/utils/progress/JobId';
import { RelationshipExporter } from '@/core/write/RelationshipExporter';

/**
 * Result store implementation of RelationshipExporter.
 *
 * This exporter stores relationship data **directly in memory** via the result store,
 * making graph topology and relationship properties immediately available for subsequent
 * operations. Unlike file or database exporters that persist data externally, this
 * implementation optimizes for **immediate accessibility** and **zero I/O overhead**.
 *
 * **Design Philosophy:**
 * - **Immediate availability**: Relationships accessible instantly after writing
 * - **Graph-centric storage**: Stores references to graph data rather than copying it
 * - **Topology and properties**: Supports both pure topology and property exports
 * - **Memory-efficient**: References existing graph data instead of duplicating it
 * - **Pipeline integration**: Enables seamless algorithm chaining and composition
 *
 * **Key Architectural Features:**
 *
 * **Dual Storage Strategies:**
 * The exporter uses different result store entry types based on the export scenario:
 *
 * **Topology-Only Export:**
 * - Uses `ResultStoreEntry.RelationshipTopology`
 * - Stores relationship type, graph reference, and ID mapping
 * - No property data, minimal memory overhead
 * - Perfect for algorithms that only need graph structure
 *
 * **Topology + Properties Export:**
 * - Uses `ResultStoreEntry.RelationshipsFromGraph`
 * - Stores relationship type, property key, graph reference, and ID mapping
 * - Enables access to both structure and property values
 * - Supports algorithms that need weighted or attributed relationships
 *
 * **Graph Reference Strategy:**
 * Instead of copying relationship data, this exporter stores a **reference to the graph**
 * along with metadata about which relationships and properties to expose. This approach:
 * - **Reduces memory usage**: No data duplication between graph and result store
 * - **Maintains consistency**: Changes in graph are reflected in exported results
 * - **Enables lazy evaluation**: Properties computed on-demand when accessed
 * - **Supports large graphs**: Memory usage independent of relationship count
 *
 * **Use Cases:**
 *
 * **Algorithm Result Sharing:**
 * ```typescript
 * // Export computed similarity graph
 * const exporter = new ResultStoreRelationshipExporter(...);
 * exporter.write('SIMILAR_TO', 'similarity_score');
 *
 * // Immediately use in downstream algorithm
 * const similarityGraph = resultStore.getRelationshipTopology('SIMILAR_TO');
 * const communities = communityDetection.run(similarityGraph);
 * ```
 *
 * **Subgraph Extraction:**
 * ```typescript
 * // Export filtered relationships
 * const filteredGraph = graph.subgraph(highValueNodes);
 * const exporter = new ResultStoreRelationshipExporter(jobId, resultStore, filteredGraph, idMapper);
 * exporter.write('HIGH_VALUE_CONNECTION');
 *
 * // Topology available for analysis
 * const connections = resultStore.getRelationshipTopology('HIGH_VALUE_CONNECTION');
 * ```
 *
 * **Multi-Layer Network Analysis:**
 * ```typescript
 * // Export different relationship layers
 * exporter.write('FRIENDSHIP'); // Social layer
 * exporter.write('COLLABORATION', 'strength'); // Work layer with weights
 * exporter.write('COMMUNICATION', 'frequency'); // Communication layer with frequencies
 *
 * // Each layer immediately available for analysis
 * const socialNetwork = resultStore.getRelationshipTopology('FRIENDSHIP');
 * const workNetwork = resultStore.getRelationshipsWithProperty('COLLABORATION', 'strength');
 * ```
 *
 * **Interactive Exploration:**
 * ```typescript
 * // Export for immediate exploration in notebooks/REPLs
 * exporter.write('INFLUENCES', 'influence_weight');
 *
 * // Immediate analysis capabilities
 * const influences = resultStore.getRelationshipsWithProperty('INFLUENCES', 'influence_weight');
 * const topInfluencers = findMostInfluentialNodes(influences);
 * const networkDensity = calculateNetworkDensity(influences);
 * ```
 *
 * **Performance Characteristics:**
 * - **Constant time writes**: O(1) regardless of relationship count
 * - **Zero I/O latency**: All operations are in-memory
 * - **Memory efficient**: References existing graph data rather than copying
 * - **Immediate queries**: Results available instantly for subsequent operations
 */
export class ResultStoreRelationshipExporter implements RelationshipExporter {
  /**
   * Job identifier for correlating this export operation with other system activities.
   * Enables tracking, auditing, and grouping of related result store entries.
   */
  private readonly jobId: JobId;

  /**
   * The result store where relationship data will be stored.
   * Provides immediate access to exported relationships for subsequent operations.
   */
  private readonly resultStore: ResultStore;

  /**
   * The source graph containing relationships to be exported.
   * Rather than copying data, the exporter stores a reference to this graph
   * along with metadata about which relationships to expose.
   */
  private readonly graph: Graph;

  /**
   * Function to convert internal node IDs back to original node IDs.
   * Essential for maintaining referential integrity when relationships are
   * accessed by external systems or subsequent algorithms.
   */
  private readonly toOriginalId: (nodeId: number) => number;

  /**
   * Creates a new result store relationship exporter.
   *
   * @param jobId Job identifier for tracking this export operation
   * @param resultStore The result store for immediate relationship access
   * @param graph The source graph containing relationships to export
   * @param toOriginalId Function to convert internal to original node IDs
   */
  constructor(
    jobId: JobId,
    resultStore: ResultStore,
    graph: Graph,
    toOriginalId: (nodeId: number) => number
  ) {
    this.jobId = jobId;
    this.resultStore = resultStore;
    this.graph = graph;
    this.toOriginalId = toOriginalId;
  }

  /**
   * Writes relationship topology (structure only) to the result store.
   *
   * This method exports **pure graph topology** without any property information.
   * It's the most memory-efficient export option, perfect for algorithms that only
   * need to know which nodes are connected, not the properties of those connections.
   *
   * **Storage Strategy:**
   * Creates a `ResultStoreEntry.RelationshipTopology` that contains:
   * - **Relationship type**: The semantic type of relationships (e.g., 'FRIENDS', 'FOLLOWS')
   * - **Graph reference**: Reference to the source graph for lazy relationship access
   * - **ID mapping**: Function to convert internal to original node IDs
   *
   * **Memory Efficiency:**
   * Since only metadata is stored (not actual relationship lists), this method:
   * - Uses **constant memory** regardless of relationship count
   * - Enables **lazy evaluation** of relationship queries
   * - **References existing data** rather than duplicating it
   * - Supports **very large graphs** without memory concerns
   *
   * **Use Cases:**
   * - **Topology analysis**: Algorithms that only need graph structure
   * - **Network metrics**: Degree centrality, clustering coefficient, connectivity
   * - **Pathfinding**: Shortest path algorithms that don't use edge weights
   * - **Subgraph extraction**: Filtered views of the original graph
   *
   * **Query Integration:**
   * After export, the topology is immediately queryable:
   * ```typescript
   * exporter.write('FRIENDSHIP');
   *
   * // Topology immediately available
   * const friendshipNetwork = resultStore.getRelationshipTopology('FRIENDSHIP');
   * const avgDegree = calculateAverageDegree(friendshipNetwork);
   * const components = findConnectedComponents(friendshipNetwork);
   * ```
   *
   * @param relationshipType The type/label of relationships to export (e.g., 'FRIENDS', 'FOLLOWS')
   */
  public write(relationshipType: string): void {
    const topologyEntry = new ResultStoreEntry.RelationshipTopology(
      relationshipType,
      this.graph,
      this.toOriginalId
    );

    this.resultStore.add(this.jobId, topologyEntry);
  }

  /**
   * Writes relationships with a single property to the result store.
   *
   * This is a **convenience method** that provides the common case of exporting
   * relationships with one property without needing to specify a consumer callback.
   * It internally delegates to the full write method with a null consumer.
   *
   * **When to Use:**
   * - Most relationship property exports (weights, scores, timestamps, etc.)
   * - When you don't need post-write processing or callbacks
   * - Simple algorithm results that produce weighted relationships
   *
   * **Equivalent to:**
   * ```typescript
   * exporter.write(relationshipType, propertyKey, null);
   * ```
   *
   * @param relationshipType The type/label of relationships to export
   * @param propertyKey The name of the property to include with each relationship
   */
  public write(relationshipType: string, propertyKey: string): void {
    this.write(relationshipType, propertyKey, null);
  }

  /**
   * Writes relationships with a property and optional post-write processing.
   *
   * This is the **most comprehensive write method**, supporting both relationship
   * properties and optional post-write callbacks. It creates a result store entry
   * that provides access to both graph topology and property values.
   *
   * **Storage Strategy:**
   * Creates a `ResultStoreEntry.RelationshipsFromGraph` that contains:
   * - **Relationship type**: The semantic type of relationships
   * - **Property key**: Name of the property to expose
   * - **Graph reference**: Reference to the source graph for data access
   * - **ID mapping**: Function to convert internal to original node IDs
   *
   * **Property Access Model:**
   * The result store entry enables efficient property queries:
   * - **On-demand evaluation**: Properties computed when requested, not pre-computed
   * - **Memory efficiency**: No property value duplication
   * - **Type consistency**: Property values maintain original types from graph
   * - **Performance optimization**: Graph's native property access is leveraged
   *
   * **Post-Write Consumer (Optional):**
   * The `afterWriteConsumer` parameter allows for **custom post-processing**:
   * ```typescript
   * // Example: Log statistics after writing
   * const statsConsumer: RelationshipWithPropertyConsumer = (source, target, property) => {
   *   if (property > threshold) {
   *     highValueConnections++;
   *   }
   * };
   *
   * exporter.write('WEIGHTED_EDGE', 'weight', statsConsumer);
   * ```
   *
   * **Note on Consumer Limitation:**
   * In this result store implementation, the `afterWriteConsumer` is **currently ignored**.
   * This is because:
   * - Result store exports are **metadata-based** (no immediate data iteration)
   * - Actual relationship processing happens **lazily** when data is queried
   * - **Future enhancement**: Could be supported by storing consumer in the result store entry
   *
   * **Common Use Cases:**
   * - **Weighted graphs**: Similarity scores, distances, strengths
   * - **Temporal networks**: Timestamps, durations, frequencies
   * - **Attributed relationships**: Categories, types, confidence levels
   * - **Algorithm results**: PageRank influence, betweenness importance
   *
   * **Query Integration:**
   * ```typescript
   * exporter.write('SIMILAR_TO', 'similarity_score');
   *
   * // Both topology and properties available
   * const similarities = resultStore.getRelationshipsWithProperty('SIMILAR_TO', 'similarity_score');
   * const topology = resultStore.getRelationshipTopology('SIMILAR_TO');
   *
   * // Use for weighted algorithms
   * const communities = weightedCommunityDetection.run(similarities);
   * ```
   *
   * @param relationshipType The type/label of relationships to export
   * @param propertyKey The name of the property to include with each relationship
   * @param afterWriteConsumer Optional consumer for post-write processing (currently ignored)
   */
  public write(
    relationshipType: string,
    propertyKey: string,
    afterWriteConsumer: RelationshipWithPropertyConsumer | null
  ): void {
    // Note: afterWriteConsumer is currently ignored in result store implementation
    // because exports are metadata-based rather than immediate data processing
    const relationshipsEntry = new ResultStoreEntry.RelationshipsFromGraph(
      relationshipType,
      propertyKey,
      this.graph,
      this.toOriginalId
    );

    this.resultStore.add(this.jobId, relationshipsEntry);
  }
}
