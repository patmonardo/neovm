import { NodePropertyValues } from '../../../../api/properties/nodes/NodePropertyValues';
import { LongNodePropertyValues } from '../../../../api/properties/nodes/LongNodePropertyValues';
import { HugeAtomicLongArray } from '../../../collections/ha/HugeAtomicLongArray';
import { ParallelLongPageCreator } from '../ParallelLongPageCreator';
import { MemoryEstimation, MemoryEstimations } from '../../../mem/MemoryEstimations';
import { DisjointSetStruct } from './DisjointSetStruct';

/**
 * Adaptation of the C++ implementation [1] for the
 * "Wait-free Parallel Algorithms for the Union-Find Problem" [2]
 * with some input from an atomic DSS implementation in Rust [3].
 *
 * This implementation uses Compare-And-Swap operations to atomically update
 * the disjoint sets, allowing for concurrent modifications without locking.
 * It implements path halving for efficient find operations and uses
 * a Union-by-Min strategy.
 *
 * References:
 * [1]: https://github.com/wjakob/dset/blob/master/dset.h
 * [2]: http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.56.8354&rep=rep1&type=pdf
 * [3]: https://github.com/tov/disjoint-sets-rs/blob/master/src/concurrent.rs
 */
export class HugeAtomicDisjointSetStruct implements DisjointSetStruct {
  private static readonly NO_SUCH_SEED_VALUE = 0n;

  private readonly parent: HugeAtomicLongArray;
  private readonly communities: HugeAtomicLongArray | null;
  private readonly maxCommunityId: AtomicBigInt | null;

  /**
   * Memory estimation for the disjoint set structure.
   *
   * @param incremental Whether to include incremental seeding information
   * @returns Memory estimation
   */
  public static memoryEstimation(incremental: boolean): MemoryEstimation {
    const builder = MemoryEstimations.builder(HugeAtomicDisjointSetStruct.name)
      .perNode("data", HugeAtomicLongArray.memoryEstimation);

    if (incremental) {
      builder.perNode("seeding information", HugeAtomicLongArray.memoryEstimation);
    }

    return builder.build();
  }

  /**
   * Create a new disjoint set structure with the specified capacity.
   *
   * @param capacity Number of elements
   * @param concurrency Number of concurrent threads to support
   */
  constructor(capacity: number, concurrency: number);

  /**
   * Create a new disjoint set structure with the specified capacity and community mapping.
   *
   * @param capacity Number of elements
   * @param communityMapping Initial community assignment for nodes
   * @param concurrency Number of concurrent threads to support
   */
  constructor(capacity: number, communityMapping: NodePropertyValues, concurrency: number);

  constructor(
    capacity: number,
    communityMappingOrConcurrency: NodePropertyValues | number,
    concurrencyOrUndefined?: number
  ) {
    // Handle overloaded constructor
    let concurrency: number;
    let communityMapping: NodePropertyValues | null = null;

    if (typeof communityMappingOrConcurrency === 'number') {
      concurrency = communityMappingOrConcurrency;
    } else {
      communityMapping = communityMappingOrConcurrency;
      concurrency = concurrencyOrUndefined!;
    }

    // Initialize parent array with identity values
    this.parent = HugeAtomicLongArray.of(
      capacity,
      ParallelLongPageCreator.identity(concurrency)
    );

    // Initialize communities and maxCommunityId if community mapping is provided
    if (communityMapping) {
      this.communities = HugeAtomicLongArray.of(
        capacity,
        ParallelLongPageCreator.of(concurrency, nodeId => {
          const seedCommunity = communityMapping.longValue(nodeId);
          return seedCommunity < 0 ? -1n : BigInt(seedCommunity);
        })
      );

      const maxValue = communityMapping.getMaxLongPropertyValue().orElse(
        Number(HugeAtomicDisjointSetStruct.NO_SUCH_SEED_VALUE)
      );
      this.maxCommunityId = new AtomicBigInt(BigInt(maxValue));
    } else {
      this.communities = null;
      this.maxCommunityId = null;
    }
  }

  /**
   * Get the parent of a node.
   *
   * @param id Node ID
   * @returns Parent ID
   */
  private parent(id: number): number {
    return this.parent.get(id);
  }

  /**
   * Find the representative (root) of the set containing the specified node.
   * Uses path halving for efficiency.
   *
   * @param id Node ID
   * @returns Representative ID
   */
  private find(id: number): number {
    let nodeId = BigInt(id);
    let parent: number;

    while (nodeId !== (parent = this.parent.get(Number(nodeId)))) {
      const grandParent = this.parent.get(Number(parent));

      if (parent !== grandParent) {
        // Try to apply path-halving by setting the value
        // for some id to its grand parent. This might fail
        // if another thread is also changing the same value
        // but that's ok. The CAS operations guarantees
        // that at least one of the contenting threads will
        // succeed.
        this.parent.compareAndSet(Number(nodeId), parent, grandParent);
      }

      nodeId = grandParent;
    }

    return Number(nodeId);
  }

  /**
   * Returns the set ID for the given node.
   *
   * @param nodeId The node ID
   * @returns The set ID
   */
  public setIdOf(nodeId: number): number {
    const setId = this.find(nodeId);

    // If no communities are defined, return the representative directly
    if (this.communities === null) {
      return setId;
    }

    // Otherwise, get or generate a community ID
    while (true) {
      const providedSetId = this.communities.get(setId);

      if (providedSetId >= 0n) {
        return Number(providedSetId);
      }

      const newSetId = this.maxCommunityId!.incrementAndGet();

      if (this.communities.compareAndSet(setId, providedSetId, newSetId)) {
        return Number(newSetId);
      }
    }
  }

  /**
   * Check if two nodes belong to the same set.
   *
   * @param id1 First node ID
   * @param id2 Second node ID
   * @returns true if both nodes are in the same set
   */
  public sameSet(id1: number, id2: number): boolean {
    while (true) {
      id1 = this.find(id1);
      id2 = this.find(id2);

      if (id1 === id2) {
        return true;
      }

      if (Number(this.parent(id1)) === id1) {
        return false;
      }
    }
  }

  /**
   * Union the sets containing the specified nodes.
   * Uses union-by-min strategy, where the smaller community ID wins.
   *
   * @param id1 First node ID
   * @param id2 Second node ID
   */
  public union(id1: number, id2: number): void {
    while (true) {
      id1 = this.find(id1);
      id2 = this.find(id2);

      if (id1 === id2) {
        return;
      }

      // Union-by-Min: smaller community ID wins
      if (this.setIdOf(id1) < this.setIdOf(id2)) {
        // Swap to ensure we update the larger ID
        [id1, id2] = [id2, id1];
      }

      const oldEntry = BigInt(id1);
      const newEntry = BigInt(id2);

      if (!this.parent.compareAndSet(id1, oldEntry, newEntry)) {
        continue; // Someone else modified the parent, retry
      }

      break; // Success
    }
  }

  /**
   * Returns the number of elements in this structure.
   *
   * @returns Size
   */
  public size(): number {
    return this.parent.size();
  }

  /**
   * Returns this disjoint set as node properties.
   *
   * @returns Node properties view
   */
  public asNodeProperties(): LongNodePropertyValues {
    return DisjointSetStruct.defaultAsNodeProperties(this);
  }
}

/**
 * Atomic number for thread-safe operations.
 */
class AtomicBigInt {
  private value: number;

  constructor(initialValue: number = 0n) {
    this.value = initialValue;
  }

  /**
   * Gets the current value.
   *
   * @returns Current value
   */
  public get(): number {
    return this.value;
  }

  /**
   * Atomically increments the value and returns the new value.
   *
   * @returns Updated value
   */
  public incrementAndGet(): number {
    const newValue = this.value + 1n;
    this.value = newValue;
    return newValue;
  }
}
