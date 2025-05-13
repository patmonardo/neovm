import { HugeObjectArray } from '../../../collections/ha/HugeObjectArray';

/**
 * Single-threaded bottom-up merge sort implementation for HugeObjectArray.
 * Sorts objects based on values obtained through a mapping function.
 */
export class HugeSerialObjectMergeSort {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Sort the provided array using the given mapping function to determine sort order.
   * 
   * @param componentClass The class of the array elements (for type information)
   * @param array The array to sort
   * @param toSortValue Function that maps objects to sortable values
   */
  public static sort<T>(
    componentClass: new (...args: any[]) => T, 
    array: HugeObjectArray<T>, 
    toSortValue: (value: T) => number
  ): void {
    const temp = HugeObjectArray.newArray<T>(componentClass, array.size());
    this.sortWithTemp(array, array.size(), toSortValue, temp);
  }

  /**
   * Sort the provided array using the given mapping function and temporary array.
   * 
   * @param array The array to sort
   * @param size Number of elements to sort
   * @param toSortValue Function that maps objects to sortable values
   * @param temp Temporary array for merge operations
   */
  public static sortWithTemp<T>(
    array: HugeObjectArray<T>, 
    size: number, 
    toSortValue: (value: T) => number, 
    temp: HugeObjectArray<T>
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
   * @param toSortValue Function to map objects to sort values
   * @param leftStart Start index of left subarray
   * @param leftEnd End index of left subarray
   * @param rightStart Start index of right subarray
   * @param rightEnd End index of right subarray
   */
  private static merge<T>(
    array: HugeObjectArray<T>,
    temp: HugeObjectArray<T>,
    toSortValue: (value: T) => number,
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number
  ): void {
    let idx = 0;

    while (leftStart <= leftEnd && rightStart <= rightEnd) {
      const lsObj = array.get(leftStart);
      const rsObj = array.get(rightStart);
      
      // Use the mapping function to get comparable values and compare them
      if (toSortValue(lsObj) <= toSortValue(rsObj)) {
        temp.set(idx++, lsObj);
        leftStart++;
      } else {
        temp.set(idx++, rsObj);
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