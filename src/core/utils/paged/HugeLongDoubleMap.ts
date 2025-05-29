/**
 * High-performance hash map for massive graph algorithm processing.
 *
 * Specialized map: long keys → double values, optimized for:
 * - Node ID → PageRank scores (billion-node graphs)
 * - Edge ID → edge weights in massive networks
 * - Feature ID → embedding values in graph neural networks
 * - Community ID → modularity scores in community detection
 * - Timestamp → temporal graph metrics
 *
 * Performance characteristics:
 * - Open addressing with linear probing (cache-friendly)
 * - Backed by HugeLongArray + HugeDoubleArray (billion-element capacity)
 * - Load factor: 0.75 (optimal space/time trade-off)
 * - Automatic resizing with power-of-2 growth
 * - BitMixer hash function for excellent distribution
 *
 * Data Science Applications:
 * - PageRank algorithm: node → rank mappings
 * - Community detection: node → community score
 * - Graph embeddings: node → feature vector components
 * - Temporal analysis: timestamp → aggregated metrics
 * - Recommendation systems: user → preference scores
 *
 * Memory efficiency:
 * - No object overhead per entry (primitive arrays)
 * - Predictable memory usage with huge array backing
 * - Suitable for memory-mapped storage
 *
 * @module HugeLongDoubleMap
 */

import { HugeLongArray, HugeDoubleArray } from "@/collections";
import { BitUtil } from "@/mem";

/**
 * Cursor for iteration over map entries.
 * Avoids object allocation during iteration.
 */
export interface LongDoubleCursor {
  /** Current entry index in the hash table */
  index: number;
  /** The key (original value, not the +1 internal representation) */
  key: number;
  /** The value associated with the key */
  value: number;
}

export class HugeLongDoubleMap implements Iterable<LongDoubleCursor> {
  private keys!: HugeLongArray;
  private values!: HugeDoubleArray;
  public keysCursor: any; // HugeCursor type when available
  private entryIterator!: EntryIterator;

  private assigned: number = 0; // Number of entries in map
  private mask: number = 0; // Bit mask for hash table (size - 1)
  private resizeAt: number = 0; // Threshold for resizing

  private static readonly DEFAULT_EXPECTED_ELEMENTS = 4;
  private static readonly LOAD_FACTOR = 0.75;
  private static readonly MIN_HASH_ARRAY_LENGTH = 4;

  /**
   * Creates a new map with default initial capacity.
   *
   * @example
   * ```typescript
   * // Map for PageRank scores
   * const pageRankScores = new HugeLongDoubleMap();
   *
   * // Store node scores
   * graph.nodes().forEach(nodeId => {
   *   const score = computePageRank(nodeId);
   *   pageRankScores.addTo(nodeId, score);
   * });
   *
   * // Retrieve scores
   * const nodeScore = pageRankScores.getOrDefault(nodeId, 0.0);
   * ```
   */
  constructor();

  /**
   * Creates a new map with specified expected number of elements.
   * Pre-allocates appropriate capacity to avoid resizing.
   *
   * @param expectedElements Expected number of unique keys
   */
  constructor(expectedElements: number);

  constructor(
    expectedElements: number = HugeLongDoubleMap.DEFAULT_EXPECTED_ELEMENTS
  ) {
    this.initialBuffers(expectedElements);
  }

  /**
   * Memory estimation for capacity planning.
   * Essential for resource allocation in large-scale processing.
   */
  public static memoryEstimation(
    expectedElements: number = HugeLongDoubleMap.DEFAULT_EXPECTED_ELEMENTS
  ): number {
    const arraySize = HugeLongDoubleMap.minBufferSize(expectedElements);
    const keysMemory = HugeLongArray.memoryEstimation(arraySize);
    const valuesMemory = HugeDoubleArray.memoryEstimation(arraySize);
    return keysMemory + valuesMemory + 128; // ~128 bytes for map overhead
  }

  /**
   * Returns current memory usage in bytes.
   */
  public sizeOf(): number {
    return this.keys.sizeOf() + this.values.sizeOf();
  }

  /**
   * Adds a value to the existing value for the given key.
   * If key doesn't exist, sets the value.
   *
   * This is the CORE operation for many graph algorithms!
   *
   * @param key The key (node ID, edge ID, etc.)
   * @param value The value to add (score delta, weight, etc.)
   *
   * Data Science Use Cases:
   * - PageRank: Add rank contribution from incoming edges
   * - Community detection: Accumulate modularity deltas
   * - Graph neural networks: Sum neighbor feature contributions
   * - Temporal analysis: Aggregate events by timestamp
   *
   * @example
   * ```typescript
   * // PageRank iteration: accumulate contributions
   * graph.edges().forEach(edge => {
   *   const contribution = currentRank[edge.source] / outDegree[edge.source];
   *   nextRank.addTo(edge.target, contribution);
   * });
   * ```
   */
  public addTo(key: number, value: number): void {
    this.addTo0(key + 1, value); // +1 to avoid 0 (empty marker)
  }

  /**
   * Gets the value for a key, or returns default if not found.
   *
   * @param key The key to look up
   * @param defaultValue Value to return if key not found
   * @returns The stored value or default
   *
   * Performance: O(1) average, O(n) worst case (rare with good hash)
   */
  public getOrDefault(key: number, defaultValue: number): number {
    return this.getOrDefault0(key + 1, defaultValue);
  }

  /**
   * Internal addTo implementation using shifted keys.
   * Uses +1 shift to distinguish empty slots (0) from actual key 0.
   */
  private addTo0(key: number, value: number): void {
    console.assert(
      this.assigned < this.mask + 1,
      "Hash table invariant violated"
    );

    const hash = this.mixHash(key);
    let slot = this.findSlot(key, hash & this.mask);
    console.assert(slot !== -1, "Should always find a slot");

    if (slot >= 0) {
      // Key exists - add to existing value
      this.values.addTo(slot, value);
      return;
    }

    // Key doesn't exist - insert new entry
    slot = ~(1 + slot); // Decode negative slot indicator

    if (this.assigned === this.resizeAt) {
      this.allocateThenInsertThenRehash(slot, key, value);
    } else {
      this.values.set(slot, value);
      this.keys.set(slot, key);
    }

    this.assigned++;
  }

  /**
   * Internal getOrDefault implementation using shifted keys.
   */
  private getOrDefault0(key: number, defaultValue: number): number {
    const hash = this.mixHash(key);
    const slot = this.findSlot(key, hash & this.mask);

    if (slot >= 0) {
      return this.values.get(slot);
    }

    return defaultValue;
  }

  /**
   * Hash mixing function for excellent distribution.
   * Uses BitMixer.mixPhi equivalent for uniform hash distribution.
   */
  private mixHash(key: number): number {
    // Equivalent to BitMixer.mixPhi - multiplies by golden ratio and mixes bits
    let h = key;
    h ^= h >>> 16;
    h *= 0x85ebca6b;
    h ^= h >>> 13;
    h *= 0xc2b2ae35;
    h ^= h >>> 16;
    return h;
  }

  /**
   * Finds slot for given key using linear probing.
   * Returns positive slot if key exists, negative encoded slot if empty.
   */
  private findSlot(key: number, start: number): number {
    const keys = this.keys;
    const size = keys.size();

    // Search from start to end
    let slot = this.findSlotInRange(key, start, size, keys);
    if (slot === -1) {
      // Wrap around: search from 0 to start
      slot = this.findSlotInRange(key, 0, start, keys);
    }
    return slot;
  }

  /**
   * Finds slot within a specific range.
   * Uses linear probing for cache-friendly access.
   */
  private findSlotInRange(
    key: number,
    start: number,
    end: number,
    keys: HugeLongArray
  ): number {
    for (let slot = start; slot < end; slot++) {
      const existing = keys.get(slot);

      if (existing === key) {
        return slot; // Found existing key
      }
      if (existing === 0) {
        return ~slot - 1; // Found empty slot (encoded as negative)
      }
    }
    return -1; // No slot found in range
  }

  /**
   * Returns the number of key-value pairs in the map.
   */
  public size(): number {
    return this.assigned;
  }

  /**
   * Checks if the map is empty.
   */
  public isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Clears all entries from the map.
   * Fast O(n) operation - fills arrays with zeros.
   * Reuses existing capacity.
   */
  public clear(): void {
    this.assigned = 0;
    this.keys.fill(0);
    this.values.fill(0);
  }

  /**
   * Releases all resources and invalidates the map.
   * Call this when completely done with the map.
   */
  public release(): void {
    this.keys.release();
    this.values.release();

    this.keys = null as any;
    this.values = null as any;
    this.assigned = 0;
    this.mask = 0;
  }

  /**
   * Returns an iterator over all key-value pairs.
   * Iterator reuses cursor object for memory efficiency.
   */
  public [Symbol.iterator](): Iterator<LongDoubleCursor> {
    return this.entryIterator.reset();
  }

  /**
   * Returns a human-readable string representation.
   * Useful for debugging small maps.
   */
  public toString(): string {
    const parts: string[] = [];

    for (const cursor of this) {
      parts.push(`${cursor.key}=>${cursor.value}`);
    }

    return `[${parts.join(", ")}]`;
  }

  /**
   * Initial buffer allocation based on expected elements.
   */
  private initialBuffers(expectedElements: number): void {
    this.allocateBuffers(HugeLongDoubleMap.minBufferSize(expectedElements));
  }

  /**
   * Allocates new internal buffers atomically.
   * Either succeeds completely or leaves map unchanged.
   */
  private allocateBuffers(arraySize: number): void {
    console.assert(
      BitUtil.isPowerOfTwo(arraySize),
      "Array size must be power of 2"
    );

    // Store previous buffers for rollback on OOM
    const prevKeys = this.keys;
    const prevValues = this.values;

    try {
      this.keys = HugeLongArray.newArray(arraySize);
      this.values = HugeDoubleArray.newArray(arraySize);
      this.keysCursor = this.keys.newCursor();
      this.entryIterator = new EntryIterator(this.keys, this.values); // ✅ Create AFTER arrays
    } catch (error) {
      // Rollback on allocation failure
      this.keys = prevKeys;
      this.values = prevValues;
      throw error;
    }

    this.resizeAt = HugeLongDoubleMap.expandAtCount(arraySize);
    this.mask = arraySize - 1;
  }

  /**
   * Rehashes all entries from old buffers to new buffers.
   * Called during map growth.
   */
  private rehash(fromKeys: HugeLongArray, fromValues: HugeDoubleArray): void {
    console.assert(
      fromKeys.size() === fromValues.size() &&
        BitUtil.isPowerOfTwo(fromValues.size()),
      "Buffer sizes must match and be power of 2"
    );

    const newKeys = this.keys;
    const newValues = this.values;
    const mask = this.mask;

    // Iterate through all entries in old buffers
    const iterator = new EntryIterator(fromKeys, fromValues);
    try {
      for (const cursor of iterator) {
        const key = cursor.key + 1; // Restore internal +1 shift
        let slot = this.mixHash(key) & mask;
        slot = this.findSlot(key, slot);
        slot = ~(1 + slot); // Decode empty slot

        newKeys.set(slot, key);
        newValues.set(slot, cursor.value);
      }
    } finally {
      iterator.close();
    }
  }

  /**
   * Handles capacity growth when load factor exceeded.
   * Allocates new buffers, inserts pending entry, then rehashes.
   */
  private allocateThenInsertThenRehash(
    slot: number,
    pendingKey: number,
    pendingValue: number
  ): void {
    console.assert(
      this.assigned === this.resizeAt,
      "Should only resize at threshold"
    );

    // Store old buffers for rehashing
    const prevKeys = this.keys;
    const prevValues = this.values;

    // Allocate new, larger buffers
    this.allocateBuffers(HugeLongDoubleMap.nextBufferSize(this.mask + 1));
    console.assert(
      this.keys.size() > prevKeys.size(),
      "New buffers should be larger"
    );

    // Insert pending entry into old buffers before rehashing
    prevKeys.set(slot, pendingKey);
    prevValues.set(slot, pendingValue);

    // Rehash all entries from old to new buffers
    this.rehash(prevKeys, prevValues);

    // Release old buffers
    prevKeys.release();
    prevValues.release();
  }

  /**
   * Calculates minimum buffer size for expected elements.
   * Accounts for load factor and ensures power-of-2 sizing.
   */
  private static minBufferSize(elements: number): number {
    if (elements < 0) {
      throw new Error(`Number of elements must be >= 0: ${elements}`);
    }

    let length = Math.ceil(elements / HugeLongDoubleMap.LOAD_FACTOR);
    if (length === elements) {
      length++; // Ensure we have some free space
    }

    length = Math.max(
      HugeLongDoubleMap.MIN_HASH_ARRAY_LENGTH,
      BitUtil.nextHighestPowerOfTwo(length)
    );

    return length;
  }

  /**
   * Returns next buffer size (doubles current size).
   */
  private static nextBufferSize(arraySize: number): number {
    console.assert(
      BitUtil.isPowerOfTwo(arraySize),
      "Current size must be power of 2"
    );
    return arraySize << 1; // Double the size
  }

  /**
   * Calculates when to resize based on load factor.
   */
  private static expandAtCount(arraySize: number): number {
    console.assert(
      BitUtil.isPowerOfTwo(arraySize),
      "Array size must be power of 2"
    );
    return Math.min(
      arraySize,
      Math.ceil(arraySize * HugeLongDoubleMap.LOAD_FACTOR)
    );
  }
}

/**
 * Memory-efficient iterator for map entries.
 * Reuses cursor object to avoid allocations during iteration.
 */
class EntryIterator
  implements Iterator<LongDoubleCursor>, Iterable<LongDoubleCursor>
{
  private keyCursor: any; // HugeCursor<number[]> when available
  private valueCursor: any; // HugeCursor<number[]> when available
  private nextFetched: boolean = false;
  private hasNextValue: boolean = false;
  private cursor: LongDoubleCursor;
  private pos: number = 0;
  private end: number = 0;
  private keys: number[] | null = null;
  private values: number[] | null = null;

  constructor(
    private keysArray: HugeLongArray,
    private valuesArray: HugeDoubleArray
  ) {
    this.keyCursor = keysArray.newCursor();
    this.valueCursor = valuesArray.newCursor();
    this.cursor = { index: 0, key: 0, value: 0 };
    this.reset();
  }

  public reset(): EntryIterator {
    this.keysArray.initCursor(this.keyCursor);
    this.valuesArray.initCursor(this.valueCursor);
    this.pos = 0;
    this.end = 0;
    this.hasNextValue = false;
    this.nextFetched = false;
    return this;
  }

  public hasNext(): boolean {
    if (!this.nextFetched) {
      this.nextFetched = true;
      this.hasNextValue = this.fetchNext();
    }
    return this.hasNextValue;
  }

  public next(): IteratorResult<LongDoubleCursor> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }
    this.nextFetched = false;
    return { done: false, value: this.cursor };
  }

  /**
   * Fetches the next non-empty entry.
   * Skips empty slots (key === 0).
   */
  private fetchNext(): boolean {
    let key: number;

    do {
      while (this.pos < this.end) {
        key = this.keys![this.pos];
        if (key !== 0) {
          this.cursor = {
            index: this.pos,
            key: key - 1, // Remove internal +1 shift
            value: this.values![this.pos],
          };
          this.pos++;
          return true;
        }
        this.pos++;
      }
    } while (this.nextPage());

    return false;
  }

  /**
   * Advances to the next page of data.
   * Uses cursors for efficient chunk-based iteration.
   */
  private nextPage(): boolean {
    const valuesHasNext = this.valueCursor.next();
    if (!this.keyCursor.next()) {
      console.assert(
        !valuesHasNext,
        "Key and value cursors should advance together"
      );
      return false;
    }
    console.assert(
      valuesHasNext,
      "Key and value cursors should advance together"
    );

    this.keys = this.keyCursor.array;
    this.pos = this.keyCursor.offset;
    this.end = this.keyCursor.limit;
    this.values = this.valueCursor.array;

    console.assert(
      this.pos === this.valueCursor.offset,
      "Cursor offsets should match"
    );
    console.assert(
      this.end === this.valueCursor.limit,
      "Cursor limits should match"
    );

    return true;
  }

  public [Symbol.iterator](): Iterator<LongDoubleCursor> {
    return this.reset();
  }

  public close(): void {
    if (this.keyCursor) {
      this.keyCursor.close();
      this.keyCursor = null;
    }
    if (this.valueCursor) {
      this.valueCursor.close();
      this.valueCursor = null;
    }
    this.cursor = null as any;
  }
}
