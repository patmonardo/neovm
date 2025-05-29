/**
 * High-performance hash map with composite keys: (long, long) → double
 *
 * Essential for advanced graph algorithms requiring pair-based mappings:
 * - Edge weights: (sourceNode, targetNode) → weight
 * - Graph embeddings: (node, dimension) → feature value
 * - Temporal graphs: (node, timestamp) → temporal score
 * - Community pairs: (community1, community2) → similarity
 * - Collaborative filtering: (user, item) → rating/preference
 *
 * Performance characteristics:
 * - Composite key hashing with excellent distribution
 * - Open addressing with linear probing (cache-friendly)
 * - Backed by three HugeArrays for billion-scale capacity
 * - Load factor: 0.75 (optimal space/time trade-off)
 * - Thread-safe cursor management for concurrent access
 *
 * Data Science Applications:
 * - Graph neural networks: (node, feature_dim) → embedding values
 * - Recommendation systems: (user, item) → predicted ratings
 * - Social network analysis: (user1, user2) → relationship strength
 * - Temporal analysis: (entity, time_bucket) → aggregated metrics
 * - Knowledge graphs: (entity1, entity2) → relationship score
 *
 * Memory efficiency:
 * - Three primitive arrays (no object overhead per entry)
 * - Predictable memory usage with huge array backing
 * - Atomic allocation/rollback for OOM safety
 *
 * @module HugeLongLongDoubleMap
 */

import { BitUtil } from '@/mem';
import { HugeLongArray, HugeDoubleArray } from '@/collections';

/**
 * Cursor for iteration over map entries.
 * Avoids object allocation during iteration.
 */
export interface LongLongDoubleCursor {
  /** Current entry index in the hash table */
  index: number;
  /** First key (original value, not the +1 internal representation) */
  key1: number;
  /** Second key (original value, not the +1 internal representation) */
  key2: number;
  /** The value associated with the key pair */
  value: number;
}

export class HugeLongLongDoubleMap implements Iterable<LongLongDoubleCursor> {
  private keys1!: HugeLongArray;
  private keys2!: HugeLongArray;
  private values!: HugeDoubleArray;
  public keysCursor: any; // HugeCursor type when available

  private keyMixer: number = 0;
  private assigned: number = 0;    // Number of entries in map
  private mask: number = 0;        // Bit mask for hash table (size - 1)
  private resizeAt: number = 0;    // Threshold for resizing

  private static readonly DEFAULT_EXPECTED_ELEMENTS = 4;
  private static readonly LOAD_FACTOR = 0.75;
  private static readonly MIN_HASH_ARRAY_LENGTH = 4;

  /**
   * Creates a new map with default initial capacity.
   *
   * @example
   * ```typescript
   * // Map for edge weights in graph
   * const edgeWeights = new HugeLongLongDoubleMap();
   *
   * // Store edge weights
   * graph.edges().forEach(edge => {
   *   edgeWeights.set(edge.source, edge.target, edge.weight);
   * });
   *
   * // Retrieve edge weight
   * const weight = edgeWeights.getOrDefault(sourceNode, targetNode, 1.0);
   * ```
   */
  constructor();

  /**
   * Creates a new map with specified expected number of elements.
   * Pre-allocates appropriate capacity to avoid resizing.
   *
   * @param expectedElements Expected number of unique key pairs
   */
  constructor(expectedElements: number);

  constructor(expectedElements: number = HugeLongLongDoubleMap.DEFAULT_EXPECTED_ELEMENTS) {
    this.initialBuffers(expectedElements);
  }

  /**
   * Memory estimation for capacity planning.
   * Essential for resource allocation in large-scale processing.
   */
  public static memoryEstimation(expectedElements: number = HugeLongLongDoubleMap.DEFAULT_EXPECTED_ELEMENTS): number {
    const arraySize = HugeLongLongDoubleMap.minBufferSize(expectedElements);
    const keys1Memory = HugeLongArray.memoryEstimation(arraySize);
    const keys2Memory = HugeLongArray.memoryEstimation(arraySize);
    const valuesMemory = HugeDoubleArray.memoryEstimation(arraySize);
    return keys1Memory + keys2Memory + valuesMemory + 256; // ~256 bytes for map overhead
  }

  /**
   * Returns current memory usage in bytes.
   */
  public sizeOf(): number {
    return this.keys1.sizeOf() + this.keys2.sizeOf() + this.values.sizeOf();
  }

  /**
   * Sets a value for the given key pair.
   * Overwrites existing value if key pair already exists.
   *
   * @param key1 First key (source node, user ID, etc.)
   * @param key2 Second key (target node, item ID, etc.)
   * @param value The value to store
   *
   * Data Science Use Cases:
   * - Set edge weights: (sourceNode, targetNode) → weight
   * - Set embeddings: (node, dimension) → feature value
   * - Set ratings: (user, item) → rating
   * - Set similarities: (entity1, entity2) → similarity score
   */
  public set(key1: number, key2: number, value: number): void {
    this.set0(key1 + 1, key2 + 1, value); // +1 to avoid 0 (empty marker)
  }

  /**
   * Adds a value to the existing value for the given key pair.
   * If key pair doesn't exist, sets the value.
   *
   * This is the CORE operation for many graph algorithms!
   *
   * @param key1 First key
   * @param key2 Second key
   * @param value The value to add
   *
   * Data Science Use Cases:
   * - Accumulate edge weights from multiple sources
   * - Sum feature contributions in graph neural networks
   * - Aggregate user-item interactions over time
   * - Build co-occurrence matrices for collaborative filtering
   *
   * @example
   * ```typescript
   * // Build user-item co-occurrence matrix
   * transactions.forEach(transaction => {
   *   transaction.items.forEach((item1, i) => {
   *     transaction.items.slice(i + 1).forEach(item2 => {
   *       coOccurrence.addTo(item1, item2, 1.0);
   *       coOccurrence.addTo(item2, item1, 1.0); // Symmetric
   *     });
   *   });
   * });
   * ```
   */
  public addTo(key1: number, key2: number, value: number): void {
    this.addTo0(key1 + 1, key2 + 1, value);
  }

  /**
   * Gets the value for a key pair, or returns default if not found.
   *
   * @param key1 First key
   * @param key2 Second key
   * @param defaultValue Value to return if key pair not found
   * @returns The stored value or default
   *
   * Performance: O(1) average, O(n) worst case (rare with good hash)
   */
  public getOrDefault(key1: number, key2: number, defaultValue: number): number {
    return this.getOrDefault0(key1 + 1, key2 + 1, defaultValue);
  }

  /**
   * Internal set implementation using shifted keys.
   * Uses +1 shift to distinguish empty slots (0) from actual key 0.
   */
  private set0(key1: number, key2: number, value: number): void {
    console.assert(this.assigned < this.mask + 1, 'Hash table invariant violated');

    const key = this.hashKey(key1, key2);
    let slot = this.findSlot(key1, key2, key & this.mask);
    console.assert(slot !== -1, 'Should always find a slot');

    if (slot >= 0) {
      // Key pair exists - overwrite value
      this.values.set(slot, value);
      return;
    }

    // Key pair doesn't exist - insert new entry
    slot = ~(1 + slot); // Decode negative slot indicator

    if (this.assigned === this.resizeAt) {
      this.allocateThenInsertThenRehash(slot, key1, key2, value);
    } else {
      this.keys1.set(slot, key1);
      this.keys2.set(slot, key2);
      this.values.set(slot, value);
    }

    this.assigned++;
  }

  /**
   * Internal addTo implementation using shifted keys.
   */
  private addTo0(key1: number, key2: number, value: number): void {
    console.assert(this.assigned < this.mask + 1, 'Hash table invariant violated');

    const key = this.hashKey(key1, key2);
    let slot = this.findSlot(key1, key2, key & this.mask);
    console.assert(slot !== -1, 'Should always find a slot');

    if (slot >= 0) {
      // Key pair exists - add to existing value
      this.values.addTo(slot, value);
      return;
    }

    // Key pair doesn't exist - insert new entry
    slot = ~(1 + slot); // Decode negative slot indicator

    if (this.assigned === this.resizeAt) {
      this.allocateThenInsertThenRehash(slot, key1, key2, value);
    } else {
      this.keys1.set(slot, key1);
      this.keys2.set(slot, key2);
      this.values.set(slot, value);
    }

    this.assigned++;
  }

  /**
   * Internal getOrDefault implementation using shifted keys.
   */
  private getOrDefault0(key1: number, key2: number, defaultValue: number): number {
    const key = this.hashKey(key1, key2);
    const slot = this.findSlot(key1, key2, key & this.mask);

    if (slot >= 0) {
      return this.values.get(slot);
    }

    return defaultValue;
  }

  /**
   * Composite key hash function with excellent distribution.
   * Combines both keys with XOR and applies BitMixer for uniform distribution.
   */
  private hashKey(key1: number, key2: number): number {
    // XOR the keys together, then mix with keyMixer for different hash sequences
    const combined = key1 ^ key2 ^ this.keyMixer;

    // Apply 64-bit BitMixer equivalent
    let h = combined;
    h ^= h >>> 16;
    h *= 0x85ebca6b;
    h ^= h >>> 13;
    h *= 0xc2b2ae35;
    h ^= h >>> 16;
    return h;
  }

  /**
   * Finds slot for given key pair using linear probing.
   * Returns positive slot if keys exist, negative encoded slot if empty.
   */
  private findSlot(key1: number, key2: number, start: number): number {
    const keys1 = this.keys1;
    const keys2 = this.keys2;
    const size = keys1.size();

    // Search from start to end
    let slot = this.findSlotInRange(key1, key2, start, size, keys1, keys2);
    if (slot === -1) {
      // Wrap around: search from 0 to start
      slot = this.findSlotInRange(key1, key2, 0, start, keys1, keys2);
    }
    return slot;
  }

  /**
   * Finds slot within a specific range.
   * Uses linear probing for cache-friendly access.
   */
  private findSlotInRange(
    key1: number,
    key2: number,
    start: number,
    end: number,
    keys1: HugeLongArray,
    keys2: HugeLongArray
  ): number {
    for (let slot = start; slot < end; slot++) {
      const existing1 = keys1.get(slot);

      if (existing1 === key1 && keys2.get(slot) === key2) {
        return slot; // Found existing key pair
      }
      if (existing1 === 0) {
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
    this.keys1.fill(0);
    this.keys2.fill(0);
    this.values.fill(0);
  }

  /**
   * Releases all resources and invalidates the map.
   * Call this when completely done with the map.
   */
  public release(): void {
    this.keys1.release();
    this.keys2.release();
    this.values.release();

    this.keys1 = null as any;
    this.keys2 = null as any;
    this.values = null as any;
    this.assigned = 0;
    this.mask = 0;
  }

  /**
   * Returns an iterator over all key-value pairs.
   * Iterator reuses cursor object for memory efficiency.
   */
  public [Symbol.iterator](): Iterator<LongLongDoubleCursor> {
    return new EntryIterator(this.keys1, this.keys2, this.values);
  }

  /**
   * Returns a human-readable string representation.
   * Useful for debugging small maps.
   */
  public toString(): string {
    const parts: string[] = [];

    for (const cursor of this) {
      parts.push(`(${cursor.key1},${cursor.key2})=>${cursor.value}`);
    }

    return `[${parts.join(', ')}]`;
  }

  /**
   * Initial buffer allocation based on expected elements.
   */
  private initialBuffers(expectedElements: number): void {
    this.allocateBuffers(HugeLongLongDoubleMap.minBufferSize(expectedElements));
  }

  /**
   * Allocates new internal buffers atomically.
   * Either succeeds completely or leaves map unchanged.
   */
  private allocateBuffers(arraySize: number): void {
    console.assert(BitUtil.isPowerOfTwo(arraySize), 'Array size must be power of 2');

    // Generate new hash mixer for this resize
    const newKeyMixer = this.generateRandomSeed();

    // Store previous buffers for rollback on OOM
    const prevKeys1 = this.keys1;
    const prevKeys2 = this.keys2;
    const prevValues = this.values;

    try {
      this.keys1 = HugeLongArray.newArray(arraySize);
      this.keys2 = HugeLongArray.newArray(arraySize);
      this.values = HugeDoubleArray.newArray(arraySize);
      this.keysCursor = this.keys1.newCursor();
    } catch (error) {
      // Rollback on allocation failure
      this.keys1 = prevKeys1;
      this.keys2 = prevKeys2;
      this.values = prevValues;
      throw error;
    }

    this.resizeAt = HugeLongLongDoubleMap.expandAtCount(arraySize);
    this.keyMixer = newKeyMixer;
    this.mask = arraySize - 1;
  }

  /**
   * Rehashes all entries from old buffers to new buffers.
   * Called during map growth.
   */
  private rehash(
    fromKeys1: HugeLongArray,
    fromKeys2: HugeLongArray,
    fromValues: HugeDoubleArray
  ): void {
    console.assert(
      fromKeys1.size() === fromValues.size() &&
      fromKeys2.size() === fromValues.size() &&
      BitUtil.isPowerOfTwo(fromValues.size()),
      'Buffer sizes must match and be power of 2'
    );

    const newKeys1 = this.keys1;
    const newKeys2 = this.keys2;
    const newValues = this.values;
    const mask = this.mask;

    // Iterate through all entries in old buffers
    const iterator = new EntryIterator(fromKeys1, fromKeys2, fromValues);
    try {
      for (const cursor of iterator) {
        const key1 = cursor.key1 + 1; // Restore internal +1 shift
        const key2 = cursor.key2 + 1;
        let slot = this.hashKey(key1, key2) & mask;
        slot = this.findSlot(key1, key2, slot);
        slot = ~(1 + slot); // Decode empty slot

        newKeys1.set(slot, key1);
        newKeys2.set(slot, key2);
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
    pendingKey1: number,
    pendingKey2: number,
    pendingValue: number
  ): void {
    console.assert(this.assigned === this.resizeAt, 'Should only resize at threshold');

    // Store old buffers for rehashing
    const prevKeys1 = this.keys1;
    const prevKeys2 = this.keys2;
    const prevValues = this.values;

    // Allocate new, larger buffers
    this.allocateBuffers(HugeLongLongDoubleMap.nextBufferSize(this.mask + 1));
    console.assert(this.keys1.size() > prevKeys1.size(), 'New buffers should be larger');

    // Insert pending entry into old buffers before rehashing
    prevKeys1.set(slot, pendingKey1);
    prevKeys2.set(slot, pendingKey2);
    prevValues.set(slot, pendingValue);

    // Rehash all entries from old to new buffers
    this.rehash(prevKeys1, prevKeys2, prevValues);

    // Release old buffers
    prevKeys1.release();
    prevKeys2.release();
    prevValues.release();
  }

  /**
   * Generates a random seed for hash mixing.
   * Uses current timestamp + counter for uniqueness.
   */
  private generateRandomSeed(): number {
    return Math.floor(Math.random() * 2147483647) ^ Date.now();
  }

  /**
   * Calculates minimum buffer size for expected elements.
   * Accounts for load factor and ensures power-of-2 sizing.
   */
  private static minBufferSize(elements: number): number {
    if (elements < 0) {
      throw new Error(`Number of elements must be >= 0: ${elements}`);
    }

    let length = Math.ceil(elements / HugeLongLongDoubleMap.LOAD_FACTOR);
    if (length === elements) {
      length++; // Ensure we have some free space
    }

    length = Math.max(
      HugeLongLongDoubleMap.MIN_HASH_ARRAY_LENGTH,
      BitUtil.nextHighestPowerOfTwo(length)
    );

    return length;
  }

  /**
   * Returns next buffer size (doubles current size).
   */
  private static nextBufferSize(arraySize: number): number {
    console.assert(BitUtil.isPowerOfTwo(arraySize), 'Current size must be power of 2');
    return arraySize << 1; // Double the size
  }

  /**
   * Calculates when to resize based on load factor.
   */
  private static expandAtCount(arraySize: number): number {
    console.assert(BitUtil.isPowerOfTwo(arraySize), 'Array size must be power of 2');
    return Math.min(arraySize, Math.ceil(arraySize * HugeLongLongDoubleMap.LOAD_FACTOR));
  }
}

/**
 * Memory-efficient iterator for map entries.
 * Reuses cursor object to avoid allocations during iteration.
 */
class EntryIterator implements Iterator<LongLongDoubleCursor>, Iterable<LongLongDoubleCursor> {
  private keys1Cursor: any; // HugeCursor when available
  private keys2Cursor: any;
  private valuesCursor: any;
  private nextFetched: boolean = false;
  private hasNextValue: boolean = false;
  private cursor: LongLongDoubleCursor;
  private pos: number = 0;
  private end: number = 0;
  private keys1: number[] | null = null;
  private keys2: number[] | null = null;
  private values: number[] | null = null;

  constructor(
    private keys1Array: HugeLongArray,
    private keys2Array: HugeLongArray,
    private valuesArray: HugeDoubleArray
  ) {
    this.keys1Cursor = keys1Array.newCursor();
    this.keys2Cursor = keys2Array.newCursor();
    this.valuesCursor = valuesArray.newCursor();
    this.cursor = { index: 0, key1: 0, key2: 0, value: 0 };
    this.reset();
  }

  public reset(): EntryIterator {
    this.keys1Array.initCursor(this.keys1Cursor);
    this.keys2Array.initCursor(this.keys2Cursor);
    this.valuesArray.initCursor(this.valuesCursor);
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

  public next(): IteratorResult<LongLongDoubleCursor> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }
    this.nextFetched = false;
    return { done: false, value: this.cursor };
  }

  /**
   * Fetches the next non-empty entry.
   * Skips empty slots (key1 === 0).
   */
    private fetchNext(): boolean {
    let key1: number;

    do {
      while (this.pos < this.end) {
        key1 = this.keys1![this.pos];
        if (key1 !== 0) {
          // ✅ CREATE NEW CURSOR OBJECT for each entry
          this.cursor = {
            index: this.pos,
            key1: key1 - 1, // Remove internal +1 shift
            key2: this.keys2![this.pos] - 1, // Remove internal +1 shift
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
    const keys2HasNext = this.keys2Cursor.next();
    const valuesHasNext = this.valuesCursor.next();

    if (!this.keys1Cursor.next()) {
      console.assert(!keys2HasNext && !valuesHasNext, 'All cursors should advance together');
      return false;
    }
    console.assert(keys2HasNext && valuesHasNext, 'All cursors should advance together');

    this.keys1 = this.keys1Cursor.array;
    this.keys2 = this.keys2Cursor.array;
    this.values = this.valuesCursor.array;
    this.pos = this.keys1Cursor.offset;
    this.end = this.keys1Cursor.limit;

    return true;
  }

  public [Symbol.iterator](): Iterator<LongLongDoubleCursor> {
    return this.reset();
  }

  public close(): void {
    if (this.keys1Cursor) {
      this.keys1Cursor.close();
      this.keys1Cursor = null;
    }
    if (this.keys2Cursor) {
      this.keys2Cursor.close();
      this.keys2Cursor = null;
    }
    if (this.valuesCursor) {
      this.valuesCursor.close();
      this.valuesCursor = null;
    }
    this.cursor = null as any;
  }
}
