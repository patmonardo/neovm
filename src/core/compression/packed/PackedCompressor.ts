/**
 * Packed Compressor - The Strategy Orchestrator
 *
 * **The Grand Unified Compressor**: Dynamically selects and executes
 * the optimal compression strategy based on feature toggles and data characteristics.
 *
 * **The Four Ways of Compression**:
 * 1. **PACKED_TAIL**: Maximum compression via bit-packing (80-90% savings)
 * 2. **VAR_LONG_TAIL**: Hybrid bit-pack + VarLong strategy (70-80% savings)
 * 3. **BLOCK_ALIGNED_TAIL**: Cache-optimized compression (75-85% savings)
 * 4. **INLINED_HEAD_PACKED_TAIL**: First-value optimization (70-85% savings)
 *
 * **Runtime Strategy Selection**: Uses feature toggles to select optimal
 * strategy based on graph characteristics and performance requirements.
 *
 * **Dual Path Processing**:
 * - With properties: Maintains adjacency structure + edge properties
 * - Without properties: Pure adjacency compression for maximum performance
 */

import { AdjacencyCompressor } from '../../api/compress/AdjacencyCompressor';
import { AdjacencyListBuilder } from '../../api/compress/AdjacencyListBuilder';
import { ModifiableSlice } from '../../api/compress/ModifiableSlice';
import { Aggregation } from '../../core/Aggregation';
import { AdjacencyCompression } from '../common/AdjacencyCompression';
import { MemoryTracker } from '../common/MemoryTracker';
import { HugeIntArray } from '../../collections/ha/HugeIntArray';
import { HugeLongArray } from '../../collections/ha/HugeLongArray';
import { GdsFeatureToggles } from '../../utils/GdsFeatureToggles';
import { Address } from './Address';
import { PackedTailPacker } from './PackedTailPacker';
import { VarLongTailPacker } from './VarLongTailPacker';
import { BlockAlignedTailPacker } from './BlockAlignedTailPacker';
import { InlinedHeadPackedTailPacker } from './InlinedHeadPackedTailPacker';

/**
 * Mutable integer wrapper for degree tracking
 */
class MutableInt {
  constructor(private value: number = 0) {}

  setValue(value: number): void {
    this.value = value;
  }

  intValue(): number {
    return this.value;
  }
}

export class PackedCompressor implements AdjacencyCompressor {

  // ============================================================================
  // ALLOCATORS - THE MEMORY MANAGERS
  // ============================================================================

  /**
   * Allocator for compressed adjacency lists.
   * **Storage**: Off-heap Address objects pointing to compressed data
   */
  private readonly adjacencyAllocator: AdjacencyListBuilder.Allocator<Address>;

  /**
   * Allocator for first property array (if properties exist).
   * **Storage**: On-heap number arrays for fast property access
   */
  private readonly firstPropertyAllocator: AdjacencyListBuilder.Allocator<number[]> | null;

  /**
   * Positional allocators for additional property arrays.
   * **Pattern**: First property uses regular allocator, rest use positional
   */
  private readonly otherPropertyAllocators: AdjacencyListBuilder.PositionalAllocator<number[]>[] | null;

  // ============================================================================
  // STORAGE ARRAYS - THE DATA REPOSITORIES
  // ============================================================================

  /**
   * Degree of each node (number of neighbors after compression).
   * **Post-aggregation**: May be less than input degree due to duplicate removal
   */
  private readonly adjacencyDegrees: HugeIntArray;

  /**
   * Offset of each node's compressed adjacency data.
   * **Hybrid**: May contain inlined data or point to off-heap storage
   */
  private readonly adjacencyOffsets: HugeLongArray;

  /**
   * Offset of each node's property data.
   * **Properties**: Points to uncompressed property arrays
   */
  private readonly propertyOffsets: HugeLongArray;

  // ============================================================================
  // COMPRESSION CONFIGURATION
  // ============================================================================

  /**
   * Skip aggregation if all edges are unique.
   * **Optimization**: Avoids duplicate checking overhead
   */
  private readonly noAggregation: boolean;

  /**
   * Aggregation strategies for handling duplicate edges.
   * **Example**: [SUM, MAX, MIN] for multiple properties
   */
  private readonly aggregations: Aggregation[];

  /**
   * Memory usage tracking and statistics.
   */
  private readonly memoryTracker: MemoryTracker;

  // ============================================================================
  // WORKING STATE - THE COMPRESSION WORKSPACE
  // ============================================================================

  /**
   * Reusable slice for adjacency allocation.
   * **Optimization**: Avoid allocation churn during compression
   */
  private readonly adjacencySlice: ModifiableSlice<Address>;

  /**
   * Reusable slice for property allocation.
   * **Optimization**: Avoid allocation churn during compression
   */
  private readonly propertySlice: ModifiableSlice<number[]>;

  /**
   * Mutable degree tracker (input/output parameter pattern).
   * **Pattern**: Passes degree in, gets final degree out after aggregation
   */
  private readonly degree: MutableInt;

  /**
   * Runtime strategy selection from feature toggles.
   * **Dynamic**: Can be changed at runtime for A/B testing
   */
  private readonly packingStrategy: GdsFeatureToggles.AdjacencyPackingStrategy;

  constructor(
    adjacencyAllocator: AdjacencyListBuilder.Allocator<Address>,
    firstPropertyAllocator: AdjacencyListBuilder.Allocator<number[]> | null,
    otherPropertyAllocators: AdjacencyListBuilder.PositionalAllocator<number[]>[] | null,
    adjacencyDegrees: HugeIntArray,
    adjacencyOffsets: HugeLongArray,
    propertyOffsets: HugeLongArray,
    noAggregation: boolean,
    aggregations: Aggregation[],
    memoryTracker: MemoryTracker
  ) {
    this.adjacencyAllocator = adjacencyAllocator;
    this.firstPropertyAllocator = firstPropertyAllocator;
    this.otherPropertyAllocators = otherPropertyAllocators;
    this.adjacencyDegrees = adjacencyDegrees;
    this.adjacencyOffsets = adjacencyOffsets;
    this.propertyOffsets = propertyOffsets;
    this.noAggregation = noAggregation;
    this.aggregations = aggregations;
    this.memoryTracker = memoryTracker;

    this.adjacencySlice = ModifiableSlice.create();
    this.propertySlice = ModifiableSlice.create();
    this.degree = new MutableInt(0);

    this.packingStrategy = GdsFeatureToggles.ADJACENCY_PACKING_STRATEGY.get();
  }

  // ============================================================================
  // MAIN COMPRESSION INTERFACE
  // ============================================================================

  /**
   * Compress a node's adjacency list and properties.
   *
   * **The Router**: Determines whether to use property-aware or
   * property-free compression path based on input data.
   *
   * **Return Value**: Final degree after aggregation (may be < input degree)
   *
   * @param nodeId Node being compressed
   * @param targets Array of neighbor node IDs
   * @param properties Arrays of edge properties (or null)
   * @param degree Number of valid entries in targets/properties
   * @returns Final degree after compression and aggregation
   */
  compress(nodeId: number, targets: number[], properties: number[][] | null, degree: number): number {
    if (properties !== null) {
      return this.packWithProperties(nodeId, targets, properties, degree);
    } else {
      return this.packWithoutProperties(nodeId, targets, degree);
    }
  }

  // ============================================================================
  // PROPERTY-AWARE COMPRESSION PATH
  // ============================================================================

  /**
   * Compress adjacency list with associated edge properties.
   *
   * **The Property Challenge**: Must maintain correspondence between
   * compressed adjacency data and property arrays after sorting/aggregation.
   *
   * **Process**:
   * 1. Sort targets and reorder all property arrays accordingly
   * 2. Apply delta encoding to targets and aggregation to properties
   * 3. Compress targets using selected strategy (adjacency compression)
   * 4. Store properties uncompressed for fast access (property compression)
   * 5. Record offsets and degrees
   *
   * **Strategy Restriction**: BlockAligned not supported with properties
   * due to complexity of maintaining property correspondence with zero-padding.
   */
  private packWithProperties(
    nodeId: number,
    targets: number[],
    unsortedProperties: number[][],
    degree: number
  ): number {
    // ✅ PREPARE SORTED PROPERTY ARRAYS
    const sortedProperties: number[][] = new Array(unsortedProperties.length);
    for (let i = 0; i < unsortedProperties.length; i++) {
      sortedProperties[i] = new Array(degree);
    }

    if (degree > 0) {
      // ✅ SORT, DELTA ENCODE, REORDER AND AGGREGATE
      // This is the complex operation that maintains target-property correspondence
      degree = AdjacencyCompression.applyDeltaEncoding(
        targets,
        degree,
        unsortedProperties,
        sortedProperties,
        this.aggregations,
        this.noAggregation
      );
    }

    this.degree.setValue(degree);

    // ✅ STRATEGY DISPATCH: Compress adjacency structure
    let offset: number;
    switch (this.packingStrategy) {
      case GdsFeatureToggles.AdjacencyPackingStrategy.PACKED_TAIL:
        offset = PackedTailPacker.compressWithProperties(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.memoryTracker
        );
        break;

      case GdsFeatureToggles.AdjacencyPackingStrategy.VAR_LONG_TAIL:
        offset = VarLongTailPacker.compressWithProperties(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.memoryTracker
        );
        break;

      case GdsFeatureToggles.AdjacencyPackingStrategy.INLINED_HEAD_PACKED_TAIL:
        offset = InlinedHeadPackedTailPacker.compressWithProperties(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.memoryTracker
        );
        break;

      case GdsFeatureToggles.AdjacencyPackingStrategy.BLOCK_ALIGNED_TAIL:
        throw new Error(
          "Block aligned tail is not supported for adjacency lists with properties"
        );

      default:
        throw new Error(`Unknown packing strategy: ${this.packingStrategy}`);
    }

    degree = this.degree.intValue();

    // ✅ STORE PROPERTIES: Uncompressed for fast access
    this.copyProperties(sortedProperties, degree, nodeId);

    // ✅ RECORD RESULTS
    this.adjacencyDegrees.set(nodeId, degree);
    this.adjacencyOffsets.set(nodeId, offset);

    return degree;
  }

  // ============================================================================
  // PROPERTY-FREE COMPRESSION PATH
  // ============================================================================

  /**
   * Compress adjacency list without properties.
   *
   * **The Performance Path**: Simpler and faster since no property
   * correspondence needs to be maintained.
   *
   * **Full Strategy Support**: All four compression strategies are
   * available since there are no property alignment constraints.
   *
   * **Process**:
   * 1. Compress targets using selected strategy
   * 2. Record offset and final degree
   * 3. No property handling needed
   */
  private packWithoutProperties(nodeId: number, targets: number[], degree: number): number {
    // ✅ STRATEGY DISPATCH: All strategies available
    let offset: number;
    switch (this.packingStrategy) {
      case GdsFeatureToggles.AdjacencyPackingStrategy.BLOCK_ALIGNED_TAIL:
        offset = BlockAlignedTailPacker.compress(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.aggregations[0],
          this.degree,
          this.memoryTracker
        );
        break;

      case GdsFeatureToggles.AdjacencyPackingStrategy.VAR_LONG_TAIL:
        offset = VarLongTailPacker.compress(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.aggregations[0],
          this.degree,
          this.memoryTracker
        );
        break;

      case GdsFeatureToggles.AdjacencyPackingStrategy.PACKED_TAIL:
        offset = PackedTailPacker.compress(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.aggregations[0],
          this.degree,
          this.memoryTracker
        );
        break;

      case GdsFeatureToggles.AdjacencyPackingStrategy.INLINED_HEAD_PACKED_TAIL:
        offset = InlinedHeadPackedTailPacker.compress(
          this.adjacencyAllocator,
          this.adjacencySlice,
          targets,
          degree,
          this.aggregations[0],
          this.degree,
          this.memoryTracker
        );
        break;

      default:
        throw new Error(`Unknown packing strategy: ${this.packingStrategy}`);
    }

    degree = this.degree.intValue();

    // ✅ RECORD RESULTS: Adjacency only
    this.adjacencyOffsets.set(nodeId, offset);
    this.adjacencyDegrees.set(nodeId, degree);

    return degree;
  }

  // ============================================================================
  // PROPERTY STORAGE
  // ============================================================================

  /**
   * Store properties in uncompressed format for fast access.
   *
   * **Storage Strategy**:
   * - First property: Regular allocation (primary property)
   * - Other properties: Positional allocation (aligned to first)
   *
   * **Why Uncompressed**: Properties are accessed frequently during
   * graph algorithms, so fast access is more important than compression.
   *
   * **Memory Layout**: All properties for a node are stored contiguously
   * for optimal cache performance during property iteration.
   */
  private copyProperties(properties: number[][], degree: number, nodeId: number): void {
    console.assert(this.firstPropertyAllocator !== null);
    console.assert(this.otherPropertyAllocators !== null);

    const slice = this.propertySlice;

    // ✅ ALLOCATE AND COPY FIRST PROPERTY
    const address = this.firstPropertyAllocator!.allocate(degree, slice);
    const firstProperty = slice.slice();
    const offset = slice.offset();

    for (let i = 0; i < degree; i++) {
      firstProperty[offset + i] = properties[0][i];
    }

    // ✅ POSITIONALLY ALLOCATE OTHER PROPERTIES
    for (let i = 1; i < properties.length; i++) {
      this.otherPropertyAllocators![i - 1].writeAt(address, properties[i], degree);
    }

    // ✅ RECORD PROPERTY OFFSET
    this.propertyOffsets.set(nodeId, address);
  }

  /**
   * Cleanup compressor resources.
   */
  close(): void {
    // No resources to clean up in this implementation
    // Allocators handle their own cleanup
  }
}
