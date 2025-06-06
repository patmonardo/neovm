import { IdMap } from '@/api';
import { HugeLongArray } from '@/collections';
import { HugeSparseLongArray } from '@/collections';
import { Concurrency, DefaultPool, ParallelUtil } from '@/concurrency';
import { ArrayIdMap } from './ArrayIdMap';
import { NodesBuilder } from './construction';

/**
 * Final assembly operations for ArrayIdMap construction.
 *
 * Handles the parallel construction of the bidirectional mapping by building
 * the sparse reverse index (original → internal) from the dense forward index
 * (internal → original). Uses cursor-based parallel processing for optimal
 * performance with huge datasets.
 */
export class ArrayIdMapBuilderOps {

  /**
   * Build the complete ArrayIdMap with bidirectional mapping.
   *
   * @param internalToOriginalIds Dense array mapping internal → original IDs
   * @param nodeCount Total number of nodes in the graph
   * @param labelInformationBuilder Builder for label information
   * @param highestNodeId Highest original node ID (will be computed if unknown)
   * @param concurrency Concurrency configuration for parallel processing
   * @returns Complete ArrayIdMap with optimized bidirectional lookup
   */
  static build(
    internalToOriginalIds: HugeLongArray,
    nodeCount: number,
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number,
    concurrency: Concurrency
  ): ArrayIdMap {
    // Compute highest node ID if unknown
    if (highestNodeId === NodesBuilder.UNKNOWN_MAX_ID) {
      highestNodeId = ArrayIdMapBuilderOps.findMaxNodeId(internalToOriginalIds) ?? NodesBuilder.UNKNOWN_MAX_ID;
    }

    // Build sparse reverse mapping (original → internal)
    const originalToInternalIds = ArrayIdMapBuilderOps.buildSparseIdMap(
      nodeCount,
      highestNodeId,
      concurrency,
      internalToOriginalIds
    );

    // Build label information with reverse mapping access
    const labelInformation = labelInformationBuilder.build(
      nodeCount,
      (originalId: number) => originalToInternalIds.get(originalId)
    );

    // Create final ArrayIdMap
    return new ArrayIdMap(
      internalToOriginalIds,
      originalToInternalIds,
      labelInformation,
      nodeCount,
      highestNodeId
    );
  }

  /**
   * Find the maximum node ID in the dense array using parallel processing.
   *
   * @param nodeIds Dense array of node IDs
   * @returns Maximum node ID or null if array is empty
   */
  private static findMaxNodeId(nodeIds: HugeLongArray): number | null {
    const nodeCount = nodeIds.size();

    if (nodeCount === 0) {
      return null;
    }

    // Use parallel stream to find maximum
    let maxId = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < nodeCount; i++) {
      const nodeId = nodeIds.get(i);
      if (nodeId > maxId) {
        maxId = nodeId;
      }
    }

    return maxId;
  }

  /**
   * Build sparse reverse mapping (original → internal) using parallel processing.
   *
   * Creates a HugeSparseLongArray that maps original node IDs back to their
   * internal array indices. Uses cursor-based parallel processing to handle
   * huge datasets efficiently.
   *
   * @param nodeCount Total number of nodes
   * @param highestNodeId Highest original node ID
   * @param concurrency Concurrency configuration
   * @param graphIds Dense array of original node IDs
   * @returns Sparse array for reverse lookup
   */
  static buildSparseIdMap(
    nodeCount: number,
    highestNodeId: number,
    concurrency: Concurrency,
    graphIds: HugeLongArray
  ): HugeSparseLongArray {
    // Create sparse array builder
    // We need capacity for `highestNodeId + 1` to store node with `id = highestNodeId`
    const idMapBuilder = HugeSparseLongArray.builder(
      IdMap.NOT_FOUND,
      highestNodeId + 1
    );

    // Parallel processing of the reverse mapping construction
    ParallelUtil.readParallel(
      concurrency,
      nodeCount,
      DefaultPool.INSTANCE,
      (start: number, end: number) => ArrayIdMapBuilderOps.addNodes(graphIds, idMapBuilder, start, end)
    );

    return idMapBuilder.build();
  }

  /**
   * Add nodes to the sparse mapping builder for a specific range.
   *
   * Processes a range of internal IDs, reading their corresponding original IDs
   * from the dense array and inserting the reverse mapping into the sparse builder.
   * Uses cursor-based access for efficient page-by-page processing.
   *
   * @param graphIds Dense array containing original node IDs
   * @param builder Sparse array builder for reverse mapping
   * @param startNode Starting internal node ID (inclusive)
   * @param endNode Ending internal node ID (exclusive)
   */
  private static addNodes(
    graphIds: HugeLongArray,
    builder: HugeSparseLongArray.Builder,
    startNode: number,
    endNode: number
  ): void {
    // Use cursor for efficient page-by-page processing
    const cursor = graphIds.newCursor();

    try {
      graphIds.initCursor(cursor, startNode, endNode);

      while (cursor.next()) {
        const array = cursor.array;
        const offset = cursor.offset;
        const limit = cursor.limit;
        let internalId = cursor.base + offset;

        // Process each node in the current page
        for (let i = offset; i < limit; i++, internalId++) {
          const originalId = array[i];
          builder.set(originalId, internalId);
        }
      }
    } finally {
      // Ensure cursor is properly closed
      cursor.close?.();
    }
  }

  /**
   * Get statistics about the building process for monitoring and debugging.
   */
  static getBuildStatistics(
    internalToOriginalIds: HugeLongArray,
    originalToInternalIds: HugeSparseLongArray,
    nodeCount: number,
    highestNodeId: number
  ): ArrayIdMapBuildStats {
    const densityRatio = nodeCount / (highestNodeId + 1);
    const compressionRatio = highestNodeId / nodeCount;

    const estimatedDenseMemory = (highestNodeId + 1) * 8; // Full array memory
    const actualSparseMemory = originalToInternalIds.memoryUsage();
    const memoryEfficiency = (estimatedDenseMemory - actualSparseMemory) / estimatedDenseMemory;

    return {
      nodeCount,
      highestNodeId,
      densityRatio,
      compressionRatio,
      estimatedDenseMemoryMB: estimatedDenseMemory / (1024 * 1024),
      actualSparseMemoryMB: actualSparseMemory / (1024 * 1024),
      memoryEfficiencyPercentage: memoryEfficiency * 100,
      sparsityOptimal: compressionRatio > 3 // Optimal when >3x compression
    };
  }

  /**
   * Verify the integrity of the bidirectional mapping.
   */
  static verifyMappingIntegrity(
    internalToOriginalIds: HugeLongArray,
    originalToInternalIds: HugeSparseLongArray,
    nodeCount: number
  ): BuildIntegrityResult {
    const errors: string[] = [];
    let testedMappings = 0;
    let validMappings = 0;

    // Test a sample of mappings for efficiency
    const sampleSize = Math.min(nodeCount, 10000);
    const sampleStep = Math.max(1, Math.floor(nodeCount / sampleSize));

    for (let internalId = 0; internalId < nodeCount; internalId += sampleStep) {
      testedMappings++;

      try {
        const originalId = internalToOriginalIds.get(internalId);
        const roundTripInternalId = originalToInternalIds.get(originalId);

        if (roundTripInternalId === internalId) {
          validMappings++;
        } else {
          errors.push(
            `Mapping inconsistency: internal ${internalId} → original ${originalId} → internal ${roundTripInternalId}`
          );
        }

        if (errors.length >= 100) {
          errors.push('... (truncated after 100 errors)');
          break;
        }
      } catch (error) {
        errors.push(`Error testing internal ID ${internalId}: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      testedMappings,
      validMappings,
      sampleSize,
      errors,
      integrityPercentage: testedMappings > 0 ? (validMappings / testedMappings) * 100 : 0
    };
  }

  /**
   * Benchmark the parallel building performance.
   */
  static benchmarkBuildPerformance(
    nodeCount: number,
    sparsityFactor: number,
    concurrencyLevels: number[]
  ): BuildPerformanceBenchmarkResult {
    const results: ConcurrencyBenchmarkResult[] = [];
    const highestNodeId = nodeCount * sparsityFactor;

    concurrencyLevels.forEach(concurrencyLevel => {
      // Create test data
      const testData = ArrayIdMapBuilderOps.generateTestData(nodeCount, highestNodeId);
      const concurrency: Concurrency = { value: concurrencyLevel };

      const startTime = Date.now();

      try {
        // Build sparse mapping
        const sparseMapping = ArrayIdMapBuilderOps.buildSparseIdMap(
          nodeCount,
          highestNodeId,
          concurrency,
          testData
        );

        const elapsedMs = Date.now() - startTime;

        results.push({
          concurrencyLevel,
          elapsedMs,
          nodesPerSecond: (nodeCount / elapsedMs) * 1000,
          memoryUsageMB: sparseMapping.memoryUsage() / (1024 * 1024),
          success: true
        });

      } catch (error) {
        results.push({
          concurrencyLevel,
          elapsedMs: Date.now() - startTime,
          nodesPerSecond: 0,
          memoryUsageMB: 0,
          success: false,
          error: error.message
        });
      }
    });

    return {
      nodeCount,
      sparsityFactor,
      results,
      summary: ArrayIdMapBuilderOps.generateBenchmarkSummary(results)
    };
  }

  private static generateTestData(nodeCount: number, highestNodeId: number): HugeLongArray {
    const array = HugeLongArray.newArray(nodeCount);

    // Generate sparse but realistic node IDs
    for (let i = 0; i < nodeCount; i++) {
      // Create some clustering and gaps
      const clusterId = Math.floor(i / 1000);
      const clusterBase = clusterId * Math.floor(highestNodeId / Math.ceil(nodeCount / 1000));
      const offset = i % 1000;
      array.set(i, clusterBase + offset);
    }

    return array;
  }

  private static generateBenchmarkSummary(results: ConcurrencyBenchmarkResult[]): BenchmarkSummary {
    const successful = results.filter(r => r.success);

    if (successful.length === 0) {
      return {
        optimalConcurrency: 1,
        maxThroughput: 0,
        scalabilityEfficiency: 0,
        recommendedSettings: 'Unable to determine - all tests failed'
      };
    }

    const maxThroughput = Math.max(...successful.map(r => r.nodesPerSecond));
    const optimalResult = successful.find(r => r.nodesPerSecond === maxThroughput)!;

    // Calculate scalability efficiency (throughput improvement vs single thread)
    const singleThreadResult = successful.find(r => r.concurrencyLevel === 1);
    const scalabilityEfficiency = singleThreadResult
      ? maxThroughput / singleThreadResult.nodesPerSecond
      : 1;

    const recommendedSettings = ArrayIdMapBuilderOps.generateRecommendations(successful);

    return {
      optimalConcurrency: optimalResult.concurrencyLevel,
      maxThroughput,
      scalabilityEfficiency,
      recommendedSettings
    };
  }

  private static generateRecommendations(results: ConcurrencyBenchmarkResult[]): string {
    const optimalResult = results.reduce((best, curr) =>
      curr.nodesPerSecond > best.nodesPerSecond ? curr : best
    );

    if (optimalResult.concurrencyLevel === 1) {
      return 'Single-threaded processing is optimal for this dataset size';
    } else if (optimalResult.concurrencyLevel <= 4) {
      return `Use ${optimalResult.concurrencyLevel} threads for optimal performance`;
    } else {
      return `High concurrency beneficial - use ${optimalResult.concurrencyLevel}+ threads`;
    }
  }
}

/**
 * Statistics about the ArrayIdMap building process.
 */
export interface ArrayIdMapBuildStats {
  nodeCount: number;
  highestNodeId: number;
  densityRatio: number;
  compressionRatio: number;
  estimatedDenseMemoryMB: number;
  actualSparseMemoryMB: number;
  memoryEfficiencyPercentage: number;
  sparsityOptimal: boolean;
}

/**
 * Result of mapping integrity verification.
 */
interface BuildIntegrityResult {
  isValid: boolean;
  testedMappings: number;
  validMappings: number;
  sampleSize: number;
  errors: string[];
  integrityPercentage: number;
}

/**
 * Benchmark result for a specific concurrency level.
 */
interface ConcurrencyBenchmarkResult {
  concurrencyLevel: number;
  elapsedMs: number;
  nodesPerSecond: number;
  memoryUsageMB: number;
  success: boolean;
  error?: string;
}

/**
 * Summary of benchmark results across all concurrency levels.
 */
interface BenchmarkSummary {
  optimalConcurrency: number;
  maxThroughput: number;
  scalabilityEfficiency: number;
  recommendedSettings: string;
}

/**
 * Complete benchmark result for build performance analysis.
 */
interface BuildPerformanceBenchmarkResult {
  nodeCount: number;
  sparsityFactor: number;
  results: ConcurrencyBenchmarkResult[];
  summary: BenchmarkSummary;
}
