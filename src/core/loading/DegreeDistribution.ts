import { Graph } from '@/api';
import { TerminationFlag } from '@/termination';
import { ParallelUtil } from '@/concurrency';
import { Concurrency } from '@/concurrency';

/**
 * DEGREE DISTRIBUTION - GRAPH STATISTICS UTILITIES
 *
 * Computes degree distribution statistics and graph density metrics.
 */

export class DegreeDistribution {
  /**
   * Histogram precision - needs to be at least 2 for AtomicHistogram requirements.
   */
  private static readonly PRECISION = 5;

  private constructor() {
    // Static utility class
  }

  /**
   * Compute degree distribution statistics for a graph.
   *
   * @param graph Graph to analyze
   * @param terminationFlag Cancellation flag
   * @returns Map with statistical metrics (min, mean, max, percentiles)
   */
  static compute(graph: Graph, terminationFlag: TerminationFlag): Map<string, number> {
    const maximumDegree = Math.max(2, graph.relationshipCount());
    const histogram = new AtomicHistogram(maximumDegree, DegreeDistribution.PRECISION);

    // Parallel computation of node degrees
    ParallelUtil.parallelForEachNode(
      graph.nodeCount(),
      Concurrency.of(1),
      terminationFlag,
      (nodeId: number) => histogram.recordValue(graph.degree(nodeId))
    );

    // Return statistics matching Java Map.of() output
    return new Map([
      ['min', histogram.getMinValue()],
      ['mean', histogram.getMean()],
      ['max', histogram.getMaxValue()],
      ['p50', histogram.getValueAtPercentile(50)],
      ['p75', histogram.getValueAtPercentile(75)],
      ['p90', histogram.getValueAtPercentile(90)],
      ['p95', histogram.getValueAtPercentile(95)],
      ['p99', histogram.getValueAtPercentile(99)],
      ['p999', histogram.getValueAtPercentile(99.9)]
    ]);
  }

  /**
   * Calculate graph density from node and relationship counts.
   *
   * @param nodeCount Number of nodes
   * @param relationshipCount Number of relationships
   * @returns Density ratio (0.0 to 1.0)
   */
  static density(nodeCount: number, relationshipCount: number): number {
    return nodeCount > 0
      ? relationshipCount / (nodeCount * (nodeCount - 1))
      : 0;
  }

  /**
   * Calculate graph density from a graph instance.
   *
   * @param graph Graph to analyze
   * @returns Density ratio (0.0 to 1.0)
   */
  static densityFromGraph(graph: Graph): number {
    return DegreeDistribution.density(graph.nodeCount(), graph.relationshipCount());
  }
}

// Mock AtomicHistogram interface until we have the real implementation
interface AtomicHistogram {
  recordValue(value: number): void;
  getMinValue(): number;
  getMean(): number;
  getMaxValue(): number;
  getValueAtPercentile(percentile: number): number;
}

// Simple mock implementation
class AtomicHistogram implements AtomicHistogram {
  private values: number[] = [];

  constructor(public maxValue: number, public precision: number) {}

  recordValue(value: number): void {
    this.values.push(value);
  }

  getMinValue(): number {
    return this.values.length > 0 ? Math.min(...this.values) : 0;
  }

  getMean(): number {
    return this.values.length > 0
      ? this.values.reduce((a, b) => a + b, 0) / this.values.length
      : 0;
  }

  getMaxValue(): number {
    return this.values.length > 0 ? Math.max(...this.values) : 0;
  }

  getValueAtPercentile(percentile: number): number {
    if (this.values.length === 0) return 0;

    const sorted = [...this.values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index];
  }
}
