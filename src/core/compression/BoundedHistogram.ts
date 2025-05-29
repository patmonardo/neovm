/**
 * A simple, exact histogram implementation for small domain spaces.
 *
 * **Compression Context:**
 * This histogram is the statistical foundation for compression decisions in GDS.
 * It analyzes value distributions to determine optimal compression strategies:
 *
 * - **Delta Compression**: If values cluster around a mean, delta encoding works well
 * - **Dictionary Compression**: High-frequency values get shorter encodings
 * - **Bit Packing**: Standard deviation determines optimal bit width
 * - **RLE (Run Length)**: Detects repetitive patterns worth compressing
 *
 * **Graph-Specific Usage:**
 * - **Node IDs**: Often have gaps → histogram reveals clustering patterns
 * - **Edge Weights**: Distribution determines floating-point compression
 * - **Adjacency Lists**: Degree distribution affects compression strategy
 * - **Property Values**: Categorical vs numeric distribution analysis
 *
 * If no values are recorded, returned statistical values are undefined.
 */
export class BoundedHistogram {
  private histogram: number[];
  private totalCount: number;

  /**
   * Creates a histogram that accepts values in [0, upperBoundInclusive].
   *
   * **Design Note**: Fixed-size array for O(1) recording and lookup.
   * This trades memory for speed - perfect for compression analysis
   * where you need fast statistics during graph loading.
   */
  constructor(upperBoundInclusive: number) {
    this.histogram = new Array(upperBoundInclusive + 1).fill(0);
    this.totalCount = 0;
  }

  /**
   * Record the occurrence of a value in the histogram.
   *
   * **Performance**: O(1) - critical for compression analysis
   * where millions of values need statistical tracking.
   */
  record(value: number): void {
    this.histogram[value]++;
    this.totalCount++;
  }

  /**
   * Returns the number of recordings for the given value.
   *
   * **Compression Usage**: High-frequency values are candidates
   * for dictionary compression with shorter bit codes.
   */
  frequency(value: number): number {
    return this.histogram[value];
  }

  /**
   * Returns the total number of recorded values.
   */
  total(): number {
    return this.totalCount;
  }

  /**
   * Return the average value recorded.
   *
   * **Compression Insight**: Mean determines the center point for
   * delta compression. Values close to mean compress better.
   */
  mean(): number {
    let sum = 0;

    for (let i = 0; i < this.histogram.length; i++) {
      sum += this.histogram[i] * i;
    }

    return sum / this.totalCount;
  }

  /**
   * Return the median value recorded.
   *
   * **Compression Insight**: Median is more robust than mean
   * for skewed distributions common in graph data (power laws).
   */
  median(): number {
    return this.percentile(50);
  }

  /**
   * Return the value that `percentile` percent of all values fall below.
   *
   * **Compression Strategy**:
   * - p50 = median split point
   * - p95 = outlier detection threshold
   * - p99 = extreme value handling
   */
  percentile(percentile: number): number {
    let count = 0;
    const limit = Math.ceil(this.totalCount * (percentile / 100));

    for (let i = 0; i < this.histogram.length; i++) {
      count += this.histogram[i];
      if (count >= limit) {
        return i;
      }
    }

    return this.histogram.length - 1;
  }

  /**
   * Return the standard deviation across all values.
   *
   * **Compression Decision**:
   * - Low stdDev → Values cluster → Good for delta/dictionary compression
   * - High stdDev → Values spread → May need different strategy
   * - Very high stdDev → Consider outlier detection + separate encoding
   */
  stdDev(): number {
    const meanValue = this.mean();
    let sum = 0;

    for (let i = 0; i < this.histogram.length; i++) {
      sum += Math.pow(i - meanValue, 2) * this.histogram[i];
    }

    return Math.sqrt(sum / this.totalCount);
  }

  /**
   * Returns the lowest recorded value in the histogram.
   *
   * **Compression Range**: Defines the minimum value for
   * range-based compression schemes.
   */
  min(): number {
    for (let i = 0; i < this.histogram.length; i++) {
      if (this.histogram[i] > 0) {
        return i;
      }
    }
    return this.histogram.length - 1;
  }

  /**
   * Returns the highest recorded value in the histogram.
   *
   * **Compression Range**: Defines the maximum value for
   * bit-width optimization. (max - min) determines encoding bits needed.
   */
  max(): number {
    for (let i = this.histogram.length - 1; i >= 0; i--) {
      if (this.histogram[i] > 0) {
        return i;
      }
    }
    return this.histogram.length - 1;
  }

  /**
   * Reset the recorded values within the histogram.
   *
   * **Usage**: Reuse histogram objects for different data sections
   * without allocation overhead.
   */
  reset(): void {
    this.histogram.fill(0);
    this.totalCount = 0;
  }

  /**
   * Adds all recorded values of `other` to `this` histogram.
   *
   * **Parallel Processing**: Merge histograms from different workers
   * to get global statistics for compression decisions.
   */
  add(other: BoundedHistogram): void {
    // Resize if other histogram is larger
    if (other.histogram.length > this.histogram.length) {
      const newHistogram = new Array(other.histogram.length).fill(0);
      for (let i = 0; i < this.histogram.length; i++) {
        newHistogram[i] = this.histogram[i];
      }
      this.histogram = newHistogram;
    }

    // Add frequencies from other histogram
    for (let i = 0; i < other.histogram.length; i++) {
      this.histogram[i] += other.histogram[i];
    }

    this.totalCount += other.totalCount;
  }

  /**
   * **Compression Analysis Helper**
   * Returns a summary of distribution characteristics for compression strategy selection.
   */
  getCompressionProfile(): {
    range: number;
    concentration: number; // How clustered the values are (inverse of stdDev)
    skewness: number;      // Asymmetry of distribution
    sparsity: number;      // Percentage of possible values actually used
  } {
    const range = this.max() - this.min();
    const stdDevValue = this.stdDev();
    const concentration = range > 0 ? 1 / (1 + stdDevValue / range) : 1;

    // Simple skewness approximation: (mean - median) / stdDev
    const skewness = stdDevValue > 0 ? (this.mean() - this.median()) / stdDevValue : 0;

    // Sparsity: fraction of possible values that actually occur
    const nonZeroCount = this.histogram.filter(count => count > 0).length;
    const sparsity = nonZeroCount / this.histogram.length;

    return {
      range,
      concentration,
      skewness,
      sparsity
    };
  }
}
