import { IndirectComparator } from '../collections/IndirectComparator';
import { IndirectSort } from '../collections/IndirectSort';
import { AscendingLongComparator } from './AscendingLongComparator';

/**
 * Utility class for simultaneously sorting two arrays.
 */
export class TwoArraysSort {
  /**
   * Sort two arrays simultaneously based on values of the first (number) array.
   * E.g. {[4, 1, 8], [0.5, 1.9, 0.9]} -> {[1, 4, 8], [1.9, 0.5, 0.9]}
   *
   * @param longArray Array of number values (e.g. neighbor ids)
   * @param doubleArray Array of number values (e.g. neighbor weights)
   * @param length Number of values to sort
   */
  public static sortDoubleArrayByLongValues(
    longArray: number[],
    doubleArray: number[],
    length: number
  ): void {
    console.assert(longArray.length >= length, "longArray length must be >= length");
    console.assert(doubleArray.length >= length, "doubleArray length must be >= length");

    const order = IndirectSort.mergesort(
      0,
      length,
      new AscendingLongComparator(longArray)
    );

    this.reorder(order, longArray, doubleArray, length);
  }

  /**
   * Reorders the arrays according to the specified permutation.
   *
   * @param order The permutation to apply
   * @param longArray First array to reorder
   * @param doubleArray Second array to reorder
   * @param length Number of elements to reorder
   */
  public static reorder(
    order: number[],
    longArray: number[],
    doubleArray: number[],
    length: number
  ): void {
    for (let i = 0; i < length; i++) {
      const initV = longArray[i];
      const initW = doubleArray[i];
      let currIdx = i;

      while (order[currIdx] !== i) {
        const nextIdx = order[currIdx];
        longArray[currIdx] = longArray[nextIdx];
        doubleArray[currIdx] = doubleArray[nextIdx];
        order[currIdx] = currIdx;
        currIdx = nextIdx;
      }

      longArray[currIdx] = initV;
      doubleArray[currIdx] = initW;
      order[currIdx] = currIdx;
    }
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}
