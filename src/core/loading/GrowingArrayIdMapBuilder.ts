import { IdMap } from '@/api/IdMap';
import { HugeLongArray } from '@/collections/ha/HugeLongArray';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { HugeLongArrayBuilder } from '@/core/utils/paged/HugeLongArrayBuilder';
import { AutoCloseableThreadLocal } from '@/utils/AutoCloseableThreadLocal';
import { LabelInformation } from './LabelInformation';
import { IdMapBuilder } from './IdMapBuilder';
import { ArrayIdMapBuilderOps } from './ArrayIdMapBuilderOps';

/**
 * Builder for IdMap implementations that uses growing arrays to store node mappings.
 *
 * This class is responsible for efficiently building the mapping between original node IDs
 * and the internal, sequential node IDs used in the CSR format. It supports concurrent
 * allocation of node ID batches by multiple threads during parallel graph loading.
 *
 * The mapping is a critical component as it:
 * 1. Enables O(1) lookups between external and internal IDs
 * 2. Creates a dense, sequential ID space for optimal memory usage
 * 3. Supports concurrent building for high-performance loading
 */
export class GrowingArrayIdMapBuilder implements IdMapBuilder {
  /**
   * The underlying array builder for storing node ID mappings
   */
  private readonly arrayBuilder: HugeLongArrayBuilder;

  /**
   * Thread-safe counter for allocating sequential indices
   */
  private readonly allocationIndex: { get: () => number; getAndAdd: (value: number) => number };

  /**
   * Thread-local allocators to enable concurrent batch loading
   */
  private readonly allocators: AutoCloseableThreadLocal<HugeLongArrayBuilder.Allocator>;

  /**
   * Creates a new GrowingArrayIdMapBuilder
   * @returns A new instance of GrowingArrayIdMapBuilder
   */
  public static of(): GrowingArrayIdMapBuilder {
    const array = HugeLongArrayBuilder.newBuilder();
    return new GrowingArrayIdMapBuilder(array);
  }

  /**
   * Constructor
   * @param arrayBuilder The underlying array builder
   */
  private constructor(arrayBuilder: HugeLongArrayBuilder) {
    this.arrayBuilder = arrayBuilder;
    // Simulate atomic behavior in JS
    let counter = 0;
    this.allocationIndex = {
      get: () => counter,
      getAndAdd: (value: number) => {
        const old = counter;
        counter += value;
        return old;
      }
    };
    this.allocators = AutoCloseableThreadLocal.withInitial(() => new HugeLongArrayBuilder.Allocator());
  }

  /**
   * Allocates space for a batch of node IDs
   * @param batchLength Number of node IDs to allocate space for
   * @returns An allocator for the batch
   */
  public allocate(batchLength: number): HugeLongArrayBuilder.Allocator {
    const startIndex = this.allocationIndex.getAndAdd(batchLength);

    const allocator = this.allocators.get();
    this.arrayBuilder.allocate(startIndex, batchLength, allocator);

    return allocator;
  }

  /**
   * Builds the final IdMap
   *
   * @param labelInformationBuilder Builder for node label information
   * @param highestNodeId Highest node ID encountered during loading
   * @param concurrency Concurrency configuration for parallel processing
   * @returns The built IdMap
   */
  public build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number,
    concurrency: Concurrency
  ): IdMap {
    this.allocators.close();
    const nodeCount = this.size();
    const graphIds = this.arrayBuilder.build(nodeCount);
    return ArrayIdMapBuilderOps.build(graphIds, nodeCount, labelInformationBuilder, highestNodeId, concurrency);
  }

  /**
   * Returns the built array
   * @returns The HugeLongArray containing node ID mappings
   */
  public array(): HugeLongArray {
    return this.arrayBuilder.build(this.size());
  }

  /**
   * Returns the number of node IDs allocated
   * @returns The number of node IDs
   */
  public size(): number {
    return this.allocationIndex.get();
  }
}

/**
 * Namespace to match Java's nested static classes pattern
 */
export namespace GrowingArrayIdMapBuilder {
  // Add any nested types here if needed
}
