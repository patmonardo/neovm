/**
 * A simple, exact histogram implementation that is used for small domain spaces.
 * It's main purpose is tracking statistics for compression related logic.
 * If no values are recorded the returned values are undefined.
 */
export class BoundedHistogram {
  private histogram: number[];
  private total: number;

  /**
   * Creates a histogram that accepts values in [0, upperBoundInclusive].
   * 
   * @param upperBoundInclusive The maximum value that can be recorded
   */
  constructor(upperBoundInclusive: number) {
    this.histogram = new Array(upperBoundInclusive + 1).fill(0);
    this.total = 0;
  }

  /**
   * Record the occurrence of the value in the histogram.
   * 
   * @param value Value to record
   */
  public record(value: number): void {
    this.histogram[value]++;
    this.total++;
  }

  /**
   * Returns the number of recordings for the given value.
   * 
   * @param value The value to get frequency for
   * @returns Count of occurrences of the value
   */
  public frequency(value: number): number {
    return this.histogram[value];
  }

  /**
   * Returns the total number of recorded values.
   * 
   * @returns Total count of all recorded values
   */
  public total(): number {
    return this.total;
  }

  /**
   * Return the average value recorded.
   * 
   * @returns Mean of all recorded values
   */
  public mean(): number {
    let sum = 0;
    const histogram = this.histogram;
    
    for (let i = 0; i < histogram.length; i++) {
      sum += histogram[i] * i;
    }

    return sum / this.total;
  }

  /**
   * Return the median value recorded.
   * 
   * @returns Median of all recorded values
   */
  public median(): number {
    return this.percentile(50);
  }

  /**
   * Return the value that `percentile` percent of all values fall below.
   * 
   * @param percentile Percentile to calculate (0-100)
   * @returns Value at the specified percentile
   */
  public percentile(percentile: number): number {
    let count = 0;
    const limit = Math.ceil(this.total * (percentile / 100));
    const histogram = this.histogram;

    for (let i = 0; i < histogram.length; i++) {
      count += histogram[i];
      if (count > limit) {
        return i;
      }
    }

    return histogram.length - 1;
  }

  /**
   * Return the standard deviation across all values.
   * 
   * @returns Standard deviation of all recorded values
   */
  public stdDev(): number {
    const mean = this.mean();
    let sum = 0;
    const histogram = this.histogram;

    for (let i = 0; i < histogram.length; i++) {
      sum += Math.pow(i - mean, 2) * histogram[i];
    }

    return Math.sqrt(sum / this.total);
  }

  /**
   * Returns the lowest recorded value in the histogram.
   * 
   * @returns Minimum value with non-zero frequency
   */
  public min(): number {
    const histogram = this.histogram;
    for (let i = 0; i < histogram.length; i++) {
      if (histogram[i] > 0) {
        return i;
      }
    }
    return histogram.length - 1;
  }

  /**
   * Returns the highest recorded value in the histogram.
   * 
   * @returns Maximum value with non-zero frequency
   */
  public max(): number {
    const histogram = this.histogram;
    for (let i = histogram.length - 1; i >= 0; i--) {
      if (histogram[i] > 0) {
        return i;
      }
    }
    return histogram.length - 1;
  }

  /**
   * Reset the recorded values within the histogram.
   */
  public reset(): void {
    this.histogram.fill(0);
    this.total = 0;
  }

  /**
   * Adds all recorded values of `other` to `this` histogram.
   * 
   * @param other Another histogram to merge with this one
   */
  public add(other: BoundedHistogram): void {
    if (other.histogram.length > this.histogram.length) {
      const oldHistogram = this.histogram;
      this.histogram = new Array(other.histogram.length).fill(0);
      
      // Copy old values to new array
      for (let i = 0; i < oldHistogram.length; i++) {
        this.histogram[i] = oldHistogram[i];
      }
    }

    for (let otherValue = 0; otherValue < other.histogram.length; otherValue++) {
      this.histogram[otherValue] += other.histogram[otherValue];
    }

    this.total += other.total;
  }
}