import { HugeIntArray } from "../../collections/ha/HugeIntArray"; // Adjust path as needed
import { HugeLongArray } from "../../collections/ha/HugeLongArray"; // Adjust path as needed
import { AdjacencyCompressor } from "./AdjacencyCompressor";
import { AdjacencyListsWithProperties } from "./AdjacencyListsWithProperties";

/**
 * Thread-safe relationship counter (JavaScript doesn't have LongAdder, so we simulate)
 */
export class LongAdder {
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

export interface AdjacencyCompressorFactory {
  /**
   * Prepares the factory for creating compressors, for example, by initializing
   * internal data structures as they are needed.
   * This version might be used when degrees and offsets are managed internally or not yet known.
   */
  init(): void;

  /**
   * Prepares the factory for creating compressors, providing existing arrays
   * for degrees and offsets. This allows the factory to potentially write
   * directly into these pre-allocated structures.
   *
   * @param degrees A HugeIntArray to store node degrees.
   * @param adjacencyOffsets A HugeLongArray to store offsets for adjacency lists.
   * @param propertyOffsets A HugeLongArray to store offsets for property lists.
   */
  init(
    degrees: HugeIntArray,
    adjacencyOffsets: HugeLongArray,
    propertyOffsets: HugeLongArray
  ): void;

  /**
   * Creates a new AdjacencyCompressor instance.
   * This method is expected to be callable multiple times, potentially returning
   * compressors that can operate concurrently if the underlying implementation supports it.
   *
   * @returns A new AdjacencyCompressor instance.
   */
  createCompressor(): AdjacencyCompressor;

  /**
   * Provides a counter for tracking the number of relationships processed.
   * In Java, `java.util.concurrent.atomic.LongAdder` is used for high-performance
   * concurrent counting. A direct TypeScript equivalent might require a custom implementation
   * or a library if similar concurrent guarantees are needed.
   *
   * @returns A LongAdder instance (or a number if atomicity is handled differently).
   */
  relationshipCounter(): LongAdder;

  /**
   * Builds the final compressed adjacency lists along with any associated properties.
   * This method is typically called after all data has been processed by the compressors.
   *
   * @param allowReordering A boolean flag indicating whether the factory is allowed
   *                        to reorder nodes or relationships for optimization purposes
   *                        during the build process.
   * @returns An AdjacencyListsWithProperties object containing the compressed graph data.
   */
  build(allowReordering: boolean): AdjacencyListsWithProperties;
}
