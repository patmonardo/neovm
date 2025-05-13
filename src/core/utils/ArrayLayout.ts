/**
 * Utility class for creating and searching binary search trees using the Eytzinger layout.
 */
export class ArrayLayout {
  /**
   * Constructs a new binary search tree using the Eytzinger layout.
   * Input must be sorted.
   *
   * @param input the sorted input data
   * @returns array with Eytzinger layout
   */
  public static constructEytzinger(input: number[]): number[] {
    return this.constructEytzingerWithRange(input, 0, input.length);
  }

  /**
   * Constructs a new binary search tree using the Eytzinger layout.
   * Input must be sorted.
   *
   * @param input the sorted input data
   * @param offset where to start at in the input
   * @param length how many elements to use from the input
   * @returns array with Eytzinger layout
   */
  public static constructEytzingerWithRange(
    input: number[],
    offset: number,
    length: number
  ): number[] {
    if (offset < 0 || length < 0 || offset + length > input.length) {
      throw new RangeError("Index out of bounds");
    }

    // position 0 is the result of a left-biased miss (needle is smaller than the smallest entry).
    // the actual values are stored 1-based
    const dest = new Array<number>(length + 1);
    dest[0] = -1n;
    this.eytzinger(length, input, dest, offset, 1);
    return dest;
  }

  /**
   * Constructs a new binary search tree using the Eytzinger layout.
   * Input must be sorted.
   * A secondary array is permuted in the same fashion as the input array.
   *
   * @param input the sorted input data
   * @param secondary secondary values that are permuted as well
   * @returns object containing both layout and secondary arrays
   */
  public static constructEytzingerWithSecondary(
    input: number[],
    secondary: number[]
  ): LayoutAndSecondary {
    if (secondary.length !== input.length) {
      throw new Error("Input arrays must be of same length");
    }

    // position 0 is the result of a left-biased miss (needle is smaller than the smallest entry).
    // the actual values are stored 1-based
    const dest = new Array<number>(input.length + 1);
    dest[0] = -1n;
    const secondaryDest = new Array<number>(secondary.length);

    this.eytzingerWithSecondary(input.length, input, dest, 0, 1, secondary, secondaryDest);

    return {
      layout: dest,
      secondary: secondaryDest
    };
  }

  /**
   * Searches for the needle in the haystack, returning an index pointing at the needle.
   *
   * The array must be one constructed from {@link constructEytzinger} or related.
   * Any other order of the array (e.g. sorted for binary search) will produce undefined results.
   *
   * Unlike standard binary search, this method returns the index of the value
   * that is either equal to the needle or the next smallest one. There are no different results to signal whether
   * a value was found or not. If you need to know whether the value is contained in the array, you need to compare
   * the value against the array at the position of the returned index.
   * The index returned is the last index where the value is not larger than the needle.
   * This is also different from standard binary search methods.
   *
   * @param haystack the input array sorted and constructed by {@link constructEytzinger}
   * @param needle the needle to search for
   * @returns the lower bound for the needle
   */
  public static searchEytzinger(haystack: number[], needle: number): number {
    let index = 1;
    const length = haystack.length - 1;

    while (index <= length) {
      index = needle < haystack[index] ? index << 1 : (index << 1) + 1;
    }

    // The index is basically a record of the branches that we traversed in the tree,
    // where a 0 means that we took the right branch and a 1 for the left branch.
    // Once the index is out of bounds (i.e. index > length), we need to track back and
    // undo all the right branches that we took.
    return index >>> (1 + this.numberOfTrailingZeros(index));
  }

  /**
   * Helper method that counts the trailing zeros in a number's binary representation.
   *
   * @param num The number to count trailing zeros for
   * @returns Number of trailing zeros
   */
  private static numberOfTrailingZeros(num: number): number {
    if (num === 0) return 32;

    let n = 31;
    let y = num << 16; if (y !== 0) { n -= 16; num = y; }
    y = num << 8;      if (y !== 0) { n -= 8;  num = y; }
    y = num << 4;      if (y !== 0) { n -= 4;  num = y; }
    y = num << 2;      if (y !== 0) { n -= 2;  num = y; }
    return n - ((num << 1) >>> 31);
  }

  /**
   * Recursive helper to build the Eytzinger layout.
   */
  private static eytzinger(
    length: number,
    source: number[],
    dest: number[],
    sourceIndex: number,
    destIndex: number
  ): number {
    if (destIndex <= length) {
      sourceIndex = this.eytzinger(length, source, dest, sourceIndex, 2 * destIndex);
      dest[destIndex] = source[sourceIndex++];
      sourceIndex = this.eytzinger(length, source, dest, sourceIndex, 2 * destIndex + 1);
    }
    return sourceIndex;
  }

  /**
   * Recursive helper to build the Eytzinger layout with a secondary array.
   */
  private static eytzingerWithSecondary(
    length: number,
    source: number[],
    dest: number[],
    sourceIndex: number,
    destIndex: number,
    secondarySource: number[],
    secondaryDest: number[]
  ): number {
    if (destIndex <= length) {
      sourceIndex = this.eytzingerWithSecondary(
        length, source, dest, sourceIndex, 2 * destIndex, secondarySource, secondaryDest
      );
      secondaryDest[destIndex - 1] = secondarySource[sourceIndex];
      dest[destIndex] = source[sourceIndex++];
      sourceIndex = this.eytzingerWithSecondary(
        length, source, dest, sourceIndex, 2 * destIndex + 1, secondarySource, secondaryDest
      );
    }
    return sourceIndex;
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}

/**
 * Interface for the result of constructEytzingerWithSecondary.
 */
export interface LayoutAndSecondary {
  layout: number[];
  secondary: number[];
}
