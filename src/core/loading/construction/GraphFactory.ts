/**
 * GRAPH FACTORY - MAIN API FOR GRAPH CONSTRUCTION
 *
 * This is the primary entry point for building graphs from raw data.
 * It orchestrates the entire construction pipeline with sensible defaults
 * and comprehensive configuration options.
 *
 * CORE RESPONSIBILITIES:
 * 🏗️ ORCHESTRATION: Coordinates NodesBuilder and RelationshipsBuilder
 * ⚙️  CONFIGURATION: Provides builder patterns with smart defaults
 * 🔧 OPTIMIZATION: Handles concurrency, memory, and performance tuning
 * 📊 SCHEMA MANAGEMENT: Supports both schema discovery and validation
 * 🎯 SIMPLIFICATION: High-level API that hides complex construction details
 *
 * TWO CONSTRUCTION APPROACHES:
 *
 * 1. SCHEMA DISCOVERY (Lazy):
 *    - Learn node labels and properties from input data
 *    - Flexible but requires runtime coordination
 *    - Use when schema is unknown or varies by source
 *
 * 2. SCHEMA VALIDATION (Fixed):
 *    - Validate input against predefined schema
 *    - Faster and stricter but requires upfront schema
 *    - Use when schema is known and consistent
 *
 * USAGE PATTERNS:
 * ```typescript
 * // Simple node construction
 * const nodesBuilder = GraphFactory.initNodesBuilder()
 *   .maxOriginalId(100000)
 *   .concurrency(Concurrency.of(4))
 *   .build();
 *
 * // Relationship construction
 * const relsBuilder = GraphFactory.initRelationshipsBuilder()
 *   .nodes(idMap)
 *   .relationshipType(RelationshipType.of("FOLLOWS"))
 *   .orientation(Orientation.NATURAL)
 *   .build();
 *
 * // Final graph assembly
 * const graph = GraphFactory.create(idMap, relationships);
 * ```
 *
 * WHY THIS IS LARGE:
 * - Java uses @Builder.Factory (auto-generated code)
 * - Java uses @ValueClass (auto-generated interfaces)
 * - Java has implicit type inference
 * - TypeScript requires explicit interfaces and implementations
 * - More comprehensive documentation for unfamiliar codebase
 */

import { IdMap, GraphCharacteristics } from '@/api';
import {
  GraphSchema,
  MutableGraphSchema,
  MutableNodeSchema,
  MutableRelationshipSchema,
  NodeSchema,
} from '@/api/schema';
import { HugeGraph, HugeGraphBuilder } from '@/core/huge';
import {
  SingleTypeRelationships
} from '@/core/loading';
import { NodesBuilder } from '@/core/loading/construction';
import { RelationshipsBuilder } from '@/core/loading/construction';

/**
 * Main factory for graph construction with high-level, user-friendly APIs.
 *
 * DESIGN PATTERNS:
 * - Factory Pattern: Creates complex builders with sensible defaults
 * - Builder Pattern: Fluent configuration APIs for both nodes and relationships
 * - Template Method: Common construction flow with strategy variations
 * - Facade Pattern: Simplifies complex construction pipeline
 */
export class GraphFactory {
  private constructor() {} // Utility class - no instances

  // =============================================================================
  // NODES BUILDER FACTORY METHODS
  // =============================================================================

  /**
   * Initialize a nodes builder with schema discovery (most flexible).
   *
   * SCHEMA DISCOVERY:
   * - Learns node labels and properties from input data
   * - Thread-safe accumulation of schema information
   * - Suitable when schema is unknown or varies by data source
   */
  static initNodesBuilder(): NodesBuilder.Builder {
    return new NodesBuilder.Builder();
  }

  /**
   * Initialize a nodes builder with schema validation (fastest/strictest).
   *
   * SCHEMA VALIDATION:
   * - Pre-creates all property builders from known schema
   * - Validates input data matches expected schema
   * - Throws errors for unexpected properties or incompatible types
   */
  static initNodesBuilderWithSchema(nodeSchema: NodeSchema): NodesBuilder.Builder {
    return new NodesBuilder.Builder().nodeSchema(nodeSchema);
  }

  // =============================================================================
  // RELATIONSHIPS BUILDER FACTORY METHODS
  // =============================================================================

  /**
   * Initialize a relationships builder with default configuration.
   *
   * DEFAULTS:
   * - Natural orientation (directed)
   * - Skip dangling relationships (graceful error handling)
   * - Single-threaded concurrency
   * - No relationship properties
   */
  static initRelationshipsBuilder(): RelationshipsBuilder.Builder {
    return new RelationshipsBuilder.Builder();
  }

  // =============================================================================
  // GRAPH ASSEMBLY METHODS
  // =============================================================================

  /**
   * Create a HugeGraph from IdMap and relationships with inferred schema.
   *
   * SCHEMA INFERENCE:
   * - Node schema inferred from available node labels in IdMap
   * - Relationship schema uses the provided relationship type
   * - Property schema inferred from relationship properties (if any)
   *
   * CONSTRAINTS:
   * - Only supports single relationship property (enforced by assertion)
   * - All nodes get labels that exist in the IdMap
   *
   * @param idMap Node mapping with labels and properties
   * @param relationships Single relationship type with topology and properties
   * @returns Complete HugeGraph ready for algorithms
   */
  static create(idMap: IdMap, relationships: SingleTypeRelationships): HugeGraph {
    // Infer node schema from available labels
    const nodeSchema = MutableNodeSchema.empty();
    for (const nodeLabel of idMap.availableNodeLabels()) {
      nodeSchema.getOrCreateLabel(nodeLabel);
    }

    // Validate single relationship property constraint
    if (relationships.properties()?.values().size !== 1) {
      throw new Error("Cannot instantiate graph with more than one relationship property.");
    }

    // Create relationship schema from relationship data
    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.set(relationships.relationshipSchemaEntry());

    return this.createWithSchema(
      MutableGraphSchema.of(nodeSchema, relationshipSchema, new Map()),
      idMap,
      new Map(), // No node properties
      relationships
    );
  }

  /**
   * Create a HugeGraph with explicit schema and node properties.
   *
   * EXPLICIT SCHEMA:
   * - Complete control over node and relationship schemas
   * - Support for multiple node properties
   * - Support for complex relationship schemas
   *
   * ADVANCED FEATURES:
   * - Bidirectional relationship support (if inverse topology provided)
   * - Multiple relationship properties (with validation)
   * - Graph characteristics inference (direction, inverse indexing)
   *
   * @param graphSchema Complete graph schema
   * @param idMap Node mapping
   * @param nodeProperties Map of node property values by property key
   * @param relationships Relationship data with topology and properties
   * @returns Complete HugeGraph with all specified features
   */
  static createWithSchema(
    graphSchema: GraphSchema,
    idMap: IdMap,
    nodeProperties: Map<string, NodePropertyValues>,
    relationships: SingleTypeRelationships
  ): HugeGraph {
    const topology = relationships.topology();
    const inverseTopology = relationships.inverseTopology();

    // Extract relationship properties (enforce single property constraint)
    const properties = this.extractSingleProperty(relationships.properties(), "relationship");
    const inverseProperties = this.extractSingleProperty(relationships.inverseProperties(), "inverse relationship");

    // Build graph characteristics from schema and topology
    const characteristicsBuilder = GraphCharacteristics
      .builder()
      .withDirection(graphSchema.direction());

    if (inverseTopology) {
      characteristicsBuilder.inverseIndexed();
    }

    // Assemble final HugeGraph
    return new HugeGraphBuilder()
      .nodes(idMap)
      .schema(graphSchema)
      .characteristics(characteristicsBuilder.build())
      .nodeProperties(nodeProperties)
      .topology(topology)
      .inverseTopology(inverseTopology || undefined)
      .relationshipProperties(properties)
      .inverseRelationshipProperties(inverseProperties)
      .build();
  }

  /**
   * Extract single property from property store (enforces constraint).
   *
   * SINGLE PROPERTY CONSTRAINT:
   * - HugeGraph currently supports only one relationship property
   * - Multiple properties require different graph representation
   * - This constraint may be relaxed in future versions
   */
  private static extractSingleProperty(
    propertyStore: any,
    propertyType: string
  ): any {
    if (!propertyStore) return undefined;

    if (propertyStore.values().size !== 1) {
      throw new Error(`Cannot instantiate graph with more than one ${propertyType} property.`);
    }

    return Array.from(propertyStore.values())[0].values();
  }
}
