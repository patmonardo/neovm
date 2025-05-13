import { HugeCursor } from '../../../collections/cursor/HugeCursor';
import { HugeDoubleArray } from '../../../collections/ha/HugeDoubleArray';
import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { BitUtil } from '../../mem/BitUtil';
import { CloseableThreadLocal } from '../../utils/CloseableThreadLocal';

/**
 * Map with two longs as keys and huge underlying storage, so it can
 * store more than 2B values. Used for edge property storage in graph algorithms.
 */
export class HugeLongLongDoubleMap {
  private keys1: HugeLongArray;
  private keys2: HugeLongArray;
  private values: HugeDoubleArray;
  private keysCursor: CloseableThreadLocal<HugeCursor.PagedCursor<BigInt64Array>>;

  private keyMixer: number;
  private assigned: number = 0;
  private mask: number = 0;
  private resizeAt: number = 0;

  private static readonly DEFAULT_EXPECTED_ELEMENTS = 4;
  private static readonly LOAD_FACTOR = 0.75;

  /**
   * New instance with sane defaults.
   */
  constructor();

  /**
   * New instance with specified capacity.
   *
   * @param expectedElements Expected number of elements
   */
  constructor(expectedElements?: number) {
    this.initialBuffers(expectedElements ?? HugeLongLongDoubleMap.DEFAULT_EXPECTED_ELEMENTS);
  }

  /**
   * Sets the value for the given key pair.
   *
   * @param key1 First key component
   * @param key2 Second key component
   * @param value Value to set
   */
  public set(key1: number, key2: number, value: number): void {
    this.set0(1n + key1, 1n + key2, value);
  }

  /**
   * Adds the given value to the current value for the key pair.
   *
   * @param key1 First key component
   * @param key2 Second key component
   * @param value Value to add
   */
  public addTo(key1: number, key2: number, value: number): void {
    this.addTo0(1n + key1, 1n + key2, value);
  }

  /**
   * Gets the value for the key pair or returns the default value.
   *
   * @param key1 First key component
   * @param key2 Second key component
   * @param defaultValue Default value if key isn't found
   * @returns The value or defaultValue
   */
  public getOrDefault(key1: number, key2: number, defaultValue: number): number {
    return this.getOrDefault0(1n + key1, 1n + key2, defaultValue);
  }

  private set0(key1: number, key2: number, value: number): void {
    console.assert(this.assigned < this.mask + 1);
    const key = this.hashKey(key1, key2);

    let slot = this.findSlot(key1, key2, key & BigInt(this.mask));
    console.assert(slot !== -1);
    if (slot >= 0) {
      this.values.set(slot, value);
      return;
    }

    slot = ~(1 + slot);
    if (this.assigned === this.resizeAt) {
      this.allocateThenInsertThenRehash(slot, key1, key2, value);
    } else {
      this.keys1.set(slot, key1);
      this.keys2.set(slot, key2);
      this.values.set(slot, value);
    }

    this.assigned++;
  }

  private addTo0(key1: number, key2: number, value: number): void {
    console.assert(this.assigned < this.mask + 1);
    const key = this.hashKey(key1, key2);

    let slot = this.findSlot(key1, key2, key & BigInt(this.mask));
    console.assert(slot !== -1);
    if (slot >= 0) {
      this.values.addTo(slot, value);
      return;
    }

    slot = ~(1 + slot);
    if (this.assigned === this.resizeAt) {
      this.allocateThenInsertThenRehash(slot, key1, key2, value);
    } else {
      this.keys1.set(slot, key1);
      this.keys2.set(slot, key2);
      this.values.set(slot, value);
    }

    this.assigned++;
  }

  private getOrDefault0(key1: number, key2: number, defaultValue: number): number {
    const key = this.hashKey(key1, key2);

    const slot = this.findSlot(key1, key2, key & BigInt(this.mask));
    if (slot >= 0) {
      return this.values.get(slot);
    }

    return defaultValue;
  }

  private findSlot(key1: number, key2: number, start: number): number {
    const keys1 = this.keys1;
    const keys2 = this.keys2;
    const cursor = this.keysCursor.get();

    let slot = this.findSlotInRange(key1, key2, Number(start), keys1.size(), keys1, keys2, cursor);
    if (slot === -1) {
      slot = this.findSlotInRange(key1, key2, 0, Number(start), keys1, keys2, cursor);
    }

    return slot;
  }

  private findSlotInRange(
    key1: number,
    key2: number,
    start: number,
    end: number,
    keys1: HugeLongArray,
    keys2: HugeLongArray,
    cursor: HugeCursor.PagedCursor<BigInt64Array>
  ): number {
    let slot = start;
    let blockPos: number;
    let blockEnd: number;
    let keysBlock: BigInt64Array;
    let existing: number;

    keys1.initCursor(cursor, start, end);
    while (cursor.next()) {
      keysBlock = cursor.array;
      blockPos = cursor.offset;
      blockEnd = cursor.limit;

      while (blockPos < blockEnd) {
        existing = keysBlock[blockPos];
        if (existing === key1 && keys2.get(slot) === key2) {
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
   */
  public size(): number {
    return this.assigned;
  }

  /**
   * Returns whether the map is empty.
   */
  public isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Releases memory held by this map.
   */
  public release(): void {
    this.keys1.release();
    this.keys2.release();
    this.values.release();

    this.keysCursor.close();

    this.keys1 = null!;
    this.keys2 = null!;
    this.values = null!;
    this.assigned = 0;
    this.mask = 0;
  }

  private initialBuffers(expectedElements: number): void {
    this.allocateBuffers(this.minBufferSize(expectedElements));
  }

  /**
   * Convert the contents of this map to a human-friendly string.
   */
  public toString(): string {
    const buffer: string[] = [];
    buffer.push('[');

    const keys1 = this.keys1.initCursor(this.keys1.newCursor());
    const keys2 = this.keys2.initCursor(this.keys2.newCursor());
    const values = this.values.initCursor(this.values.newCursor());

    let key1: number;
    while (keys1.next()) {
      keys2.next();
      values.next();

      const ks1 = keys1.array;
      const ks2 = keys2.array;
      const vs = values.array;
      const end = keys1.limit;

      for (let pos = keys1.offset; pos < end; ++pos) {
        if ((key1 = ks1[pos]) !== 0n) {
          buffer.push(
            `(${key1 - 1n},${ks2[pos] - 1n})=>${vs[pos]}, `
          );
        }
      }
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
   * Hash function for a pair of keys.
   */
  private hashKey(key1: number, key2: number): number {
    return this.mixPhi(key1 ^ key2 ^ BigInt(this.keyMixer));
  }

  /**
   * Allocate new internal buffers.
   */
  private allocateBuffers(arraySize: number): void {
    console.assert(BitUtil.isPowerOfTwo(arraySize));

    // Compute new hash mixer candidate before expanding
    const newKeyMixer = RandomSeed.next();

    // Ensure no change is done if we hit an OOM
    const prevKeys1 = this.keys1;
    const prevKeys2 = this.keys2;
    const prevValues = this.values;

    try {
      this.keys1 = HugeLongArray.newArray(arraySize);
      this.keys2 = HugeLongArray.newArray(arraySize);
      this.values = HugeDoubleArray.newArray(arraySize);
      this.keysCursor = CloseableThreadLocal.withInitial(() => this.keys1.newCursor());
    } catch (e) {
      this.keys1 = prevKeys1;
      this.keys2 = prevKeys2;
      this.values = prevValues;
      throw e;
    }

    this.resizeAt = this.expandAtCount(arraySize);
    this.keyMixer = newKeyMixer;
    this.mask = arraySize - 1;
  }

  /**
   * Rehash from old buffers to new buffers.
   */
  private rehash(
    fromKeys1: HugeLongArray,
    fromKeys2: HugeLongArray,
    fromValues: HugeDoubleArray
  ): void {
    console.assert(
      fromKeys1.size() === fromValues.size() &&
      fromKeys2.size() === fromValues.size() &&
      BitUtil.isPowerOfTwo(fromValues.size())
    );

    // Rehash all stored key/value pairs into the new buffers
    const newKeys1 = this.keys1;
    const newKeys2 = this.keys2;
    const newValues = this.values;
    const mask = this.mask;

    const keys1 = fromKeys1.initCursor(fromKeys1.newCursor());
    const keys2 = fromKeys2.initCursor(fromKeys2.newCursor());
    const values = fromValues.initCursor(fromValues.newCursor());

    let key1: number, key2: number, slot: number;
    while (keys1.next()) {
      keys2.next();
      values.next();

      const ks1 = keys1.array;
      const ks2 = keys2.array;
      const vs = values.array;
      const end = keys1.limit;

      for (let pos = keys1.offset; pos < end; ++pos) {
        if ((key1 = ks1[pos]) !== 0n) {
          key2 = ks2[pos];
          slot = Number(this.hashKey(key1, key2) & BigInt(mask));
          slot = this.findSlot(key1, key2, BigInt(slot));
          slot = ~(1 + slot);
          newKeys1.set(slot, key1);
          newKeys2.set(slot, key2);
          newValues.set(slot, vs[pos]);
        }
      }
    }
  }

  /**
   * This method is invoked when there is a new key/value pair to be inserted into
   * the buffers but there is not enough empty slots to do so.
   */
  private allocateThenInsertThenRehash(
    slot: number,
    pendingKey1: number,
    pendingKey2: number,
    pendingValue: number
  ): void {
    console.assert(this.assigned === this.resizeAt);

    // Try to allocate new buffers first
    const prevKeys1 = this.keys1;
    const prevKeys2 = this.keys2;
    const prevValues = this.values;

    this.allocateBuffers(this.nextBufferSize(this.mask + 1));
    console.assert(this.keys1.size() > prevKeys1.size());

    // We have succeeded at allocating new data so insert the pending key/value
    prevKeys1.set(slot, pendingKey1);
    prevKeys2.set(slot, pendingKey2);
    prevValues.set(slot, pendingValue);

    // Rehash old keys, including the pending key
    this.rehash(prevKeys1, prevKeys2, prevValues);

    prevKeys1.release();
    prevKeys2.release();
    prevValues.release();
  }

  private static readonly MIN_HASH_ARRAY_LENGTH = 4;

  private minBufferSize(elements: number): number {
    if (elements < 0) {
      throw new Error(`Number of elements must be >= 0: ${elements}`);
    }

    let length = Math.ceil(elements / HugeLongLongDoubleMap.LOAD_FACTOR);
    if (length === elements) {
      length++;
    }

    length = Math.max(
      HugeLongLongDoubleMap.MIN_HASH_ARRAY_LENGTH,
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
    return Math.min(arraySize, Math.ceil(arraySize * HugeLongLongDoubleMap.LOAD_FACTOR));
  }

  /**
   * BitMixer.mixPhi implementation for 64-bit values
   */
  private mixPhi(key: number): number {
    const h = key * 0x9E3779B97F4A7C15n;
    return h ^ (h >> 32n);
  }
}

/**
 * Generates pseudo-random seeds for hash mixers.
 */
class RandomSeed {
  private static readonly INSTANCE = new RandomSeed();

  /**
   * Returns the next random seed.
   */
  public static next(): number {
    return RandomSeed.INSTANCE.newSeed();
  }

  private seed: number;

  private constructor() {
    this.seed = RandomSeed.randomSeed64();
  }

  private newSeed(): number {
    this.seed += 1n;
    return Number(this.mixPhi(this.seed) & 0xFFFFFFFFn); // Keep 32 bits
  }

  private mixPhi(key: number): number {
    const h = key * 0x9E3779B97F4A7C15n;
    return h ^ (h >> 32n);
  }

  private static randomSeed64(): number {
    // Generate a random 64-bit value using crypto API if available
    if (typeof crypto !== 'undefined') {
      const buffer = new BigUint64Array(1);
      crypto.getRandomValues(buffer);
      return BigInt(buffer[0]);
    }
    // Fallback to Math.random (less secure but works everywhere)
    return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  }
}

/**
 * Thread-local implementation for closeable resources.
 */
export class CloseableThreadLocal<T> {
  private readonly factory: () => T;
  private readonly value: T;

  /**
   * Creates a new thread local with the given factory.
   */
  public static withInitial<T>(factory: () => T): CloseableThreadLocal<T> {
    return new CloseableThreadLocal<T>(factory);
  }

  /**
   * Private constructor.
   */
  private constructor(factory: () => T) {
    this.factory = factory;
    this.value = factory();
  }

  /**
   * Gets the thread-local value.
   */
  public get(): T {
    return this.value;
  }

  /**
   * Closes the thread local and releases its resources.
   */
  public close(): void {
    const value = this.value;
    if (value && typeof (value as any).close === 'function') {
      (value as any).close();
    }
  }
}
