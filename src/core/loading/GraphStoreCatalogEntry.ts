import { GraphStore } from '@/api/GraphStore';
import { ResultStore } from '@/api/ResultStore';
import { GraphProjectConfig } from '@/config/GraphProjectConfig';

/**
 * Immutable catalog entry containing a complete graph context.
 *
 * GraphStoreCatalogEntry is a **value record** that packages together all the
 * essential components of a projected graph: the graph data itself, its
 * configuration, and associated result storage. This design ensures that
 * **graph context is never fragmented** across the system.
 *
 * **Design Philosophy:**
 *
 * 1. **Complete Context**: All related graph components in one immutable package
 * 2. **Type Safety**: Strong typing prevents mismatched graph/config combinations
 * 3. **Immutable State**: Thread-safe sharing across concurrent operations
 * 4. **Lifecycle Tracking**: Configuration provides complete projection history
 *
 * **Components:**
 *
 * - **GraphStore**: The actual graph data and algorithms
 * - **GraphProjectConfig**: Complete projection configuration and metadata
 * - **ResultStore**: Associated algorithm results and intermediate data
 *
 * **Use Cases:**
 *
 * - **Catalog Storage**: Primary storage unit in the graph catalog
 * - **Context Passing**: Pass complete graph context between operations
 * - **Lifecycle Management**: Track graph from creation to disposal
 * - **Algorithm Execution**: Provide complete context for algorithm runs
 * - **Result Association**: Link results with their source graphs
 *
 * **Integration Points:**
 * ```typescript
 * // Catalog storage and retrieval
 * catalog.store(graphName, entry);
 * const entry = catalog.get(graphName, request);
 *
 * // Algorithm execution with complete context
 * const result = await algorithm.execute(entry.graphStore, entry.config);
 * entry.resultStore.store(algorithmName, result);
 *
 * // Context-aware operations
 * if (entry.config.readConcurrency > 1) {
 *   // Use parallel processing
 * }
 * ```
 *
 * **Memory Management:**
 * The entry holds references to potentially large graph data structures.
 * Proper lifecycle management is critical for memory efficiency:
 *
 * ```typescript
 * // Explicit cleanup when graph is no longer needed
 * entry.graphStore.release();
 * entry.resultStore.clear();
 * ```
 */
export class GraphStoreCatalogEntry {

  /**
   * The graph store containing the projected graph data and algorithms.
   *
   * The GraphStore is the **core data structure** containing:
   * - **Node data**: All projected nodes with their properties
   * - **Relationship data**: All projected relationships with properties
   * - **Graph algorithms**: Ready-to-execute algorithm implementations
   * - **Indices**: Optimized data structures for fast graph operations
   *
   * **Memory Characteristics:**
   * - Often the largest component in terms of memory usage
   * - Optimized for algorithm execution performance
   * - May include compressed or specialized data formats
   * - Should be released when graph is no longer needed
   *
   * **Thread Safety:**
   * GraphStore implementations are typically thread-safe for read operations
   * but may require coordination for write operations.
   */
  public readonly graphStore: GraphStore;

  /**
   * The configuration used to project this graph.
   *
   * The GraphProjectConfig contains **complete projection metadata**:
   * - **Source configuration**: Database queries, filters, projections
   * - **Processing parameters**: Concurrency, memory limits, optimizations
   * - **Graph schema**: Node labels, relationship types, property mappings
   * - **Creation metadata**: Timestamps, user context, projection method
   *
   * **Use Cases:**
   * - **Algorithm parameterization**: Configure algorithms based on graph properties
   * - **Lifecycle management**: Track graph creation and modification history
   * - **Debugging**: Understand how the graph was created and configured
   * - **Replication**: Recreate identical graphs in different environments
   * - **Optimization**: Adjust future projections based on configuration analysis
   *
   * **Configuration Consistency:**
   * The config must be consistent with the actual GraphStore contents.
   * Mismatches can lead to incorrect algorithm behavior or runtime errors.
   */
  public readonly config: GraphProjectConfig;

  /**
   * The result store for algorithm results associated with this graph.
   *
   * The ResultStore manages **algorithm execution results**:
   * - **Algorithm outputs**: Results from graph algorithms run on this graph
   * - **Intermediate data**: Cached computations and temporary results
   * - **Result metadata**: Execution timestamps, parameters, performance metrics
   * - **Result lifecycle**: Automatic cleanup and memory management
   *
   * **Result Association:**
   * Results are automatically associated with their source graph, enabling:
   * - **Result reuse**: Avoid recomputing expensive algorithm results
   * - **Result composition**: Combine results from multiple algorithms
   * - **Result analysis**: Understand algorithm performance and accuracy
   * - **Result export**: Extract results for external analysis
   *
   * **Memory Management:**
   * ResultStore provides automatic cleanup of old results to prevent
   * memory leaks during long-running graph analysis sessions.
   */
  public readonly resultStore: ResultStore;

  /**
   * Create a new catalog entry with complete graph context.
   *
   * **Immutable Construction**: All components are set at creation time
   * and cannot be modified afterward, ensuring thread safety and
   * preventing accidental modification of shared graph contexts.
   *
   * @param graphStore The graph data and algorithm implementations
   * @param config The configuration used to create this graph
   * @param resultStore The store for algorithm results
   */
  constructor(
    graphStore: GraphStore,
    config: GraphProjectConfig,
    resultStore: ResultStore
  ) {
    this.graphStore = graphStore;
    this.config = config;
    this.resultStore = resultStore;
  }

  /**
   * Get the name of the graph from its configuration.
   *
   * **Convenience accessor** for the graph name, which is frequently
   * needed for logging, UI display, and catalog operations.
   *
   * @returns The graph name from the configuration
   */
  get graphName(): string {
    return this.config.graphName;
  }

  /**
   * Get the username associated with this graph.
   *
   * **User context accessor** for determining graph ownership,
   * access control, and user-specific operations.
   *
   * @returns The username from the configuration
   */
  get username(): string {
    return this.config.username;
  }

  /**
   * Get the creation timestamp of this graph.
   *
   * **Lifecycle tracking** for understanding when the graph was
   * created, useful for cache invalidation and audit trails.
   *
   * @returns The creation timestamp from the configuration
   */
  get creationTime(): Date {
    return this.config.creationTime;
  }

  /**
   * Check if this graph belongs to the specified user.
   *
   * **Ownership check** for access control and user isolation.
   * Used by the catalog to enforce user-specific graph access.
   *
   * @param username Username to check against
   * @returns true if the graph belongs to the specified user
   */
  belongsToUser(username: string): boolean {
    return this.config.username === username;
  }

  /**
   * Get memory usage information for this catalog entry.
   *
   * **Memory analysis** combining usage from all components
   * to provide complete picture of resource consumption.
   *
   * @returns Memory usage breakdown
   */
  getMemoryUsage(): CatalogEntryMemoryUsage {
    return {
      graphStoreBytes: this.graphStore.memoryUsage(),
      resultStoreBytes: this.resultStore.memoryUsage(),
      configBytes: this.estimateConfigMemoryUsage(),
      totalBytes: this.graphStore.memoryUsage() +
                  this.resultStore.memoryUsage() +
                  this.estimateConfigMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of the configuration object.
   *
   * **Configuration memory estimation** for complete memory accounting.
   * Config objects are typically small but may contain large string
   * configurations for complex projections.
   *
   * @returns Estimated config memory usage in bytes
   */
  private estimateConfigMemoryUsage(): number {
    // Rough estimation: JSON string length * 2 (UTF-16) + object overhead
    const jsonString = JSON.stringify(this.config);
    return jsonString.length * 2 + 1024; // 1KB object overhead estimate
  }

  /**
   * Create a summary of this catalog entry for logging and display.
   *
   * **Human-readable summary** with key metrics and context
   * information, useful for monitoring and debugging.
   *
   * @returns Formatted summary string
   */
  toSummaryString(): string {
    const memoryUsage = this.getMemoryUsage();
    const memoryMB = (memoryUsage.totalBytes / 1024 / 1024).toFixed(1);

    return `GraphStoreCatalogEntry{` +
           `graph: '${this.graphName}', ` +
           `user: '${this.username}', ` +
           `nodes: ${this.graphStore.nodeCount().toLocaleString()}, ` +
           `relationships: ${this.graphStore.relationshipCount().toLocaleString()}, ` +
           `memory: ${memoryMB}MB, ` +
           `created: ${this.creationTime.toISOString()}` +
           `}`;
  }

  /**
   * Convert to JSON for serialization and API responses.
   *
   * **Serialization support** for API responses, catalog persistence,
   * and cross-service communication. Note that GraphStore and ResultStore
   * are not directly serializable and require special handling.
   *
   * @returns JSON-serializable representation
   */
  toJSON(): GraphStoreCatalogEntryJSON {
    const memoryUsage = this.getMemoryUsage();

    return {
      graphName: this.graphName,
      username: this.username,
      creationTime: this.creationTime.toISOString(),
      nodeCount: this.graphStore.nodeCount(),
      relationshipCount: this.graphStore.relationshipCount(),
      memoryUsage: memoryUsage,
      config: this.config.toJSON(),
      hasResults: this.resultStore.hasResults()
    };
  }

  /**
   * Release all resources associated with this catalog entry.
   *
   * **Resource cleanup** for proper memory management. This method
   * should be called when the graph is removed from the catalog
   * to prevent memory leaks.
   *
   * **Cleanup operations:**
   * - Release graph store memory and indices
   * - Clear all cached algorithm results
   * - Clean up temporary files and resources
   * - Notify garbage collector of large object release
   */
  release(): void {
    this.graphStore.release();
    this.resultStore.clear();
  }

  /**
   * Create a copy with a different result store.
   *
   * **Context modification** for scenarios where the same graph
   * needs to be used with different result storage contexts.
   *
   * @param newResultStore New result store to use
   * @returns New catalog entry with updated result store
   */
  withResultStore(newResultStore: ResultStore): GraphStoreCatalogEntry {
    return new GraphStoreCatalogEntry(
      this.graphStore,
      this.config,
      newResultStore
    );
  }

  /**
   * Validate that all components are consistent and properly initialized.
   *
   * **Integrity validation** to ensure that the catalog entry represents
   * a valid and consistent graph context.
   *
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.graphStore) {
      throw new Error('GraphStore cannot be null');
    }

    if (!this.config) {
      throw new Error('GraphProjectConfig cannot be null');
    }

    if (!this.resultStore) {
      throw new Error('ResultStore cannot be null');
    }

    // Validate consistency between config and graph store
    if (this.config.graphName !== this.graphStore.graphName()) {
      throw new Error(
        `Graph name mismatch: config='${this.config.graphName}', ` +
        `store='${this.graphStore.graphName()}'`
      );
    }

    // Validate graph store state
    if (this.graphStore.nodeCount() < 0) {
      throw new Error('GraphStore has invalid node count');
    }

    if (this.graphStore.relationshipCount() < 0) {
      throw new Error('GraphStore has invalid relationship count');
    }
  }
}

/**
 * Memory usage breakdown for a catalog entry.
 */
export interface CatalogEntryMemoryUsage {
  readonly graphStoreBytes: number;
  readonly resultStoreBytes: number;
  readonly configBytes: number;
  readonly totalBytes: number;
}

/**
 * JSON representation for API responses.
 */
export interface GraphStoreCatalogEntryJSON {
  readonly graphName: string;
  readonly username: string;
  readonly creationTime: string;
  readonly nodeCount: number;
  readonly relationshipCount: number;
  readonly memoryUsage: CatalogEntryMemoryUsage;
  readonly config: any; // GraphProjectConfig JSON
  readonly hasResults: boolean;
}

/**
 * Type guard for validating JSON structure.
 */
export function isGraphStoreCatalogEntryJSON(obj: any): obj is GraphStoreCatalogEntryJSON {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.graphName === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.creationTime === 'string' &&
    typeof obj.nodeCount === 'number' &&
    typeof obj.relationshipCount === 'number' &&
    typeof obj.memoryUsage === 'object' &&
    typeof obj.config === 'object' &&
    typeof obj.hasResults === 'boolean'
  );
}

// Export namespace for related utilities
export namespace GraphStoreCatalogEntry {
  export type MemoryUsage = CatalogEntryMemoryUsage;
  export type JSON = GraphStoreCatalogEntryJSON;
  export const isJSON = isGraphStoreCatalogEntryJSON;
}
