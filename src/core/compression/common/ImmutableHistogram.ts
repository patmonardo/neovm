export interface ImmutableHistogram {
  minValue(): number;
  mean(): number;
  maxValue(): number;
  valueAtPercentile(percentile: number): number;
  merge(other: ImmutableHistogram): ImmutableHistogram;
  toMap(): Record<string, number>;
}

export namespace ImmutableHistogram {
  export const EMPTY: ImmutableHistogram = {
    minValue: () => 0,
    mean: () => 0,
    maxValue: () => 0,
    valueAtPercentile: (_percentile: number) => 0,
    merge: (other: ImmutableHistogram) => other,
    toMap: () => ({
      min: 0,
      mean: 0,
      max: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      p999: 0,
    }),
  };

  export function ofAbstract(abstractHistogram: AbstractHistogram): ImmutableHistogram {
    return new ImmutableAbstractHistogram(abstractHistogram);
  }

  export function ofBounded(boundedHistogram: BoundedHistogram): ImmutableHistogram {
    return new ImmutableBoundedHistogram(boundedHistogram);
  }
}

// Example stubs for AbstractHistogram and BoundedHistogram
export interface AbstractHistogram {
  getMinValue(): number;
  getMean(): number;
  getMaxValue(): number;
  getValueAtPercentile(percentile: number): number;
  copy(): AbstractHistogram;
  add(other: AbstractHistogram): void;
}

export interface BoundedHistogram {
  min(): number;
  mean(): number;
  max(): number;
  percentile(percentile: number): number;
}

// Implementation for AbstractHistogram-backed ImmutableHistogram
class ImmutableAbstractHistogram implements ImmutableHistogram {
  constructor(private readonly abstractHistogram: AbstractHistogram) {}

  minValue(): number {
    return this.abstractHistogram.getMinValue();
  }
  mean(): number {
    return this.abstractHistogram.getMean();
  }
  maxValue(): number {
    return this.abstractHistogram.getMaxValue();
  }
  valueAtPercentile(percentile: number): number {
    return this.abstractHistogram.getValueAtPercentile(percentile);
  }
  merge(other: ImmutableHistogram): ImmutableHistogram {
    if (other === ImmutableHistogram.EMPTY) {
      return this;
    }
    if (other instanceof ImmutableAbstractHistogram) {
      const merged = this.abstractHistogram.copy();
      merged.add(other.abstractHistogram);
      return new ImmutableAbstractHistogram(merged);
    }
    throw new Error("Cannot merge with non-AbstractHistogram");
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

// Implementation for BoundedHistogram-backed ImmutableHistogram
class ImmutableBoundedHistogram implements ImmutableHistogram {
  constructor(private readonly boundedHistogram: BoundedHistogram) {}

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
  merge(_other: ImmutableHistogram): ImmutableHistogram {
    throw new Error("merge() not implemented for BoundedHistogram");
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
