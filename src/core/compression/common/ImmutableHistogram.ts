import { BoundedHistogram } from "../BoundedHistogram";

export interface ImmutableHistogram {
  minValue(): number;
  mean(): number;
  maxValue(): number;
  valueAtPercentile(percentile: number): number;
  merge(other: ImmutableHistogram): ImmutableHistogram;
  total(): number;
  toMap?(): Record<string, number>; // Optional for compatibility
}

/**
 * ImmutableHistogram namespace with factory methods and implementations.
 * **Pattern**: Matches Java's static factory + inner class approach.
 */
export namespace ImmutableHistogram {
  /**
   * Empty implementation - singleton.
   */
  class Empty implements ImmutableHistogram {
    minValue(): number {
      return 0;
    }

    mean(): number {
      return 0;
    }

    maxValue(): number {
      return 0;
    }

    valueAtPercentile(percentile: number): number {
      return 0;
    }

    merge(other: ImmutableHistogram): ImmutableHistogram {
      return other;
    }

    total(): number {
      return 0;
    }
    toMap(): Record<string, number> {
      return {
        min: 0,
        mean: 0,
        max: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
      };
    }
  }

  /**
   * BoundedHistogram wrapper implementation.
   */
  class ImmutableBoundedHistogram implements ImmutableHistogram {
    constructor(private boundedHistogram: BoundedHistogram) {}

    minValue(): number {
      return this.boundedHistogram.min();
    }

    mean(): number {
      return this.boundedHistogram.mean();
    }

    maxValue(): number {
      return this.boundedHistogram.max();
    }

    valueAtPercentile(percentile: number): number {
      return this.boundedHistogram.percentile(percentile);
    }

    merge(other: ImmutableHistogram): ImmutableHistogram {
      throw new Error("BoundedHistogram merge not implemented - todo!()");
    }

    total(): number {
      return this.boundedHistogram.total();
    }

    toMap(): Record<string, number> {
      return {
        min: this.minValue(),
        mean: this.mean(),
        max: this.maxValue(),
        p50: this.valueAtPercentile(50),
        p75: this.valueAtPercentile(75),
        p90: this.valueAtPercentile(90),
        p95: this.valueAtPercentile(95),
        p99: this.valueAtPercentile(99),
        p999: this.valueAtPercentile(99.9),
      };
    }
  }

  /**
   * Concurrent/Mutable histogram wrapper that can record values.
   * **Key Addition**: This is what we need for MemoryTracker!
   */
  export class Concurrent implements ImmutableHistogram {
    private values: number[] = [];

    record(value: number): void {
      this.values.push(value);
    }

    minValue(): number {
      return this.values.length > 0 ? Math.min(...this.values) : 0;
    }

    mean(): number {
      if (this.values.length === 0) return 0;
      return (
        this.values.reduce((sum, val) => sum + val, 0) / this.values.length
      );
    }

    maxValue(): number {
      return this.values.length > 0 ? Math.max(...this.values) : 0;
    }

    valueAtPercentile(percentile: number): number {
      if (this.values.length === 0) return 0;

      const sorted = [...this.values].sort((a, b) => a - b);
      const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
      return sorted[Math.max(0, index)];
    }

    merge(other: ImmutableHistogram): ImmutableHistogram {
      const merged = new Concurrent();
      merged.values = [...this.values];

      if (other instanceof Concurrent) {
        merged.values.push(...other.values);
      } else if (other instanceof Empty) {
        // No change needed
      } else {
        throw new Error("Cannot merge with " + other.constructor.name);
      }

      return merged;
    }

    total(): number {
      return this.values.length;
    }

    toMap(): Record<string, number> {
      return {
        min: this.minValue(),
        mean: this.mean(),
        max: this.maxValue(),
        p50: this.valueAtPercentile(50),
        p75: this.valueAtPercentile(75),
        p90: this.valueAtPercentile(90),
        p95: this.valueAtPercentile(95),
        p99: this.valueAtPercentile(99),
        p999: this.valueAtPercentile(99.9),
      };
    }
  }

  // ============================================================================
  // STATIC FACTORY METHODS (matches Java exactly)
  // ============================================================================

  /**
   * Singleton empty histogram.
   */
  export const EMPTY: ImmutableHistogram = new Empty();

  /**
   * Create ImmutableHistogram from BoundedHistogram.
   */
  export function of(boundedHistogram: BoundedHistogram): ImmutableHistogram {
    return new ImmutableBoundedHistogram(boundedHistogram);
  }

  /**
   * Create a concurrent (mutable) histogram.
   */
  export function concurrent(): Concurrent {
    return new Concurrent();
  }
}

// ============================================================================
// EXPORT CONVENIENCE
// ============================================================================

export const EMPTY_HISTOGRAM = ImmutableHistogram.EMPTY;
