/**
 * Result of dropping node properties from a graph.
 *
 * GraphDropNodePropertiesResult encapsulates the **outcome of property removal operations**
 * with comprehensive information about what was modified. This immutable result class
 * provides **audit trails** and **operation feedback** for graph management operations.
 *
 * **Key Features:**
 *
 * 1. **Immutable State**: All fields are readonly, ensuring result integrity
 * 2. **Sorted Properties**: Property names are automatically sorted for consistency
 * 3. **Audit Information**: Complete record of what was removed and from where
 * 4. **Operation Metrics**: Quantitative feedback on the scope of changes
 *
 * **Use Cases:**
 *
 * - **Property Cleanup**: Remove unused or temporary node properties
 * - **Memory Optimization**: Free memory by dropping large property arrays
 * - **Schema Evolution**: Remove deprecated properties during schema updates
 * - **Privacy Compliance**: Remove sensitive properties for data governance
 * - **Performance Tuning**: Drop heavy properties that slow down algorithms
 *
 * **Integration Points:**
 * ```typescript
 * // Graph management operations
 * const result = await graphCatalog.dropNodeProperties(graphName, propertyKeys);
 * console.log(`Removed ${result.propertiesRemoved} properties from ${result.graphName}`);
 *
 * // Batch property management
 * const results = await Promise.all(
 *   graphs.map(graph => graphCatalog.dropNodeProperties(graph, deprecatedProps))
 * );
 *
 * // Audit logging
 * auditLogger.logPropertyRemoval(result);
 * ```
 *
 * **Performance Considerations:**
 * - Property list is sorted once during construction for consistent ordering
 * - Immutable design enables safe sharing across threads
 * - Minimal memory footprint with essential information only
 *
 * **Example Usage:**
 * ```typescript
 * const result = new GraphDropNodePropertiesResult(
 *   'socialNetwork',
 *   ['temporaryScore', 'debugInfo', 'oldMetrics'],
 *   150000
 * );
 *
 * console.log(`Graph: ${result.graphName}`);
 * console.log(`Properties removed: ${result.nodeProperties.join(', ')}`);
 * console.log(`Total instances removed: ${result.propertiesRemoved.toLocaleString()}`);
 * ```
 */
export class GraphDropNodePropertiesResult {

  /**
   * Name of the graph from which properties were removed.
   *
   * The graph name provides **context identification** for the operation,
   * enabling proper result attribution in multi-graph environments.
   *
   * **Characteristics:**
   * - Immutable reference to the source graph
   * - Used for audit trails and logging
   * - Enables correlation with other graph operations
   * - Required for result context in management UIs
   */
  public readonly graphName: string;

  /**
   * List of node property keys that were removed, sorted alphabetically.
   *
   * The property list provides **detailed information** about what specific
   * properties were targeted for removal. Properties are automatically
   * sorted to ensure **consistent ordering** across different operations.
   *
   * **Sorting Benefits:**
   * - Consistent result presentation in UIs
   * - Deterministic ordering for testing
   * - Easier comparison between operation results
   * - Predictable audit log formatting
   *
   * **Property Key Characteristics:**
   * - Contains only properties that actually existed and were removed
   * - Empty list if no matching properties were found
   * - Alphabetically sorted for consistency
   * - Deduplicated (no duplicates possible in Set-based removal)
   */
  public readonly nodeProperties: readonly string[];

  /**
   * Total number of property instances removed across all nodes.
   *
   * This metric provides **quantitative feedback** about the scope of the
   * removal operation. The count represents individual property instances,
   * not unique property keys.
   *
   * **Calculation Details:**
   * ```
   * propertiesRemoved = Σ(nodes with property_i) for all removed properties
   * ```
   *
   * **Example Calculation:**
   * ```
   * Graph with 1000 nodes:
   * - 800 nodes have 'score' property → 800 instances
   * - 300 nodes have 'metadata' property → 300 instances
   * - Remove both 'score' and 'metadata' → 1100 total instances removed
   * ```
   *
   * **Use Cases:**
   * - Memory impact assessment
   * - Operation progress reporting
   * - Performance optimization metrics
   * - Billing/usage tracking
   * - Impact analysis for rollback decisions
   */
  public readonly propertiesRemoved: number;

  /**
   * Create a new GraphDropNodePropertiesResult with sorted property list.
   *
   * **Constructor Behavior:**
   * - Automatically sorts property names alphabetically
   * - Creates immutable defensive copies of inputs
   * - Validates input parameters for consistency
   * - Ensures result integrity and thread safety
   *
   * **Property List Processing:**
   * The constructor performs automatic sorting to ensure consistent
   * result presentation regardless of the order in which properties
   * were specified or processed during removal.
   *
   * @param graphName Name of the graph that was modified
   * @param nodeProperties List of property keys that were removed
   * @param propertiesRemoved Total count of property instances removed
   */
  constructor(
    graphName: string,
    nodeProperties: string[],
    propertiesRemoved: number
  ) {
    this.graphName = graphName;

    // Sort and create immutable copy for consistent ordering
    this.nodeProperties = Object.freeze(
      [...nodeProperties].sort()
    );

    this.propertiesRemoved = propertiesRemoved;
  }

  /**
   * Check if any properties were actually removed.
   *
   * **Utility Method** for quickly determining if the operation
   * had any effect on the graph structure.
   *
   * @returns true if at least one property instance was removed
   */
  hasRemovedProperties(): boolean {
    return this.propertiesRemoved > 0;
  }

  /**
   * Check if the operation was a no-op (no changes made).
   *
   * **Utility Method** for identifying operations that didn't
   * modify the graph, useful for optimization and logging.
   *
   * @returns true if no property instances were removed
   */
  isEmpty(): boolean {
    return this.propertiesRemoved === 0;
  }

  /**
   * Get the number of distinct property keys that were removed.
   *
   * **Distinction from propertiesRemoved:**
   * - `propertyKeysRemoved`: Count of unique property names
   * - `propertiesRemoved`: Count of individual property instances
   *
   * @returns Number of unique property keys that were removed
   */
  get propertyKeysRemoved(): number {
    return this.nodeProperties.length;
  }

  /**
   * Calculate average number of property instances per removed key.
   *
   * **Statistical Metric** useful for understanding the distribution
   * of properties across nodes in the graph.
   *
   * @returns Average instances per property key, or 0 if no properties removed
   */
  get averageInstancesPerProperty(): number {
    if (this.propertyKeysRemoved === 0) {
      return 0;
    }
    return this.propertiesRemoved / this.propertyKeysRemoved;
  }

  /**
   * Create a formatted summary string for logging and display.
   *
   * **Human-Readable Summary** suitable for logs, UIs, and reports.
   *
   * @returns Formatted summary of the removal operation
   */
  toSummaryString(): string {
    if (this.isEmpty()) {
      return `No properties removed from graph '${this.graphName}'`;
    }

    const keyCount = this.propertyKeysRemoved;
    const instanceCount = this.propertiesRemoved;
    const avgInstances = this.averageInstancesPerProperty.toFixed(1);

    return `Removed ${keyCount} property key${keyCount !== 1 ? 's' : ''} ` +
           `(${this.nodeProperties.join(', ')}) from graph '${this.graphName}': ` +
           `${instanceCount.toLocaleString()} total instances ` +
           `(avg ${avgInstances} instances per key)`;
  }

  /**
   * Create a detailed report for audit and analysis purposes.
   *
   * **Comprehensive Report** with all available metrics and context.
   *
   * @returns Detailed operation report
   */
  toDetailedReport(): GraphDropNodePropertiesReport {
    return {
      operation: 'DROP_NODE_PROPERTIES',
      timestamp: new Date().toISOString(),
      graphName: this.graphName,
      propertyKeys: [...this.nodeProperties],
      metrics: {
        propertyKeysRemoved: this.propertyKeysRemoved,
        propertyInstancesRemoved: this.propertiesRemoved,
        averageInstancesPerKey: this.averageInstancesPerProperty
      },
      summary: this.toSummaryString()
    };
  }

  /**
   * Convert to JSON for serialization and API responses.
   *
   * **Serialization-Friendly** representation for REST APIs,
   * message queues, and persistence.
   *
   * @returns JSON-serializable object
   */
  toJSON(): GraphDropNodePropertiesResultJSON {
    return {
      graphName: this.graphName,
      nodeProperties: [...this.nodeProperties],
      propertiesRemoved: this.propertiesRemoved,
      propertyKeysRemoved: this.propertyKeysRemoved,
      averageInstancesPerProperty: this.averageInstancesPerProperty,
      isEmpty: this.isEmpty()
    };
  }

  /**
   * Create result from JSON data.
   *
   * **Deserialization Support** for recreating results from
   * stored or transmitted JSON data.
   *
   * @param json JSON representation of the result
   * @returns Reconstructed GraphDropNodePropertiesResult
   */
  static fromJSON(json: GraphDropNodePropertiesResultJSON): GraphDropNodePropertiesResult {
    return new GraphDropNodePropertiesResult(
      json.graphName,
      json.nodeProperties,
      json.propertiesRemoved
    );
  }

  /**
   * Combine multiple results into a single aggregate result.
   *
   * **Batch Operation Support** for combining results from
   * multiple property removal operations.
   *
   * @param results Array of results to combine
   * @param aggregateGraphName Name for the combined result
   * @returns Combined result with aggregated metrics
   */
  static combine(
    results: GraphDropNodePropertiesResult[],
    aggregateGraphName: string = 'multiple-graphs'
  ): GraphDropNodePropertiesResult {
    if (results.length === 0) {
      return new GraphDropNodePropertiesResult(aggregateGraphName, [], 0);
    }

    // Collect all unique property names
    const allProperties = new Set<string>();
    let totalInstancesRemoved = 0;

    results.forEach(result => {
      result.nodeProperties.forEach(prop => allProperties.add(prop));
      totalInstancesRemoved += result.propertiesRemoved;
    });

    return new GraphDropNodePropertiesResult(
      aggregateGraphName,
      Array.from(allProperties),
      totalInstancesRemoved
    );
  }

  /**
   * Create an empty result for operations that found no matching properties.
   *
   * **Factory Method** for creating consistent empty results.
   *
   * @param graphName Name of the graph that was checked
   * @returns Empty result indicating no properties were removed
   */
  static empty(graphName: string): GraphDropNodePropertiesResult {
    return new GraphDropNodePropertiesResult(graphName, [], 0);
  }

  /**
   * Validate that the result data is consistent and logical.
   *
   * **Data Integrity Check** to ensure the result represents
   * a valid and consistent operation outcome.
   *
   * @throws Error if the result data is inconsistent
   */
  validate(): void {
    if (this.propertiesRemoved < 0) {
      throw new Error('Properties removed count cannot be negative');
    }

    if (this.propertyKeysRemoved === 0 && this.propertiesRemoved > 0) {
      throw new Error('Cannot have removed property instances without removed property keys');
    }

    if (this.propertyKeysRemoved > 0 && this.propertiesRemoved === 0) {
      throw new Error('Cannot have removed property keys without removed property instances');
    }

    if (!this.graphName || this.graphName.trim().length === 0) {
      throw new Error('Graph name cannot be empty');
    }

    // Check for duplicate property names (should not happen due to Set-based removal)
    const uniqueProperties = new Set(this.nodeProperties);
    if (uniqueProperties.size !== this.nodeProperties.length) {
      throw new Error('Property list contains duplicates');
    }

    // Verify sorting
    const sortedProperties = [...this.nodeProperties].sort();
    if (!this.nodeProperties.every((prop, index) => prop === sortedProperties[index])) {
      throw new Error('Property list is not properly sorted');
    }
  }
}

/**
 * Detailed report interface for comprehensive analysis.
 */
export interface GraphDropNodePropertiesReport {
  readonly operation: 'DROP_NODE_PROPERTIES';
  readonly timestamp: string;
  readonly graphName: string;
  readonly propertyKeys: string[];
  readonly metrics: {
    readonly propertyKeysRemoved: number;
    readonly propertyInstancesRemoved: number;
    readonly averageInstancesPerKey: number;
  };
  readonly summary: string;
}

/**
 * JSON representation for serialization.
 */
export interface GraphDropNodePropertiesResultJSON {
  readonly graphName: string;
  readonly nodeProperties: string[];
  readonly propertiesRemoved: number;
  readonly propertyKeysRemoved: number;
  readonly averageInstancesPerProperty: number;
  readonly isEmpty: boolean;
}

/**
 * Type guard to check if an object is a valid result JSON.
 */
export function isGraphDropNodePropertiesResultJSON(
  obj: any
): obj is GraphDropNodePropertiesResultJSON {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.graphName === 'string' &&
    Array.isArray(obj.nodeProperties) &&
    obj.nodeProperties.every((prop: any) => typeof prop === 'string') &&
    typeof obj.propertiesRemoved === 'number' &&
    typeof obj.propertyKeysRemoved === 'number' &&
    typeof obj.averageInstancesPerProperty === 'number' &&
    typeof obj.isEmpty === 'boolean'
  );
}

// Export namespace for related utilities
export namespace GraphDropNodePropertiesResult {
  export type Report = GraphDropNodePropertiesReport;
  export type JSON = GraphDropNodePropertiesResultJSON;
  export const isJSON = isGraphDropNodePropertiesResultJSON;
}
