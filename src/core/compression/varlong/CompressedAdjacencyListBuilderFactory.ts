/**
 * Factory for creating compressed adjacency list builders.
 *
 * **Design Pattern**: Simple factory that encapsulates builder creation
 * **Purpose**: Consistent interface for dependency injection systems
 */

import { AdjacencyListBuilderFactory } from '../../api/compress/AdjacencyListBuilderFactory';
import { MemoryTracker } from '../common/MemoryTracker';
import { CompressedAdjacencyList } from './CompressedAdjacencyList';
import { CompressedAdjacencyListBuilder } from './CompressedAdjacencyListBuilder';
// TODO: Import when we translate uncompressed
// import { UncompressedAdjacencyList } from '../uncompressed/UncompressedAdjacencyList';
// import { UncompressedAdjacencyListBuilder } from '../uncompressed/UncompressedAdjacencyListBuilder';

export class CompressedAdjacencyListBuilderFactory
  implements AdjacencyListBuilderFactory<Uint8Array, CompressedAdjacencyList, number[], any /*UncompressedAdjacencyList*/> {

  /**
   * Singleton factory instance.
   */
  static of(): CompressedAdjacencyListBuilderFactory {
    return new CompressedAdjacencyListBuilderFactory();
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Create new compressed adjacency list builder.
   * **For**: Node adjacency lists (the actual graph structure)
   */
  newAdjacencyListBuilder(memoryTracker: MemoryTracker): CompressedAdjacencyListBuilder {
    return new CompressedAdjacencyListBuilder(memoryTracker);
  }

  /**
   * Create new uncompressed properties builder.
   * **For**: Edge properties/weights (kept uncompressed for fast access)
   *
   * **Design Decision**: Compress the graph structure aggressively,
   * but keep properties uncompressed for query performance.
   */
  newAdjacencyPropertiesBuilder(memoryTracker: MemoryTracker): any /*UncompressedAdjacencyListBuilder*/ {
    // TODO: Return actual UncompressedAdjacencyListBuilder when we translate it
    throw new Error("UncompressedAdjacencyListBuilder not yet translated");
  }
}
