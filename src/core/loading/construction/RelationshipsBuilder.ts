/**
 * RELATIONSHIPS BUILDER - CONCURRENT GRAPH EDGE CONSTRUCTION
 *
 * This is the main orchestrator for building large relationship collections with:
 *
 * 🚀 CONCURRENT PROCESSING: Multiple threads add relationships simultaneously
 * 🔗 ID MAPPING: Converts original node IDs to internal mapped IDs
 * ⚠️  VALIDATION: Handles dangling relationships (edges to non-existent nodes)
 * 🏷️  PROPERTY SUPPORT: Relationships can have single or multiple properties
 * 🧵 THREAD SAFETY: Thread-safe public API with pooled local builders
 * 🗜️  COMPRESSION: Optional value compression for memory efficiency
 *
 * ARCHITECTURE OVERVIEW:
 * ┌─────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────┐
 * │ RelationshipsBuilder│───▶│ SingleTypeRelationships  │───▶│ LocalRelationships  │
 * │ (Public API)        │    │ Builder (Coordination)   │    │ Builder (Per-Thread)│
 * └─────────────────────┘    └──────────────────────────┘    └─────────────────────┘
 *           │                               │                               │
 *           ▼                               ▼                               ▼
 *    Validates IDs                 Manages Compression              Actual Edge Storage
 *    Maps Original→Internal        Handles Progress Tracking       Thread-Local Buffers
 *    Handles Dangling Edges        Coordinates Final Assembly      Efficient Batching
 *
 * CONSTRUCTION FLOW:
 * 1. Create RelationshipsBuilder with configuration
 * 2. Call add() methods from multiple threads (thread-safe)
 * 3. Builder maps original IDs → internal IDs via IdMap
 * 4. Valid relationships go to thread-local builders
 * 5. Invalid relationships either skipped or throw errors
 * 6. Call build() to assemble final SingleTypeRelationships
 *
 * THREAD SAFETY MODEL:
 * - RelationshipsBuilder: Thread-safe public API (this class)
 * - LocalRelationshipsBuilder: Thread-local, not shared between threads
 * - Provider: Manages safe access to LocalRelationshipsBuilder instances
 * - IdMap: Thread-safe for concurrent ID lookups
 *
 * MEMORY EFFICIENCY:
 * - Thread-local builders minimize contention
 * - Optional compression reduces memory footprint
 * - Pooled builders reduce allocation overhead
 * - Streaming construction handles datasets larger than memory
 */

import { join } from "@/utils";
import { PartialIdMap, IdMap } from "@/api";
import { SingleTypeRelationships } from "@/core/loading";
import { SingleTypeRelationshipsBuilder } from "./SingleTypeRelationshipsBuilder";
import { LocalRelationshipsBuilderProvider } from "./LocalRelationshipsBuilderProvider";

/**
 * Main orchestrator for concurrent relationship construction.
 *
 * DESIGN PATTERNS:
 * - Facade Pattern: Simple API hiding complex concurrent infrastructure
 * - Provider Pattern: Thread-safe access to LocalRelationshipsBuilder instances
 * - Validation Pattern: Consistent ID validation and error handling
 * - Builder Pattern: Flexible configuration and assembly
 */
export class RelationshipsBuilder {
  /** Sentinel value indicating no property is associated with a relationship */
  static readonly NO_PROPERTY_REF = -1;

  /** ID mapping service for converting original → internal node IDs */
  private readonly idMap: PartialIdMap;

  /** Core builder that coordinates the construction process */
  private readonly singleTypeRelationshipsBuilder: SingleTypeRelationshipsBuilder;

  /** Provider for thread-safe access to LocalRelationshipsBuilder instances */
  private readonly localBuilderProvider: LocalRelationshipsBuilderProvider;

  /** Whether to skip dangling relationships or throw errors */
  private readonly skipDanglingRelationships: boolean;

  constructor(
    singleTypeRelationshipsBuilder: SingleTypeRelationshipsBuilder,
    localBuilderProvider: LocalRelationshipsBuilderProvider,
    skipDanglingRelationships: boolean
  ) {
    this.singleTypeRelationshipsBuilder = singleTypeRelationshipsBuilder;
    this.idMap = singleTypeRelationshipsBuilder.partialIdMap();
    this.localBuilderProvider = localBuilderProvider;
    this.skipDanglingRelationships = skipDanglingRelationships;
  }

  // =============================================================================
  // PUBLIC API - THREAD-SAFE RELATIONSHIP ADDITION METHODS
  // =============================================================================

  /**
   * Add a relationship between two nodes using original node IDs.
   *
   * CORE RELATIONSHIP ADDITION:
   * - Most common method for adding basic relationships
   * - Automatically maps original IDs to internal IDs
   * - Validates that both nodes exist in the graph
   * - Thread-safe for concurrent access
   *
   * ERROR HANDLING:
   * - Throws error if nodes don't exist and skipDanglingRelationships=false
   * - Silently skips if nodes don't exist and skipDanglingRelationships=true
   *
   * PERFORMANCE:
   * - O(1) ID mapping lookup
   * - Minimal overhead for valid relationships
   * - Thread-local builder acquisition amortized across batches
   *
   * @param originalSourceId Source node ID from original data
   * @param originalTargetId Target node ID from original data
   * @throws Error if nodes don't exist and skipDanglingRelationships=false
   */
  add(originalSourceId: number, originalTargetId: number): void {
    if (
      !this.addFromInternal(
        this.idMap.toMappedNodeId(originalSourceId),
        this.idMap.toMappedNodeId(originalTargetId)
      ) &&
      !this.skipDanglingRelationships
    ) {
      RelationshipsBuilder.throwUnmappedNodeIds(
        originalSourceId,
        originalTargetId,
        this.idMap
      );
    }
  }

  /**
   * Add a relationship with a single property value.
   *
   * PROPERTY RELATIONSHIPS:
   * - Common for weighted graphs (distances, costs, similarities)
   * - Property value stored efficiently with the relationship
   * - Same validation and mapping as basic relationships
   *
   * USAGE EXAMPLES:
   * - Social networks: friendship strength
   * - Transportation: distance or travel time
   * - Recommendations: similarity scores
   * - Financial: transaction amounts
   *
   * @param originalSourceId Source node ID from original data
   * @param originalTargetId Target node ID from original data
   * @param relationshipPropertyValue Numeric property (weight, distance, etc.)
   * @throws Error if nodes don't exist and skipDanglingRelationships=false
   */
  addWithProperty(
    originalSourceId: number,
    originalTargetId: number,
    relationshipPropertyValue: number
  ): void {
    if (
      !this.addFromInternal(
        this.idMap.toMappedNodeId(originalSourceId),
        this.idMap.toMappedNodeId(originalTargetId),
        relationshipPropertyValue
      ) &&
      !this.skipDanglingRelationships
    ) {
      RelationshipsBuilder.throwUnmappedNodeIds(originalSourceId, originalTargetId, this.idMap);
    }
  }

  /**
   * Add a relationship with multiple property values.
   *
   * MULTI-PROPERTY RELATIONSHIPS:
   * - Advanced use cases with multiple attributes per relationship
   * - Each property has semantic meaning in the domain
   * - Efficient storage of property arrays
   *
   * USAGE EXAMPLES:
   * - Multi-modal transportation: [distance, time, cost]
   * - Social networks: [interaction_count, last_contact, sentiment]
   * - Financial: [amount, fee, exchange_rate]
   * - Scientific: [correlation, p_value, effect_size]
   *
   * PERFORMANCE:
   * - Properties stored as contiguous arrays for cache efficiency
   * - Memory layout optimized for vectorized operations
   * - Bulk property operations during graph algorithms
   *
   * @param originalSourceId Source node ID from original data
   * @param originalTargetId Target node ID from original data
   * @param relationshipPropertyValues Array of numeric properties
   * @throws Error if nodes don't exist and skipDanglingRelationships=false
   */
  addWithProperties(
    originalSourceId: number,
    originalTargetId: number,
    relationshipPropertyValues: number[]
  ): void {
    if (
      !this.addFromInternal(
        this.idMap.toMappedNodeId(originalSourceId),
        this.idMap.toMappedNodeId(originalTargetId),
        relationshipPropertyValues
      ) &&
      !this.skipDanglingRelationships
    ) {
      RelationshipsBuilder.throwUnmappedNodeIds(originalSourceId, originalTargetId, this.idMap);
    }
  }

  // =============================================================================
  // INTERNAL ID API - HIGH-PERFORMANCE METHODS FOR MAPPED IDs
  // =============================================================================

  /**
   * Add a relationship using already-mapped internal node IDs.
   *
   * HIGH-PERFORMANCE PATH:
   * - Skips ID mapping overhead (already done)
   * - Used by algorithms that work with internal IDs
   * - Used by bulk import operations with pre-mapped IDs
   * - Returns success/failure instead of throwing
   *
   * WHEN TO USE:
   * - Internal graph algorithms creating new relationships
   * - Bulk import with pre-computed ID mappings
   * - Performance-critical inner loops
   * - When you need to handle failures gracefully
   *
   * THREAD SAFETY:
   * - Acquires thread-local builder from provider
   * - Try-finally ensures builder is always released
   * - Provider handles thread coordination and pooling
   *
   * @param mappedSourceId Source node internal ID (already mapped)
   * @param mappedTargetId Target node internal ID (already mapped)
   * @returns true if relationship was added, false if nodes not found
   */
  addFromInternal(mappedSourceId: number, mappedTargetId: number): boolean {
    if (this.validateRelationships(mappedSourceId, mappedTargetId)) {
      const threadLocalBuilder = this.localBuilderProvider.acquire();
      try {
        threadLocalBuilder
          .get()
          .addRelationship(mappedSourceId, mappedTargetId);
      } finally {
        threadLocalBuilder.release();
      }
      return true;
    }
    return false;
  }

  /**
   * Add a relationship with single property using mapped internal node IDs.
   *
   * HIGH-PERFORMANCE PROPERTY PATH:
   * - Combines performance benefits of internal IDs with property storage
   * - Used by algorithms that compute relationship weights
   * - Efficient for bulk operations with computed properties
   *
   * @param mappedSourceId Source node internal ID (already mapped)
   * @param mappedTargetId Target node internal ID (already mapped)
   * @param relationshipPropertyValue Numeric property value
   * @returns true if relationship was added, false if nodes not found
   */
  addFromInternalWithProperty(
    mappedSourceId: number,
    mappedTargetId: number,
    relationshipPropertyValue: number
  ): boolean {
    if (this.validateRelationships(mappedSourceId, mappedTargetId)) {
      const threadLocalBuilder = this.localBuilderProvider.acquire();
      try {
        threadLocalBuilder
          .get()
          .addRelationshipWithProperty(
            mappedSourceId,
            mappedTargetId,
            relationshipPropertyValue
          );
      } finally {
        threadLocalBuilder.release();
      }
      return true;
    }
    return false;
  }

  /**
   * Add a relationship with multiple properties using mapped internal node IDs.
   *
   * HIGH-PERFORMANCE MULTI-PROPERTY PATH:
   * - Maximum performance for complex relationship data
   * - Used by advanced algorithms with computed relationship attributes
   * - Efficient for machine learning feature generation
   *
   * @param mappedSourceId Source node internal ID (already mapped)
   * @param mappedTargetId Target node internal ID (already mapped)
   * @param relationshipPropertyValues Array of numeric properties
   * @returns true if relationship was added, false if nodes not found
   */
  addFromInternalWithProperties(
    mappedSourceId: number,
    mappedTargetId: number,
    relationshipPropertyValues: number[]
  ): boolean {
    if (this.validateRelationships(mappedSourceId, mappedTargetId)) {
      const threadLocalBuilder = this.localBuilderProvider.acquire();
      try {
        threadLocalBuilder
          .get()
          .addRelationshipWithProperties(
            mappedSourceId,
            mappedTargetId,
            relationshipPropertyValues
          );
      } finally {
        threadLocalBuilder.release();
      }
      return true;
    }
    return false;
  }

  // =============================================================================
  // VALIDATION AND ERROR HANDLING
  // =============================================================================

  /**
   * Validate that both source and target node IDs are valid (not NOT_FOUND).
   *
   * VALIDATION LOGIC:
   * - IdMap.NOT_FOUND indicates the node ID wasn't found during mapping
   * - Both source and target must be valid for relationship to be added
   * - Fast integer comparison (no expensive lookups)
   *
   * EDGE CASES:
   * - Self-loops: allowed if both IDs are the same valid ID
   * - Missing nodes: detected by NOT_FOUND sentinel value
   * - Invalid IDs: handled upstream by IdMap during mapping
   *
   * @param mappedSourceId Internal source node ID
   * @param mappedTargetId Internal target node ID
   * @returns true if both IDs are valid, false otherwise
   */
  private validateRelationships(mappedSourceId: number, mappedTargetId: number): boolean {
    return mappedSourceId !== IdMap.NOT_FOUND && mappedTargetId !== IdMap.NOT_FOUND;
  }

  /**
   * Throw a detailed error for unmapped node IDs.
   *
   * ERROR REPORTING:
   * - Identifies which specific node IDs are missing
   * - Provides actionable error message for debugging
   * - Includes both original IDs that failed mapping
   * - Helps users identify data quality issues
   *
   * DEBUGGING AID:
   * - Common during data import from external sources
   * - Helps identify missing nodes in the input data
   * - Points to data consistency problems
   * - Provides exact IDs that need to be added to nodes
   *
   * @param originalSourceId Original source node ID from input
   * @param originalTargetId Original target node ID from input
   * @param idMap The IdMap that failed to map the IDs
   * @throws Error with detailed information about missing nodes
   */
  private static throwUnmappedNodeIds(
    originalSourceId: number,
    originalTargetId: number,
    idMap: PartialIdMap
  ): never {
    const mappedSource = idMap.toMappedNodeId(originalSourceId);
    const mappedTarget = idMap.toMappedNodeId(originalTargetId);

    const unmappedIds: string[] = [];
    if (mappedSource === IdMap.NOT_FOUND) {
      unmappedIds.push(originalSourceId.toString());
    }
    if (mappedTarget === IdMap.NOT_FOUND) {
      unmappedIds.push(originalTargetId.toString());
    }

    const message = `The following node ids are not present in the node id space: ${join(
      unmappedIds
    )}`;
    throw new Error(message);
  }

  // =============================================================================
  // BUILD PHASE - ASSEMBLY OF FINAL RELATIONSHIPS STRUCTURE
  // =============================================================================

  /**
   * Build the final SingleTypeRelationships without compression or progress tracking.
   *
   * SIMPLE BUILD:
   * - Most common case for basic relationship construction
   * - No compression applied (faster but uses more memory)
   * - No progress callbacks (suitable for non-interactive scenarios)
   * - Clean API for straightforward use cases
   *
   * WHEN TO USE:
   * - Development and testing scenarios
   * - Small to medium graphs where memory isn't constrained
   * - Batch processing where progress tracking isn't needed
   * - Simple applications that don't need compression
   *
   * @returns Final SingleTypeRelationships ready for graph algorithms
   */
  build(): SingleTypeRelationships {
    return this.buildWithOptions();
  }

  /**
   * Build the final SingleTypeRelationships with optional compression and progress tracking.
   *
   * ADVANCED BUILD OPTIONS:
   * - Compression: Reduces memory footprint for large graphs
   * - Progress tracking: Provides feedback during long construction phases
   * - Production-ready: Handles large-scale graph construction
   *
   * COMPRESSION BENEFITS:
   * - Significant memory reduction (50-80% typical)
   * - Better cache performance due to smaller data structures
   * - Enables larger graphs to fit in memory
   * - Trades CPU time for memory efficiency
   *
   * PROGRESS TRACKING:
   * - Called periodically during adjacency list construction
   * - Provides relationship count feedback for progress bars
   * - Helps estimate completion time for large imports
   * - Essential for interactive applications
   *
   * THREAD SAFETY:
   * - Both mapper and drainCountConsumer must be thread-safe
   * - Called concurrently from multiple construction threads
   * - Implementations must handle concurrent access properly
   *
   * ERROR HANDLING:
   * - Properly closes all resources on failure
   * - Propagates construction errors with context
   * - Ensures clean state even if build fails
   *
   * @param mapper Optional value mapper for compression (must be thread-safe)
   * @param drainCountConsumer Optional progress callback (must be thread-safe)
   * @returns Final SingleTypeRelationships with applied optimizations
   * @throws Error if construction fails or resources cannot be closed
   */
  buildWithOptions(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): SingleTypeRelationships {
    try {
      // Close all local builders and flush remaining data
      this.localBuilderProvider.close();
    } catch (error) {
      throw new Error(`Failed to close local builder provider: ${error}`);
    }

    // Delegate to the underlying builder with options
    return this.singleTypeRelationshipsBuilder.build(
      mapper,
      drainCountConsumer
    );
  }
}

// =============================================================================
// RELATIONSHIP DATA STRUCTURES
// =============================================================================

/**
 * Interface representing a relationship with source, target, and optional property.
 *
 * DESIGN PRINCIPLES:
 * - Immutable value object representing a graph edge
 * - Simple interface suitable for various relationship representations
 * - Compatible with both weighted and unweighted graphs
 * - Efficient for bulk operations and transformations
 *
 * USAGE PATTERNS:
 * - Input data representation during import
 * - Algorithm results (shortest paths, spanning trees)
 * - Export and serialization formats
 * - Testing and validation scenarios
 */
export interface Relationship {
  /** Get the source node ID for this relationship */
  sourceNodeId(): number;

  /** Get the target node ID for this relationship */
  targetNodeId(): number;

  /** Get the property value (0.0 for unweighted relationships) */
  property(): number;
}

/**
 * Simple implementation of the Relationship interface.
 *
 * MEMORY EFFICIENT:
 * - Stores only essential data (source, target, property)
 * - Immutable after construction (safe for concurrent access)
 * - Compact representation suitable for large collections
 *
 * EQUALITY SEMANTICS:
 * - Two relationships are equal if all fields match
 * - Floating-point comparison uses epsilon for property values
 * - Hash code suitable for use in hash-based collections
 *
 * USAGE:
 * - Creating relationship collections for testing
 * - Representing algorithm outputs
 * - Intermediate data structures during import
 * - Simple relationship containers
 */
export class SimpleRelationship implements Relationship {
  private readonly source: number;
  private readonly target: number;
  private readonly propertyValue: number;

  /**
   * Create a new relationship.
   *
   * @param source Source node ID
   * @param target Target node ID
   * @param propertyValue Property value (defaults to 0.0 for unweighted)
   */
  constructor(source: number, target: number, propertyValue = 0.0) {
    this.source = source;
    this.target = target;
    this.propertyValue = propertyValue;
  }

  sourceNodeId(): number {
    return this.source;
  }

  targetNodeId(): number {
    return this.target;
  }

  property(): number {
    return this.propertyValue;
  }

  toString(): string {
    return `Relationship(${this.source} -> ${this.target}, property=${this.propertyValue})`;
  }

  /**
   * Check equality with another object.
   * Uses epsilon comparison for floating-point property values.
   */
  equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof SimpleRelationship)) return false;
    return (
      this.source === other.source &&
      this.target === other.target &&
      Math.abs(this.propertyValue - other.propertyValue) < 1e-10
    );
  }

  /**
   * Compute hash code suitable for hash-based collections.
   * Uses simple but effective hash combination.
   */
  hashCode(): number {
    let hash = 17;
    hash = hash * 31 + this.source;
    hash = hash * 31 + this.target;
    hash = hash * 31 + Math.floor(this.propertyValue * 1000); // Simple hash for double
    return hash >>> 0; // Ensure positive
  }
}

// =============================================================================
// BUILDER CONFIGURATION
// =============================================================================

/**
 * Builder for RelationshipsBuilder configuration.
 *
 * CONFIGURATION PATTERN:
 * - Fluent API for easy configuration
 * - Validation ensures all required components are provided
 * - Type-safe construction with compile-time checks
 * - Flexible configuration for different use cases
 *
 * REQUIRED COMPONENTS:
 * - SingleTypeRelationshipsBuilder: Core construction coordinator
 * - LocalRelationshipsBuilderProvider: Thread-safe access to local builders
 *
 * OPTIONAL CONFIGURATION:
 * - skipDanglingRelationships: Error handling strategy for missing nodes
 */
export class RelationshipsBuilderBuilder {
  private singleTypeBuilder?: SingleTypeRelationshipsBuilder;
  private localBuilderProvider?: LocalRelationshipsBuilderProvider;
  private skipDangling = false;

  /**
   * Set the single type relationships builder (required).
   * This is the core coordinator for the construction process.
   */
  singleTypeRelationshipsBuilder(
    builder: SingleTypeRelationshipsBuilder
  ): this {
    this.singleTypeBuilder = builder;
    return this;
  }

  /**
   * Set the local relationships builder provider (required).
   * This manages thread-safe access to LocalRelationshipsBuilder instances.
   */
  localRelationshipsBuilderProvider(
    provider: LocalRelationshipsBuilderProvider
  ): this {
    this.localBuilderProvider = provider;
    return this;
  }

  /**
   * Configure whether to skip dangling relationships or throw errors.
   *
   * @param skip true to skip dangling relationships, false to throw errors
   */
  skipDanglingRelationships(skip: boolean): this {
    this.skipDangling = skip;
    return this;
  }

  /**
   * Build the configured RelationshipsBuilder.
   * Validates that all required components are provided.
   *
   * @returns Configured RelationshipsBuilder ready for use
   * @throws Error if required components are missing
   */
  build(): RelationshipsBuilder {
    if (!this.singleTypeBuilder) {
      throw new Error("SingleTypeRelationshipsBuilder is required");
    }
    if (!this.localBuilderProvider) {
      throw new Error("LocalRelationshipsBuilderProvider is required");
    }

    return new RelationshipsBuilder(
      this.singleTypeBuilder,
      this.localBuilderProvider,
      this.skipDangling
    );
  }
}
