import { ResultStore } from '@/api';
import { ResultStoreEntry } from '@/api';
import { JobId } from '@/core/utils/progress/JobId';
import { NodeLabelExporter } from '@/core/write';

/**
 * Result store implementation of NodeLabelExporter.
 *
 * This exporter stores node label assignments **directly in memory** via the result store,
 * making them immediately available for subsequent graph operations or analysis.
 * Unlike file or database exporters that persist data externally, this implementation
 * focuses on **in-memory accessibility** and **pipeline integration**.
 *
 * **Design Philosophy:**
 * - **Immediate availability**: Labels are accessible immediately after writing
 * - **Memory-efficient metadata**: Stores label assignment metadata rather than full data
 * - **Pipeline-optimized**: Designed for algorithm chaining and result composition
 * - **Zero I/O overhead**: No external storage operations or serialization costs
 *
 * **Key Architectural Decisions:**
 *
 * **Metadata Storage Strategy:**
 * Instead of storing individual node-label assignments, this exporter stores the
 * **label assignment metadata** (label name, node count, ID mapping function).
 * This approach:
 * - **Reduces memory footprint**: Avoids storing redundant node ID lists
 * - **Enables efficient queries**: Label assignments can be computed on-demand
 * - **Maintains flexibility**: ID mapping allows for dynamic node ID resolution
 * - **Supports composition**: Multiple label assignments can be layered
 *
 * **Result Store Integration:**
 * The exporter creates a `ResultStoreEntry.NodeLabel` that encapsulates:
 * - **Label name**: The semantic name of the label being assigned
 * - **Node count**: Total number of nodes receiving this label
 * - **ID mapping**: Function to convert internal to original node IDs
 * - **Job correlation**: Associates the label with the originating job
 *
 * **Use Cases:**
 *
 * **Community Detection Results:**
 * ```typescript
 * // Export community assignments as labels
 * const exporter = new ResultStoreNodeLabelExporter(jobId, resultStore, nodeCount, idMapper);
 *
 * // Each community becomes a label
 * exporter.write('Community_1');
 * exporter.write('Community_2');
 * exporter.write('Community_3');
 *
 * // Labels are immediately queryable from result store
 * const community1Nodes = resultStore.getNodeLabel('Community_1');
 * ```
 *
 * **Node Classification Results:**
 * ```typescript
 * // Export ML classification results
 * exporter.write('HighRisk');
 * exporter.write('MediumRisk');
 * exporter.write('LowRisk');
 *
 * // Use classifications for further analysis
 * const highRiskNodes = resultStore.getNodeLabel('HighRisk');
 * const riskAnalysis = analyzeRiskDistribution(highRiskNodes);
 * ```
 *
 * **Graph Partitioning Results:**
 * ```typescript
 * // Export partition assignments for distributed processing
 * exporter.write('Partition_A');
 * exporter.write('Partition_B');
 * exporter.write('Partition_C');
 *
 * // Partitions available for distributed algorithm execution
 * distributedAlgorithm.run(resultStore.getNodeLabels());
 * ```
 *
 * **Performance Characteristics:**
 * - **Constant time writes**: O(1) per label regardless of node count
 * - **Memory efficient**: Stores metadata rather than full node lists
 * - **Immediate access**: Zero latency for result store queries
 * - **Composition friendly**: Multiple label assignments can coexist
 */
export class ResultStoreNodeLabelExporter implements NodeLabelExporter {
  /**
   * Job identifier for correlating this export operation with other system activities.
   * Used to group related result store entries and provide audit trails.
   */
  private readonly jobId: JobId;

  /**
   * The result store where node label metadata will be stored.
   * Provides immediate access to label assignments for subsequent operations.
   */
  private readonly resultStore: ResultStore;

  /**
   * Total number of nodes in the graph that can receive label assignments.
   * Used for progress tracking and validation of label assignment operations.
   */
  private readonly nodeCount: number;

  /**
   * Function to convert internal node IDs back to original node IDs.
   * Essential for maintaining referential integrity when label assignments
   * are accessed by external systems or subsequent algorithms.
   */
  private readonly toOriginalId: (nodeId: number) => number;

  /**
   * Creates a new result store node label exporter.
   *
   * @param jobId Job identifier for tracking this export operation
   * @param resultStore The result store for storing label metadata
   * @param nodeCount Total number of nodes that can receive labels
   * @param toOriginalId Function to convert internal to original node IDs
   */
  constructor(
    jobId: JobId,
    resultStore: ResultStore,
    nodeCount: number,
    toOriginalId: (nodeId: number) => number
  ) {
    this.jobId = jobId;
    this.resultStore = resultStore;
    this.nodeCount = nodeCount;
    this.toOriginalId = toOriginalId;
  }

  /**
   * Writes a node label assignment to the result store.
   *
   * This method stores the **metadata for a label assignment** rather than the actual
   * node-to-label mappings. The result store entry contains all the information needed
   * to resolve which nodes have the specified label when queried.
   *
   * **Storage Strategy:**
   * Instead of storing a list of node IDs for each label, this implementation stores:
   * - **Label name**: The semantic identifier for the label
   * - **Node count**: Total nodes in the graph (not nodes with this label)
   * - **ID mapping function**: To resolve original node IDs when needed
   *
   * **Metadata Benefits:**
   * - **Memory efficiency**: Avoids storing potentially large node ID lists
   * - **Query flexibility**: Label queries can be resolved dynamically
   * - **Composition support**: Multiple label assignments can be layered
   * - **Performance**: Constant-time storage regardless of labeled node count
   *
   * **Result Store Integration:**
   * The created `ResultStoreEntry.NodeLabel` becomes immediately queryable:
   * ```typescript
   * exporter.write('HighValueCustomer');
   *
   * // Label is immediately available for queries
   * const highValueNodes = resultStore.getNodeLabel('HighValueCustomer');
   * const analysis = performCustomerAnalysis(highValueNodes);
   * ```
   *
   * **Important Notes:**
   * - The actual determination of which nodes have the label is handled by the algorithm
   *   that calls this exporter, not by the exporter itself
   * - The `nodeCount` parameter represents the total graph size, not the number of
   *   nodes that will receive this specific label
   * - Multiple labels can be written for the same set of nodes (overlapping labels)
   *
   * @param nodeLabel The name/identifier of the node label to assign
   */
  public write(nodeLabel: string): void {
    // Create a result store entry that encapsulates the label assignment metadata
    const labelEntry = new ResultStoreEntry.NodeLabel(
      nodeLabel,
      this.nodeCount,
      this.toOriginalId
    );

    // Store the label metadata in the result store, associated with this job
    this.resultStore.add(this.jobId, labelEntry);
  }

  /**
   * Returns the total number of nodes that can receive label assignments.
   *
   * **Important Distinction:**
   * This method returns the **total node count in the graph**, NOT the number
   * of nodes that have been assigned labels. The returned value represents the
   * universe of nodes that could potentially receive label assignments.
   *
   * **Why Total Node Count:**
   * - **Progress tracking**: Enables progress calculation for label assignment algorithms
   * - **Validation**: Helps validate that label assignments are within expected bounds
   * - **Resource planning**: Provides insight into the scale of the labeling operation
   * - **Consistency**: Maintains consistent semantics with other exporter implementations
   *
   * **Usage Examples:**
   * ```typescript
   * // Progress tracking for community detection
   * const totalNodes = exporter.nodeLabelsWritten();
   * const progressPercent = (processedNodes / totalNodes) * 100;
   *
   * // Validation of label assignment coverage
   * const labeledNodes = resultStore.getNodeLabel('Community').size;
   * const coverage = (labeledNodes / exporter.nodeLabelsWritten()) * 100;
   * console.log(`Label coverage: ${coverage}%`);
   * ```
   *
   * **Alternative Interpretation:**
   * Some implementations might interpret this as "number of labels written" rather
   * than "number of nodes." However, this implementation follows the pattern of
   * returning the node count for consistency with the broader export framework.
   *
   * @returns The total number of nodes in the graph
   */
  public nodeLabelsWritten(): number {
    return this.nodeCount;
  }
}
