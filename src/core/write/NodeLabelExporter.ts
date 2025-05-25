import { Task } from '@/core/utils/progress/tasks/Task';
import { Tasks } from '@/core/utils/progress/tasks/Tasks';

/**
 * Interface for exporting node label assignments to storage systems.
 *
 * Node label exporters handle writing computed node classifications back to
 * storage. This is typically used for results from community detection algorithms,
 * clustering operations, or machine learning classification tasks.
 *
 * **Common Use Cases:**
 * - **Community Detection**: Exporting community IDs as node labels (Louvain, Label Propagation)
 * - **Graph Clustering**: Writing cluster assignments from K-means, DBSCAN, etc.
 * - **Node Classification**: ML-predicted categories or types for nodes
 * - **Graph Partitioning**: Partition assignments for distributed processing
 * - **Workflow Stages**: Marking nodes as processed, validated, or categorized
 *
 * **Export Patterns:**
 * ```typescript
 * // Community detection results
 * communityIds.forEach((communityId, nodeId) => {
 *   const label = `Community_${communityId}`;
 *   exporter.write(label);
 * });
 *
 * // Classification results
 * predictions.forEach((prediction, nodeId) => {
 *   exporter.write(prediction.label);
 * });
 *
 * // Workflow status
 * processedNodes.forEach(nodeId => {
 *   exporter.write('PROCESSED');
 * });
 * ```
 *
 * **Batching Strategy:**
 * The interface defines optimal batch sizes for performance. Implementations
 * should batch writes to balance memory usage with I/O efficiency.
 */
export interface NodeLabelExporter {
  /**
   * Minimum recommended batch size for efficient writing.
   *
   * Writing fewer than this many labels at once may result in
   * suboptimal I/O performance due to excessive system calls.
   */
  MIN_BATCH_SIZE: number; // 10_000

  /**
   * Maximum recommended batch size to avoid memory pressure.
   *
   * Writing more than this many labels at once may cause
   * memory issues or transaction timeout problems.
   */
  MAX_BATCH_SIZE: number; // 100_000

  /**
   * Writes a node label assignment.
   *
   * This method assigns the specified label to the current node being processed.
   * The exact node is typically determined by the context in which this exporter
   * is used (e.g., during iteration over algorithm results).
   *
   * **Implementation Notes:**
   * - Should handle batch accumulation internally for optimal performance
   * - Should validate label format according to target system requirements
   * - Should handle duplicate labels gracefully (additive vs. replacement)
   *
   * @param nodeLabel The label to assign to the current node
   */
  write(nodeLabel: string): void;

  /**
   * Returns the total number of node labels written so far.
   *
   * This count includes all labels written since the exporter was created,
   * across all batches and write operations. Useful for progress tracking
   * and performance monitoring.
   *
   * @returns The total count of node labels exported
   */
  nodeLabelsWritten(): number;
}

/**
 * Static utilities for creating progress tracking tasks.
 *
 * These helper methods provide standardized task creation for progress
 * monitoring during node label export operations.
 */
export namespace NodeLabelExporter {
  /**
   * Creates a base-level task for tracking the overall label export operation.
   *
   * This represents the top-level progress for the entire node labeling process,
   * typically shown to users as "Exporting Community Labels" or similar.
   *
   * @param operationName Name of the algorithm or operation producing labels
   * @param taskVolume Expected number of nodes to be labeled
   * @returns A leaf task for tracking overall export progress
   */
  export function baseTask(operationName: string, taskVolume: number): Task {
    return Tasks.leaf(`${operationName} :: WriteNodeLabel`, taskVolume);
  }

  /**
   * Creates a sub-task for tracking internal export operations.
   *
   * This represents progress for internal steps within the export process,
   * such as "Batching Labels", "Validating Assignments", or "Writing to Storage".
   *
   * @param innerName Name of the internal operation
   * @param taskVolume Expected volume for this specific sub-operation
   * @returns A leaf task for tracking internal progress
   */
  export function innerTask(innerName: string, taskVolume: number): Task {
    return Tasks.leaf(innerName, taskVolume);
  }

  /**
   * Constants for batch size recommendations.
   */
  export const MIN_BATCH_SIZE = 10_000;
  export const MAX_BATCH_SIZE = 100_000;
}
