import { HugeCursor } from '../../../collections/cursor/HugeCursor';
import { HugeDoubleArray } from '../../../collections/ha/HugeDoubleArray';
import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { MemoryEstimation, MemoryEstimations } from '../../mem/MemoryEstimation';
import { BitUtil } from '../../mem/BitUtil';

/**
 * A map implementation for storing large numbers of entries mapping number keys to number values.
 * Uses open addressing with linear probing for collision resolution.
 */
export class HugeLongDoubleMap implements Iterable<LongDoubleCursor> {
  /**
   * Memory estimation for this data structure.
   */
  private static readonly MEMORY_REQUIREMENTS: MemoryEstimation = MemoryEstimations
    .builder(HugeLongDoubleMap)
    .field("keysCursor", HugeCursor.PagedCursor)
    .field("entries", EntryIterator)
    .perNode("keys", HugeLongArray.memoryEstimation)
    .perNode("values", HugeDoubleArray.memoryEstimation)
    .build();

  private keys: HugeLongArray;
  private values: HugeDoubleArray;
  private keysCursor: HugeCursor.PagedCursor<BigInt64Array>;
  private entries: EntryIterator;

  private assigned: number = 0;
  private mask: number = 0;
  private resizeAt: number = 0;

  private static readonly DEFAULT_EXPECTED_ELEMENTS = 4;
  private static readonly LOAD_FACTOR = 0.75;

  /**
   * Returns a memory estimation for this data structure.
   *
   * @returns Memory estimation
   */
  public static memoryEstimation(): MemoryEstimation {
    return this.MEMORY_REQUIREMENTS;
  }

  /**
   * Creates a new map with default capacity.
   */
  constructor();

  /**
   * Creates a new map with the specified expected capacity.
   *
   * @param expectedElements Expected number of elements
   */
  constructor(expectedElements?: number) {
    this.initialBuffers(expectedElements ?? HugeLongDoubleMap.DEFAULT_EXPECTED_ELEMENTS);
  }

  /**
   * Calculates the memory size of this map.
   *
   * @returns Size in bytes
   */
  public sizeOf(): number {
    return this.keys.sizeOf() + this.values.sizeOf();
  }

  /**
   * Adds a value to the current value associated with the given key.
   * If the key doesn't exist, it's added with the given value.
   *
   * @param key The key
   * @param value The value to add
   */
  public addTo(key: number, value: number): void {
    this.addTo0(1n + key, value);
  }

  /**
   * Gets the value associated with the key, or returns the default value
   * if the key doesn't exist in the map.
   *
   * @param key The key
   * @param defaultValue Value to return if key doesn't exist
   * @returns The associated value or defaultValue
   */
  public getOrDefault(key: number, defaultValue: number): number {
    return this.getOrDefault0(1n + key, defaultValue);
  }

  private addTo0(key: number, value: number): void {
    console.assert(this.assigned < this.mask + 1);
    const hash = this.mixPhi(key);
    let slot = this.findSlot(key, hash & BigInt(this.mask));

    if (slot >= 0) {
      // Key exists, add to current value
      this.values.addTo(slot, value);
      return;
    }

    // Key doesn't exist, insert new entry
    slot = ~(1 + slot);
    if (this.assigned === this.resizeAt) {
      this.allocateThenInsertThenRehash(slot, key, value);
    } else {
      this.values.set(slot, value);
      this.keys.set(slot, key);
    }

    this.assigned++;
  }

  private getOrDefault0(key: number, defaultValue: number): number {
    const hash = this.mixPhi(key);
    const slot = this.findSlot(key, hash & BigInt(this.mask));

    if (slot >= 0) {
      return this.values.get(slot);
    }

    return defaultValue;
  }

  private findSlot(key: number, start: number): number {
    const keys = this.keys;
    const cursor = this.keysCursor;
    let slot = this.findSlotInRange(key, Number(start), keys.size(), keys, cursor);

    if (slot === -1) {
      slot = this.findSlotInRange(key, 0, Number(start), keys, cursor);
    }

    return slot;
  }

  private findSlotInRange(
    key: number,
    start: number,
    end: number,
    keys: HugeLongArray,
    cursor: HugeCursor.PagedCursor<BigInt64Array>
  ): number {
    let slot = start;
    let blockPos: number;
    let blockEnd: number;
    let keysBlock: BigInt64Array;
    let existing: number;

    keys.initCursor(cursor, start, end);
    while (cursor.next()) {
      keysBlock = cursor.array;
      blockPos = cursor.offset;
      blockEnd = cursor.limit;

      while (blockPos < blockEnd) {
        existing = keysBlock[blockPos];
        if (existing === key) {
          return slot;
        }
        if (existing === 0n) {
          return ~slot - 1;
        }
        ++blockPos;
        ++slot;
      }
    }

    return -1;
  }

  /**
   * Returns the number of entries in the map.
   *
   * @returns Entry count
   */
  public size(): number {
    return this.assigned;
  }

  /**
   * Returns whether the map is empty.
   *
   * @returns true if the map is empty
   */
  public isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Removes all entries from the map.
   */
  public clear(): void {
    this.assigned = 0;
    this.keys.fill(0n);
    this.values.fill(0);
  }

  /**
   * Releases memory held by this map.
   */
  public release(): void {
    this.keys.release();
    this.values.release();

    this.keys = null!;
    this.values = null!;
    this.assigned = 0;
    this.mask = 0;
  }

  private initialBuffers(expectedElements: number): void {
    this.allocateBuffers(this.minBufferSize(expectedElements));
  }

  /**
   * Returns an iterator over the entries in the map.
   */
  public [Symbol.iterator](): Iterator<LongDoubleCursor> {
    return this.entries.reset();
  }

  /**
   * Convert the contents of this map to a human-friendly string.
   */
  public toString(): string {
    const buffer: string[] = [];
    buffer.push('[');

    for (const cursor of this) {
      buffer.push(`${cursor.key}=>${cursor.value}, `);
    }

    if (buffer.length > 1) {
      buffer[buffer.length - 1] = buffer[buffer.length - 1].slice(0, -2);
      buffer.push(']');
    } else {
      buffer.push(']');
    }

    return buffer.join('');
  }

  /**
   * Allocate new internal buffers.
   */
  private allocateBuffers(arraySize: number): void {
    console.assert(BitUtil.isPowerOfTwo(arraySize));

    // Ensure no change is done if we hit an OOM.
    const prevKeys = this.keys;
    const prevValues = this.values;

    try {
      this.keys = HugeLongArray.newArray(arraySize);
      this.values = HugeDoubleArray.newArray(arraySize);
      this.keysCursor = this.keys.newCursor();
      this.entries = new EntryIterator(this.keys, this.values);
    } catch (e) {
      this.keys = prevKeys;
      this.values = prevValues;
      throw e;
    }

    this.resizeAt = this.expandAtCount(arraySize);
    this.mask = arraySize - 1;
  }

  /**
   * Rehash from old buffers to new buffers.
   */
  private rehash(fromKeys: HugeLongArray, fromValues: HugeDoubleArray): void {
    console.assert(
      fromKeys.size() === fromValues.size() &&
      BitUtil.isPowerOfTwo(fromValues.size())
    );

    // Rehash all stored key/value pairs into the new buffers.
    const newKeys = this.keys;
    const newValues = this.values;
    const mask = this.mask;

    const fromEntries = new EntryIterator(fromKeys, fromValues);
    try {
      for (const cursor of fromEntries) {
        const key = cursor.key + 1n;
        let slot = Number(this.mixPhi(key) & BigInt(mask));
        slot = this.findSlot(key, BigInt(slot));
        slot = ~(1 + slot);
        newKeys.set(slot, key);
        newValues.set(slot, cursor.value);
      }
    } finally {
      fromEntries.close();
    }
  }

  /**
   * This method is invoked when there is a new key/value pair to be inserted into
   * the buffers but there is not enough empty slots to do so.
   */
  private allocateThenInsertThenRehash(slot: number, pendingKey: number, pendingValue: number): void {
    console.assert(this.assigned === this.resizeAt);

    // Try to allocate new buffers first. If we OOM, we leave in a consistent state.
    const prevKeys = this.keys;
    const prevValues = this.values;
    this.allocateBuffers(this.nextBufferSize(this.mask + 1));
    console.assert(this.keys.size() > prevKeys.size());

    // We have succeeded at allocating new data so insert the pending key/value at
    // the free slot in the old arrays before rehashing.
    prevKeys.set(slot, pendingKey);
    prevValues.set(slot, pendingValue);

    // Rehash old keys, including the pending key.
    this.rehash(prevKeys, prevValues);

    prevKeys.release();
    prevValues.release();
  }

  private static readonly MIN_HASH_ARRAY_LENGTH = 4;

  private minBufferSize(elements: number): number {
    if (elements < 0) {
      throw new Error(`Number of elements must be >= 0: ${elements}`);
    }

    let length = Math.ceil(elements / HugeLongDoubleMap.LOAD_FACTOR);
    if (length === elements) {
      length++;
    }

    length = Math.max(
      HugeLongDoubleMap.MIN_HASH_ARRAY_LENGTH,
      BitUtil.nextHighestPowerOfTwo(length)
    );

    return length;
  }

  private nextBufferSize(arraySize: number): number {
    console.assert(BitUtil.isPowerOfTwo(arraySize));
    return arraySize << 1;
  }

  private expandAtCount(arraySize: number): number {
    console.assert(BitUtil.isPowerOfTwo(arraySize));
    return Math.min(arraySize, Math.ceil(arraySize * HugeLongDoubleMap.LOAD_FACTOR));
  }

  /**
   * BitMixer.mixPhi implementation from HPPC
   * A method to mix bits for a 64-bit hash code.
   */
  private mixPhi(key: number): number {
    const h = key * 0x9E3779B97F4A7C15n;
    return h ^ (h >> 32n);
  }
}

/**
 * Cursor for iterating over long-double entries.
 */
export class LongDoubleCursor {
  /**
   * Current index in the backing arrays.
   */
  index: number = 0;

  /**
   * Current key.
   */
  key: number = 0n;

  /**
   * Current value.
   */
  value: number = 0;
}

/**
 * Iterator over the map entries.
 */
class EntryIterator implements AutoCloseable, Iterable<LongDoubleCursor>, Iterator<LongDoubleCursor> {
  private keyCursor: HugeCursor.PagedCursor<BigInt64Array>;
  private valueCursor: HugeCursor.PagedCursor<Float64Array>;
  private nextFetched = false;
  private hasNext = false;
  private cursor: LongDoubleCursor;
  private pos = 0;
  private end = 0;
  private ks: BigInt64Array = new BigInt64Array(0);
  private vs: Float64Array = new Float64Array(0);

  /**
   * Creates a new iterator over the map entries.
   */
  constructor();

  /**
   * Creates a new iterator over the specified arrays.
   *
   * @param keys The keys array
   * @param values The values array
   */
  constructor(keys?: HugeLongArray, values?: HugeDoubleArray) {
    this.keyCursor = (keys ?? HugeLongArray.newArray(0)).newCursor();
    this.valueCursor = (values ?? HugeDoubleArray.newArray(0)).newCursor();
    this.cursor = new LongDoubleCursor();
  }

  /**
   * Resets the iterator to the beginning of the map.
   *
   * @returns This iterator
   */
  reset(): EntryIterator;

  /**
   * Resets the iterator to the beginning of the specified arrays.
   *
   * @param keys The keys array
   * @param values The values array
   * @returns This iterator
   */
  reset(keys?: HugeLongArray, values?: HugeDoubleArray): EntryIterator {
    if (keys && values) {
      keys.initCursor(this.keyCursor);
      values.initCursor(this.valueCursor);
    } else {
      this.keyCursor.setRange(0, this.keyCursor.capacity);
      this.valueCursor.setRange(0, this.valueCursor.capacity);
    }

    this.pos = 0;
    this.end = 0;
    this.hasNext = false;
    this.nextFetched = false;
    return this;
  }

  /**
   * Checks if there are more entries.
   */
  public hasNext(): boolean {
    if (!this.nextFetched) {
      this.nextFetched = true;
      return this.hasNext = this.fetchNext();
    }
    return this.hasNext;
  }

  /**
   * Returns the next entry.
   */
  public next(): IteratorResult<LongDoubleCursor> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }
    this.nextFetched = false;
    return { done: false, value: this.cursor };
  }

  private fetchNext(): boolean {
    let key: number;
    do {
      while (this.pos < this.end) {
        if ((key = this.ks[this.pos]) !== 0n) {
          this.cursor.index = this.pos;
          this.cursor.key = key - 1n;
          this.cursor.value = this.vs[this.pos];
          ++this.pos;
          return true;
        }
        ++this.pos;
      }
    } while (this.nextPage());
    return false;
  }

  private nextPage(): boolean {
    return this.nextPage(this.keyCursor, this.valueCursor);
  }

  private nextPage(
    keys: HugeCursor.PagedCursor<BigInt64Array>,
    values: HugeCursor.PagedCursor<Float64Array>
  ): boolean {
    const valuesHasNext = values.next();
    if (!keys.next()) {
      console.assert(!valuesHasNext);
      return false;
    }
    console.assert(valuesHasNext);

    this.ks = keys.array;
    this.pos = keys.offset;
    this.end = keys.limit;
    this.vs = values.array;
    console.assert(this.pos === values.offset);
    console.assert(this.end === values.limit);

    return true;
  }

  /**
   * Returns an iterator over the entries.
   */
  public [Symbol.iterator](): Iterator<LongDoubleCursor> {
    return this.reset();
  }

  /**
   * Closes the iterator and releases resources.
   */
  public close(): void {
    this.keyCursor.close();
    this.keyCursor = null!;
    this.valueCursor.close();
    this.valueCursor = null!;
    this.cursor = null!;
  }
}

/**
 * Interface for objects that can be automatically closed.
 */
interface AutoCloseable {
  close(): void;
}
