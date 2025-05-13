import { AtomicHistogramMock } from "../../hdr-histogram-mock"; // Adjust path
import { Graph } from "../../api/Graph"; // Adjust path
import { ConcurrencyConfig } from "../../config/ConcurrencyConfig"; // Adjust path
import { ParallelUtil } from "../concurrency/ParallelUtil"; // Adjust path
import { TerminationFlag } from "../../termination/TerminationFlag"; // Adjust path

/**
 * Utility class to compute degree distribution statistics for a graph.
 */
export class DegreeDistribution {
  /**
   * Needs to be at least 2 due to some requirement from the AtomicHistogram.
   * @see org.HdrHistogram.Histogram
   * (In HdrHistogram, this is numberOfSignificantValueDigits)
   */
  private static readonly PRECISION = 5;

  /**
   * Private constructor to prevent instantiation, making it a static utility class.
   */
  private constructor() {}

  /**
   * Computes degree distribution statistics for the given graph.
   * @param graph The graph to analyze.
   * @param terminationFlag A flag to signal termination of the computation.
   * @returns A map (object) containing degree statistics.
   */
  public static compute(
    graph: Graph,
    terminationFlag: TerminationFlag
  ): Record<string, number | number> {
    // Assuming relationshipCount() can return a large number, use BigInt if necessary,
    // but HdrHistogram constructor takes long, which often maps to number in JS if within safe limits.
    // For this mock, we'll use number.
    const maxDegreeFromRelationships = graph.relationshipCount();
    // HdrHistogram's highestTrackableValue must be >= 1.
    // The Java code uses Math.max(2, graph.relationshipCount()).
    // Let's ensure it's at least 2 for consistency with the Java code's logic,
    // though our mock doesn't strictly need it to be >= 2.
    const highestTrackableValue = Math.max(
      2,
      Number(maxDegreeFromRelationships)
    );

    const histogram = new AtomicHistogramMock(
      highestTrackableValue,
      DegreeDistribution.PRECISION
    );

    ParallelUtil.parallelForEachNode(
      Number(graph.nodeCount()), // Assuming nodeCount fits in number
      ConcurrencyConfig.TYPED_DEFAULT_CONCURRENCY,
      terminationFlag,
      (nodeId: number) => {
        histogram.recordValue(Number(graph.degree(nodeId))); // Assuming degree fits in number
      }
    );

    return {
      min: histogram.getMinValue(),
      mean: histogram.getMean(),
      max: histogram.getMaxValue(),
      p50: histogram.getValueAtPercentile(50),
      p75: histogram.getValueAtPercentile(75),
      p90: histogram.getValueAtPercentile(90),
      p95: histogram.getValueAtPercentile(95),
      p99: histogram.getValueAtPercentile(99),
      p999: histogram.getValueAtPercentile(99.9),
    };
  }

  /**
   * Calculates the density of a graph given its node and relationship counts.
   * Density is defined as E / (V * (V - 1)) for directed graphs where E is edges, V is vertices.
   * @param nodeCount The number of nodes in the graph.
   * @param relationshipCount The number of relationships (edges) in the graph.
   * @returns The density of the graph.
   */
  public static density(
    nodeCount: number | number,
    relationshipCount: number | number
  ): number {
    const nc = BigInt(nodeCount); // Use BigInt for precision with large counts
    const rc = BigInt(relationshipCount);

    if (nc > 0n) {
      // Ensure denominator is not zero if nc is 1
      const denominator = nc * (nc - 1n);
      if (denominator === 0n) {
        // For a single node graph, density can be considered 0 or undefined.
        // If it has self-loops, the formula might differ.
        // Given V*(V-1), a single node graph (V=1) has denominator 0.
        // If relationshipCount > 0 (self-loop), this would be div by zero.
        // Neo4j typically doesn't count self-loops in simple degree unless specified.
        // Let's assume for V=1, density is 0 if no self-loops, or handle as per specific GDS def.
        // If rc > 0 and nc === 1n, this implies self-loops.
        // The formula E / (V * (V-1)) is for graphs without self-loops or multiple edges between same nodes.
        // For simplicity, if V=1, V*(V-1) = 0. If E > 0, it's tricky.
        // GDS might handle this by saying density is 0 if V <= 1.
        return nc <= 1n ? 0 : Number(rc) / Number(denominator);
      }
      return Number(rc) / Number(denominator);
    }
    return 0;
  }

  /**
   * Calculates the density of the given graph.
   * @param graph The graph.
   * @returns The density of the graph.
   */
  public static densityForGraph(graph: Graph): number {
    return DegreeDistribution.density(
      graph.nodeCount(),
      graph.relationshipCount()
    );
  }
}
