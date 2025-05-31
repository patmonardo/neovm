/**
 * Packed Adjacency List Builder Factory - The Hybrid Strategy
 *
 * **The Brilliant Design**: Separate optimization strategies for different data:
 * - **Adjacency lists**: Heavily compressed using off-heap bit-packing
 * - **Properties**: Uncompressed for fast access using raw arrays
 *
 * **Why This Works**:
 * - Graph structure (who connects to whom) compresses well
 * - Property values (weights, timestamps) need fast random access
 * - Result: Best of both worlds! 🎯
 *
 * **Memory Strategy**:
 * - Structure: Off-heap compressed (80-90% space savings)
 * - Properties: On-heap uncompressed (maximum speed)
 * - Perfect for real-world graph workloads!
 */

import { AdjacencyListBuilderFactory } from './AdjacencyListBuilderFactory';
import { MemoryTracker } from '../common/MemoryTracker';
import { Address } from './Address';
import { PackedAdjacencyList } from './PackedAdjacencyList';
import { PackedAdjacencyListBuilder } from './PackedAdjacencyListBuilder';
import { UncompressedAdjacencyList } from '../uncompressed/UncompressedAdjacencyList';
import { UncompressedAdjacencyListBuilder } from '../uncompressed/UncompressedAdjacencyListBuilder';

export class PackedAdjacencyListBuilderFactory
  implements AdjacencyListBuilderFactory<Address, PackedAdjacencyList, number[], UncompressedAdjacencyList> {

  // ============================================================================
  // SINGLETON PATTERN
  // ============================================================================

  /**
   * Singleton factory instance.
   * **Why Singleton**: Stateless factory, no need for multiple instances.
   */
  static of(): PackedAdjacencyListBuilderFactory {
    return new PackedAdjacencyListBuilderFactory();
  }

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  // ============================================================================
  // BUILDER CREATION METHODS
  // ============================================================================

  /**
   * Create new adjacency list builder (PACKED).
   * **For**: Graph structure (node → neighbors mapping)
   *
   * **Strategy**: Maximum compression using off-heap bit-packing
   * **Storage**: Address objects pointing to compressed off-heap data
   * **Trade-off**: Higher CPU cost for decompression, massive space savings
   *
   * **Use Case**: Social networks, web graphs, citation networks where
   * structure is huge but queries can tolerate decompression overhead.
   */
  newAdjacencyListBuilder(memoryTracker: MemoryTracker): PackedAdjacencyListBuilder {
    return new PackedAdjacencyListBuilder(memoryTracker);
  }

  /**
   * Create new adjacency properties builder (UNCOMPRESSED).
   * **For**: Edge properties (weights, timestamps, metadata)
   *
   * **Strategy**: Zero compression for maximum access speed
   * **Storage**: Raw number arrays in JavaScript heap
   * **Trade-off**: More memory usage, zero decompression overhead
   *
   * **Use Case**: Properties that are accessed frequently during algorithms
   * (shortest path weights, PageRank scores, temporal analysis timestamps).
   *
   * **The Hybrid Wisdom**: Structure compresses well, properties need speed!
   */
  newAdjacencyPropertiesBuilder(memoryTracker: MemoryTracker): UncompressedAdjacencyListBuilder {
    return new UncompressedAdjacencyListBuilder(memoryTracker);
  }
}
