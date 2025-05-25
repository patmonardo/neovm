import { PartialIdMap } from '@/api';
import { PropertyState } from '@/api';
import { NodePropertyStore } from '@/api/properties/nodes';
import { MutableNodeSchema } from '@/api/schema';
import { Concurrency } from '@/core/concurrency';
import { ShardedLongLongMap } from '@/core/utils/paged';
import { GraphFactory } from '@/core/loading/construction';
import { NodeLabelToken } from '@/core/loading/construction';
import { NodesBuilder } from '@/core/loading/construction';
import { PropertyValues } from '@/core/loading/construction';
import { HighLimitIdMap } from './HighLimitIdMap';
import { LoadingExceptions } from './LoadingExceptions';
import { AtomicBoolean } from '@/core/utils';

/**
 * Advanced ID mapping builder for extremely sparse graphs.
 *
 * LazyIdMapBuilder is designed for scenarios where node IDs are so sparse that
 * traditional ID mapping strategies (ArrayIdMap, HighLimitIdMap) would waste
 * significant memory. It uses a two-stage mapping approach:
 *
 * 1. **Intermediate Mapping**: Original ID → Intermediate ID (dense sequence)
 * 2. **Final Mapping**: Intermediate ID → Internal ID (optimized for actual usage)
 *
 * This approach is particularly effective for:
 * - Extremely sparse ID spaces (>1000x sparsity)
 * - Large-scale imports with unpredictable ID patterns
 * - Memory-constrained environments
 * - Dynamic graph construction
 *
 * Architecture:
 * ```
 * Original IDs (sparse)  →  Intermediate IDs (dense)  →  Internal IDs (optimized)
 * [1000, 50000, 999999]  →  [0, 1, 2]                →  [0, 1, 2]
 * ```
 */
export class LazyIdMapBuilder implements PartialIdMap {
  private readonly isEmpty = new AtomicBoolean(true);
  private readonly intermediateIdMapBuilder: ShardedLongLongMap.Builder;
  private readonly nodesBuilder: NodesBuilder;

  /**
   * Create a new LazyIdMapBuilder with advanced configuration options.
   *
   * @param config Configuration for the lazy ID map builder
   */
  constructor(config: LazyIdMapBuilderConfig) {
    this.intermediateIdMapBuilder = ShardedLongLongMap.builder(config.concurrency);
    this.nodesBuilder = GraphFactory.initNodesBuilder()
      .concurrency(config.concurrency)
      .hasLabelInformation(config.hasLabelInformation)
      .hasProperties(config.hasProperties)
      .deduplicateIds(false) // LazyIdMapBuilder handles deduplication itself
      .usePooledBuilderProvider(config.usePooledLocalNodesBuilder)
      .propertyState(config.propertyState)
      .build();
  }

  /**
   * Prepare the builder for data ingestion.
   * This method signals that the builder will start receiving nodes.
   */
  prepareForFlush(): void {
    this.isEmpty.set(false);
  }

  /**
   * Add a node with labels to the lazy ID mapping.
   *
   * Performs automatic deduplication - if the same original node ID is added
   * multiple times, it returns the same intermediate ID.
   *
   * @param nodeId Original node ID (must be positive)
   * @param nodeLabels Labels for this node
   * @returns Intermediate ID assigned to this node
   * @throws Error if nodeId is not positive
   */
  addNode(nodeId: number, nodeLabels: NodeLabelToken): number {
    LoadingExceptions.checkPositiveId(nodeId);

    const intermediateId = this.intermediateIdMapBuilder.addNode(nodeId);

    // Handle deduplication: negative values indicate the node already exists
    if (intermediateId < 0) {
      // Convert back to positive intermediate ID
      return -(intermediateId + 1);
    }

    // Add the node with its intermediate ID
    this.nodesBuilder.addNode(intermediateId, nodeLabels);

    return intermediateId;
  }

  /**
   * Add a node with properties and labels to the lazy ID mapping.
   *
   * @param nodeId Original node ID (must be positive)
   * @param properties Properties for this node
   * @param nodeLabels Labels for this node
   * @returns Intermediate ID assigned to this node
   * @throws Error if nodeId is not positive
   */
  addNodeWithProperties(
    nodeId: number,
    properties: PropertyValues,
    nodeLabels: NodeLabelToken
  ): number {
    LoadingExceptions.checkPositiveId(nodeId);

    const intermediateId = this.intermediateIdMapBuilder.addNode(nodeId);

    // Handle deduplication
    if (intermediateId < 0) {
      return -(intermediateId + 1);
    }

    // Add node with or without properties
    if (properties.isEmpty()) {
      this.nodesBuilder.addNode(intermediateId, nodeLabels);
    } else {
      this.nodesBuilder.addNode(intermediateId, nodeLabels, properties);
    }

    return intermediateId;
  }

  /**
   * Map original node ID to mapped node ID.
   * During construction phase, this is an identity mapping.
   *
   * @param originalNodeId Original node ID
   * @returns Mapped node ID (identity during construction)
   */
  toMappedNodeId(originalNodeId: number): number {
    return originalNodeId;
  }

  /**
   * Get the current number of nodes imported.
   *
   * @returns Number of imported nodes, or empty if no nodes added yet
   */
  rootNodeCount(): number | null {
    return this.isEmpty.getAcquire()
      ? null
      : this.nodesBuilder.importedNodes();
  }

  /**
   * Build the final HighLimitIdMap and associated structures.
   *
   * This creates a sophisticated two-stage mapping system:
   * 1. ShardedLongLongMap for original → intermediate mapping
   * 2. Internal ID map for intermediate → final mapping
   *
   * @returns Complete high-limit ID map with properties and schema
   */
  build(): HighLimitIdMapAndProperties {
    // Build the nodes structure
    const nodes = this.nodesBuilder.build();

    // Build the intermediate mapping (original → intermediate)
    const intermediateIdMap = this.intermediateIdMapBuilder.build();

    // Get the internal mapping (intermediate → internal)
    const internalIdMap = nodes.idMap();

    // Create the composite high-limit ID map
    const idMap = new HighLimitIdMap(intermediateIdMap, internalIdMap);

    // Create a partial ID map for property construction
    const partialIdMap: PartialIdMap = {
      /**
       * Map intermediate ID to final mapped ID.
       *
       * During property construction, properties are indexed by intermediate ID.
       * This mapping converts intermediate ID → original ID → final mapped ID.
       */
      toMappedNodeId: (intermediateId: number): number => {
        // Get original ID from intermediate ID
        const originalId = intermediateIdMap.toOriginalNodeId(intermediateId);
        // Get final mapped ID from original ID
        return idMap.toMappedNodeId(originalId);
      },

      rootNodeCount: (): number | null => {
        return intermediateIdMap.size();
      }
    };

    return {
      idMap,
      intermediateIdMap: partialIdMap,
      schema: nodes.schema(),
      propertyStore: nodes.properties()
    };
  }

  /**
   * Get statistics about the current state of the lazy ID map builder.
   */
  getStatistics(): LazyIdMapBuilderStatistics {
    const nodeCount = this.rootNodeCount() || 0;
    const estimatedIntermediateMapMemory = this.intermediateIdMapBuilder.estimateMemoryUsage?.() || 0;
    const estimatedNodesBuilderMemory = this.nodesBuilder.estimateMemoryUsage?.() || 0;

    return {
      nodeCount,
      isEmpty: this.isEmpty.get(),
      estimatedMemoryUsageBytes: estimatedIntermediateMapMemory + estimatedNodesBuilderMemory,
      hasStartedIngestion: !this.isEmpty.get()
    };
  }

  /**
   * Check if this builder is suitable for the given sparsity characteristics.
   *
   * @param nodeCount Number of nodes
   * @param highestOriginalId Highest original node ID
   * @returns Suitability assessment
   */
  static assessSuitability(nodeCount: number, highestOriginalId: number): SuitabilityAssessment {
    const sparsityFactor = highestOriginalId / nodeCount;

    // LazyIdMapBuilder is most beneficial for very sparse graphs
    const isHighlySparse = sparsityFactor > 1000;
    const isExtremelySparse = sparsityFactor > 10000;

    // Estimate memory usage for different strategies
    const arrayIdMapMemory = highestOriginalId * 8; // Dense array
    const highLimitIdMapMemory = nodeCount * 16 + 1024; // Estimated overhead
    const lazyIdMapMemory = nodeCount * 24; // Intermediate mapping + overhead

    const memoryEfficiencyVsArray = (arrayIdMapMemory - lazyIdMapMemory) / arrayIdMapMemory;
    const memoryEfficiencyVsHighLimit = (highLimitIdMapMemory - lazyIdMapMemory) / highLimitIdMapMemory;

    return {
      sparsityFactor,
      isRecommended: isHighlySparse,
      isOptimal: isExtremelySparse,
      memoryEfficiencyVsArray: memoryEfficiencyVsArray * 100,
      memoryEfficiencyVsHighLimit: memoryEfficiencyVsHighLimit * 100,
      estimatedMemoryUsageMB: lazyIdMapMemory / (1024 * 1024),
      reasoning: this.generateSuitabilityReasoning(sparsityFactor, memoryEfficiencyVsArray)
    };
  }

  private static generateSuitabilityReasoning(sparsityFactor: number, memoryEfficiency: number): string {
    if (sparsityFactor < 100) {
      return 'Low sparsity - consider ArrayIdMap or HighLimitIdMap';
    } else if (sparsityFactor < 1000) {
      return 'Moderate sparsity - HighLimitIdMap likely more efficient';
    } else if (memoryEfficiency > 0.8) {
      return 'High sparsity with excellent memory efficiency - LazyIdMapBuilder optimal';
    } else if (memoryEfficiency > 0.5) {
      return 'High sparsity with good memory efficiency - LazyIdMapBuilder recommended';
    } else {
      return 'Very high sparsity but marginal memory benefits - evaluate based on other factors';
    }
  }

  /**
   * Create a new LazyIdMapBuilder with default configuration.
   */
  static create(concurrency: Concurrency): LazyIdMapBuilder {
    return new LazyIdMapBuilder({
      concurrency,
      hasLabelInformation: true,
      hasProperties: true,
      usePooledLocalNodesBuilder: true,
      propertyState: PropertyState.PERSISTENT
    });
  }

  /**
   * Create a builder specifically optimized for large-scale sparse imports.
   */
  static forLargeScaleSparseImport(concurrency: Concurrency): LazyIdMapBuilder {
    return new LazyIdMapBuilder({
      concurrency,
      hasLabelInformation: false, // Minimize overhead for large imports
      hasProperties: false,
      usePooledLocalNodesBuilder: true,
      propertyState: PropertyState.TRANSIENT
    });
  }

  /**
   * Create a builder optimized for feature-rich graph construction.
   */
  static forFeatureRichGraphs(concurrency: Concurrency): LazyIdMapBuilder {
    return new LazyIdMapBuilder({
      concurrency,
      hasLabelInformation: true,
      hasProperties: true,
      usePooledLocalNodesBuilder: false, // More control for complex scenarios
      propertyState: PropertyState.PERSISTENT
    });
  }
}

/**
 * Configuration for LazyIdMapBuilder construction.
 */
export interface LazyIdMapBuilderConfig {
  concurrency: Concurrency;
  hasLabelInformation?: boolean;
  hasProperties?: boolean;
  usePooledLocalNodesBuilder?: boolean;
  propertyState: PropertyState;
}

/**
 * Complete result of building a lazy ID map.
 */
export interface HighLimitIdMapAndProperties {
  idMap: HighLimitIdMap;
  intermediateIdMap: PartialIdMap;
  schema: MutableNodeSchema;
  propertyStore: NodePropertyStore;
}

/**
 * Statistics about the lazy ID map builder state.
 */
export interface LazyIdMapBuilderStatistics {
  nodeCount: number;
  isEmpty: boolean;
  estimatedMemoryUsageBytes: number;
  hasStartedIngestion: boolean;
}

/**
 * Assessment of suitability for using LazyIdMapBuilder.
 */
export interface SuitabilityAssessment {
  sparsityFactor: number;
  isRecommended: boolean;
  isOptimal: boolean;
  memoryEfficiencyVsArray: number;
  memoryEfficiencyVsHighLimit: number;
  estimatedMemoryUsageMB: number;
  reasoning: string;
}
