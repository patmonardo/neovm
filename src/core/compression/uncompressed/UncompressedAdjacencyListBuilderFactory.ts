/**
 * Factory for creating uncompressed adjacency list builders.
 *
 * **The Beautiful Simplicity**: Unlike the compressed version that needs
 * different builders for adjacency (Uint8Array) vs properties (number[]),
 * the uncompressed version uses the SAME builder for everything!
 *
 * **Why This Works**:
 * - Adjacency lists: Store node IDs as raw numbers
 * - Properties: Store property values as raw numbers
 * - Same data type (number[]), same builder, same performance!
 *
 * **Design Elegance**: One builder to rule them all! 🎯
 */

import { AdjacencyListBuilderFactory } from '../../api/compress/AdjacencyListBuilderFactory';
import { MemoryTracker } from '../common/MemoryTracker';
import { UncompressedAdjacencyList } from './UncompressedAdjacencyList';
import { UncompressedAdjacencyListBuilder } from './UncompressedAdjacencyListBuilder';

export class UncompressedAdjacencyListBuilderFactory
  implements AdjacencyListBuilderFactory<number[], UncompressedAdjacencyList, number[], UncompressedAdjacencyList> {

  // ============================================================================
  // SINGLETON PATTERN
  // ============================================================================

  /**
   * Singleton factory instance.
   * **Why Singleton**: No state to maintain, just creates builders on demand.
   */
  static of(): UncompressedAdjacencyListBuilderFactory {
    return new UncompressedAdjacencyListBuilderFactory();
  }

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  // ============================================================================
  // BUILDER CREATION METHODS
  // ============================================================================

  /**
   * Create new adjacency list builder.
   * **For**: Graph structure (node → neighbors mapping)
   *
   * **Storage**: Raw number arrays containing neighbor node IDs
   * **Performance**: Zero decompression overhead during traversal
   */
  newAdjacencyListBuilder(memoryTracker: MemoryTracker): UncompressedAdjacencyListBuilder {
    return new UncompressedAdjacencyListBuilder(memoryTracker);
  }

  /**
   * Create new adjacency properties builder.
   * **For**: Edge properties (weights, timestamps, metadata)
   *
   * **Key Insight**: SAME implementation as adjacency builder!
   * Both store raw numbers, just different semantic meaning:
   * - Adjacency: numbers represent node IDs
   * - Properties: numbers represent property values
   *
   * **Beautiful Simplicity**: One builder type handles everything!
   */
  newAdjacencyPropertiesBuilder(memoryTracker: MemoryTracker): UncompressedAdjacencyListBuilder {
    return new UncompressedAdjacencyListBuilder(memoryTracker);
  }
}
