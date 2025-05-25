import { GraphProjectConfig } from '@/config';

/**
 * Base result class for graph projection operations.
 *
 * GraphProjectResult serves as the **foundational result structure** for all graph
 * projection operations in the GDS system. This abstract base class provides
 * **core metrics** and **builder pattern support** for creating consistent
 * result objects across different projection types.
 *
 * **Design Philosophy:**
 *
 * 1. **Inheritance-Based Extensibility**: Abstract base for specialized result types
 * 2. **Public Field API**: Direct field access for UI rendering and JSON serialization
 * 3. **Builder Pattern**: Fluent API for constructing complex result objects
 * 4. **Core Metrics**: Essential graph statistics that all projections share
 *
 * **Key Metrics:**
 *
 * - **Graph Identity**: Name and configuration context
 * - **Scale Metrics**: Node and relationship counts for capacity planning
 * - **Performance Metrics**: Projection timing for optimization analysis
 *
 * **Inheritance Hierarchy:**
 * ```
 * GraphProjectResult (abstract base)
 * ├── NativeProjectResult (native graph projections)
 * ├── CypherProjectResult (Cypher-based projections)
 * ├── SubgraphProjectResult (filtered projections)
 * ├── StreamingProjectResult (streaming projections)
 * └── CatalogProjectResult (catalog operations)
 * ```
 *
 * **Public Fields Design:**
 * The public fields design is intentional for **UI integration** and **API responses**.
 * While not ideal from an OOP perspective, it enables:
 * - Direct JSON serialization without getters
 * - Easy UI binding in frontend frameworks
 * - Minimal reflection overhead in serialization
 * - Consistent API response format
 *
 * **Usage Patterns:**
 * ```typescript
 * // Direct field access for UI rendering
 * console.log(`Graph '${result.graphName}' created with ${result.nodeCount} nodes`);
 *
 * // JSON serialization (automatic)
 * const json = JSON.stringify(result);
 *
 * // Builder pattern for construction
 * const result = new ConcreteProjectResult.Builder(config)
 *   .withNodeCount(1000000)
 *   .withRelationshipCount(5000000)
 *   .withProjectMillis(15000)
 *   .build();
 * ```
 *
 * **Performance Characteristics:**
 * - **Memory**: Minimal overhead with direct field storage
 * - **Serialization**: Zero-reflection JSON conversion
 * - **Access**: O(1) field access with no method call overhead
 * - **Construction**: Fluent builder with validation support
 *
 * **Integration Points:**
 * - UI dashboards and monitoring systems
 * - REST API responses and GraphQL resolvers
 * - Audit logging and operational metrics
 * - Performance analysis and capacity planning
 * - Graph catalog management operations
 */
export abstract class GraphProjectResult {

  /**
   * Name of the projected graph.
   *
   * The graph name serves as the **primary identifier** for the projected graph
   * within the graph catalog. This name is used for:
   *
   * - **Catalog Operations**: Referencing the graph in subsequent operations
   * - **UI Display**: Human-readable identifier in dashboards and reports
   * - **Audit Trails**: Tracking operations across the graph lifecycle
   * - **Multi-tenancy**: Namespace isolation in shared environments
   *
   * **Naming Constraints:**
   * - Must be unique within the graph catalog namespace
   * - Should follow naming conventions for consistency
   * - Case-sensitive and must be valid identifier
   * - Length limits may apply based on storage backend
   *
   * **Example Values:**
   * ```
   * 'socialNetwork'           // Simple identifier
   * 'user_interaction_graph'  // Descriptive with underscores
   * 'recommendation_v2'       // Versioned graph name
   * 'temp_analysis_20241124'  // Temporary with timestamp
   * ```
   */
  public readonly graphName: string;

  /**
   * Total number of nodes in the projected graph.
   *
   * The node count represents the **total vertex count** after all filtering,
   * aggregation, and projection logic has been applied. This metric is
   * essential for:
   *
   * - **Capacity Planning**: Memory and storage requirements estimation
   * - **Algorithm Selection**: Different algorithms have different node count thresholds
   * - **Performance Prediction**: Many algorithms scale with O(n) or O(n²) complexity
   * - **Billing and Usage**: Resource consumption tracking in cloud environments
   *
   * **Calculation Notes:**
   * ```
   * nodeCount = |V| where V is the set of vertices in the projected graph
   * ```
   *
   * **Scale Categories:**
   * ```
   * Small:    nodeCount < 100K        // Interactive analysis
   * Medium:   100K ≤ nodeCount < 10M  // Batch processing
   * Large:    10M ≤ nodeCount < 1B    // Distributed algorithms
   * Massive:  nodeCount ≥ 1B          // Specialized infrastructure
   * ```
   *
   * **Performance Impact:**
   * - **Memory Usage**: ~32-64 bytes per node for basic storage
   * - **Index Size**: Additional overhead for property indices
   * - **Algorithm Runtime**: Major factor in complexity analysis
   * - **Serialization**: Linear impact on result size
   */
  public readonly nodeCount: number;

  /**
   * Total number of relationships in the projected graph.
   *
   * The relationship count represents the **total edge count** after projection,
   * including any relationship aggregation, filtering, or transformation that
   * was applied during the projection process.
   *
   * **Relationship Counting Details:**
   * ```
   * relationshipCount = |E| where E is the set of edges in the projected graph
   * ```
   *
   * **Projection Effects on Count:**
   * - **Filtering**: May reduce count by excluding certain relationship types
   * - **Aggregation**: May reduce count by merging parallel relationships
   * - **Expansion**: May increase count by materializing implicit relationships
   * - **Direction**: Undirected projections may double the effective count
   *
   * **Density Analysis:**
   * ```typescript
   * // Graph density calculation
   * const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2; // undirected
   * const density = relationshipCount / maxPossibleEdges;
   *
   * // Density categories
   * if (density < 0.01) return 'Sparse';      // < 1% of possible edges
   * if (density < 0.1) return 'Medium';       // 1-10% of possible edges
   * return 'Dense';                           // > 10% of possible edges
   * ```
   *
   * **Performance Implications:**
   * - **Memory Usage**: ~16-32 bytes per relationship for basic storage
   * - **Traversal Speed**: Higher density = slower traversals but richer connectivity
   * - **Algorithm Choice**: Dense graphs favor matrix-based algorithms
   * - **Storage Format**: Sparse vs dense representation optimization
   *
   * **Scale Impact:**
   * ```
   * Low Degree:     relationshipCount ≈ nodeCount          // Tree-like
   * Medium Degree:  relationshipCount ≈ 5 × nodeCount      // Social networks
   * High Degree:    relationshipCount ≈ 50 × nodeCount     // Dense networks
   * Massive Scale:  relationshipCount > 100 × nodeCount    // Knowledge graphs
   * ```
   */
  public readonly relationshipCount: number;

  /**
   * Time taken to complete the graph projection in milliseconds.
   *
   * The projection time captures the **total wall-clock time** from projection
   * initiation to completion, including all phases of the projection pipeline.
   * This metric is crucial for:
   *
   * - **Performance Monitoring**: Tracking projection performance over time
   * - **Capacity Planning**: Estimating resources needed for similar projections
   * - **Optimization**: Identifying bottlenecks and improvement opportunities
   * - **SLA Compliance**: Meeting performance requirements in production
   *
   * **Timing Scope:**
   * ```
   * projectMillis includes:
   * ├── Configuration validation and parsing
   * ├── Source data scanning and analysis
   * ├── Memory allocation and initialization
   * ├── Node loading and property processing
   * ├── Relationship loading and processing
   * ├── Index creation and optimization
   * ├── Validation and consistency checks
   * └── Catalog registration and finalization
   * ```
   *
   * **Performance Benchmarks:**
   * ```
   * Fast:      < 1 second       // Small graphs, simple projections
   * Good:      1-10 seconds     // Medium graphs, standard projections
   * Moderate:  10-60 seconds    // Large graphs, complex projections
   * Slow:      1-10 minutes     // Massive graphs, heavy processing
   * Critical:  > 10 minutes     // Requires optimization or scaling
   * ```
   *
   * **Optimization Insights:**
   * ```typescript
   * // Performance analysis
   * const nodesPerSecond = nodeCount / (projectMillis / 1000);
   * const relationshipsPerSecond = relationshipCount / (projectMillis / 1000);
   *
   * // Bottleneck identification
   * const nodeLoadingRate = 50000; // nodes/sec baseline
   * const relationshipLoadingRate = 200000; // relationships/sec baseline
   *
   * if (nodesPerSecond < nodeLoadingRate) {
   *   console.log('Node loading bottleneck detected');
   * }
   * if (relationshipsPerSecond < relationshipLoadingRate) {
   *   console.log('Relationship loading bottleneck detected');
   * }
   * ```
   */
  public readonly projectMillis: number;

  /**
   * Create a new GraphProjectResult with core projection metrics.
   *
   * **Protected Constructor**: This constructor is protected to enforce
   * the use of the builder pattern and ensure proper inheritance structure.
   * Concrete subclasses should provide their own builders.
   *
   * @param graphName Name of the projected graph
   * @param nodeCount Total number of nodes in the graph
   * @param relationshipCount Total number of relationships in the graph
   * @param projectMillis Time taken for projection in milliseconds
   */
  protected constructor(
    graphName: string,
    nodeCount: number,
    relationshipCount: number,
    projectMillis: number
  ) {
    this.graphName = graphName;
    this.nodeCount = nodeCount;
    this.relationshipCount = relationshipCount;
    this.projectMillis = projectMillis;
  }

  /**
   * Calculate the average degree of nodes in the graph.
   *
   * **Graph Theory Metric** representing the average number of relationships
   * per node, useful for understanding graph connectivity characteristics.
   *
   * @returns Average degree, or 0 if no nodes
   */
  get averageDegree(): number {
    return this.nodeCount === 0 ? 0 : (this.relationshipCount * 2) / this.nodeCount;
  }

  /**
   * Calculate the graph density as a percentage.
   *
   * **Density Analysis** showing how connected the graph is relative
   * to a complete graph with the same number of nodes.
   *
   * @returns Density percentage (0-100)
   */
  get densityPercentage(): number {
    if (this.nodeCount < 2) return 0;
    const maxPossibleEdges = this.nodeCount * (this.nodeCount - 1) / 2;
    return (this.relationshipCount / maxPossibleEdges) * 100;
  }

  /**
   * Get projection throughput in nodes per second.
   *
   * **Performance Metric** for comparing projection efficiency
   * across different configurations and data sizes.
   *
   * @returns Nodes processed per second
   */
  get nodeProjectionThroughput(): number {
    return this.projectMillis === 0 ? 0 : this.nodeCount / (this.projectMillis / 1000);
  }

  /**
   * Get projection throughput in relationships per second.
   *
   * **Performance Metric** for analyzing relationship processing
   * efficiency during projection operations.
   *
   * @returns Relationships processed per second
   */
  get relationshipProjectionThroughput(): number {
    return this.projectMillis === 0 ? 0 : this.relationshipCount / (this.projectMillis / 1000);
  }

  /**
   * Categorize the graph size for operational planning.
   *
   * **Scale Classification** to help with algorithm selection
   * and resource planning decisions.
   *
   * @returns Scale category
   */
  get scaleCategory(): GraphScale {
    if (this.nodeCount < 100_000) return 'Small';
    if (this.nodeCount < 10_000_000) return 'Medium';
    if (this.nodeCount < 1_000_000_000) return 'Large';
    return 'Massive';
  }

  /**
   * Categorize the graph density for algorithm selection.
   *
   * **Density Classification** to guide algorithm choice
   * and optimization strategies.
   *
   * @returns Density category
   */
  get densityCategory(): GraphDensity {
    const density = this.densityPercentage;
    if (density < 1) return 'Sparse';
    if (density < 10) return 'Medium';
    return 'Dense';
  }

  /**
   * Create a summary string for logging and display.
   *
   * **Human-Readable Summary** with key metrics formatted
   * for quick consumption in logs and UIs.
   *
   * @returns Formatted summary string
   */
  toSummaryString(): string {
    const duration = this.projectMillis < 1000
      ? `${this.projectMillis}ms`
      : `${(this.projectMillis / 1000).toFixed(1)}s`;

    return `Graph '${this.graphName}': ${this.nodeCount.toLocaleString()} nodes, ` +
           `${this.relationshipCount.toLocaleString()} relationships ` +
           `(${this.scaleCategory} ${this.densityCategory}, projected in ${duration})`;
  }

  /**
   * Convert to JSON for API responses and serialization.
   *
   * **API-Ready JSON** with computed metrics included
   * for comprehensive result representation.
   *
   * @returns JSON-serializable object
   */
  toJSON(): GraphProjectResultJSON {
    return {
      graphName: this.graphName,
      nodeCount: this.nodeCount,
      relationshipCount: this.relationshipCount,
      projectMillis: this.projectMillis,
      averageDegree: this.averageDegree,
      densityPercentage: this.densityPercentage,
      nodeProjectionThroughput: this.nodeProjectionThroughput,
      relationshipProjectionThroughput: this.relationshipProjectionThroughput,
      scaleCategory: this.scaleCategory,
      densityCategory: this.densityCategory
    };
  }

  /**
   * Abstract builder class for fluent result construction.
   *
   * The Builder pattern provides **type-safe construction** with **fluent API**
   * while supporting **inheritance** for specialized result types. Each concrete
   * result class should extend this builder with additional configuration options.
   *
   * **Design Benefits:**
   * - **Type Safety**: Generic typing ensures correct result type
   * - **Fluent API**: Method chaining for readable construction
   * - **Extensibility**: Subclasses can add specialized configuration
   * - **Validation**: Centralized validation in build() method
   *
   * **Usage Pattern:**
   * ```typescript
   * const result = new ConcreteProjectResult.Builder(config)
   *   .withNodeCount(1000000)
   *   .withRelationshipCount(5000000)
   *   .withProjectMillis(15000)
   *   .build();
   * ```
   */
  public abstract static class Builder<T extends GraphProjectResult> {
    protected readonly graphName: string;
    protected nodeCount: number = 0;
    protected relationshipCount: number = 0;
    protected projectMillis: number = 0;

    /**
     * Create a new builder with graph configuration.
     *
     * **Configuration-Based Initialization** ensures that the graph name
     * and other essential configuration is properly set from the start.
     *
     * @param config Graph projection configuration
     */
    protected constructor(config: GraphProjectConfig) {
      this.graphName = config.graphName;
    }

    /**
     * Set the number of nodes in the projected graph.
     *
     * **Fluent API Method** for specifying the node count with
     * method chaining support and type safety.
     *
     * @param nodeCount Total number of nodes
     * @returns Builder instance for chaining
     */
    withNodeCount(nodeCount: number): this {
      this.nodeCount = nodeCount;
      return this;
    }

    /**
     * Set the number of relationships in the projected graph.
     *
     * **Fluent API Method** for specifying the relationship count
     * with validation and type safety.
     *
     * @param relationshipCount Total number of relationships
     * @returns Builder instance for chaining
     */
    withRelationshipCount(relationshipCount: number): this {
      this.relationshipCount = relationshipCount;
      return this;
    }

    /**
     * Set the projection time in milliseconds.
     *
     * **Performance Metric Setting** for recording the total
     * time taken for the projection operation.
     *
     * @param projectMillis Projection time in milliseconds
     */
    withProjectMillis(projectMillis: number): void {
      this.projectMillis = projectMillis;
    }

    /**
     * Validate builder state before construction.
     *
     * **Pre-Construction Validation** to ensure all required
     * fields are set and values are logically consistent.
     *
     * @throws Error if validation fails
     */
    protected validate(): void {
      if (!this.graphName || this.graphName.trim().length === 0) {
        throw new Error('Graph name cannot be empty');
      }

      if (this.nodeCount < 0) {
        throw new Error('Node count cannot be negative');
      }

      if (this.relationshipCount < 0) {
        throw new Error('Relationship count cannot be negative');
      }

      if (this.projectMillis < 0) {
        throw new Error('Project time cannot be negative');
      }

      // Logical validation: relationships require nodes (except empty graphs)
      if (this.relationshipCount > 0 && this.nodeCount === 0) {
        throw new Error('Cannot have relationships without nodes');
      }
    }

    /**
     * Build the concrete result instance.
     *
     * **Abstract Factory Method** that must be implemented by concrete
     * builders to create the appropriate result type with validation.
     *
     * @returns Constructed result instance
     */
    abstract build(): T;
  }
}

/**
 * Graph scale categories for operational planning.
 */
export type GraphScale = 'Small' | 'Medium' | 'Large' | 'Massive';

/**
 * Graph density categories for algorithm selection.
 */
export type GraphDensity = 'Sparse' | 'Medium' | 'Dense';

/**
 * JSON representation for API responses.
 */
export interface GraphProjectResultJSON {
  readonly graphName: string;
  readonly nodeCount: number;
  readonly relationshipCount: number;
  readonly projectMillis: number;
  readonly averageDegree: number;
  readonly densityPercentage: number;
  readonly nodeProjectionThroughput: number;
  readonly relationshipProjectionThroughput: number;
  readonly scaleCategory: GraphScale;
  readonly densityCategory: GraphDensity;
}

/**
 * Type guard for validating JSON structure.
 */
export function isGraphProjectResultJSON(obj: any): obj is GraphProjectResultJSON {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.graphName === 'string' &&
    typeof obj.nodeCount === 'number' &&
    typeof obj.relationshipCount === 'number' &&
    typeof obj.projectMillis === 'number' &&
    typeof obj.averageDegree === 'number' &&
    typeof obj.densityPercentage === 'number' &&
    typeof obj.nodeProjectionThroughput === 'number' &&
    typeof obj.relationshipProjectionThroughput === 'number' &&
    ['Small', 'Medium', 'Large', 'Massive'].includes(obj.scaleCategory) &&
    ['Sparse', 'Medium', 'Dense'].includes(obj.densityCategory)
  );
}

// Export namespace for related utilities
export namespace GraphProjectResult {
  export type Scale = GraphScale;
  export type Density = GraphDensity;
  export type JSON = GraphProjectResultJSON;
  export const isJSON = isGraphProjectResultJSON;
}
