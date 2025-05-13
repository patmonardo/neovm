import { HugeLongArray } from '../../../collections/ha/HugeLongArray';

/**
 * A read-only view of a HugeLongArray.
 * Provides access to array elements without allowing modification.
 */
export interface ReadOnlyHugeLongArray {
  /**
   * Gets the value at the specified index.
   *
   * @param index The index to get
   * @returns The value at the index
   */
  get(index: number): number;

  /**
   * Returns the size of the array.
   *
   * @returns The size
   */
  size(): number;

  /**
   * Converts the array to a regular array.
   * For testing purposes only.
   *
   * @returns A regular array with the values
   */
  toArray(): number[];
}

/**
 * Factory methods for creating read-only arrays.
 */
export class ReadOnlyHugeLongArrays {
  /**
   * Creates a read-only array from a list of values.
   *
   * @param values The values to include
   * @returns A new read-only array
   */
  public static of(...values: number[]): ReadOnlyHugeLongArray {
    return this.ofHugeLongArray(HugeLongArray.of(...values));
  }

  /**
   * Creates a read-only view of an existing HugeLongArray.
   *
   * @param array The array to wrap
   * @returns A read-only view of the array
   */
  public static ofHugeLongArray(array: HugeLongArray): ReadOnlyHugeLongArray {
    return {
      get(index: number): number {
        return array.get(index);
      },

      size(): number {
        return array.size();
      },

      toArray(): number[] {
        return array.toArray();
      }
    };
  }
}
