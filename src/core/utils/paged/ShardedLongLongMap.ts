/**
 * High-performance sharded bidirectional ID mapping for massive graphs.
 *
 * Essential for billion-scale graph processing with concurrent ID translation:
 * - Bidirectional mapping between original and internal node IDs
 * - Thread-safe concurrent building with sharded locks
 * - Efficient hash-based sharding for load distribution
 * - Memory-optimized storage for massive ID ranges
 * - Batch processing for high-throughput scenarios
 *
 * Performance characteristics:
 * - O(1) ID lookup in both directions
 * - Concurrent building with minimal lock contention
 * - Memory-efficient sharded storage
 * - Hash-based load balancing across shards
 * - Batch operations for bulk ID assignment
 *
 * Concurrency features:
 * - Per-shard locking for fine-grained concurrency
 * - Thread-local batches for high-throughput building
 * - Atomic node counting across all shards
 * - Lock-free read operations after building
 * - Parallel shard construction and finalization
 *
 * Use Cases:
 * - Graph loading with arbitrary original node IDs
 * - Node ID compaction for memory efficiency
 * - Distributed graph processing coordination
 * - Stream processing with dynamic node discovery
 * - Multi-source graph integration
 *
 * @module ShardedLongLongMap
 */

import { HugeLongArray } from '@/collections/haa';
import { Concurrency } from '@/core/concurrency';
import { IdMapAllocator } from '@/core/loading';
import { BitUtil } from '@/core/utils';
import { CloseableThreadLocal } from '@/utils';

export class ShardedLongLongMap {
  private readonly internalNodeMapping: HugeLongArray;
  private readonly originalNodeMappingShards: Map<number, number>[];
  private readonly shardShift: number;
  private readonly shardMask: number;
  private readonly maxOriginalId: number;

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
   * Creates a simple builder for sequential ID assignment.
   *
   * @param concurrency Parallelism configuration
   * @returns New builder instance
   *
   * @example
   * ```typescript
   * const builder = ShardedLongLongMap.builder(new Concurrency(8));
   *
   * // Add nodes concurrently - each gets sequential internal ID
   * const mappedId1 = builder.addNode(12345); // Returns 0
   * const mappedId2 = builder.addNode(67890); // Returns 1
   * const duplicate = builder.addNode(12345); // Returns -(0) - 1 = -1
   *
   * const idMap = builder.build();
   * console.log(idMap.toMappedNodeId(12345)); // 0
   * console.log(idMap.toOriginalNodeId(0)); // 12345
   * ```
   */
  public static builder(concurrency: Concurrency): Builder {
    return new Builder(concurrency);
  }

  /**
   * Creates a batched builder for high-throughput scenarios.
   *
   * @param concurrency Parallelism configuration
   * @returns New batched builder instance
   *
   * @example
   * ```typescript
   * const builder = ShardedLongLongMap.batchedBuilder(new Concurrency(8));
   *
   * // Prepare batch for 1000 nodes
   * const batch = builder.prepareBatch(1000);
   *
   * // Add nodes in batch - much faster than individual adds
   * for (let i = 0; i < 1000; i++) {
   *   batch.addNode(originalIds[i]);
   * }
   *
   * const idMap = builder.build();
   * ```
   */
  public static batchedBuilder(concurrency: Concurrency): BatchedBuilder {
    return this.batchedBuilderWithOverride(concurrency, false);
  }

  /**
   * Creates a batched builder with ID override capability.
   *
   * @param concurrency Parallelism configuration
   * @param overrideIds Whether to override input IDs with mapped IDs
   * @returns New batched builder instance
   */
  public static batchedBuilderWithOverride(concurrency: Concurrency, overrideIds: boolean): BatchedBuilder {
    return new BatchedBuilder(concurrency, overrideIds);
  }

  /**
   * Maps an original node ID to its internal mapped ID.
   *
   * @param nodeId Original node ID
   * @returns Mapped internal ID, or -1 if not found
   *
   * Performance: O(1) with hash-based shard selection
   * Thread-safety: Safe for concurrent reads after building
   */
  public toMappedNodeId(nodeId: number): number {
    const shard = this.findShard(nodeId, this.originalNodeMappingShards);
    return shard.get(nodeId) ?? -1; // IdMap.NOT_FOUND equivalent
  }

  /**
   * Checks if an original node ID exists in the mapping.
   *
   * @param originalId Original node ID to check
   * @returns true if the ID exists in the mapping
   */
  public contains(originalId: number): boolean {
    const shard = this.findShard(originalId, this.originalNodeMappingShards);
    return shard.has(originalId);
  }

  /**
   * Maps an internal node ID back to its original ID.
   *
   * @param nodeId Internal mapped node ID
   * @returns Original node ID
   *
   * Performance: O(1) direct array access
   * Thread-safety: Safe for concurrent reads after building
   */
  public toOriginalNodeId(nodeId: number): number {
    return this.internalNodeMapping.get(nodeId);
  }

  /**
   * Returns the maximum original node ID in the mapping.
   * Useful for determining ID ranges and memory allocation.
   */
  public maxOriginalId(): number {
    return this.maxOriginalId;
  }

  /**
   * Returns the total number of mapped nodes.
   */
  public size(): number {
    return Number(this.internalNodeMapping.size());
  }

  /**
   * Finds the appropriate shard for a given key using hash-based distribution.
   */
  private findShard<T>(key: number, shards: T[]): T {
    const idx = this.shardIdx2(key);
    return shards[idx];
  }

  /**
   * Computes shard index using hash function for uniform distribution.
   * More robust than simple modulo for arbitrary key distributions.
   */
  private shardIdx2(key: number): number {
    const hash = this.longSpreadOne(key);
    return Math.floor(hash / (2 ** this.shardShift)) & this.shardMask;
  }

  /**
   * Simple hash function for spreading keys uniformly.
   * Equivalent to Eclipse Collections SpreadFunctions.longSpreadOne.
   */
  private longSpreadOne(key: number): number {
    // Simple multiplicative hash
    const hash = key * 0x9e3779b9;
    return Math.abs(hash) >>> 0; // Ensure unsigned 32-bit result
  }

  /**
   * Calculates optimal number of shards based on concurrency.
   * Uses next power of 2 for efficient bit masking.
   */
  private static numberOfShards(concurrency: Concurrency): number {
    return BitUtil.nextHighestPowerOfTwo(concurrency.value * 4);
  }

  /**
   * Builds the final mapping from shards with parallel processing.
   */
  private static build<S extends MapShard>(
    nodeCount: number,
    shards: S[],
    shardShift: number,
    shardMask: number,
    maxOriginalId?: number
  ): ShardedLongLongMap {
    const internalNodeMapping = HugeLongArray.newArray(nodeCount);
    const mapShards = new Array<Map<number, number>>(shards.length);
    const maxOriginalIds = new Array<number>(shards.length);

    // Process shards in parallel
    const promises = shards.map(async (shard, idx) => {
      let localMaxOriginalId = 0;
      const mapping = shard.intoMapping();

      // Build internal node mapping and track max original ID
      for (const [originalId, mappedId] of mapping) {
        if (originalId > localMaxOriginalId) {
          localMaxOriginalId = originalId;
        }
        internalNodeMapping.set(mappedId, originalId);
      }

      maxOriginalIds[idx] = localMaxOriginalId;
      mapShards[idx] = mapping;
    });

    // Wait for all shards to complete
    Promise.all(promises);

    const computedMaxOriginalId = maxOriginalId ?? Math.max(...maxOriginalIds);

    return new ShardedLongLongMap(
      internalNodeMapping,
      mapShards,
      shardShift,
      shardMask,
      computedMaxOriginalId
    );
  }
}

/**
 * Base class for mapping shards with thread-safe operations.
 */
abstract class MapShard {
  protected readonly mapping: Map<number, number>;
  private readonly lock: AsyncMutex;

  constructor() {
    this.mapping = new Map();
    this.lock = new AsyncMutex();
  }

  /**
   * Acquires exclusive lock for this shard.
   * Must be called before any mutating operations.
   */
  public async acquireLock(): Promise<() => void> {
    return await this.lock.acquire();
  }

  /**
   * Returns the internal mapping for final build process.
   */
  public intoMapping(): Map<number, number> {
    return this.mapping;
  }
}

/**
 * Simple sequential builder for ID mapping.
 */
export class Builder {
  private readonly nodeCount: AtomicCounter;
  private readonly shards: BuilderShard[];
  private readonly shardShift: number;
  private readonly shardMask: number;

  constructor(concurrency: Concurrency) {
    this.nodeCount = new AtomicCounter();
    const numberOfShards = ShardedLongLongMap.numberOfShards(concurrency);
    this.shardShift = 64 - Math.clz32(numberOfShards - 1) - 1;
    this.shardMask = numberOfShards - 1;
    this.shards = Array.from({ length: numberOfShards }, () => new BuilderShard(this.nodeCount));
  }

  /**
   * Adds a node to the mapping with thread-safe ID assignment.
   *
   * @param nodeId Original node ID to add
   * @returns Mapped ID if new (>= 0), or -(existing mapped ID) - 1 if duplicate
   *
   * Thread-safety: Safe for concurrent calls from multiple threads
   *
   * @example
   * ```typescript
   * const builder = ShardedLongLongMap.builder(new Concurrency(4));
   *
   * // Concurrent node addition
   * await Promise.all([
   *   worker1.processNodes(builder, nodeIds1),
   *   worker2.processNodes(builder, nodeIds2),
   *   worker3.processNodes(builder, nodeIds3),
   *   worker4.processNodes(builder, nodeIds4)
   * ]);
   *
   * async function processNodes(builder: Builder, nodeIds: number[]) {
   *   for (const nodeId of nodeIds) {
   *     const result = await builder.addNode(nodeId);
   *     if (result >= 0) {
   *       console.log(`New node ${nodeId} -> ${result}`);
   *     } else {
   *       const existingId = -result - 1;
   *       console.log(`Duplicate node ${nodeId}, existing mapping: ${existingId}`);
   *     }
   *   }
   * }
   * ```
   */
  public async addNode(nodeId: number): Promise<number> {
    const shard = this.findShard(nodeId);
    const unlock = await shard.acquireLock();
    try {
      return shard.addNode(nodeId);
    } finally {
      unlock();
    }
  }

  /**
   * Builds the final mapping structure.
   */
  public build(): ShardedLongLongMap {
    return ShardedLongLongMap.build(
      this.nodeCount.get(),
      this.shards,
      this.shardShift,
      this.shardMask
    );
  }

  /**
   * Builds the final mapping with explicit max original ID.
   */
  public buildWithMaxId(maxOriginalId: number): ShardedLongLongMap {
    return ShardedLongLongMap.build(
      this.nodeCount.get(),
      this.shards,
      this.shardShift,
      this.shardMask,
      maxOriginalId
    );
  }

  private findShard(nodeId: number): BuilderShard {
    const idx = this.shardIdx2(nodeId);
    return this.shards[idx];
  }

  private shardIdx2(key: number): number {
    const hash = this.longSpreadOne(key);
    return Math.floor(hash / (2 ** this.shardShift)) & this.shardMask;
  }

  private longSpreadOne(key: number): number {
    const hash = key * 0x9e3779b9;
    return Math.abs(hash) >>> 0;
  }
}

/**
 * Shard implementation for sequential builder.
 */
class BuilderShard extends MapShard {
  private readonly nextId: AtomicCounter;

  constructor(nextId: AtomicCounter) {
    super();
    this.nextId = nextId;
  }

  /**
   * Adds a node with automatic ID assignment.
   * Must be called while holding the shard lock.
   */
  public addNode(nodeId: number): number {
    const existingMappedId = this.mapping.get(nodeId);
    if (existingMappedId !== undefined) {
      return -existingMappedId - 1; // Indicate duplicate
    }

    const mappedId = this.nextId.getAndIncrement();
    this.mapping.set(nodeId, mappedId);
    return mappedId;
  }
}

/**
 * High-throughput batched builder for bulk operations.
 */
export class BatchedBuilder {
  private readonly nodeCount: AtomicCounter;
  private readonly shards: BatchedShard[];
  private readonly batches: CloseableThreadLocal<Batch>;
  private readonly shardShift: number;
  private readonly shardMask: number;

  constructor(concurrency: Concurrency, overrideIds: boolean) {
    this.nodeCount = new AtomicCounter();
    const numberOfShards = ShardedLongLongMap.numberOfShards(concurrency);
    this.shardShift = 64 - Math.clz32(numberOfShards - 1) - 1;
    this.shardMask = numberOfShards - 1;
    this.shards = Array.from({ length: numberOfShards }, () => new BatchedShard());

    this.batches = new CloseableThreadLocal(() => {
      if (overrideIds) {
        return new OverridingBatch(this.shards, this.shardShift, this.shardMask);
      }
      return new Batch(this.shards, this.shardShift, this.shardMask);
    });
  }

  /**
   * Prepares a batch for high-throughput node addition.
   *
   * @param nodeCount Number of nodes in this batch
   * @returns Batch instance for adding nodes
   *
   * Thread-safety: Each thread gets its own batch instance
   *
   * @example
   * ```typescript
   * const builder = ShardedLongLongMap.batchedBuilder(new Concurrency(8));
   *
   * // Parallel batch processing
   * await Promise.all(chunks.map(async chunk => {
   *   const batch = builder.prepareBatch(chunk.length);
   *
   *   for (const nodeId of chunk) {
   *     batch.addNode(nodeId);
   *   }
   * }));
   *
   * const idMap = builder.build();
   * ```
   */
  public prepareBatch(nodeCount: number): Batch {
    const startId = this.nodeCount.getAndAdd(nodeCount);
    const batch = this.batches.get();
    batch.initBatch(startId, nodeCount);
    return batch;
  }

  /**
   * Builds the final mapping structure.
   */
  public build(): ShardedLongLongMap {
    this.batches.close();
    return ShardedLongLongMap.build(
      this.nodeCount.get(),
      this.shards,
      this.shardShift,
      this.shardMask
    );
  }

  /**
   * Builds the final mapping with explicit max original ID.
   */
  public buildWithMaxId(maxOriginalId: number): ShardedLongLongMap {
    this.batches.close();
    return ShardedLongLongMap.build(
      this.nodeCount.get(),
      this.shards,
      this.shardShift,
      this.shardMask,
      maxOriginalId
    );
  }
}

/**
 * Batch for high-throughput node addition.
 */
export class Batch implements IdMapAllocator {
  protected readonly shards: BatchedShard[];
  protected readonly shardShift: number;
  protected readonly shardMask: number;
  protected startId: number = 0;
  protected length: number = 0;

  constructor(shards: BatchedShard[], shardShift: number, shardMask: number) {
    this.shards = shards;
    this.shardShift = shardShift;
    this.shardMask = shardMask;
  }

  public allocatedSize(): number {
    return this.length;
  }

  public async insert(nodeIds: number[]): Promise<void> {
    const length = this.allocatedSize();
    for (let i = 0; i < length; i++) {
      await this.addNode(nodeIds[i]);
    }
  }

  /**
   * Adds a node to the batch with pre-assigned mapped ID.
   *
   * @param nodeId Original node ID
   * @returns Pre-assigned mapped ID
   */
  public async addNode(nodeId: number): Promise<number> {
    const mappedId = this.startId++;
    const shard = this.findShard(nodeId);
    const unlock = await shard.acquireLock();
    try {
      shard.addNode(nodeId, mappedId);
    } finally {
      unlock();
    }
    return mappedId;
  }

  public initBatch(startId: number, length: number): void {
    this.startId = startId;
    this.length = length;
  }

  protected findShard(nodeId: number): BatchedShard {
    const idx = this.shardIdx2(nodeId);
    return this.shards[idx];
  }

  protected shardIdx2(key: number): number {
    const hash = this.longSpreadOne(key);
    return Math.floor(hash / (2 ** this.shardShift)) & this.shardMask;
  }

  protected longSpreadOne(key: number): number {
    const hash = key * 0x9e3779b9;
    return Math.abs(hash) >>> 0;
  }
}

/**
 * Batch that overrides input array with mapped IDs.
 */
class OverridingBatch extends Batch {
  public async insert(nodeIds: number[]): Promise<void> {
    const length = this.allocatedSize();
    for (let i = 0; i < length; i++) {
      nodeIds[i] = await this.addNode(nodeIds[i]);
    }
  }
}

/**
 * Shard implementation for batched builder.
 */
class BatchedShard extends MapShard {
  /**
   * Adds a node with explicit mapped ID.
   * Must be called while holding the shard lock.
   */
  public addNode(nodeId: number, mappedId: number): void {
    this.mapping.set(nodeId, mappedId);
  }
}

// Helper classes
class AtomicCounter {
  private value: number = 0;

  public get(): number {
    return this.value;
  }

  public getAndIncrement(): number {
    return this.value++;
  }

  public getAndAdd(delta: number): number {
    const current = this.value;
    this.value += delta;
    return current;
  }
}

class AsyncMutex {
  private locked = false;
  private waiting: Array<() => void> = [];

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => resolve(() => this.release()));
      }
    });
  }

  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}
