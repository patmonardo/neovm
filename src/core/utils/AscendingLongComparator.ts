import { IndirectComparator } from '@/collections/IndirectComparator';

/**
 * A comparator for sorting long/number arrays in ascending order.
 * Used with indirect sorting algorithms to avoid moving array elements.
 */
export class AscendingLongComparator implements IndirectComparator {
  private readonly array: number[];

  /**
   * Creates a new ascending comparator for a number array.
   *
   * @param array The array to compare elements from
   */
  constructor(array: number[]) {
    this.array = array;
  }

  /**
   * Compares two elements in the array by their indices.
   *
   * @param indexA First index to compare
   * @param indexB Second index to compare
   * @returns -1 if element at indexA < element at indexB,
   *           1 if element at indexA > element at indexB,
   *           0 if equal
   */
  public compare(indexA: number, indexB: number): number {
    const a = this.array[indexA];
    const b = this.array[indexB];

    if (a < b) {
      return -1;
    } else {
      return a > b ? 1 : 0;
    }
  }
}
