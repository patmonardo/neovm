/**
 * LOCAL RELATIONSHIPS BUILDER - THREAD-LOCAL RELATIONSHIP PROCESSING WORKER
 *
 * This is a thread-local worker that efficiently processes relationships in batches.
 * Each import thread gets its own LocalRelationshipsBuilder to avoid contention.
 *
 * CORE RESPONSIBILITIES:
 * 🔄 BATCHING: Accumulates relationships into efficient batch sizes
 * 🏷️  PROPERTY HANDLING: Manages single/multiple relationship properties
 * 📦 BUFFER MANAGEMENT: Auto-flushes when batches are full
 * 🔄 ORIENTATION: Supports directed (NonIndexed) and undirected (Indexed) graphs
 *
 * TWO STRATEGIES:
 *
 * 1. NON-INDEXED (Directed): Stores relationships in one direction only
 *    - Used for directed graphs (A → B)
 *    - More memory efficient
 *    - Faster import for directed data
 *
 * 2. INDEXED (Undirected): Stores relationships in both directions
 *    - Used for undirected graphs (A ↔ B)
 *    - Enables bidirectional traversal
 *    - Automatically creates reverse edges
 *
 * WORKFLOW:
 * 1. addRelationship() called with edge data
 * 2. Add to batch buffer with properties if present
 * 3. Auto-flush when buffer full
 * 4. close() flushes any remaining data
 *
 * THREAD SAFETY:
 * - Each thread has its own LocalRelationshipsBuilder (no sharing)
 * - Thread-safe coordination through underlying importers
 * - Atomic buffer operations for relationship batching
 */

import {
  PropertyReader,
  RelationshipsBatchBufferBuilder,
  SingleTypeRelationshipImporter,
  ThreadLocalSingleTypeRelationshipImporter
} from '@/core/loading';
import { RelationshipsBuilder } from './RelationshipsBuilder';

/**
 * Abstract base class for thread-local relationship processing.
 *
 * DESIGN PATTERNS:
 * - Worker Pattern: Processes work items (relationships) in batches
 * - Template Method: Abstract interface with concrete implementations
 * - Resource Management: Implements AutoCloseable for cleanup
 */
export abstract class LocalRelationshipsBuilder {

  /** Add a relationship without properties */
  abstract addRelationship(source: number, target: number): void;

  /** Add a relationship with a single property value */
  abstract addRelationshipWithProperty(source: number, target: number, relationshipPropertyValue: number): void;

  /** Add a relationship with multiple property values */
  abstract addRelationshipWithProperties(source: number, target: number, relationshipPropertyValues: number[]): void;

  /** Close the builder and flush any remaining data */
  abstract close(): void;
}

/**
 * NON-INDEXED STRATEGY (Directed Relationships)
 *
 * Stores relationships in a single direction only.
 * Optimized for directed graphs and memory efficiency.
 *
 * WHEN TO USE:
 * - Directed graphs (social media follows, web links, etc.)
 * - Memory-constrained environments
 * - Import data that's naturally directed
 *
 * PERFORMANCE:
 * - 50% memory usage compared to indexed
 * - Faster import (single direction only)
 * - Optimized buffer management
 */
export class NonIndexedLocalRelationshipsBuilder extends LocalRelationshipsBuilder {
  private readonly importer: ThreadLocalSingleTypeRelationshipImporter<number>;
  private readonly bufferedPropertyReader: PropertyReader.Buffered<number> | null;
  private readonly propertyCount: number;
  private localRelationshipId = 0;

  constructor(
    singleTypeRelationshipImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    propertyCount: number
  ) {
    super();
    this.propertyCount = propertyCount;

    // Create batch buffer for efficient relationship processing
    const relationshipsBatchBuffer = new RelationshipsBatchBufferBuilder<number>()
      .capacity(bufferSize)
      .propertyReferenceClass(Number)
      .build();

    // Setup property handling based on property count
    if (propertyCount > 1) {
      // Multi-property: need buffered reader for property arrays
      this.bufferedPropertyReader = PropertyReader.buffered(bufferSize, propertyCount);
      this.importer = singleTypeRelationshipImporter.threadLocalImporter(
        relationshipsBatchBuffer,
        this.bufferedPropertyReader
      );
    } else {
      // Single/no property: use simpler pre-loaded reader
      this.bufferedPropertyReader = null;
      this.importer = singleTypeRelationshipImporter.threadLocalImporter(
        relationshipsBatchBuffer,
        PropertyReader.preLoaded()
      );
    }
  }

  /**
   * Add a basic relationship (no properties).
   *
   * FAST PATH:
   * - Most common case for unweighted graphs
   * - Minimal overhead, maximum throughput
   * - Automatic batching and flushing
   */
  addRelationship(source: number, target: number): void {
    this.importer.buffer().add(source, target);
    if (this.importer.buffer().isFull()) {
      this.flushBuffer();
    }
  }

  /**
   * Add a relationship with a single property (weighted graphs).
   *
   * PROPERTY ENCODING:
   * - Property value encoded as long bits for efficiency
   * - Compatible with Java's Double.doubleToLongBits
   * - Maintains precision while enabling fast operations
   */
  addRelationshipWithProperty(source: number, target: number, relationshipPropertyValue: number): void {
    this.importer.buffer().add(
      source,
      target,
      this.doubleToLongBits(relationshipPropertyValue),
      RelationshipsBuilder.NO_PROPERTY_REF
    );
    if (this.importer.buffer().isFull()) {
      this.flushBuffer();
    }
  }

  /**
   * Add a relationship with multiple properties.
   *
   * MULTI-PROPERTY HANDLING:
   * - Each relationship gets unique local ID
   * - Properties stored separately in buffered reader
   * - Efficient for complex relationship attributes
   */
  addRelationshipWithProperties(source: number, target: number, relationshipPropertyValues: number[]): void {
    const nextRelationshipId = this.localRelationshipId++;
    this.importer.buffer().add(source, target, nextRelationshipId, RelationshipsBuilder.NO_PROPERTY_REF);

    if (!this.bufferedPropertyReader) {
      throw new Error('Multi-property relationships require buffered property reader');
    }

    // Store each property with relationship ID and property index
    for (let propertyKeyId = 0; propertyKeyId < this.propertyCount; propertyKeyId++) {
      this.bufferedPropertyReader.add(
        nextRelationshipId,
        propertyKeyId,
        relationshipPropertyValues[propertyKeyId]
      );
    }

    if (this.importer.buffer().isFull()) {
      this.flushBuffer();
    }
  }

  close(): void {
    this.flushBuffer();
  }

  /**
   * Flush current batch to the relationship importer.
   *
   * BATCH PROCESSING:
   * - Sends complete batch to underlying importer
   * - Resets buffer and counters for next batch
   * - Efficient bulk operation reduces per-relationship overhead
   */
  private flushBuffer(): void {
    this.importer.importRelationships();
    this.importer.buffer().reset();
    this.localRelationshipId = 0;
  }

  /**
   * Convert double to long bits (TypeScript equivalent of Java's Double.doubleToLongBits).
   * Preserves exact bit representation for compatibility.
   */
  private doubleToLongBits(value: number): number {
    const buffer = new ArrayBuffer(8);
    const floatView = new Float64Array(buffer);
    const intView = new BigInt64Array(buffer);
    floatView[0] = value;
    return Number(intView[0]);
  }
}

/**
 * INDEXED STRATEGY (Undirected Relationships)
 *
 * Stores relationships in both directions for undirected graphs.
 * Automatically creates reverse edges for bidirectional traversal.
 *
 * WHEN TO USE:
 * - Undirected graphs (friendships, physical connections, etc.)
 * - Algorithms requiring bidirectional traversal
 * - Social networks, road networks, molecular structures
 *
 * DESIGN:
 * - Composition pattern: delegates to two NonIndexed builders
 * - Forward builder: A → B relationships
 * - Reverse builder: B → A relationships (automatically created)
 * - Synchronized flushing for consistency
 */
export class IndexedLocalRelationshipsBuilder extends LocalRelationshipsBuilder {
  private readonly forwardBuilder: NonIndexedLocalRelationshipsBuilder;
  private readonly reverseBuilder: NonIndexedLocalRelationshipsBuilder;

  constructor(forwardBuilder: NonIndexedLocalRelationshipsBuilder, reverseBuilder: NonIndexedLocalRelationshipsBuilder) {
    super();
    this.forwardBuilder = forwardBuilder;
    this.reverseBuilder = reverseBuilder;
  }

  /**
   * Add undirected relationship (creates both A→B and B→A).
   */
  addRelationship(source: number, target: number): void {
    this.forwardBuilder.addRelationship(source, target);
    this.reverseBuilder.addRelationship(target, source); // Reversed for undirected
  }

  /**
   * Add undirected relationship with property (both directions get same property).
   */
  addRelationshipWithProperty(source: number, target: number, relationshipPropertyValue: number): void {
    this.forwardBuilder.addRelationshipWithProperty(source, target, relationshipPropertyValue);
    this.reverseBuilder.addRelationshipWithProperty(target, source, relationshipPropertyValue);
  }

  /**
   * Add undirected relationship with multiple properties (both directions get same properties).
   */
  addRelationshipWithProperties(source: number, target: number, relationshipPropertyValues: number[]): void {
    this.forwardBuilder.addRelationshipWithProperties(source, target, relationshipPropertyValues);
    this.reverseBuilder.addRelationshipWithProperties(target, source, relationshipPropertyValues);
  }

  /**
   * Close both builders ensuring all data is flushed.
   * Uses try-finally to ensure cleanup even if one builder fails.
   */
  close(): void {
    try {
      this.forwardBuilder.close();
    } finally {
      this.reverseBuilder.close();
    }
  }
}

// =============================================================================
// FACTORY AND CONFIGURATION
// =============================================================================

/**
 * Factory for creating LocalRelationshipsBuilder instances.
 * Provides convenient methods for different graph orientations.
 */
export class LocalRelationshipsBuilderFactory {

  /**
   * Create a directed relationship builder.
   */
  static createNonIndexed(
    singleTypeRelationshipImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    propertyCount = 0
  ): NonIndexedLocalRelationshipsBuilder {
    return new NonIndexedLocalRelationshipsBuilder(
      singleTypeRelationshipImporter,
      bufferSize,
      propertyCount
    );
  }

  /**
   * Create an undirected relationship builder.
   */
  static createIndexed(
    forwardImporter: SingleTypeRelationshipImporter,
    reverseImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    propertyCount = 0
  ): IndexedLocalRelationshipsBuilder {
    const forwardBuilder = new NonIndexedLocalRelationshipsBuilder(
      forwardImporter,
      bufferSize,
      propertyCount
    );

    const reverseBuilder = new NonIndexedLocalRelationshipsBuilder(
      reverseImporter,
      bufferSize,
      propertyCount
    );

    return new IndexedLocalRelationshipsBuilder(forwardBuilder, reverseBuilder);
  }

  /**
   * Create a builder based on orientation configuration.
   * Convenience method that chooses the right strategy.
   */
  static create(config: RelationshipBuilderConfig): LocalRelationshipsBuilder {
    if (config.isUndirected) {
      if (!config.reverseImporter) {
        throw new Error('Reverse importer required for undirected relationships');
      }
      return this.createIndexed(
        config.forwardImporter,
        config.reverseImporter,
        config.bufferSize,
        config.propertyCount
      );
    } else {
      return this.createNonIndexed(
        config.forwardImporter,
        config.bufferSize,
        config.propertyCount
      );
    }
  }
}

/**
 * Configuration for relationship builder creation.
 * Encapsulates all options needed for flexible builder creation.
 */
export interface RelationshipBuilderConfig {
  /** Primary importer for forward direction */
  forwardImporter: SingleTypeRelationshipImporter;

  /** Optional reverse importer for undirected graphs */
  reverseImporter?: SingleTypeRelationshipImporter;

  /** Buffer size for batching relationships */
  bufferSize: number;

  /** Number of properties per relationship */
  propertyCount: number;

  /** Whether to create bidirectional edges */
  isUndirected: boolean;
}
