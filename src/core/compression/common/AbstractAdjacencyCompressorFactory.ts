/**
 * Abstract factory for creating adjacency compressors.
 *
 * **Design Pattern**: Template Method + Factory
 * **Purpose**: Provides the scaffolding for building compressed graph structures
 * while letting subclasses define the specific compression strategy.
 *
 * **The Big Picture**: This is the "assembly line foreman" that coordinates:
 * - Node degree tracking
 * - Offset management for compressed data
 * - Property alignment with adjacency data
 * - Relationship counting for statistics
 */

import { AdjacencyList } from '../../api/AdjacencyList';
import { AdjacencyProperties } from '../../api/AdjacencyProperties';
import { AdjacencyCompressor } from '../../api/compress/AdjacencyCompressor';
import { AdjacencyCompressorFactory } from '../../api/compress/AdjacencyCompressorFactory';
import { AdjacencyListBuilder } from '../../api/compress/AdjacencyListBuilder';
import { AdjacencyListsWithProperties } from '../../api/compress/AdjacencyListsWithProperties';
import { Aggregation } from '../../core/Aggregation';
import { HugeIntArray } from '../../collections/ha/HugeIntArray';
import { HugeLongArray } from '../../collections/ha/HugeLongArray';

/**
 * Thread-safe relationship counter (JavaScript doesn't have LongAdder, so we simulate)
 */
class LongAdder {
  private value = 0;

  add(delta: number): void {
    this.value += delta;
  }

  longValue(): number {
    return this.value;
  }

  increment(): void {
    this.value++;
  }
}

export abstract class AbstractAdjacencyCompressorFactory<TARGET_PAGE, PROPERTY_PAGE>
  implements AdjacencyCompressorFactory {

  // ============================================================================
  // FACTORY CONFIGURATION
  // ============================================================================

  private readonly nodeCountSupplier: () => number;
  private readonly adjacencyBuilder: AdjacencyListBuilder<TARGET_PAGE, AdjacencyList>;
  private readonly propertyBuilders: AdjacencyListBuilder<PROPERTY_PAGE, AdjacencyProperties>[];
  private readonly noAggregation: boolean;
  private readonly aggregations: Aggregation[];
  private readonly relationshipCounter: LongAdder;

  // ============================================================================
  // COMPRESSION STATE TRACKING
  // ============================================================================

  /**
   * Node degrees - how many neighbors each node has after compression.
   * **Key Insight**: Degrees can change due to aggregation of parallel edges.
   */
  private adjacencyDegrees?: HugeIntArray;

  /**
   * Byte offsets where each node's compressed adjacency list starts.
   * **Performance**: Enables O(1) random access to any node's neighbors.
   */
  private adjacencyOffsets?: HugeLongArray;

  /**
   * Byte offsets where each node's compressed properties start.
   * **Alignment**: Properties must stay aligned with adjacency data.
   */
  private propertyOffsets?: HugeLongArray;

  constructor(
    nodeCountSupplier: () => number,
    adjacencyBuilder: AdjacencyListBuilder<TARGET_PAGE, AdjacencyList>,
    propertyBuilders: AdjacencyListBuilder<PROPERTY_PAGE, AdjacencyProperties>[],
    noAggregation: boolean,
    aggregations: Aggregation[]
  ) {
    this.nodeCountSupplier = nodeCountSupplier;
    this.adjacencyBuilder = adjacencyBuilder;
    this.propertyBuilders = propertyBuilders;
    this.noAggregation = noAggregation;
    this.aggregations = aggregations;
    this.relationshipCounter = new LongAdder();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Initialize with fresh arrays based on node count.
   *
   * **Use Case**: Building a new graph from scratch.
   */
  init(): void {
    const nodeCount = this.nodeCountSupplier();
    this.adjacencyDegrees = HugeIntArray.newArray(nodeCount);
    this.adjacencyOffsets = HugeLongArray.newArray(nodeCount);
    this.propertyOffsets = HugeLongArray.newArray(nodeCount);
  }

  /**
   * Initialize with existing arrays.
   *
   * **Use Case**: Rebuilding/recompressing an existing graph structure.
   * Useful for format conversions or compression strategy changes.
   */
  initWithArrays(
    degrees: HugeIntArray,
    adjacencyOffsets: HugeLongArray,
    propertyOffsets: HugeLongArray
  ): void {
    this.adjacencyDegrees = degrees;
    this.adjacencyOffsets = adjacencyOffsets;
    this.propertyOffsets = propertyOffsets;
  }

  // ============================================================================
  // STATISTICS & MONITORING
  // ============================================================================

  /**
   * Get the relationship counter for statistics.
   *
   * **Thread Safety**: Multiple compressor threads can safely increment
   * the same counter to track total relationships processed.
   */
  relationshipCounter(): LongAdder {
    return this.relationshipCounter;
  }

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Build the final compressed graph structure.
   *
   * **The Grand Finale**: Combines all compressed adjacency lists and
   * properties into a unified graph structure ready for queries.
   *
   * @param allowReordering Whether to optimize memory layout for performance
   * @returns Complete compressed graph with adjacency lists + properties
   */
  build(allowReordering: boolean): AdjacencyListsWithProperties {
    if (!this.adjacencyDegrees || !this.adjacencyOffsets || !this.propertyOffsets) {
      throw new Error("Factory not initialized - call init() first");
    }

    // ✅ BUILD COMPRESSED ADJACENCY LISTS
    const adjacencyList = this.adjacencyBuilder.build(
      this.adjacencyDegrees,
      this.adjacencyOffsets,
      allowReordering
    );

    // ✅ BUILD COMPRESSED PROPERTIES (aligned with adjacency data)
    const properties: AdjacencyProperties[] = [];
    for (const propertyBuilder of this.propertyBuilders) {
      const property = propertyBuilder.build(
        this.adjacencyDegrees,
        this.propertyOffsets,
        allowReordering
      );
      properties.push(property);
    }

    // ✅ COMBINE INTO UNIFIED STRUCTURE
    return {
      adjacency: adjacencyList,
      properties: properties,
      relationshipCount: this.relationshipCounter.longValue()
    } as AdjacencyListsWithProperties;
  }

  /**
   * Create a new compressor instance.
   *
   * **Template Method**: Delegates to subclass to create the specific
   * compression implementation while providing all the shared state.
   */
  createCompressor(): AdjacencyCompressor {
    if (!this.adjacencyDegrees || !this.adjacencyOffsets || !this.propertyOffsets) {
      throw new Error("Factory not initialized - call init() first");
    }

    return this.createCompressorFromInternalState(
      this.adjacencyBuilder,
      this.propertyBuilders,
      this.noAggregation,
      this.aggregations,
      this.adjacencyDegrees,
      this.adjacencyOffsets,
      this.propertyOffsets
    );
  }

  // ============================================================================
  // ABSTRACT METHODS - Subclass Implementation
  // ============================================================================

  /**
   * Create the specific compressor implementation.
   *
   * **Subclass Responsibility**: Define how to create compressors with
   * the specific compression strategy (Uncompressed, Mixed, Packed, etc.)
   */
  protected abstract createCompressorFromInternalState(
    adjacencyBuilder: AdjacencyListBuilder<TARGET_PAGE, AdjacencyList>,
    propertyBuilders: AdjacencyListBuilder<PROPERTY_PAGE, AdjacencyProperties>[],
    noAggregation: boolean,
    aggregations: Aggregation[],
    adjacencyDegrees: HugeIntArray,
    adjacencyOffsets: HugeLongArray,
    propertyOffsets: HugeLongArray
  ): AdjacencyCompressor;
}
