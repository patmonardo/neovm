/**
 * Result of dropping relationships from a graph.
 *
 * GraphDropRelationshipResult encapsulates the **outcome of relationship removal operations**
 * with detailed metrics about relationships and properties that were deleted. This immutable
 * result class provides **comprehensive audit information** for relationship management operations.
 *
 * **Key Features:**
 *
 * 1. **Relationship-Centric**: Focuses on relationship type and associated data removal
 * 2. **Property Tracking**: Detailed breakdown of property deletions by property key
 * 3. **Immutable State**: All fields are readonly for thread safety and data integrity
 * 4. **Comprehensive Metrics**: Both relationship and property-level deletion statistics
 *
 * **Use Cases:**
 *
 * - **Relationship Type Removal**: Delete entire relationship types from graphs
 * - **Schema Evolution**: Remove deprecated relationship types during schema updates
 * - **Data Cleanup**: Clean up invalid or temporary relationships
 * - **Privacy Compliance**: Remove relationships containing sensitive data
 * - **Graph Optimization**: Remove unnecessary relationships to improve performance
 *
 * **Operation Scope:**
 * Unlike node property removal which targets properties across nodes, relationship
 * removal operates on **entire relationship instances** and their associated properties.
 * This can have significant impact on graph structure and connectivity.
 *
 * **Performance Impact:**
 * Relationship removal can dramatically affect graph algorithms since it changes
 * the fundamental graph topology. Consider impact on:
 * - Path-finding algorithms
 * - Centrality calculations
 * - Community detection
 * - Recommendation systems
 *
 * **Integration Points:**
 * ```typescript
 * // Single relationship type removal
 * const result = await graphCatalog.dropRelationshipType(graphName, 'TEMP_CONNECTION');
 * console.log(`Removed ${result.deletedRelationships} relationships of type ${result.relationshipType}`);
 *
 * // Batch relationship management
 * const results = await Promise.all(
 *   deprecatedTypes.map(type => graphCatalog.dropRelationshipType(graph, type))
 * );
 *
 * // Audit and monitoring
 * relationshipAuditLogger.logDeletion(result);
 * ```
 *
 * **Example Usage:**
 * ```typescript
 * const deletionResult = new DeletionResult(15000, { weight: 15000, timestamp: 12000 });
 * const result = new GraphDropRelationshipResult(
 *   'socialNetwork',
 *   'TEMPORARY_LINK',
 *   deletionResult
 * );
 *
 * console.log(`Graph: ${result.graphName}`);
 * console.log(`Relationship Type: ${result.relationshipType}`);
 * console.log(`Relationships Deleted: ${result.deletedRelationships.toLocaleString()}`);
 * console.log(`Properties Deleted: ${Object.keys(result.deletedProperties).length} types`);
 * ```
 */
export class GraphDropRelationshipResult {

  /**
   * Name of the graph from which relationships were removed.
   *
   * The graph name provides **context identification** for the operation,
   * enabling proper result attribution in multi-graph environments.
   *
   * **Characteristics:**
   * - Immutable reference to the source graph
   * - Used for audit trails and operation correlation
   * - Essential for multi-tenant graph management
   * - Required for rollback and recovery operations
   */
  public readonly graphName: string;

  /**
   * Type of relationships that were targeted for removal.
   *
   * The relationship type specifies **which relationship type** was targeted
   * for deletion. This is a key identifier for understanding the scope and
   * impact of the removal operation.
   *
   * **Relationship Type Characteristics:**
   * - Represents the Neo4j relationship type (e.g., 'FOLLOWS', 'LIKES', 'CONNECTS')
   * - All relationships of this type were candidates for removal
   * - May include pattern matching (e.g., 'TEMP_*' for temporary relationships)
   * - Critical for understanding graph topology changes
   *
   * **Impact Analysis:**
   * Different relationship types have different impacts:
   * - **Core types** (FOLLOWS, FRIENDS): Major topology changes
   * - **Metadata types** (TAGGED, CATEGORIZED): Minimal topology impact
   * - **Temporary types** (TEMP_*, DEBUG_*): Cleanup operations
   * - **Analytics types** (SIMILAR, RECOMMENDED): Algorithm-specific
   */
  public readonly relationshipType: string;

  /**
   * Total number of relationship instances that were deleted.
   *
   * This metric provides **quantitative feedback** about the scope of the
   * relationship removal operation. Each count represents a complete
   * relationship instance removed from the graph.
   *
   * **Counting Details:**
   * ```
   * deletedRelationships = Number of (source)-[relationshipType]->(target) instances removed
   * ```
   *
   * **Impact Calculation:**
   * ```typescript
   * // Connectivity impact
   * const connectivityLoss = deletedRelationships / totalRelationshipsBeforeOperation;
   *
   * // Node isolation risk
   * const potentialIsolatedNodes = deletedRelationships * 2; // source + target
   *
   * // Algorithm impact
   * const pathLengthIncrease = estimatePathLengthIncrease(deletedRelationships);
   * ```
   *
   * **Use Cases:**
   * - Performance impact assessment
   * - Rollback decision making
   * - Connectivity analysis
   * - Graph health monitoring
   * - Billing and usage tracking
   */
  public readonly deletedRelationships: number;

  /**
   * Breakdown of deleted properties by property key with instance counts.
   *
   * This detailed mapping shows **exactly which properties were removed**
   * and **how many instances of each property** were deleted. The map
   * provides granular insight into the data impact of the operation.
   *
   * **Map Structure:**
   * ```typescript
   * {
   *   'weight': 15000,      // 15,000 relationships had weight property
   *   'timestamp': 14800,   // 14,800 relationships had timestamp property
   *   'metadata': 3200,     // 3,200 relationships had metadata property
   *   'tags': 500          // 500 relationships had tags property
   * }
   * ```
   *
   * **Property Coverage Analysis:**
   * ```typescript
   * // Calculate property coverage for each property
   * Object.entries(deletedProperties).forEach(([prop, count]) => {
   *   const coverage = (count / deletedRelationships) * 100;
   *   console.log(`${prop}: ${coverage.toFixed(1)}% coverage`);
   * });
   * ```
   *
   * **Data Impact Assessment:**
   * - **High coverage properties** (>80%): Core relationship data
   * - **Medium coverage properties** (20-80%): Contextual information
   * - **Low coverage properties** (<20%): Sparse or optional metadata
   *
   * **Use Cases:**
   * - Data governance and compliance reporting
   * - Storage impact analysis
   * - Property usage pattern analysis
   * - Recovery planning and data reconstruction
   * - Schema optimization decisions
   */
  public readonly deletedProperties: ReadonlyMap<string, number>;

  /**
   * Create a new GraphDropRelationshipResult from deletion operation results.
   *
   * **Constructor Design:**
   * - Accepts DeletionResult for consistent data packaging
   * - Creates immutable defensive copies of all inputs
   * - Validates input consistency and completeness
   * - Ensures thread safety and result integrity
   *
   * **DeletionResult Integration:**
   * The constructor uses DeletionResult to ensure consistent packaging
   * of deletion metrics from the underlying deletion operation.
   *
   * @param graphName Name of the graph that was modified
   * @param relationshipType Type of relationships that were targeted
   * @param deletionResult Detailed results from the deletion operation
   */
  constructor(
    graphName: string,
    relationshipType: string,
    deletionResult: DeletionResult
  ) {
    this.graphName = graphName;
    this.relationshipType = relationshipType;
    this.deletedRelationships = deletionResult.deletedRelationships;

    // Create immutable defensive copy of the properties map
    this.deletedProperties = Object.freeze(
      new Map(Object.entries(deletionResult.deletedProperties))
    );
  }

  /**
   * Check if any relationships were actually deleted.
   *
   * **Utility Method** for quickly determining if the operation
   * had any effect on the graph structure.
   *
   * @returns true if at least one relationship was deleted
   */
  hasDeletedRelationships(): boolean {
    return this.deletedRelationships > 0;
  }

  /**
   * Check if the operation was a no-op (no changes made).
   *
   * **Utility Method** for identifying operations that didn't
   * modify the graph, useful for optimization and logging.
   *
   * @returns true if no relationships were deleted
   */
  isEmpty(): boolean {
    return this.deletedRelationships === 0;
  }

  /**
   * Get the number of distinct property keys that were removed.
   *
   * **Distinction from property instance counts:**
   * - `propertyKeysDeleted`: Count of unique property names
   * - `deletedProperties.values()`: Count of individual property instances
   *
   * @returns Number of unique property keys that were removed
   */
  get propertyKeysDeleted(): number {
    return this.deletedProperties.size;
  }

  /**
   * Get total number of property instances deleted across all keys.
   *
   * **Aggregate Calculation** summing all property instance counts
   * to provide total data impact measurement.
   *
   * @returns Total property instances deleted
   */
  get totalPropertyInstancesDeleted(): number {
    return Array.from(this.deletedProperties.values()).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Calculate average number of properties per deleted relationship.
   *
   * **Property Density Metric** useful for understanding the
   * data richness of the deleted relationships.
   *
   * @returns Average properties per relationship, or 0 if no relationships deleted
   */
  get averagePropertiesPerRelationship(): number {
    if (this.deletedRelationships === 0) {
      return 0;
    }
    return this.totalPropertyInstancesDeleted / this.deletedRelationships;
  }

  /**
   * Get property coverage analysis for each property key.
   *
   * **Coverage Analysis** showing what percentage of deleted relationships
   * had each property, useful for understanding property distribution.
   *
   * @returns Map of property keys to coverage percentages
   */
  getPropertyCoverage(): ReadonlyMap<string, number> {
    if (this.deletedRelationships === 0) {
      return new Map();
    }

    const coverage = new Map<string, number>();
    this.deletedProperties.forEach((count, property) => {
      coverage.set(property, (count / this.deletedRelationships) * 100);
    });

    return Object.freeze(coverage);
  }

  /**
   * Create a formatted summary string for logging and display.
   *
   * **Human-Readable Summary** suitable for logs, UIs, and reports.
   *
   * @returns Formatted summary of the relationship deletion operation
   */
  toSummaryString(): string {
    if (this.isEmpty()) {
      return `No relationships of type '${this.relationshipType}' removed from graph '${this.graphName}'`;
    }

    const relCount = this.deletedRelationships;
    const propKeys = this.propertyKeysDeleted;
    const propInstances = this.totalPropertyInstancesDeleted;
    const avgProps = this.averagePropertiesPerRelationship.toFixed(1);

    return `Removed ${relCount.toLocaleString()} '${this.relationshipType}' relationships ` +
           `from graph '${this.graphName}' with ${propKeys} property types ` +
           `(${propInstances.toLocaleString()} total instances, avg ${avgProps} props/rel)`;
  }

  /**
   * Create a detailed report for comprehensive analysis.
   *
   * **Comprehensive Report** with all available metrics, coverage analysis,
   * and operational context for audit and decision-making purposes.
   *
   * @returns Detailed operation report
   */
  toDetailedReport(): GraphDropRelationshipReport {
    const propertyCoverage: Record<string, number> = {};
    this.getPropertyCoverage().forEach((coverage, property) => {
      propertyCoverage[property] = coverage;
    });

    return {
      operation: 'DROP_RELATIONSHIPS',
      timestamp: new Date().toISOString(),
      graphName: this.graphName,
      relationshipType: this.relationshipType,
      metrics: {
        relationshipsDeleted: this.deletedRelationships,
        propertyKeysDeleted: this.propertyKeysDeleted,
        propertyInstancesDeleted: this.totalPropertyInstancesDeleted,
        averagePropertiesPerRelationship: this.averagePropertiesPerRelationship
      },
      propertyBreakdown: Object.fromEntries(this.deletedProperties),
      propertyCoverage,
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
  toJSON(): GraphDropRelationshipResultJSON {
    return {
      graphName: this.graphName,
      relationshipType: this.relationshipType,
      deletedRelationships: this.deletedRelationships,
      deletedProperties: Object.fromEntries(this.deletedProperties),
      propertyKeysDeleted: this.propertyKeysDeleted,
      totalPropertyInstancesDeleted: this.totalPropertyInstancesDeleted,
      averagePropertiesPerRelationship: this.averagePropertiesPerRelationship,
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
   * @returns Reconstructed GraphDropRelationshipResult
   */
  static fromJSON(json: GraphDropRelationshipResultJSON): GraphDropRelationshipResult {
    const deletionResult = new DeletionResult(
      json.deletedRelationships,
      json.deletedProperties
    );

    return new GraphDropRelationshipResult(
      json.graphName,
      json.relationshipType,
      deletionResult
    );
  }

  /**
   * Combine multiple results into a single aggregate result.
   *
   * **Batch Operation Support** for combining results from
   * multiple relationship deletion operations.
   *
   * @param results Array of results to combine
   * @param aggregateGraphName Name for the combined result
   * @param aggregateRelationshipType Type for the combined result
   * @returns Combined result with aggregated metrics
   */
  static combine(
    results: GraphDropRelationshipResult[],
    aggregateGraphName: string = 'multiple-graphs',
    aggregateRelationshipType: string = 'multiple-types'
  ): GraphDropRelationshipResult {
    if (results.length === 0) {
      return new GraphDropRelationshipResult(
        aggregateGraphName,
        aggregateRelationshipType,
        new DeletionResult(0, {})
      );
    }

    // Aggregate relationship counts
    let totalRelationshipsDeleted = 0;
    const aggregatedProperties = new Map<string, number>();

    results.forEach(result => {
      totalRelationshipsDeleted += result.deletedRelationships;

      result.deletedProperties.forEach((count, property) => {
        aggregatedProperties.set(
          property,
          (aggregatedProperties.get(property) || 0) + count
        );
      });
    });

    const deletionResult = new DeletionResult(
      totalRelationshipsDeleted,
      Object.fromEntries(aggregatedProperties)
    );

    return new GraphDropRelationshipResult(
      aggregateGraphName,
      aggregateRelationshipType,
      deletionResult
    );
  }

  /**
   * Create an empty result for operations that found no matching relationships.
   *
   * **Factory Method** for creating consistent empty results.
   *
   * @param graphName Name of the graph that was checked
   * @param relationshipType Type of relationships that were targeted
   * @returns Empty result indicating no relationships were removed
   */
  static empty(graphName: string, relationshipType: string): GraphDropRelationshipResult {
    return new GraphDropRelationshipResult(
      graphName,
      relationshipType,
      new DeletionResult(0, {})
    );
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
    if (this.deletedRelationships < 0) {
      throw new Error('Deleted relationships count cannot be negative');
    }

    if (!this.graphName || this.graphName.trim().length === 0) {
      throw new Error('Graph name cannot be empty');
    }

    if (!this.relationshipType || this.relationshipType.trim().length === 0) {
      throw new Error('Relationship type cannot be empty');
    }

    // Validate property counts
    this.deletedProperties.forEach((count, property) => {
      if (count < 0) {
        throw new Error(`Property count for '${property}' cannot be negative`);
      }

      if (count > this.deletedRelationships) {
        throw new Error(
          `Property count for '${property}' (${count}) cannot exceed deleted relationships (${this.deletedRelationships})`
        );
      }
    });

    // Validate consistency between relationships and properties
    if (this.deletedRelationships === 0 && this.totalPropertyInstancesDeleted > 0) {
      throw new Error('Cannot have deleted property instances without deleted relationships');
    }
  }
}

/**
 * Encapsulates the detailed results of a relationship deletion operation.
 *
 * DeletionResult provides a **structured container** for the two key metrics
 * of relationship deletion: the count of relationships removed and the
 * detailed breakdown of property deletions.
 */
export class DeletionResult {
  /**
   * Create a new DeletionResult with relationship and property deletion metrics.
   *
   * @param deletedRelationships Number of relationship instances deleted
   * @param deletedProperties Map of property keys to instance counts
   */
  constructor(
    public readonly deletedRelationships: number,
    public readonly deletedProperties: Record<string, number>
  ) {}
}

/**
 * Detailed report interface for comprehensive relationship deletion analysis.
 */
export interface GraphDropRelationshipReport {
  readonly operation: 'DROP_RELATIONSHIPS';
  readonly timestamp: string;
  readonly graphName: string;
  readonly relationshipType: string;
  readonly metrics: {
    readonly relationshipsDeleted: number;
    readonly propertyKeysDeleted: number;
    readonly propertyInstancesDeleted: number;
    readonly averagePropertiesPerRelationship: number;
  };
  readonly propertyBreakdown: Record<string, number>;
  readonly propertyCoverage: Record<string, number>;
  readonly summary: string;
}

/**
 * JSON representation for serialization.
 */
export interface GraphDropRelationshipResultJSON {
  readonly graphName: string;
  readonly relationshipType: string;
  readonly deletedRelationships: number;
  readonly deletedProperties: Record<string, number>;
  readonly propertyKeysDeleted: number;
  readonly totalPropertyInstancesDeleted: number;
  readonly averagePropertiesPerRelationship: number;
  readonly isEmpty: boolean;
}

/**
 * Type guard to check if an object is a valid result JSON.
 */
export function isGraphDropRelationshipResultJSON(
  obj: any
): obj is GraphDropRelationshipResultJSON {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.graphName === 'string' &&
    typeof obj.relationshipType === 'string' &&
    typeof obj.deletedRelationships === 'number' &&
    typeof obj.deletedProperties === 'object' &&
    typeof obj.propertyKeysDeleted === 'number' &&
    typeof obj.totalPropertyInstancesDeleted === 'number' &&
    typeof obj.averagePropertiesPerRelationship === 'number' &&
    typeof obj.isEmpty === 'boolean'
  );
}

// Export namespace for related utilities
export namespace GraphDropRelationshipResult {
  export type DeletionResult = DeletionResult;
  export type Report = GraphDropRelationshipReport;
  export type JSON = GraphDropRelationshipResultJSON;
  export const isJSON = isGraphDropRelationshipResultJSON;
}
