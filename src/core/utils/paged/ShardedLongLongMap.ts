import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { BitUtil } from '../../mem/BitUtil';
import { CloseableThreadLocal } from '../../utils/CloseableThreadLocal';
import { IdMap } from '../../../api/IdMap';
import { IdMapAllocator } from '../../loading/IdMapAllocator';

/**
 * A map between original node IDs and mapped node IDs that uses sharding
 * to improve concurrent access performance.
 */
export class ShardedLongLongMap {
  private readonly internalNodeMapping: HugeLongArray;
  private readonly originalNodeMappingShards: Map<number, number>[];
  private readonly shardShift: number;
  private readonly shardMask: number;
  private readonly maxOriginalId: number;

  /**
   * Creates a new ShardedLongLongMap.
   *
   * @param internalNodeMapping Array mapping internal IDs to original IDs
   * @param originalNodeMappingShards Shards mapping original IDs to internal IDs
   * @param shardShift Shift value for shard calculation
   * @param shardMask Mask value for shard calculation
   * @param maxOriginalId Maximum original ID in the map
   */
  private constructor(
    internalNodeMapping: HugeLongArray,
    originalNodeMappingShards: Map<number, number>[],
    shardShift: number,
    shardMask: number,
    maxOriginalId: number
  ) {
    this.internalNodeMapping = internalNodeMapping;
    this.originalNodeMappingShards = originalNodeMappingShards;
    this.shardShift = shardShift;
    this.shardMask = shardMask;
    this.maxOriginalId = maxOriginalId;
  }

  /**
   * Creates a builder for constructing a ShardedLongLongMap.
   *
   * @param concurrency Number of concurrent threads to support
   * @returns A new builder
   */
  public static builder(concurrency: number): Builder {
    return new Builder(concurrency);
  }

  /**
   * Creates a batched builder for constructing a ShardedLongLongMap.
   *
   * @param concurrency Number of concurrent threads to support
   * @param overrideIds Whether to override ids in-place
   * @returns A new batched builder
   */
  public static batchedBuilder(concurrency: number, overrideIds: boolean = false): BatchedBuilder {
    return new BatchedBuilder(concurrency, overrideIds);
  }

  /**
   * Converts an original node ID to its mapped ID.
   *
   * @param nodeId The original node ID
   * @returns The mapped ID or NOT_FOUND
   */
  public toMappedNodeId(nodeId: number): number {
    const shard = this.findShard(nodeId);
    return shard.get(nodeId) ?? IdMap.NOT_FOUND;
  }

  /**
   * Checks if the map contains the specified original ID.
   *
   * @param originalId The original ID to check
   * @returns true if the ID is in the map
   */
  public contains(originalId: number): boolean {
    const shard = this.findShard(originalId);
    return shard.has(originalId);
  }

  /**
   * Converts a mapped node ID to its original ID.
   *
   * @param nodeId The mapped node ID
   * @returns The original node ID
   */
  public toOriginalNodeId(nodeId: number): number {
    return this.internalNodeMapping.get(nodeId);
  }

  /**
   * Returns the maximum original ID in this map.
   *
   * @returns The maximum original ID
   */
  public maxOriginalId(): number {
    return this.maxOriginalId;
  }

  /**
   * Returns the number of mappings in this map.
   *
   * @returns The map size
   */
  public size(): number {
    return this.internalNodeMapping.size();
  }

  /**
   * Finds the correct shard for the given key.
   *
   * @param key The key to find a shard for
   * @returns The appropriate shard
   */
  private findShard(key: number): Map<number, number> {
    const idx = this.shardIdx(key);
    return this.originalNodeMappingShards[idx];
  }

  /**
   * Calculates the shard index for a key using a hash function.
   *
   * @param key The key
   * @returns The shard index
   */
  private shardIdx(key: number): number {
    // Using a hash function for better distribution
    const hash = this.longSpreadOne(key);
    return Number(hash >> BigInt(this.shardShift));
  }

  /**
   * Hash function for long values.
   *
   * @param value The value to hash
   * @returns The hashed value
   */
  private longSpreadOne(value: number): number {
    value = (value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n;
    value = (value ^ (value >> 27n)) * 0x94d049bb133111ebn;
    return value ^ (value >> 31n);
  }

  /**
   * Static method to build a ShardedLongLongMap from shards.
   */
  private static build<S extends MapShard>(
    nodeCount: number,
    shards: S[],
    shardShift: number,
    shardMask: number,
    maxOriginalId?: number
  ): ShardedLongLongMap {
    const internalNodeMapping = HugeLongArray.newArray(nodeCount);
    const mapShards: Map<number, number>[] = new Array(shards.length);
    let maxOriginalIdValue = 0n;

    // Process each shard
    for (let idx = 0; idx < shards.length; idx++) {
      const shard = shards[idx];
      const mapping = shard.intoMapping();
      let localMaxOriginalId = 0n;

      // Copy mappings to the internal arrays
      mapping.forEach((mappedId, originalId) => {
        if (originalId > localMaxOriginalId) {
          localMaxOriginalId = originalId;
        }
        internalNodeMapping.set(Number(mappedId), originalId);
      });

      if (localMaxOriginalId > maxOriginalIdValue) {
        maxOriginalIdValue = localMaxOriginalId;
      }

      mapShards[idx] = mapping;
    }

    return new ShardedLongLongMap(
      internalNodeMapping,
      mapShards,
      shardShift,
      shardMask,
      maxOriginalId ?? maxOriginalIdValue
    );
  }
}

/**
 * Base class for map shards providing locking mechanisms.
 */
abstract class MapShard {
  protected readonly mapping: Map<number, number>;
  private readonly lock = new Mutex();

  /**
   * Creates a new map shard.
   */
  protected constructor() {
    this.mapping = new Map<number, number>();
  }

  /**
   * Acquires the lock on this shard.
   *
   * @returns A lock release function
   */
  public async acquireLock(): Promise<() => void> {
    const release = await this.lock.acquire();
    return release;
  }

  /**
   * Synchronously acquires the lock on this shard.
   * Only use this in environments where async/await is not available.
   *
   * @returns A lock release function
   */
  public acquireLockSync(): () => void {
    if (this.lock.isLocked()) {
      throw new Error("Lock is already held");
    }
    this.lock.lockSync();
    return () => this.lock.unlock();
  }

  /**
   * Asserts that the current thread holds the lock.
   */
  protected assertIsUnderLock(): void {
    if (!this.lock.isHeldByCurrentThread()) {
      throw new Error("Operation must only be called while holding the lock");
    }
  }

  /**
   * Returns the mapping from this shard.
   *
   * @returns The mapping
   */
  public intoMapping(): Map<number, number> {
    return this.mapping;
  }
}

/**
 * Builder for ShardedLongLongMap.
 */
export class Builder {
  private readonly nodeCount: AtomicLong;
  private readonly shards: BuilderShard[];
  private readonly shardShift: number;
  private readonly shardMask: number;

  /**
   * Creates a new builder.
   *
   * @param concurrency Number of concurrent threads to support
   */
  constructor(concurrency: number) {
    this.nodeCount = new AtomicLong();
    const numberOfShards = numberOfShards(concurrency);
    this.shardShift = 64 - numberOfTrailingZeros(numberOfShards);
    this.shardMask = numberOfShards - 1;
    this.shards = Array.from(
      { length: numberOfShards },
      () => new BuilderShard(this.nodeCount)
    );
  }

  /**
   * Adds a node to the mapping.
   *
   * @param nodeId The original node ID
   * @returns The mapped ID if the node was added,
   *          or the negated mapped ID - 1 if the node was already mapped
   */
  public addNode(nodeId: number): number {
    const shard = findShard(nodeId, this.shards, this.shardShift, this.shardMask);
    const release = shard.acquireLockSync();
    try {
      return shard.addNode(nodeId);
    } finally {
      release();
    }
  }

  /**
   * Builds the map.
   *
   * @returns A new ShardedLongLongMap
   */
  public build(): ShardedLongLongMap {
    return ShardedLongLongMap["build"](
      Number(this.nodeCount.get()),
      this.shards,
      this.shardShift,
      this.shardMask
    );
  }

  /**
   * Builds the map with a specified maximum original ID.
   *
   * @param maxOriginalId The maximum original ID
   * @returns A new ShardedLongLongMap
   */
  public build(maxOriginalId: number): ShardedLongLongMap {
    return ShardedLongLongMap["build"](
      Number(this.nodeCount.get()),
      this.shards,
      this.shardShift,
      this.shardMask,
      maxOriginalId
    );
  }
}

/**
 * Shard implementation for the Builder.
 */
class BuilderShard extends MapShard {
  private readonly nextId: AtomicLong;

  /**
   * Creates a new builder shard.
   *
   * @param nextId Counter for assigning IDs
   */
  constructor(nextId: AtomicLong) {
    super();
    this.nextId = nextId;
  }

  /**
   * Adds a node to this shard.
   *
   * @param nodeId The original node ID
   * @returns The mapped ID if the node was added,
   *         or the negated mapped ID - 1 if the node was already mapped
   */
  public addNode(nodeId: number): number {
    this.assertIsUnderLock();
    const mappedId = this.mapping.get(nodeId);
    if (mappedId !== undefined) {
      return -mappedId - 1n;
    }
    const newId = this.nextId.getAndIncrement();
    this.mapping.set(nodeId, newId);
    return newId;
  }
}

/**
 * Batched builder for ShardedLongLongMap.
 */
export class BatchedBuilder {
  private readonly nodeCount: AtomicLong;
  private readonly shards: BatchedBuilderShard[];
  private readonly batches: CloseableThreadLocal<Batch>;
  private readonly shardShift: number;
  private readonly shardMask: number;

  /**
   * Creates a new batched builder.
   *
   * @param concurrency Number of concurrent threads to support
   * @param overrideIds Whether to override IDs in-place
   */
  constructor(concurrency: number, overrideIds: boolean) {
    this.nodeCount = new AtomicLong();
    const numberOfShards = numberOfShards(concurrency);
    this.shardShift = 64 - numberOfTrailingZeros(numberOfShards);
    this.shardMask = numberOfShards - 1;
    this.shards = Array.from(
      { length: numberOfShards },
      () => new BatchedBuilderShard()
    );
    this.batches = new CloseableThreadLocal(() => {
      if (overrideIds) {
        return new OverridingBatch(this.shards, this.shardShift, this.shardMask);
      }
      return new Batch(this.shards, this.shardShift, this.shardMask);
    });
  }

  /**
   * Prepares a batch for node allocation.
   *
   * @param nodeCount Number of nodes to allocate
   * @returns A batch for allocation
   */
  public prepareBatch(nodeCount: number): Batch {
    const startId = this.nodeCount.getAndAdd(BigInt(nodeCount));
    const batch = this.batches.get();
    batch.initBatch(startId, nodeCount);
    return batch;
  }

  /**
   * Builds the map.
   *
   * @returns A new ShardedLongLongMap
   */
  public build(): ShardedLongLongMap {
    this.batches.close();
    return ShardedLongLongMap["build"](
      Number(this.nodeCount.get()),
      this.shards,
      this.shardShift,
      this.shardMask
    );
  }

  /**
   * Builds the map with a specified maximum original ID.
   *
   * @param maxOriginalId The maximum original ID
   * @returns A new ShardedLongLongMap
   */
  public build(maxOriginalId: number): ShardedLongLongMap {
    this.batches.close();
    return ShardedLongLongMap["build"](
      Number(this.nodeCount.get()),
      this.shards,
      this.shardShift,
      this.shardMask,
      maxOriginalId
    );
  }
}

/**
 * Batch for allocated node IDs.
 */
export class Batch implements IdMapAllocator {
  protected readonly shards: BatchedBuilderShard[];
  protected readonly shardShift: number;
  protected readonly shardMask: number;
  protected startId: number = 0n;
  protected length: number = 0;

  /**
   * Creates a new batch.
   *
   * @param shards Array of shards
   * @param shardShift Shift value for shard calculation
   * @param shardMask Mask value for shard calculation
   */
  constructor(shards: BatchedBuilderShard[], shardShift: number, shardMask: number) {
    this.shards = shards;
    this.shardShift = shardShift;
    this.shardMask = shardMask;
  }

  /**
   * Returns the allocated size of this batch.
   *
   * @returns The allocated size
   */
  public allocatedSize(): number {
    return this.length;
  }

  /**
   * Inserts node IDs into the batch.
   *
   * @param nodeIds Array of node IDs to insert
   */
  public insert(nodeIds: number[]): void {
    const length = this.allocatedSize();
    for (let i = 0; i < length; i++) {
      this.addNode(nodeIds[i]);
    }
  }

  /**
   * Adds a node to the batch.
   *
   * @param nodeId The node ID to add
   * @returns The mapped ID
   */
  public addNode(nodeId: number): number {
    const mappedId = this.startId++;
    const shard = findShard(nodeId, this.shards, this.shardShift, this.shardMask);
    const release = shard.acquireLockSync();
    try {
      shard.addNode(nodeId, mappedId);
      return mappedId;
    } finally {
      release();
    }
  }

  /**
   * Initializes the batch with start ID and length.
   *
   * @param startId The start ID
   * @param length The batch length
   */
  public initBatch(startId: number, length: number): void {
    this.startId = startId;
    this.length = length;
  }
}

/**
 * Batch implementation that overrides the incoming node IDs.
 */
class OverridingBatch extends Batch {
  /**
   * Inserts node IDs into the batch, overriding the original IDs.
   *
   * @param nodeIds Array of node IDs to insert and override
   */
  public override insert(nodeIds: number[]): void {
    const length = this.allocatedSize();
    for (let i = 0; i < length; i++) {
      nodeIds[i] = this.addNode(nodeIds[i]);
    }
  }
}

/**
 * Shard implementation for the BatchedBuilder.
 */
class BatchedBuilderShard extends MapShard {
  /**
   * Adds a node to this shard with a specified mapped ID.
   *
   * @param nodeId The original node ID
   * @param mappedId The mapped ID to use
   */
  public addNode(nodeId: number, mappedId: number): void {
    this.assertIsUnderLock();
    this.mapping.set(nodeId, mappedId);
  }
}

/**
 * Helper function to find a shard for a key.
 *
 * @param key The key to find a shard for
 * @param shards Array of shards
 * @param shift Shift value for shard calculation
 * @param mask Mask value for shard calculation
 * @returns The appropriate shard
 */
function findShard<T>(key: number, shards: T[], shift: number, mask: number): T {
  const idx = shardIdx(key, shift, mask);
  return shards[idx];
}

/**
 * Calculates the shard index for a key using a hash function.
 *
 * @param key The key
 * @param shift Shift value
 * @param mask Mask value
 * @returns The shard index
 */
function shardIdx(key: number, shift: number, mask: number): number {
  // Use a hash function to try to get a uniform distribution
  const hash = longSpreadOne(key);
  return Number(hash >> BigInt(shift));
}

/**
 * Hash function for long values.
 *
 * @param value The value to hash
 * @returns The hashed value
 */
function longSpreadOne(value: number): number {
  value = (value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n;
  value = (value ^ (value >> 27n)) * 0x94d049bb133111ebn;
  return value ^ (value >> 31n);
}

/**
 * Calculates the number of shards based on concurrency.
 *
 * @param concurrency The concurrency level
 * @returns Number of shards to use
 */
function numberOfShards(concurrency: number): number {
  return BitUtil.nextHighestPowerOfTwo(concurrency * 4);
}

/**
 * Returns the number of trailing zeros in a number.
 *
 * @param value The value to check
 * @returns Number of trailing zeros
 */
function numberOfTrailingZeros(value: number): number {
  if (value === 0) return 32;
  let n = 31;
  let y = value << 16; if (y !== 0) { n -= 16; value = y; }
  y = value << 8; if (y !== 0) { n -= 8; value = y; }
  y = value << 4; if (y !== 0) { n -= 4; value = y; }
  y = value << 2; if (y !== 0) { n -= 2; value = y; }
  return n - ((value << 1) >>> 31);
}

/**
 * Atomic long value for thread-safe operations.
 */
class AtomicLong {
  private value: number = 0n;

  /**
   * Gets the current value.
   *
   * @returns The current value
   */
  public get(): number {
    return this.value;
  }

  /**
   * Sets to the given value.
   *
   * @param newValue The new value
   */
  public set(newValue: number): void {
    this.value = newValue;
  }

  /**
   * Atomically increments by one and returns the old value.
   *
   * @returns The previous value
   */
  public getAndIncrement(): number {
    const oldValue = this.value;
    this.value = oldValue + 1n;
    return oldValue;
  }

  /**
   * Atomically adds the given value and returns the old value.
   *
   * @param delta The value to add
   * @returns The previous value
   */
  public getAndAdd(delta: number): number {
    const oldValue = this.value;
    this.value = oldValue + delta;
    return oldValue;
  }
}

/**
 * Simple mutex implementation for locking.
 */
class Mutex {
  private locked: boolean = false;
  private owner: any = null;

  /**
   * Acquires the lock asynchronously.
   *
   * @returns A function to release the lock
   */
  public async acquire(): Promise<() => void> {
    while (this.locked) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.locked = true;
    this.owner = new Error().stack;
    return () => this.unlock();
  }

  /**
   * Acquires the lock synchronously.
   */
  public lockSync(): void {
    if (this.locked) {
      throw new Error("Lock already held");
    }
    this.locked = true;
    this.owner = new Error().stack;
  }

  /**
   * Releases the lock.
   */
  public unlock(): void {
    this.locked = false;
    this.owner = null;
  }

  /**
   * Checks if the lock is currently held.
   *
   * @returns true if locked
   */
  public isLocked(): boolean {
    return this.locked;
  }

  /**
   * Checks if the current thread holds the lock.
   * In JavaScript this is an approximation using the error stack.
   *
   * @returns true if the current thread holds the lock
   */
  public isHeldByCurrentThread(): boolean {
    if (!this.locked) return false;
    // In JavaScript we don't have true thread IDs, so this is an approximation
    return true;
  }
}
