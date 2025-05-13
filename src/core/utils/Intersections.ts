/**
 * Utility class providing functions for computing intersections and similarity metrics.
 */
export class Intersections {
  /**
   * Computes the intersection size of two sets.
   *
   * @param targets1 First set
   * @param targets2 Second set
   * @returns The size of the intersection
   */
  public static intersection(targets1: Set<number>, targets2: Set<number>): number {
    const intersectionSet = new Set<number>();

    // Get the smaller set for efficiency
    const [smallerSet, largerSet] = targets1.size <= targets2.size
      ? [targets1, targets2]
      : [targets2, targets1];

    // Check each element from the smaller set
    smallerSet.forEach(value => {
      if (largerSet.has(value)) {
        intersectionSet.add(value);
      }
    });

    return intersectionSet.size;
  }

  /**
   * Computes the intersection size of two arrays by converting them to sets.
   *
   * @param targets1 First array
   * @param targets2 Second array
   * @returns The size of the intersection
   */
  public static intersection2(targets1: number[], targets2: number[]): number {
    const set1 = new Set(targets1);
    const set2 = new Set(targets2);
    return this.intersection(set1, set2);
  }

  /**
   * Computes the intersection size of two sorted arrays using a linear algorithm.
   *
   * @param targets1 First sorted array
   * @param targets2 Second sorted array
   * @returns The size of the intersection
   */
  public static intersection3(targets1: number[], targets2: number[]): number {
    const len2 = targets2.length;
    if (len2 === 0) return 0;

    let off2 = 0;
    let intersection = 0;

    for (const value1 of targets1) {
      if (value1 > targets2[off2]) {
        while (++off2 !== len2 && value1 > targets2[off2]) {}
        if (off2 === len2) return intersection;
      }

      if (value1 === targets2[off2]) {
        intersection++;
        off2++;
        if (off2 === len2) return intersection;
      }
    }

    return intersection;
  }

  /**
   * Computes the intersection size of two sorted arrays with specified lengths.
   *
   * @param targets1 First sorted array
   * @param targets2 Second sorted array
   * @param len1 Length of first array to consider
   * @param len2 Length of second array to consider
   * @returns The size of the intersection
   */
  public static intersectionArraysWithLength(
    targets1: number[],
    targets2: number[],
    len1: number,
    len2: number
  ): number {
    console.assert(len1 <= targets1.length);
    console.assert(len2 <= targets2.length);

    if (len2 === 0) return 0;

    let off2 = 0;
    let intersection = 0;
    let idx1 = 0;

    while (idx1 < len1) {
      const value1 = targets1[idx1];

      if (value1 > targets2[off2]) {
        while (++off2 !== len2 && value1 > targets2[off2]) {}
        if (off2 === len2) return intersection;
      }

      if (value1 === targets2[off2]) {
        intersection++;
        off2++;
        if (off2 === len2) return intersection;
      }

      idx1++;
    }

    return intersection;
  }

  /**
   * Another implementation for computing intersection size of sorted arrays.
   *
   * @param targets1 First sorted array
   * @param targets2 Second sorted array
   * @returns The size of the intersection
   */
  public static intersection4(targets1: number[], targets2: number[]): number {
    if (targets2.length === 0) return 0;

    let off2 = 0;
    let intersection = 0;

    for (let off1 = 0; off1 < targets1.length; off1++) {
      if (off2 === targets2.length) return intersection;

      const value1 = targets1[off1];

      if (value1 > targets2[off2]) {
        for (; off2 < targets2.length; off2++) {
          if (value1 <= targets2[off2]) break;
        }

        if (off2 === targets2.length) return intersection;
      }

      if (value1 === targets2[off2]) {
        intersection++;
        off2++;
      }
    }

    return intersection;
  }

  /**
   * Computes the sum of squared differences between two double arrays.
   *
   * @param vector1 First vector
   * @param vector2 Second vector
   * @param len Length to consider
   * @returns Sum of squared differences
   */
  public static sumSquareDelta(vector1: number[], vector2: number[], len: number): number {
    let result = 0;

    for (let i = 0; i < len; i++) {
      const delta = vector1[i] - vector2[i];
      result += delta * delta;
    }

    return result;
  }

  /**
   * Computes the sum of squared differences between two float arrays.
   * In TypeScript, we use number for both float and double.
   *
   * @param vector1 First vector
   * @param vector2 Second vector
   * @param len Length to consider
   * @returns Sum of squared differences
   */
  public static sumSquareDeltaFloat(vector1: number[], vector2: number[], len: number): number {
    let result = 0;

    for (let i = 0; i < len; i++) {
      const delta = vector1[i] - vector2[i];
      result += delta * delta;
    }

    return result;
  }

  /**
   * Computes the sum of squared differences between one vector and multiple others.
   *
   * @param vector1 First vector
   * @param vector2 Array of vectors to compare against
   * @param len Length to consider
   * @returns Array of squared differences
   */
  public static sumSquareDeltas(vector1: number[], vector2: number[][], len: number): number[] {
    const vectors = vector2.length;
    const result = new Array(vectors).fill(0);

    for (let i = 0; i < len; i++) {
      const v1 = vector1[i];

      for (let j = 0; j < vectors; j++) {
        result[j] += (v1 - vector2[j][i]) * (v1 - vector2[j][i]);
      }
    }

    return result;
  }

  /**
   * Computes the Pearson correlation between two vectors.
   *
   * @param vector1 First vector
   * @param vector2 Second vector
   * @param len Length to consider
   * @returns Pearson correlation coefficient
   */
  public static pearson(vector1: number[], vector2: number[], len: number): number {
    let vector1Sum = 0;
    let vector2Sum = 0;

    for (let i = 0; i < len; i++) {
      vector1Sum += vector1[i];
      vector2Sum += vector2[i];
    }

    const vector1Mean = vector1Sum / len;
    const vector2Mean = vector2Sum / len;

    let dotProductMinusMean = 0;
    let xLength = 0;
    let yLength = 0;

    for (let i = 0; i < len; i++) {
      const vector1Delta = vector1[i] - vector1Mean;
      const vector2Delta = vector2[i] - vector2Mean;

      dotProductMinusMean += (vector1Delta * vector2Delta);
      xLength += vector1Delta * vector1Delta;
      yLength += vector2Delta * vector2Delta;
    }

    const result = dotProductMinusMean / Math.sqrt(xLength * yLength);
    return isNaN(result) ? 0 : result;
  }

  /**
   * Computes the cosine similarity between two vectors.
   *
   * @param vector1 First vector
   * @param vector2 Second vector
   * @param len Length to consider
   * @returns Cosine similarity
   */
  public static cosine(vector1: number[], vector2: number[], len: number): number {
    let dotProduct = 0;
    let xLength = 0;
    let yLength = 0;

    for (let i = 0; i < len; i++) {
      const weight1 = vector1[i];
      const weight2 = vector2[i];

      dotProduct += weight1 * weight2;
      xLength += weight1 * weight1;
      yLength += weight2 * weight2;
    }

    return dotProduct / Math.sqrt(xLength * yLength);
  }

  /**
   * Computes the cosine similarity between two float vectors.
   * In TypeScript, we use number for both float and double.
   *
   * @param vector1 First vector
   * @param vector2 Second vector
   * @param len Length to consider
   * @returns Cosine similarity
   */
  public static cosineFloat(vector1: number[], vector2: number[], len: number): number {
    let dotProduct = 0;
    let xLength = 0;
    let yLength = 0;

    for (let i = 0; i < len; i++) {
      const weight1 = vector1[i];
      const weight2 = vector2[i];

      dotProduct += weight1 * weight2;
      xLength += weight1 * weight1;
      yLength += weight2 * weight2;
    }

    return dotProduct / Math.sqrt(xLength * yLength);
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}
