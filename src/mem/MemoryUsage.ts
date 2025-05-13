import { Estimate } from './Estimate';

/**
 * Utility class for estimating memory usage of JavaScript objects.
 *
 * Note: Due to fundamental differences between Java and JavaScript memory models,
 * exact memory measurement is not possible in JavaScript. This implementation
 * provides approximations based on common object patterns.
 */
export class MemoryUsage {
  /**
   * Estimates the memory size of an object in bytes.
   * Returns -1 if the size cannot be determined.
   *
   * @param thing The object to measure
   * @returns Estimated size in bytes, or -1 if unknown
   */
  public static sizeOf(thing: any): number {
    if (thing === null || thing === undefined) {
      return 0;
    }

    // Handle primitive types
    if (typeof thing === 'boolean') return 1;
    if (typeof thing === 'number') return 8;
    if (typeof thing === 'number') return 8; // Approximate
    if (typeof thing === 'string') return 2 * thing.length + 16; // 2 bytes per char + overhead

    // Handle arrays
    if (Array.isArray(thing)) {
      let size = Estimate.BYTES_ARRAY_HEADER;

      for (const item of thing) {
        size += MemoryUsage.sizeOf(item);
      }

      return size;
    }

    // Handle objects by estimating their fields
    if (typeof thing === 'object') {
      try {
        let size = Estimate.BYTES_OBJECT_HEADER;

        for (const key in thing) {
          if (Object.prototype.hasOwnProperty.call(thing, key)) {
            size += MemoryUsage.sizeOf(key); // Key size
            size += MemoryUsage.sizeOf(thing[key]); // Value size
          }
        }

        return size;
      } catch (e) {
        return -1;
      }
    }

    // Functions, symbols, and other types
    return -1;
  }

  /**
   * Estimates the memory size of an object, returning undefined if
   * the size cannot be determined.
   *
   * @param thing The object to measure
   * @returns Estimated size in bytes, or undefined if unknown
   */
  public static sizeOfObject(thing: any): number | undefined {
    const size = MemoryUsage.sizeOf(thing);
    return size === -1 ? undefined : size;
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {
    throw new Error("MemoryUsage is a utility class and cannot be instantiated");
  }
}
