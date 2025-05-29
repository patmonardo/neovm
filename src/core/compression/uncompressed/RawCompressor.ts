/**
 * Raw (Uncompressed) Adjacency Compressor
 *
 * **The Fast Lane**: Zero compression overhead, maximum query performance.
 * Perfect for:
 * - Small graphs (memory isn't a concern)
 * - Hot data (frequently accessed adjacency lists)
 * - Real-time applications (no decompression latency)
 *
 * **Trade-off**: 8 bytes per node ID vs ~1-2 bytes with VarLong compression
 * **Benefit**: Zero CPU overhead for queries - direct array access
 *
 * **Use Cases**:
 * - Interactive graph applications
 * - Small knowledge graphs
 * - Hot partition data in distributed systems
 */

import { AdjacencyCompressor } from '../../api/compress/AdjacencyCompressor';
import { AdjacencyCompressorFactory } from '../../api/compress/AdjacencyCompressorFactory';
import { AdjacencyListBuilder } from '../../api/compress/AdjacencyListBuilder';
import { AdjacencyListBuilderFactory } from '../../api/compress/AdjacencyListBuilderFactory';
import { ModifiableSlice } from '../../api/compress/ModifiableSlice';
import { AdjacencyList } from '../../api/AdjacencyList';
import { AdjacencyProperties } from '../../api/AdjacencyProperties';
import { PropertyMappings } from '../../PropertyMappings';
import { Aggregation } from '../../core/Aggregation';
import { AbstractAdjacencyCompressorFactory } from '../common/AbstractAdjacencyCompressorFactory';
import { MemoryTracker } from '../common/MemoryTracker';
import { HugeIntArray } from '../../collections/ha/HugeIntArray';
import { HugeLongArray } from '../../collections/ha/HugeLongArray';

// ============================================================================
// SEPARATE FACTORY CLASS (TypeScript style)
// ============================================================================

/**
 * Factory for creating Raw (uncompressed) compressors.
 *
 * **Memory Strategy**: Raw arrays for both adjacency lists AND properties.
 * No compression anywhere - pure speed optimization.
 */
export class RawCompressorFactory extends AbstractAdjacencyCompressorFactory<number[], number[]> {

  constructor(
    nodeCountSupplier: () => number,
    adjacencyBuilder: AdjacencyListBuilder<number[], AdjacencyList>,
    propertyBuilders: AdjacencyListBuilder<number[], AdjacencyProperties>[],
    noAggregation: boolean,
    aggregations: Aggregation[]
  ) {
    super(
      nodeCountSupplier,
      adjacencyBuilder,
      propertyBuilders,
      noAggregation,
      aggregations
    );
  }

  /**
   * Create raw compressor with aligned property allocators.
   *
   * **Same Pattern**: First property gets address, others align to it.
   * This pattern works regardless of compression strategy!
   */
  protected createCompressorFromInternalState(
    adjacencyBuilder: AdjacencyListBuilder<number[], AdjacencyList>,
    propertyBuilders: AdjacencyListBuilder<number[], AdjacencyProperties>[],
    noAggregation: boolean,
    aggregations: Aggregation[],
    adjacencyDegrees: HugeIntArray,
    adjacencyOffsets: HugeLongArray,
    propertyOffsets: HugeLongArray
  ): AdjacencyCompressor {

    let firstAllocator: AdjacencyListBuilder.Allocator<number[]> | null = null;
    let otherAllocators: AdjacencyListBuilder.PositionalAllocator<number[]>[] | null = null;

    if (propertyBuilders.length > 0) {
      // ✅ FIRST PROPERTY: Gets an address
      firstAllocator = propertyBuilders[0].newAllocator();

      // ✅ OTHER PROPERTIES: Align to first property's addresses
      otherAllocators = [];
      for (let i = 1; i < propertyBuilders.length; i++) {
        otherAllocators.push(propertyBuilders[i].newPositionalAllocator());
      }
    }

    return new RawCompressor(
      adjacencyBuilder.newAllocator(),
      firstAllocator,
      otherAllocators,
      adjacencyDegrees,
      adjacencyOffsets,
      propertyOffsets,
      noAggregation,
      aggregations
    );
  }
}

// ============================================================================
// MAIN RAW COMPRESSOR CLASS
// ============================================================================

export class RawCompressor implements AdjacencyCompressor {

  // ============================================================================
  // STATIC FACTORY METHOD
  // ============================================================================

  /**
   * Create factory for Raw compressors.
   *
   * **Key Difference from VarLong**: Both adjacency AND properties use
   * raw number arrays - no compression anywhere in the pipeline.
   *
   * **Performance**: Maximum speed, maximum memory usage.
   */
  static factory(
    nodeCountSupplier: () => number,
    adjacencyListBuilderFactory: AdjacencyListBuilderFactory<number[], AdjacencyList, number[], AdjacencyProperties>,
    propertyMappings: PropertyMappings,
    aggregations: Aggregation[],
    noAggregation: boolean,
    memoryTracker: MemoryTracker
  ): AdjacencyCompressorFactory {

    // ✅ CREATE PROPERTY BUILDERS: All uncompressed
    const propertyBuilders: AdjacencyListBuilder<number[], AdjacencyProperties>[] = [];
    for (let i = 0; i < propertyMappings.numberOfMappings(); i++) {
      propertyBuilders.push(
        adjacencyListBuilderFactory.newAdjacencyPropertiesBuilder(memoryTracker)
      );
    }

    return new RawCompressorFactory(
      nodeCountSupplier,
      adjacencyListBuilderFactory.newAdjacencyListBuilder(memoryTracker),
      propertyBuilders,
      noAggregation,
      aggregations
    );
  }

  // ============================================================================
  // COMPRESSOR STATE
  // ============================================================================

  /**
   * Allocator for uncompressed adjacency arrays.
   * **Storage**: Raw number arrays (8 bytes per node ID)
   */
  private readonly adjacencyAllocator: AdjacencyListBuilder.Allocator<number[]>;

  /**
   * Allocator for first property type.
   * **Storage**: Raw number arrays (8 bytes per property value)
   */
  private readonly firstPropertyAllocator: AdjacencyListBuilder.Allocator<number[]> | null;

  /**
   * Positional allocators for additional property types.
   */
  private readonly otherPropertyAllocators: AdjacencyListBuilder.PositionalAllocator<number[]>[] | null;

  /**
   * Node degrees after aggregation.
   */
  private readonly adjacencyDegrees: HugeIntArray;

  /**
   * Offsets where each node's adjacency data starts.
   */
  private readonly adjacencyOffsets: HugeLongArray;

  /**
   * Offsets where each node's property data starts.
   */
  private readonly propertyOffsets: HugeLongArray;

  /**
   * Whether to skip aggregation logic.
   */
  private readonly noAggregation: boolean;

  /**
   * Aggregation strategies for each property type.
   */
  private readonly aggregations: Aggregation[];

  /**
   * Reusable slice for allocations.
   */
  private readonly slice: ModifiableSlice<number[]>;

  constructor(
    adjacencyAllocator: AdjacencyListBuilder.Allocator<number[]>,
    firstPropertyAllocator: AdjacencyListBuilder.Allocator<number[]> | null,
    otherPropertyAllocators: AdjacencyListBuilder.PositionalAllocator<number[]>[] | null,
    adjacencyDegrees: HugeIntArray,
    adjacencyOffsets: HugeLongArray,
    propertyOffsets: HugeLongArray,
    noAggregation: boolean,
    aggregations: Aggregation[]
  ) {
    this.adjacencyAllocator = adjacencyAllocator;
    this.firstPropertyAllocator = firstPropertyAllocator;
    this.otherPropertyAllocators = otherPropertyAllocators;
    this.adjacencyDegrees = adjacencyDegrees;
    this.adjacencyOffsets = adjacencyOffsets;
    this.propertyOffsets = propertyOffsets;
    this.noAggregation = noAggregation;
    this.aggregations = aggregations;

    this.slice = ModifiableSlice.create();
  }

  // ============================================================================
  // MAIN COMPRESSION API
  // ============================================================================

  /**
   * "Compress" a node's adjacency list (actually just sort + aggregate).
   *
   * **No Actual Compression**: We sort, aggregate parallel edges,
   * and store as raw arrays. The "compression" is just duplicate removal!
   *
   * **Performance**: Fastest possible - direct array copy to storage.
   *
   * @param nodeId The node being processed
   * @param targets Array of neighbor node IDs
   * @param properties Array of edge properties (optional)
   * @param degree Number of relationships
   * @returns Final degree after aggregation
   */
  compress(nodeId: number, targets: number[], properties: number[][] | null, degree: number): number {
    if (properties !== null) {
      return this.withProperties(nodeId, targets, properties, degree);
    } else {
      return this.withoutProperties(nodeId, targets, degree);
    }
  }

  /**
   * Clean up allocator resources.
   */
  close(): void {
    this.adjacencyAllocator.close();

    if (this.firstPropertyAllocator !== null) {
      this.firstPropertyAllocator.close();
    }

    if (this.otherPropertyAllocators !== null) {
      for (const otherPropertyAllocator of this.otherPropertyAllocators) {
        if (otherPropertyAllocator !== null) {
          otherPropertyAllocator.close();
        }
      }
    }
  }

  // ============================================================================
  // PROCESSING WITHOUT PROPERTIES
  // ============================================================================

  /**
   * Process adjacency list without edge properties.
   *
   * **Simple Case**:
   * 1. Sort the adjacency list
   * 2. Remove duplicates (aggregate parallel edges)
   * 3. Copy to storage as raw array
   * 4. Store degree and offset
   *
   * **Speed**: Fastest possible - just array operations!
   */
  private withoutProperties(nodeId: number, targets: number[], degree: number): number {
    // ✅ STEP 1: Sort and aggregate (remove duplicates)
    degree = this.aggregate(targets, degree, this.aggregations[0]);

    // ✅ STEP 2: Copy raw data to storage
    const address = this.copy(targets, degree);

    // ✅ STEP 3: Store metadata
    this.adjacencyDegrees.set(nodeId, degree);
    this.adjacencyOffsets.set(nodeId, address);

    return degree;
  }

  /**
   * Sort and aggregate adjacency list.
   *
   * **Aggregation Strategy**:
   * - Sort the array for consistency with compressed version
   * - Remove duplicate node IDs (parallel edges)
   * - No property aggregation since no properties here
   *
   * **Example**:
   * Input: [1005, 1002, 1005, 1001] (unsorted with duplicate)
   * Output: [1001, 1002, 1005] (sorted, deduplicated)
   */
  private aggregate(values: number[], length: number, aggregation: Aggregation): number {
    // ✅ SORT: Essential for consistent ordering
    const sortSlice = values.slice(0, length);
    sortSlice.sort((a, b) => a - b);

    // Copy sorted values back
    for (let i = 0; i < length; i++) {
      values[i] = sortSlice[i];
    }

    if (aggregation === Aggregation.NONE) {
      return length;
    }

    // ✅ REMOVE DUPLICATES: In-place deduplication
    let read = 1;
    let write = 1;

    for (; read < length; ++read) {
      const value = values[read];
      if (value !== values[read - 1]) {
        values[write++] = value;
      }
    }

    return write;
  }

  // ============================================================================
  // PROCESSING WITH PROPERTIES
  // ============================================================================

  /**
   * Process adjacency list with edge properties.
   *
   * **Complex Case**:
   * 1. Sort targets and reorder properties to match
   * 2. Aggregate parallel edges based on property aggregation strategies
   * 3. Copy adjacency data as raw array
   * 4. Copy property data aligned with adjacency
   *
   * **Key Challenge**: Keep properties aligned after sorting!
   */
  private withProperties(
    nodeId: number,
    targets: number[],
    unsortedProperties: number[][],
    degree: number
  ): number {
    // ✅ STEP 1: Create temporary arrays for sorted properties
    const sortedProperties: number[][] = [];
    for (let i = 0; i < unsortedProperties.length; i++) {
      sortedProperties.push(new Array<number>(degree));
    }

    // ✅ STEP 2: Sort targets and reorder properties
    degree = this.aggregateWithProperties(
      targets,
      degree,
      unsortedProperties,
      sortedProperties,
      this.aggregations
    );

    // ✅ STEP 3: Copy adjacency data (raw array)
    const address = this.copy(targets, degree);

    // ✅ STEP 4: Copy property data (aligned with adjacency)
    this.copyProperties(sortedProperties, degree, nodeId);

    // ✅ STEP 5: Store metadata
    this.adjacencyDegrees.set(nodeId, degree);
    this.adjacencyOffsets.set(nodeId, address);

    return degree;
  }

  /**
   * Sort targets and aggregate properties for parallel edges.
   *
   * **The Complex Algorithm**: This handles the full case where we have
   * multiple edge properties that need to stay aligned with sorted targets.
   *
   * **Aggregation Logic**:
   * - Sort by target node ID using indirect sort
   * - For parallel edges (same target), aggregate properties
   * - Keep only one edge per unique target
   *
   * **Example**:
   * Targets: [1002, 1001, 1002] with weights [1.0, 2.0, 0.5]
   * Result: [1001, 1002] with weights [2.0, 1.5] (aggregated)
   */
  private aggregateWithProperties(
    values: number[],
    length: number,
    unsortedProperties: number[][],
    sortedProperties: number[][],
    aggregations: Aggregation[]
  ): number {
    // ✅ STEP 1: Create indirect sort order
    const indices = Array.from({ length }, (_, i) => i);
    indices.sort((a, b) => values[a] - values[b]);

    const outValues = new Array<number>(length);

    // ✅ STEP 2: Process first relationship
    const firstSortIdx = indices[0];
    let value = values[firstSortIdx];

    outValues[0] = value;
    for (let i = 0; i < unsortedProperties.length; i++) {
      sortedProperties[i][0] = unsortedProperties[i][firstSortIdx];
    }

    let input = 1;
    let output = 1;

    if (this.noAggregation) {
      // ✅ NO AGGREGATION: Just reorder properties to match sorted targets
      for (; input < length; ++input) {
        const sortIdx = indices[input];

        for (let i = 0; i < unsortedProperties.length; i++) {
          sortedProperties[i][output] = unsortedProperties[i][sortIdx];
        }

        outValues[output++] = values[sortIdx];
      }
    } else {
      // ✅ WITH AGGREGATION: Merge parallel edges
      for (; input < length; ++input) {
        const sortIdx = indices[input];
        const delta = values[sortIdx] - value;
        value = values[sortIdx];

        if (delta > 0) {
          // ✅ NEW TARGET: Add new relationship
          for (let i = 0; i < unsortedProperties.length; i++) {
            sortedProperties[i][output] = unsortedProperties[i][sortIdx];
          }
          outValues[output++] = value;
        } else {
          // ✅ PARALLEL EDGE: Aggregate with previous relationship
          for (let i = 0; i < unsortedProperties.length; i++) {
            const aggregation = aggregations[i];
            const existingIdx = output - 1;
            const outProperty = sortedProperties[i];

            // Convert between number and double for aggregation
            const existingProperty = this.longBitsToDouble(outProperty[existingIdx]);
            const newProperty = this.longBitsToDouble(unsortedProperties[i][sortIdx]);
            const aggregatedProperty = aggregation.merge(existingProperty, newProperty);
            outProperty[existingIdx] = this.doubleToLongBits(aggregatedProperty);
          }
        }
      }
    }

    // ✅ STEP 3: Copy results back to original arrays
    for (let i = 0; i < output; i++) {
      values[i] = outValues[i];
    }

    for (let i = 0; i < sortedProperties.length; i++) {
      for (let j = 0; j < output; j++) {
        unsortedProperties[i][j] = sortedProperties[i][j];
      }
    }

    return output;
  }

  // ============================================================================
  // STORAGE OPERATIONS
  // ============================================================================

  /**
   * Copy raw adjacency data to storage.
   *
   * **Raw Copy**: No compression, no encoding - just copy the array!
   * This is the fastest possible storage operation.
   *
   * @param data Sorted adjacency array
   * @param degree Number of neighbors
   * @returns Storage address for offset tracking
   */
  private copy(data: number[], degree: number): number {
    const slice = this.slice;
    const address = this.adjacencyAllocator.allocate(degree, slice);

    // ✅ RAW COPY: Direct array copy - maximum speed!
    for (let i = 0; i < degree; i++) {
      slice.slice()[slice.offset() + i] = data[i];
    }

    return address;
  }

  /**
   * Copy edge properties aligned with adjacency data.
   *
   * **Same Pattern**: First property gets address, others align to it.
   * This pattern is consistent across all compression strategies.
   */
  private copyProperties(properties: number[][], degree: number, nodeId: number): void {
    console.assert(this.firstPropertyAllocator !== null, "First property allocator must exist");
    console.assert(this.otherPropertyAllocators !== null, "Other property allocators must exist");

    // ✅ FIRST PROPERTY: Gets an address
    const slice = this.slice;
    const address = this.firstPropertyAllocator!.allocate(degree, slice);

    for (let i = 0; i < degree; i++) {
      slice.slice()[slice.offset() + i] = properties[0][i];
    }

    // ✅ OTHER PROPERTIES: Write at positions relative to first
    for (let i = 1; i < properties.length; i++) {
      this.otherPropertyAllocators![i - 1].writeAt(address, properties[i], degree);
    }

    // ✅ STORE PROPERTY OFFSET
    this.propertyOffsets.set(nodeId, address);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert JavaScript number to Java-style long bits representation.
   * **Note**: This simulates Java's Double.doubleToLongBits() behavior.
   */
  private doubleToLongBits(value: number): number {
    // In JavaScript, we can store the number directly
    // Java uses IEEE 754 bit manipulation, but JS handles this internally
    return value;
  }

  /**
   * Convert Java-style long bits to JavaScript number.
   * **Note**: This simulates Java's Double.longBitsToDouble() behavior.
   */
  private longBitsToDouble(bits: number): number {
    // In JavaScript, we can return the number directly
    return bits;
  }
}
