import { GraphStore } from '@/api';
import { GraphStoreToFileExporter } from '@/core/io/file';
import {
  MemoryEstimation,
  MemoryEstimations,
  MemoryDimensions
} from '@/mem';
import { NodePropertySampler } from './NodePropertySampler';
import { RelationshipPropertySampler } from './RelationshipPropertySampler';

/**
 * Memory estimation utility for CSV export operations.
 * Calculates memory requirements for exporting graph data to CSV format.
 */
export class CsvExportEstimation {
  // Assuming UTF-8 encoding
  private static readonly BYTES_PER_WRITTEN_CHARACTER = 1;

  /**
   * Estimate memory usage for CSV export of the given graph store.
   */
  static estimate(graphStore: GraphStore, samplingFactor: number): MemoryEstimation {
    return MemoryEstimations
      .builder(GraphStoreToFileExporter)
      .fixed("Node data", this.estimateNodes(graphStore, samplingFactor))
      .fixed("Relationship data", this.estimateRelationships(graphStore, samplingFactor))
      .build();
  }

  /**
   * Estimate memory required for node data export.
   */
  private static estimateNodes(graphStore: GraphStore, samplingFactor: number): number {
    const nodeIdsEstimate = this.getIdEstimate(graphStore);
    const nodePropertiesEstimate = this.sampleNodeProperties(graphStore, samplingFactor);

    return nodeIdsEstimate + nodePropertiesEstimate;
  }

  /**
   * Estimate memory required for relationship data export.
   */
  private static estimateRelationships(graphStore: GraphStore, samplingFactor: number): number {
    const avgBytesPerNodeId = Math.floor(this.getIdEstimate(graphStore) / graphStore.nodeCount()) + 1;

    // Each relationship has source + target ID
    const sourceTargetIdEstimate = avgBytesPerNodeId * 2 * graphStore.relationshipCount();
    const relationshipPropertiesEstimate = this.sampleRelationshipProperties(graphStore, samplingFactor);

    return sourceTargetIdEstimate + relationshipPropertiesEstimate;
  }

  /**
   * Estimate total bytes needed to store all node IDs.
   * Calculates based on the number of digits required for each ID.
   */
  private static getIdEstimate(graphStore: GraphStore): number {
    const nodeCount = graphStore.nodeCount();
    if (nodeCount === 0) return 0;

    const maxNumberOfDigits = Math.floor(Math.log10(nodeCount)) + 1;
    let nodeIdEstimate = 0;
    let consideredNumbers = 0;

    // Count all nodes from 1 to log10(nodeCount)
    // 1 digit  -> 1-9 (9 numbers)
    // 2 digits -> 10-99 (90 numbers)
    // 3 digits -> 100-999 (900 numbers)
    // ...
    for (let digits = 1; digits < maxNumberOfDigits; digits++) {
      const numbersWithDigitX = Math.pow(10, digits) - Math.pow(10, digits - 1);
      nodeIdEstimate += numbersWithDigitX * digits * this.BYTES_PER_WRITTEN_CHARACTER;
      consideredNumbers += numbersWithDigitX;
    }

    // Count the nodes with max digit count
    const remainingNodes = nodeCount - consideredNumbers;
    nodeIdEstimate += remainingNodes * maxNumberOfDigits * this.BYTES_PER_WRITTEN_CHARACTER;

    return nodeIdEstimate;
  }

  /**
   * Sample node properties to estimate total memory usage.
   */
  private static sampleNodeProperties(graphStore: GraphStore, samplingFactor: number): number {
    return graphStore.nodeCount() * NodePropertySampler.sample(graphStore, samplingFactor);
  }

  /**
   * Sample relationship properties to estimate total memory usage.
   */
  private static sampleRelationshipProperties(graphStore: GraphStore, samplingFactor: number): number {
    return graphStore.relationshipCount() * RelationshipPropertySampler.sample(graphStore, samplingFactor);
  }

  // Private constructor - utility class
  private constructor() {}
}
