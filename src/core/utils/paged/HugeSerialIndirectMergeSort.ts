import { HugeLongArray } from '../../../collections/ha/HugeLongArray';

/**
 * Single-threaded bottom-up merge sort implementation for HugeLongArray.
 * Sorts array indices based on values obtained through a mapping function.
 *
 * See HugeMergeSort for a concurrent version.
 */
export class HugeSerialIndirectMergeSort {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Sort the provided array using the given mapping function to determine sort order.
   *
   * @param array The array to sort
   * @param toSortValue Function that maps array values to sortable values
   */
  public static sort(array: HugeLongArray, toSortValue: (index: number) => number): void {
    const temp = HugeLongArray.newArray(array.size());
    this.sortWithTemp(array, array.size(), toSortValue, temp);
  }

  /**
   * Sort the provided array using the given mapping function and temporary array.
   *
   * @param array The array to sort
   * @param size Number of elements to sort
   * @param toSortValue Function that maps array values to sortable values
   * @param temp Temporary array for merge operations
   */
  public static sortWithTemp(
    array: HugeLongArray,
    size: number,
    toSortValue: (index: number) => number,
    temp: HugeLongArray
  ): void {
    let tempSize = 1;

    while (tempSize < size) {
      let i = 0;

      while (i < size) {
        const leftStart = i;
        const leftEnd = i + tempSize - 1;
        const rightStart = i + tempSize;
        const rightEnd = i + 2 * tempSize - 1;

        if (rightStart >= size) {
          break;
        }

        const actualRightEnd = rightEnd >= size ? size - 1 : rightEnd;

        this.merge(
          array,
          temp,
          toSortValue,
          leftStart,
          leftEnd,
          rightStart,
          actualRightEnd
        );

        // Copy back from temp to the original array
        for (let j = 0; j < actualRightEnd - leftStart + 1; j++) {
          array.set(i + j, temp.get(j));
        }

        i = i + 2 * tempSize;
      }

      tempSize *= 2;
    }
  }

  /**
   * Merge two sorted subarrays into the temporary array.
   *
   * @param array Source array
   * @param temp Target temporary array
   * @param toSortValue Function to map indices to sort values
   * @param leftStart Start index of left subarray
   * @param leftEnd End index of left subarray
   * @param rightStart Start index of right subarray
   * @param rightEnd End index of right subarray
   */
  private static merge(
    array: HugeLongArray,
    temp: HugeLongArray,
    toSortValue: (index: number) => number,
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number
  ): void {
    let idx = 0;

    while (leftStart <= leftEnd && rightStart <= rightEnd) {
      const lsIdx = array.get(leftStart);
      const rsIdx = array.get(rightStart);

      if (toSortValue(lsIdx) <= toSortValue(rsIdx)) {
        temp.set(idx++, lsIdx);
        leftStart++;
      } else {
        temp.set(idx++, rsIdx);
        rightStart++;
      }
    }

    // Copy remaining elements from left subarray
    while (leftStart <= leftEnd) {
      temp.set(idx++, array.get(leftStart++));
    }

    // Copy remaining elements from right subarray
    while (rightStart <= rightEnd) {
      temp.set(idx++, array.get(rightStart++));
    }
  }
}
