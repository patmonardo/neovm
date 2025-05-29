/**
 * High-performance hash map: long keys → long values
 *
 * Essential for core graph algorithm mappings:
 * - Node ID → Community ID (community detection)
 * - Node ID → Parent node (Union-Find, spanning trees)
 * - Node ID → Distance/rank (shortest paths, PageRank quantized)
 * - Edge ID → Weight ID (edge weight lookups)
 * - Original ID → Internal ID (ID mapping/compression)
 *
 * Performance characteristics:
 * - Open addressing with linear probing (cache-friendly)
 * - Backed by HugeLongArray for billion-element capacity
 * - Load factor: 0.75 (optimal space/time trade-off)
 * - BitMixer hash function for excellent distribution
 * - Automatic resizing with power-of-2 growth
 *
 * Data Science Applications:
 * - Community detection: node → community assignments
 * - Graph compression: original node ID → compressed ID
 * - Union-Find: node → parent/root mappings
 * - Ranking algorithms: node → rank position
 * - Graph partitioning: node → partition ID
 *
 * Memory efficiency:
 * - Two primitive arrays (no object overhead per entry)
 * - Predictable memory usage with huge array backing
 * - Suitable for memory-mapped storage and persistence
 *
 * @module HugeLongLongMap
 */

import { HugeLongArray } from "@/collections";
import { BitUtil } from "@/mem";

/**
 * Cursor for iteration over map entries.
 * Reuses the same object to avoid allocations during iteration.
 */
export interface LongLongCursor {
  /** Current entry index in the hash table */
  index: number;
  /** The key (original value, not the +1 internal representation) */
  key: number;
  /** The value associated with the key */
  value: number;
}
export class HugeLongLongMap implements Iterable<LongLongCursor> {
  private keys!: HugeLongArray;
  private values!: HugeLongArray;
  private keysCursor: any; // HugeCursor type when available
  private entries!: EntryIterator;

  private assigned: number = 0; // Number of entries in map
  private mask: number = 0; // Bit mask for hash table (size - 1)
  private resizeAt: number = 0; // Threshold for resizing

  private static readonly DEFAULT_EXPECTED_ELEMENTS = 4;
  private static readonly LOAD_FACTOR = 0.75;
  private static readonly MIN_HASH_ARRAY_LENGTH = 4;

  /**
   * Creates a new map with default initial capacity.
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
    expectedElements: number = HugeLongLongMap.DEFAULT_EXPECTED_ELEMENTS
  ) {
    this.initialBuffers(expectedElements);
  }

  /**
   * Factory method to create an empty map with default capacity.
   */
  public static of(): HugeLongLongMap {
    return new HugeLongLongMap();
  }

  /**
   * Factory method to create a map with specified capacity.
   */
  public static withExpectedSize(expectedElements: number): HugeLongLongMap {
    return new HugeLongLongMap(expectedElements);
  }

  /**
   * Memory estimation for capacity planning.
   */
  public static memoryEstimation(): number {
    return HugeLongLongMap.memoryEstimationForSize(
      HugeLongLongMap.DEFAULT_EXPECTED_ELEMENTS
    );
  }

  /**
   * Memory estimation for specific expected elements.
   */
  public static memoryEstimationForSize(expectedElements: number): number {
    const arraySize = HugeLongLongMap.minBufferSize(expectedElements);
    const keysMemory = HugeLongArray.memoryEstimation(arraySize);
    const valuesMemory = HugeLongArray.memoryEstimation(arraySize);
    return keysMemory + valuesMemory + 128; // ~128 bytes for map overhead
  }

  /**
   * Initial buffer allocation based on expected elements.
   */
  private initialBuffers(expectedElements: number): void {
    this.allocateBuffers(HugeLongLongMap.minBufferSize(expectedElements));
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
      this.values = HugeLongArray.newArray(arraySize);
      this.keysCursor = this.keys.newCursor();
      this.entries = new EntryIterator(this.keys, this.values);
    } catch (error) {
      // Rollback on allocation failure
      this.keys = prevKeys;
      this.values = prevValues;
      throw error;
    }

    this.resizeAt = HugeLongLongMap.expandAtCount(arraySize);
    this.mask = arraySize - 1;
  }

  /**
   * Returns current memory usage in bytes.
   */
  public sizeOf(): number {
    return this.keys.sizeOf() + this.values.sizeOf();
  }

  /**
   * Sets a value for the given key.
   * Overwrites existing value if key already exists.
   *
   * @param key The key (node ID, edge ID, etc.)
   * @param value The value to store (community ID, parent node, etc.)
   *
   * Data Science Use Cases:
   * - Set community assignments: node → community
   * - Set parent pointers: node → parent (Union-Find)
   * - Set ID mappings: original ID → compressed ID
   * - Set rankings: node → rank position
   */
  public put(key: number, value: number): void {
    this.put0(key + 1, value); // +1 to avoid 0 (empty marker)
  }

  /**
   * Adds a value to the existing value for the given key.
   * If key doesn't exist, sets the value.
   *
   * Perfect for accumulation patterns in graph algorithms!
   *
   * @param key The key
   * @param value The value to add
   *
   * Data Science Use Cases:
   * - Accumulate node degrees
   * - Sum edge weights by source
   * - Count community memberships
   * - Aggregate temporal events by node
   *
   * @example
   * ```typescript
   * // Count node degrees
   * graph.edges().forEach(edge => {
   *   degrees.addTo(edge.source, 1);
   *   degrees.addTo(edge.target, 1);
   * });
   * ```
   */
  public addTo(key: number, value: number): void {
    this.addTo0(key + 1, value);
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
   * Checks if the map contains the given key.
   *
   * @param key The key to check
   * @returns true if key exists, false otherwise
   */
  public containsKey(key: number): boolean {
    return this.containsKey0(key + 1);
  }

  /**
   * Internal containsKey implementation using shifted keys.
   */
  private containsKey0(key: number): boolean {
    const hash = this.mixHash(key);
    return this.findSlot(key, hash & this.mask) >= 0;
  }

  /**
   * Internal put implementation using shifted keys.
   * Uses +1 shift to distinguish empty slots (0) from actual key 0.
   */
  private put0(key: number, value: number): void {
    console.assert(
      this.assigned < this.mask + 1,
      "Hash table invariant violated"
    );

    const hash = this.mixHash(key);
    let slot = this.findSlot(key, hash & this.mask);
    console.assert(slot !== -1, "Should always find a slot");

    if (slot >= 0) {
      // Key exists - overwrite value
      this.values.set(slot, value);
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
   * Internal addTo implementation using shifted keys.
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
    const cursor = this.keysCursor;

    let slot = this.findSlotInRange(key, start, keys.size(), keys, cursor);
    if (slot === -1) {
      // Wrap around: search from 0 to start
      slot = this.findSlotInRange(key, 0, start, keys, cursor);
    }
    return slot;
  }

  /**
   * Finds slot within a specific range using cursor-based iteration.
   * Optimized for huge arrays with paged access.
   */
  private findSlotInRange(
    key: number,
    start: number,
    end: number,
    keys: HugeLongArray,
    cursor: any
  ): number {
    let slot = start;
    let blockPos: number, blockEnd: number;
    let keysBlock: number[];
    let existing: number;

    keys.initCursor(cursor, start, end);
    while (cursor.next()) {
      keysBlock = cursor.array;
      blockPos = cursor.offset;
      blockEnd = cursor.limit;

      while (blockPos < blockEnd) {
        existing = keysBlock[blockPos];
        if (existing === key) {
          return slot; // Found existing key
        }
        if (existing === 0) {
          return ~slot - 1; // Found empty slot (encoded as negative)
        }
        blockPos++;
        slot++;
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
  [Symbol.iterator](): Iterator<LongLongCursor> {
    // Reset the iterator to start from beginning
    this.entries.reset(this.keys, this.values);
    return this.entries;
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
   * Rehashes all entries from old buffers to new buffers.
   * Called during map growth.
   */
  private rehash(fromKeys: HugeLongArray, fromValues: HugeLongArray): void {
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
    this.allocateBuffers(HugeLongLongMap.nextBufferSize(this.mask + 1));
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

    let length = Math.ceil(elements / HugeLongLongMap.LOAD_FACTOR);
    if (length === elements) {
      length++; // Ensure we have some free space
    }

    length = Math.max(
      HugeLongLongMap.MIN_HASH_ARRAY_LENGTH,
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
      Math.ceil(arraySize * HugeLongLongMap.LOAD_FACTOR)
    );
  }
}

/**
 * Memory-efficient iterator for map entries.
 * Reuses cursor object to avoid allocations during iteration.
 */
class EntryIterator
  implements Iterator<LongLongCursor>, Iterable<LongLongCursor>
{
  private keyCursor: any; // HugeCursor<number[]> when available
  private valueCursor: any; // HugeCursor<number[]> when available
  private nextFetched: boolean = false;
  private hasNextValue: boolean = false;
  private cursor: LongLongCursor;
  private pos: number = 0;
  private end: number = 0;
  private ks: number[] | null = null;
  private vs: number[] | null = null;
  private globalIndex: number = 0; // Track absolute position in arrays

  constructor(
    private keysArray: HugeLongArray,
    private valuesArray: HugeLongArray
  ) {
    this.cursor = { index: 0, key: 0, value: 0 };
    this.init(keysArray, valuesArray);
  }

  /**
   * Initialize/reinitialize the iterator with arrays
   */
  public init(keys: HugeLongArray, values: HugeLongArray): void {
    this.keysArray = keys;
    this.valuesArray = values;
    this.keyCursor = keys.newCursor();
    this.valueCursor = values.newCursor();
    this.reset();
  }

  /**
   * Reset iterator to beginning
   */
  public reset(): EntryIterator;
  public reset(keys: HugeLongArray, values: HugeLongArray): EntryIterator;
  public reset(keys?: HugeLongArray, values?: HugeLongArray): EntryIterator {
    if (keys && values) {
      this.init(keys, values);
      return this;
    }

    // Reset to beginning of arrays
    this.keysArray.initCursor(this.keyCursor);
    this.valuesArray.initCursor(this.valueCursor);
    this.pos = 0;
    this.end = 0;
    this.globalIndex = 0;
    this.hasNextValue = false;
    this.nextFetched = false;
    this.ks = null;
    this.vs = null;

    return this;
  }

  /**
   * Check if there are more entries (JavaScript Iterator interface)
   */
  // public hasNext(): boolean {
  //   // Simple peek-ahead without caching
  //   return this.pos < this.end || this.canAdvanceToNextPage();
  // }
  /**
   * Get next entry (JavaScript Iterator interface)
   */
  public next(): IteratorResult<LongLongCursor> {
    if (this.fetchNext()) {
      return { done: false, value: this.cursor };
    } else {
      return { done: true, value: undefined };
    }
  }

  /**
   * Fetches the next non-empty entry.
   * Skips empty slots (key === 0).
   */
  private fetchNext(): boolean {
    let key: number;

    // Continue searching through current page and subsequent pages
    do {
      // Search within current page
      while (this.pos < this.end) {
        key = this.ks![this.pos];
        if (key !== 0) {
          // Found non-empty slot
          // ✅ CREATE NEW CURSOR OBJECT instead of reusing this.cursor
          const newCursor: LongLongCursor = {
            index: this.globalIndex,
            key: key - 1, // Remove internal +1 shift
            value: this.vs![this.pos],
          };

          this.cursor = newCursor; // Update for next() return
          this.pos++;
          this.globalIndex++;
          return true;
        }
        this.pos++;
        this.globalIndex++;
      }
    } while (this.nextPage());

    return false; // No more entries
  }

  /**
   * Advances to the next page of data.
   * Uses cursors for efficient chunk-based iteration.
   */
  private nextPage(): boolean {
    const keysHasNext = this.keyCursor.next();
    const valuesHasNext = this.valueCursor.next();

    // Both cursors should advance together
    if (!keysHasNext) {
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

    // Get the new page data
    this.ks = this.keyCursor.array;
    this.pos = this.keyCursor.offset;
    this.end = this.keyCursor.limit;
    this.vs = this.valueCursor.array;

    // Verify cursors are synchronized
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

  /**
   * Make this object iterable (for...of support)
   */
  public [Symbol.iterator](): Iterator<LongLongCursor> {
    return this.reset();
  }

  /**
   * Close and cleanup resources
   */
  public close(): void {
    if (this.keyCursor) {
      this.keyCursor.close();
      this.keyCursor = null;
    }
    if (this.valueCursor) {
      this.valueCursor.close();
      this.valueCursor = null;
    }
    this.ks = null;
    this.vs = null;
    this.cursor = null as any;
  }
}
