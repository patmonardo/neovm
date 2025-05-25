import { NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { Task } from '@/core/utils/progress/tasks/Task';
import { Tasks } from '@/core/utils/progress/tasks/Tasks';
import { NodeProperty } from './NodeProperty';

/**
 * Interface for exporting computed node properties to storage systems.
 *
 * NodePropertyExporter is the **core interface** for writing algorithm results
 * and computed node properties back to persistent storage. This is typically
 * the final step in a graph analytics pipeline, where computed values like
 * PageRank scores, community IDs, or centrality measures are saved.
 *
 * **Design Philosophy:**
 * - **Batch-oriented**: Optimized for writing large volumes of properties efficiently
 * - **Type-agnostic**: Works with any property value type (numbers, arrays, strings)
 * - **Progress-aware**: Built-in support for tracking export progress
 * - **Storage-agnostic**: Can write to files, databases, memory stores, streams
 *
 * **Common Usage Patterns:**
 * ```typescript
 * // Single property export
 * const pageRankScores = algorithm.computePageRank();
 * exporter.write('pagerank', pageRankScores);
 *
 * // Structured property export
 * const property = NodeProperty.of('centrality', centralityValues);
 * exporter.write(property);
 *
 * // Batch export of multiple properties
 * const properties = [
 *   NodeProperty.of('pagerank', pageRankScores),
 *   NodeProperty.of('community', communityIds),
 *   NodeProperty.of('degree', degreeValues)
 * ];
 * exporter.write(properties);
 * ```
 *
 * **Performance Considerations:**
 * - **Batching**: Use MIN/MAX_BATCH_SIZE constants for optimal throughput
 * - **Memory usage**: Large property collections may require streaming or chunking
 * - **Concurrency**: Implementations may support parallel writing for better performance
 * - **Transaction management**: Consider transaction boundaries for consistency
 *
 * **Storage Implementations:**
 * - `FileNodePropertyExporter` - CSV, JSON, Parquet files
 * - `MemoryNodePropertyExporter` - In-memory result stores
 * - `StreamNodePropertyExporter` - Real-time streaming to external systems
 * - `DatabaseNodePropertyExporter` - SQL/NoSQL database storage
 */
export interface NodePropertyExporter {
  /**
   * Minimum recommended batch size for efficient writing.
   *
   * Writing fewer than this many properties at once may result in
   * suboptimal I/O performance due to excessive overhead from small writes.
   * This is particularly important for file-based and network-based exporters.
   */
  readonly MIN_BATCH_SIZE: number; // 10_000

  /**
   * Maximum recommended batch size to avoid memory pressure.
   *
   * Writing more than this many properties at once may cause memory issues
   * or transaction timeout problems. Large batches should be chunked to
   * stay within this limit.
   */
  readonly MAX_BATCH_SIZE: number; // 100_000

  /**
   * Writes a single property with the given key and values.
   *
   * This is the **fundamental write operation** for exporting computed properties.
   * The property key becomes the column name (for files) or property name
   * (for databases), while the values contain the actual computed data.
   *
   * **Implementation Responsibilities:**
   * - Validate property key format for target storage system
   * - Handle type conversion between NodePropertyValues and target format
   * - Manage batching internally for optimal performance
   * - Provide progress feedback if possible
   *
   * @param property The property key/name (e.g., 'pagerank', 'community')
   * @param properties The computed property values for all nodes
   */
  write(property: string, properties: NodePropertyValues): void;

  /**
   * Writes a structured NodeProperty object.
   *
   * This is a **convenience method** that wraps the key-value pair in a
   * structured object. It's equivalent to calling write(property.key, property.values)
   * but provides better type safety and cleaner code.
   *
   * **Benefits:**
   * - Type safety: Ensures key and values are properly paired
   * - Cleaner code: More readable than separate key/value parameters
   * - Future extensibility: NodeProperty can be extended with metadata
   *
   * @param nodeProperty The structured property object to write
   */
  write(nodeProperty: NodeProperty): void;

  /**
   * Writes multiple properties in a single batch operation.
   *
   * This is the **most efficient method** for exporting multiple properties
   * as it allows implementations to:
   * - Optimize I/O by batching writes
   * - Use transactions more efficiently
   * - Reduce per-property overhead
   * - Provide better progress feedback
   *
   * **Performance Benefits:**
   * - Single transaction for all properties (if applicable)
   * - Reduced system call overhead
   * - Better progress tracking granularity
   * - Opportunity for parallel writing within the batch
   *
   * **Usage Guidelines:**
   * - Prefer this method when exporting algorithm results with multiple outputs
   * - Consider memory usage when building large collections
   * - Properties can have different value types within the same batch
   *
   * @param nodeProperties Collection of properties to write in batch
   */
  write(nodeProperties: NodeProperty[]): void;

  /**
   * Returns the total number of node properties written so far.
   *
   * This count includes **all properties across all write operations** since
   * the exporter was created. For batch operations, this counts each individual
   * property, not the number of batch calls.
   *
   * **Use Cases:**
   * - Progress monitoring: Track how many properties have been exported
   * - Performance metrics: Measure export throughput
   * - Validation: Verify expected number of properties were written
   * - Debugging: Identify where exports might be failing
   *
   * **Counting Examples:**
   * ```typescript
   * exporter.write('prop1', values1);           // propertiesWritten() = 1
   * exporter.write('prop2', values2);           // propertiesWritten() = 2
   * exporter.write([prop3, prop4, prop5]);      // propertiesWritten() = 5
   * ```
   *
   * @returns The total count of individual properties exported
   */
  propertiesWritten(): number;
}

/**
 * Static utilities for creating progress tracking tasks.
 *
 * These helper methods provide standardized task creation for progress
 * monitoring during node property export operations, ensuring consistent
 * user experience across different algorithms and export scenarios.
 */
export namespace NodePropertyExporter {
  /**
   * Creates a base-level task for tracking the overall property export operation.
   *
   * This represents the **top-level progress** for the entire property export process,
   * typically shown to users as "Writing PageRank Properties" or "Exporting Algorithm Results".
   *
   * **Task Hierarchy:**
   * ```
   * Algorithm :: WriteNodeProperties
   * ├── Batching Properties (sub-task)
   * ├── Converting Values (sub-task)
   * ├── Writing to Storage (sub-task)
   * └── Finalizing Export (sub-task)
   * ```
   *
   * @param operationName Name of the algorithm or operation producing properties
   * @param taskVolume Expected number of properties to be written (for progress calculation)
   * @returns A leaf task for tracking overall export progress
   */
  export function baseTask(operationName: string, taskVolume: number): Task {
    return Tasks.leaf(`${operationName} :: WriteNodeProperties`, taskVolume);
  }

  /**
   * Creates a sub-task for tracking internal export operations.
   *
   * This represents progress for **internal steps** within the export process,
   * such as "Batching Properties", "Converting Values", "Validating Data", or
   * "Writing to Storage". These provide detailed progress feedback for complex exports.
   *
   * **Common Sub-Task Names:**
   * - "Batching Properties" - Organizing properties into optimal batch sizes
   * - "Converting Values" - Type conversion for target storage format
   * - "Writing to File" - Actual I/O operations for file-based exports
   * - "Updating Database" - Database write operations
   * - "Validating Export" - Post-write validation and verification
   *
   * @param innerName Name of the internal operation being tracked
   * @param taskVolume Expected volume for this specific sub-operation
   * @returns A leaf task for tracking internal progress
   */
  export function innerTask(innerName: string, taskVolume: number): Task {
    return Tasks.leaf(innerName, taskVolume);
  }

  /**
   * Constants for batch size recommendations.
   * These values are based on empirical testing across various storage systems.
   */
  export const MIN_BATCH_SIZE = 10_000;
  export const MAX_BATCH_SIZE = 100_000;
}
