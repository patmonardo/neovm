/**
 * GRAPH DIMENSIONS - COMPREHENSIVE GRAPH METADATA & STATISTICS
 *
 * This class provides complete information about graph structure including
 * node counts, relationship counts, label mappings, and property metadata.
 *
 * KEY RESPONSIBILITIES:
 * 📊 NODE METRICS: Node counts, highest IDs, label information
 * 🔗 RELATIONSHIP METRICS: Relationship counts by type, upper bounds
 * 🏷️ LABEL MAPPING: Token-to-label mappings for nodes and relationships
 * 📈 STATISTICS: Average degree, estimation metrics
 * 🎯 PROPERTY METADATA: Property tokens and dimensions
 *
 * SPECIAL CONSTANTS:
 * - ANY_LABEL = -1: Wildcard for any node label
 * - ANY_RELATIONSHIP_TYPE = -1: Wildcard for any relationship type
 * - NO_SUCH_LABEL = -2: Indicates label doesn't exist
 * - NO_SUCH_RELATIONSHIP_TYPE = -2: Indicates relationship type doesn't exist
 * - IGNORE = -4: Marker for items to ignore in processing
 *
 * DESIGN PATTERN:
 * - Abstract Class: Provides complete implementation with extensibility
 * - Builder Pattern: Fluent construction with validation
 * - Immutable State: Thread-safe after construction
 * - Derived Properties: Computed properties from base data
 */

import { NodeLabel, RelationshipType, ElementProjection } from '@/projection';
import { DimensionsMap } from './DimensionsMap';

/**
 * Abstract base class for graph dimensions with complete functionality.
 * Provides both the interface and implementation using abstract class pattern.
 */
export abstract class GraphDimensions {
  // Special constants matching Java implementation
  static readonly ANY_LABEL = -1;
  static readonly ANY_RELATIONSHIP_TYPE = -1;
  static readonly NO_SUCH_LABEL = -2;
  static readonly NO_SUCH_RELATIONSHIP_TYPE = -2;
  static readonly IGNORE = -4;

  // =============================================================================
  // ABSTRACT PROPERTIES (Must be implemented by concrete classes)
  // =============================================================================

  /** Total number of nodes in the graph */
  abstract nodeCount(): number;

  /** Set of node label tokens present in the graph */
  abstract nodeLabelTokens(): Set<number> | null;

  /** Set of relationship type tokens present in the graph */
  abstract relationshipTypeTokens(): Set<number> | null;

  /** Mapping from tokens to node labels */
  abstract tokenNodeLabelMapping(): Map<number, NodeLabel[]> | null;

  /** Mapping from tokens to relationship types */
  abstract tokenRelationshipTypeMapping(): Map<number, RelationshipType[]> | null;

  // =============================================================================
  // CONCRETE PROPERTIES WITH DEFAULTS (Can be overridden)
  // =============================================================================

  /** Highest possible node count (defaults to nodeCount) */
  highestPossibleNodeCount(): number {
    return this.nodeCount();
  }

  /** Upper bound on relationship count */
  relCountUpperBound(): number {
    return 0;
  }

  /** Map of relationship types to their counts */
  relationshipCounts(): Map<RelationshipType, number> {
    return new Map();
  }

  /** Highest relationship ID in the graph */
  highestRelationshipId(): number {
    return this.relCountUpperBound();
  }

  /** Node property tokens mapping */
  nodePropertyTokens(): Map<string, number> {
    return new Map();
  }

  /** Node property dimensions */
  nodePropertyDimensions(): DimensionsMap {
    return new DimensionsMap(new Map());
  }

  /** Relationship property tokens mapping */
  relationshipPropertyTokens(): Map<string, number> {
    return new Map();
  }

  // =============================================================================
  // DERIVED PROPERTIES (Computed from other properties)
  // =============================================================================

  /**
   * Get all available node labels in the graph.
   *
   * COMPUTATION:
   * - Extracts all node labels from token mapping
   * - Flattens the mapping values into a single collection
   * - Returns empty set if no token mapping exists
   */
  availableNodeLabels(): Set<NodeLabel> {
    const mapping = this.tokenNodeLabelMapping();
    if (!mapping) {
      return new Set();
    }

    const labels = new Set<NodeLabel>();
    for (const labelList of mapping.values()) {
      for (const label of labelList) {
        labels.add(label);
      }
    }

    return labels;
  }

  /**
   * Get node labels that apply to all nodes (star mappings).
   *
   * STAR MAPPING:
   * - Uses ANY_LABEL token to represent labels that apply to all nodes
   * - Common for graphs where some labels are universal
   * - Returns empty array if no star mappings exist
   */
  starNodeLabelMappings(): NodeLabel[] {
    const mapping = this.tokenNodeLabelMapping();
    if (!mapping) {
      return [];
    }

    return mapping.get(GraphDimensions.ANY_LABEL) || [];
  }

  /**
   * Calculate average degree of nodes in the graph.
   *
   * CALCULATION:
   * - Average degree = total relationships / total nodes
   * - Returns 0 if graph has no nodes (avoid division by zero)
   * - Uses upper bound for relationship count
   */
  averageDegree(): number {
    const nodeCount = this.nodeCount();
    return nodeCount === 0 ? 0 : Math.floor(this.relCountUpperBound() / nodeCount);
  }

  /**
   * Create reverse mapping from relationship types to tokens.
   *
   * REVERSE MAPPING:
   * - Inverts the token → relationship types mapping
   * - Allows efficient lookup of token by relationship type
   * - Returns null if no token mapping exists
   */
  relationshipTypeTokenMapping(): Map<RelationshipType, number> | null {
    const tokenMapping = this.tokenRelationshipTypeMapping();
    if (!tokenMapping) {
      return null;
    }

    const reverseMapping = new Map<RelationshipType, number>();

    for (const [token, relationshipTypes] of tokenMapping) {
      for (const relationshipType of relationshipTypes) {
        reverseMapping.set(relationshipType, token);
      }
    }

    return reverseMapping;
  }

  /**
   * Estimate the number of distinct node labels for memory planning.
   *
   * ESTIMATION LOGIC:
   * - Counts unique node labels across all token mappings
   * - Excludes ALL_NODES label from count (universal label)
   * - Returns 0 if only ALL_NODES labels exist
   * - Used for memory estimation in graph algorithms
   */
  estimationNodeLabelCount(): number {
    const nodeLabels = new Set<NodeLabel>();
    const mapping = this.tokenNodeLabelMapping();

    if (mapping) {
      for (const labelList of mapping.values()) {
        for (const label of labelList) {
          nodeLabels.add(label);
        }
      }
    }

    // Filter out ALL_NODES labels for estimation purposes
    const nonUniversalLabels = Array.from(nodeLabels).filter(
      label => !label.equals(NodeLabel.ALL_NODES)
    );

    return nonUniversalLabels.length;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Estimate relationship count for specific relationship types.
   *
   * ESTIMATION STRATEGY:
   * - If requesting specific types (not PROJECT_ALL), try exact counts
   * - Fall back to upper bound if exact counts unavailable
   * - Handles wildcard projections efficiently
   *
   * @param relationshipTypeNames List of relationship type names to estimate
   * @returns Estimated relationship count
   */
  estimatedRelCount(relationshipTypeNames: string[]): number {
    // Handle wildcard projection
    if (relationshipTypeNames.includes(ElementProjection.PROJECT_ALL)) {
      return this.relCountUpperBound();
    }

    const relCounts = this.relationshipCounts();
    const requestedTypes = relationshipTypeNames.map(name => RelationshipType.of(name));

    // Check if we have exact counts for all requested types
    const hasAllCounts = requestedTypes.every(type => relCounts.has(type));

    if (hasAllCounts) {
      return requestedTypes
        .map(type => relCounts.get(type) || 0)
        .reduce((sum, count) => sum + count, 0);
    }

    // Fall back to upper bound if exact counts unavailable
    return this.relCountUpperBound();
  }

  // =============================================================================
  // FACTORY METHODS
  // =============================================================================

  /**
   * Create simple GraphDimensions with just node count.
   */
  // static of(nodeCount: number): GraphDimensions {
  //   return GraphDimensions.of(nodeCount, 0);
  // }

  /**
   * Create simple GraphDimensions with node and relationship counts.
   */
  static of(nodeCount: number, relationshipCount: number = 0): GraphDimensions {
    return new GraphDimensionsBuilder()
      .nodeCount(nodeCount)
      .relationshipCounts(new Map([[RelationshipType.ALL_RELATIONSHIPS, relationshipCount]]))
      .relCountUpperBound(relationshipCount)
      .build();
  }

  /**
   * Create a builder for fluent GraphDimensions construction.
   */
  static builder(): GraphDimensionsBuilder {
    return new GraphDimensionsBuilder();
  }
}

/**
 * Concrete implementation of GraphDimensions with builder pattern.
 * This is the class that actually stores the data.
 */
class ConcreteGraphDimensions extends GraphDimensions {
  private readonly _nodeCount: number;
  private readonly _highestPossibleNodeCount: number;
  private readonly _relCountUpperBound: number;
  private readonly _relationshipCounts: Map<RelationshipType, number>;
  private readonly _highestRelationshipId: number;
  private readonly _nodeLabelTokens: Set<number> | null;
  private readonly _relationshipTypeTokens: Set<number> | null;
  private readonly _tokenNodeLabelMapping: Map<number, NodeLabel[]> | null;
  private readonly _tokenRelationshipTypeMapping: Map<number, RelationshipType[]> | null;
  private readonly _nodePropertyTokens: Map<string, number>;
  private readonly _nodePropertyDimensions: DimensionsMap;
  private readonly _relationshipPropertyTokens: Map<string, number>;

  constructor(builder: GraphDimensionsBuilder) {
    super();
    this._nodeCount = builder._nodeCount;
    this._highestPossibleNodeCount = builder._highestPossibleNodeCount ?? this._nodeCount;
    this._relCountUpperBound = builder._relCountUpperBound ?? 0;
    this._relationshipCounts = builder._relationshipCounts ?? new Map();
    this._highestRelationshipId = builder._highestRelationshipId ?? this._relCountUpperBound;
    this._nodeLabelTokens = builder._nodeLabelTokens ?? null;
    this._relationshipTypeTokens = builder._relationshipTypeTokens ?? null;
    this._tokenNodeLabelMapping = builder._tokenNodeLabelMapping ?? null;
    this._tokenRelationshipTypeMapping = builder._tokenRelationshipTypeMapping ?? null;
    this._nodePropertyTokens = builder._nodePropertyTokens ?? new Map();
    this._nodePropertyDimensions = builder._nodePropertyDimensions ?? new DimensionsMap(new Map());
    this._relationshipPropertyTokens = builder._relationshipPropertyTokens ?? new Map();
  }

  nodeCount(): number { return this._nodeCount; }
  highestPossibleNodeCount(): number { return this._highestPossibleNodeCount; }
  relCountUpperBound(): number { return this._relCountUpperBound; }
  relationshipCounts(): Map<RelationshipType, number> { return this._relationshipCounts; }
  highestRelationshipId(): number { return this._highestRelationshipId; }
  nodeLabelTokens(): Set<number> | null { return this._nodeLabelTokens; }
  relationshipTypeTokens(): Set<number> | null { return this._relationshipTypeTokens; }
  tokenNodeLabelMapping(): Map<number, NodeLabel[]> | null { return this._tokenNodeLabelMapping; }
  tokenRelationshipTypeMapping(): Map<number, RelationshipType[]> | null { return this._tokenRelationshipTypeMapping; }
  nodePropertyTokens(): Map<string, number> { return this._nodePropertyTokens; }
  nodePropertyDimensions(): DimensionsMap { return this._nodePropertyDimensions; }
  relationshipPropertyTokens(): Map<string, number> { return this._relationshipPropertyTokens; }
}

/**
 * Builder for GraphDimensions with fluent API and validation.
 */
export class GraphDimensionsBuilder {
  _nodeCount: number = 0;
  _highestPossibleNodeCount?: number;
  _relCountUpperBound?: number;
  _relationshipCounts?: Map<RelationshipType, number>;
  _highestRelationshipId?: number;
  _nodeLabelTokens?: Set<number>;
  _relationshipTypeTokens?: Set<number>;
  _tokenNodeLabelMapping?: Map<number, NodeLabel[]>;
  _tokenRelationshipTypeMapping?: Map<number, RelationshipType[]>;
  _nodePropertyTokens?: Map<string, number>;
  _nodePropertyDimensions?: DimensionsMap;
  _relationshipPropertyTokens?: Map<string, number>;

  nodeCount(nodeCount: number): this {
    this._nodeCount = nodeCount;
    return this;
  }

  highestPossibleNodeCount(count: number): this {
    this._highestPossibleNodeCount = count;
    return this;
  }

  relCountUpperBound(count: number): this {
    this._relCountUpperBound = count;
    return this;
  }

  relationshipCounts(counts: Map<RelationshipType, number>): this {
    this._relationshipCounts = counts;
    return this;
  }

  highestRelationshipId(id: number): this {
    this._highestRelationshipId = id;
    return this;
  }

  nodeLabelTokens(tokens: Set<number>): this {
    this._nodeLabelTokens = tokens;
    return this;
  }

  relationshipTypeTokens(tokens: Set<number>): this {
    this._relationshipTypeTokens = tokens;
    return this;
  }

  tokenNodeLabelMapping(mapping: Map<number, NodeLabel[]>): this {
    this._tokenNodeLabelMapping = mapping;
    return this;
  }

  tokenRelationshipTypeMapping(mapping: Map<number, RelationshipType[]>): this {
    this._tokenRelationshipTypeMapping = mapping;
    return this;
  }

  nodePropertyTokens(tokens: Map<string, number>): this {
    this._nodePropertyTokens = tokens;
    return this;
  }

  nodePropertyDimensions(dimensions: DimensionsMap): this {
    this._nodePropertyDimensions = dimensions;
    return this;
  }

  relationshipPropertyTokens(tokens: Map<string, number>): this {
    this._relationshipPropertyTokens = tokens;
    return this;
  }

  build(): GraphDimensions {
    if (this._nodeCount < 0) {
      throw new Error('Node count cannot be negative');
    }

    return new ConcreteGraphDimensions(this);
  }
}
