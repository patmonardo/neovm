import { ResultStore } from '@/api';
import { ResultStoreEntry } from '@/api';
import { NodePropertyValues } from '@/api/properties/nodes';
import { JobId } from '@/core/utils/progress/JobId';
import { NodeProperty } from '@/core/write';
import { NodePropertyExporter } from '@/core/write/NodePropertyExporter';

/**
 * Result store implementation of NodePropertyExporter.
 *
 * This exporter stores computed node properties **directly in memory** via the result store,
 * making them immediately available for subsequent graph operations, analysis, or algorithm
 * chaining. Unlike file or database exporters that persist data externally, this implementation
 * optimizes for **immediate accessibility** and **zero I/O overhead**.
 *
 * **Design Philosophy:**
 * - **Immediate availability**: Properties are accessible immediately after writing
 * - **Algorithm chaining**: Enables seamless composition of graph algorithms
 * - **Memory-first**: Prioritizes speed and accessibility over persistence
 * - **Batch-optimized**: Supports efficient multi-property exports
 * - **Development-friendly**: Perfect for testing, debugging, and interactive analysis
 *
 * **Key Architectural Features:**
 *
 * **Multi-Property Support:**
 * The exporter supports both single and batch property exports, enabling efficient
 * storage of algorithms that compute multiple node properties simultaneously:
 * ```typescript
 * // Single property export
 * exporter.write('pagerank', pageRankValues);
 *
 * // Batch property export (more efficient)
 * exporter.write([
 *   NodeProperty.of('pagerank', pageRankValues),
 *   NodeProperty.of('betweenness', betweennessValues),
 *   NodeProperty.of('closeness', closenessValues)
 * ]);
 * ```
 *
 * **Result Store Integration:**
 * Properties are stored as `ResultStoreEntry.NodeProperties` objects that encapsulate:
 * - **Node labels**: Which node types these properties apply to
 * - **Property metadata**: Names and types of stored properties
 * - **Property values**: The actual computed values
 * - **ID mapping**: Function to resolve original node IDs
 *
 * **Use Cases:**
 *
 * **Algorithm Pipelines:**
 * ```typescript
 * // Step 1: Compute centrality measures
 * const centralityExporter = new ResultStoreNodePropertyExporter(...);
 * centralityExporter.write('pagerank', pageRankResults);
 * centralityExporter.write('betweenness', betweennessResults);
 *
 * // Step 2: Use centrality for community detection
 * const pageRankValues = resultStore.getNodeProperty('pagerank');
 * const communityAlgorithm = new WeightedCommunityDetection(pageRankValues);
 * const communities = communityAlgorithm.compute();
 *
 * // Step 3: Export communities
 * const communityExporter = new ResultStoreNodePropertyExporter(...);
 * communityExporter.write('community', communities);
 * ```
 *
 * **Interactive Analysis:**
 * ```typescript
 * // Compute properties for immediate exploration
 * exporter.write('influence_score', influenceScores);
 *
 * // Immediately analyze results
 * const scores = resultStore.getNodeProperty('influence_score');
 * const topInfluencers = findTopNodes(scores, 10);
 * const distribution = analyzeScoreDistribution(scores);
 * ```
 *
 * **Multi-Algorithm Comparison:**
 * ```typescript
 * // Store results from different algorithms
 * exporter.write('pagerank_v1', standardPageRank);
 * exporter.write('pagerank_v2', personalizedPageRank);
 * exporter.write('pagerank_v3', weightedPageRank);
 *
 * // Compare algorithm performance
 * const comparison = compareAlgorithmResults(
 *   resultStore.getNodeProperty('pagerank_v1'),
 *   resultStore.getNodeProperty('pagerank_v2'),
 *   resultStore.getNodeProperty('pagerank_v3')
 * );
 * ```
 *
 * **Performance Characteristics:**
 * - **Zero I/O latency**: All operations are in-memory
 * - **Immediate access**: Properties available instantly after writing
 * - **Batch efficiency**: Multi-property writes reduce overhead
 * - **Memory proportional**: Memory usage scales with property count and graph size
 */
export class ResultStoreNodePropertyExporter implements NodePropertyExporter {
  /**
   * Job identifier for correlating this export operation with other system activities.
   * Enables tracking, auditing, and grouping of related result store entries.
   */
  private readonly jobId: JobId;

  /**
   * The result store where node properties will be stored.
   * Provides immediate access to stored properties for subsequent operations.
   */
  private readonly resultStore: ResultStore;

  /**
   * List of node labels that these properties apply to.
   * Enables property queries to be scoped to specific node types, supporting
   * multi-label graphs and type-specific property access patterns.
   */
  private readonly nodeLabels: string[];

  /**
   * Function to convert internal node IDs back to original node IDs.
   * Essential for maintaining referential integrity when properties are
   * accessed by external systems or subsequent algorithms.
   */
  private readonly toOriginalId: (nodeId: number) => number;

  /**
   * Running count of total property values written across all write operations.
   * Used for progress tracking and operational monitoring. Since each node can
   * have multiple properties, this counts individual property values, not nodes.
   */
  private writtenProperties: number = 0;

  /**
   * Creates a new result store node property exporter.
   *
   * @param jobId Job identifier for tracking this export operation
   * @param resultStore The result store for immediate property access
   * @param nodeLabels List of node labels these properties apply to
   * @param toOriginalId Function to convert internal to original node IDs
   */
  constructor(
    jobId: JobId,
    resultStore: ResultStore,
    nodeLabels: string[],
    toOriginalId: (nodeId: number) => number
  ) {
    this.jobId = jobId;
    this.resultStore = resultStore;
    this.nodeLabels = nodeLabels;
    this.toOriginalId = toOriginalId;
  }

  /**
   * Writes a single node property to the result store.
   *
   * This is a **convenience method** for single-property exports that internally
   * creates a NodeProperty object and delegates to the batch write method.
   *
   * **When to Use:**
   * - Algorithms that compute one property at a time
   * - Simple property exports where batch efficiency isn't critical
   * - Interactive/exploratory analysis scenarios
   *
   * **Performance Note:**
   * For algorithms that compute multiple properties, prefer the batch write
   * methods (`write(NodeProperty)` or `write(Collection<NodeProperty>)`) for
   * better efficiency.
   *
   * @param property The name/key of the property
   * @param properties The computed property values for all nodes
   */
  public write(property: string, properties: NodePropertyValues): void {
    this.write(NodeProperty.of(property, properties));
  }

  /**
   * Writes a single NodeProperty to the result store.
   *
   * This method is **more efficient than the string-based version** when you
   * already have a NodeProperty object, as it avoids object creation overhead.
   *
   * **Internal Implementation:**
   * Creates a single-element collection and delegates to the batch write method,
   * ensuring consistent behavior and result store entry creation across all
   * write variants.
   *
   * @param nodeProperty The NodeProperty containing both key and values
   */
  public write(nodeProperty: NodeProperty): void {
    this.write([nodeProperty]);
  }

  /**
   * Writes multiple node properties to the result store in a single operation.
   *
   * This is the **most efficient write method** for algorithms that compute multiple
   * properties simultaneously. It creates a single result store entry containing
   * all properties, which:
   * - **Reduces storage overhead**: One entry instead of multiple separate entries
   * - **Improves query performance**: Related properties are co-located
   * - **Ensures consistency**: All properties are associated with the same job
   * - **Enables atomic updates**: All properties written together or not at all
   *
   * **Batch Processing Strategy:**
   * The method processes all properties together to create a single
   * `ResultStoreEntry.NodeProperties` containing:
   * - **Property keys**: Array of property names in order
   * - **Property values**: Array of NodePropertyValues in corresponding order
   * - **Metadata**: Node labels, ID mapping, and job correlation
   *
   * **Property Count Tracking:**
   * Updates the `writtenProperties` counter by summing the node counts from
   * all property values. This provides accurate tracking even when properties
   * have different node coverage (e.g., sparse properties).
   *
   * **Example Usage:**
   * ```typescript
   * // Centrality algorithm computing multiple measures
   * const properties = [
   *   NodeProperty.of('pagerank', pageRankValues),
   *   NodeProperty.of('betweenness', betweennessValues),
   *   NodeProperty.of('closeness', closenessValues),
   *   NodeProperty.of('eigenvector', eigenvectorValues)
   * ];
   *
   * exporter.write(properties); // Single efficient operation
   *
   * // All properties immediately available together
   * const centralityData = resultStore.getNodeProperties(['pagerank', 'betweenness', 'closeness', 'eigenvector']);
   * ```
   *
   * **Multi-Property Algorithm Benefits:**
   * - **Graph neural networks**: Store multiple embedding dimensions together
   * - **Community detection**: Store community ID, modularity contribution, and stability
   * - **Similarity algorithms**: Store multiple similarity metrics per node pair
   * - **Classification results**: Store prediction, confidence, and feature importance
   *
   * @param nodeProperties Collection of NodeProperty objects to write
   */
  public write(nodeProperties: NodeProperty[]): void {
    const propertyKeys: string[] = [];
    const propertyValues: NodePropertyValues[] = [];

    // Process all properties to extract keys and values
    nodeProperties.forEach(nodeProperty => {
      propertyKeys.push(nodeProperty.key());
      propertyValues.push(nodeProperty.values());

      // Update total written property count
      // Note: This counts individual property values, so a node with 3 properties contributes 3 to the count
      this.writtenProperties += nodeProperty.values().nodeCount();
    });

    // Create a single result store entry containing all properties
    const nodePropertiesEntry = new ResultStoreEntry.NodeProperties(
      this.nodeLabels,
      propertyKeys,
      propertyValues,
      this.toOriginalId
    );

    // Store all properties together under this job
    this.resultStore.add(this.jobId, nodePropertiesEntry);
  }

  /**
   * Returns the total number of property values written across all operations.
   *
   * **Important Interpretation:**
   * This method returns the count of **individual property values**, not the number
   * of nodes or properties. The calculation is:
   * ```
   * total = sum(property.values().nodeCount() for property in all_written_properties)
   * ```
   *
   * **Example Calculations:**
   * ```typescript
   * // Scenario 1: Single property for 1000 nodes
   * exporter.write('pagerank', pageRankFor1000Nodes);
   * console.log(exporter.propertiesWritten()); // Output: 1000
   *
   * // Scenario 2: Three properties for 1000 nodes each
   * exporter.write([
   *   NodeProperty.of('pagerank', pageRankFor1000Nodes),     // +1000
   *   NodeProperty.of('betweenness', betweennessFor1000Nodes), // +1000
   *   NodeProperty.of('closeness', closenessFor1000Nodes)     // +1000
   * ]);
   * console.log(exporter.propertiesWritten()); // Output: 4000 (1000 + 3000)
   *
   * // Scenario 3: Sparse properties (different node coverage)
   * exporter.write('sparse_feature', sparsePropertyFor500Nodes); // +500
   * console.log(exporter.propertiesWritten()); // Output: 4500 (4000 + 500)
   * ```
   *
   * **Use Cases:**
   * - **Progress tracking**: Monitor how many property values have been processed
   * - **Performance metrics**: Calculate property export throughput (values/second)
   * - **Resource monitoring**: Estimate memory usage based on property count
   * - **Validation**: Verify expected number of properties were written
   * - **Debugging**: Identify unexpectedly high or low property counts
   *
   * **Alternative Metrics:**
   * If you need different metrics, you can derive them from result store queries:
   * ```typescript
   * // Number of distinct properties written
   * const distinctProperties = resultStore.getPropertyKeys().length;
   *
   * // Number of nodes with properties
   * const nodesWithProperties = resultStore.getNodeProperty('any_property').nodeCount();
   *
   * // Average properties per node
   * const avgPropertiesPerNode = exporter.propertiesWritten() / nodesWithProperties;
   * ```
   *
   * @returns Total count of individual property values written
   */
  public propertiesWritten(): number {
    return this.writtenProperties;
  }
}
