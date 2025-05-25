import { NodeLabel } from '@/api';
import { IdMap } from '@/api/graph';
import { BitSet } from '@/core/utils';
import { BatchNodeIterable } from '@/api/graph';
import { HugeAtomicGrowingBitSet } from '@/core/utils/paged';
import { LabelInformation, LabelInformationConsumer } from './LabelInformation';
import { LabelInformationBuilders } from './LabelInformationBuilders';
import { StringFormatting } from '@/utils';

/**
 * Multi-label information management for graphs with multiple node labels.
 *
 * This is the core implementation for managing label-to-node mappings in graphs where
 * nodes can have multiple labels. It uses BitSets for memory-efficient storage and
 * fast set operations (union, intersection, iteration).
 *
 * Key features:
 * - Memory-efficient BitSet storage (1 bit per node per label)
 * - Fast union operations for multi-label queries
 * - Thread-safe construction with atomic growing bit sets
 * - Automatic optimization for edge cases (single/empty labels)
 * - Support for "star" projections that include all nodes
 *
 * Architecture:
 * ```
 * NodeLabel → BitSet mapping
 * Person   → [1,0,1,0,1,0,0,1] (nodes 0,2,4,7 are Person)
 * Company  → [0,1,0,1,0,1,1,0] (nodes 1,3,5,6 are Company)
 * ```
 *
 * Memory efficiency example:
 * - 1M nodes, 10 labels = ~1.25MB (vs ~80MB for Set<NodeId> approach)
 */
export class MultiLabelInformation implements LabelInformation {
  private readonly labelInformation: Map<NodeLabel, BitSet>;

  private constructor(labelInformation: Map<NodeLabel, BitSet>) {
    this.labelInformation = labelInformation;
  }

  /**
   * Check if this label information is empty (no labels defined).
   */
  isEmpty(): boolean {
    return this.labelInformation.size === 0;
  }

  /**
   * Iterate over all label-to-bitset mappings.
   *
   * @param consumer Function to process each label and its corresponding BitSet
   */
  forEach(consumer: LabelInformationConsumer): void {
    for (const [nodeLabel, bitSet] of this.labelInformation.entries()) {
      if (!consumer.accept(nodeLabel, bitSet)) {
        return; // Consumer requested early termination
      }
    }
  }

  /**
   * Create a filtered view containing only the specified labels.
   *
   * @param nodeLabels Labels to include in the filtered view
   * @returns New MultiLabelInformation with only the specified labels
   */
  filter(nodeLabels: NodeLabel[]): MultiLabelInformation {
    const filteredMap = new Map<NodeLabel, BitSet>();

    nodeLabels.forEach(nodeLabel => {
      const bitSet = this.labelInformation.get(nodeLabel);
      if (bitSet !== undefined) {
        filteredMap.set(nodeLabel, bitSet);
      }
    });

    return new MultiLabelInformation(filteredMap);
  }

  /**
   * Create a BitSet representing the union of all specified labels.
   *
   * This is a core operation for multi-label queries - finds all nodes that
   * have ANY of the specified labels using efficient bit operations.
   *
   * @param nodeLabels Labels to union
   * @param nodeCount Total number of nodes (for BitSet sizing)
   * @returns BitSet with bits set for nodes having any of the labels
   */
  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet {
    // Verify all requested labels exist
    const missingLabels = nodeLabels.filter(label => !this.labelInformation.has(label));
    if (missingLabels.length > 0) {
      throw new Error(`Labels not found: ${missingLabels.map(l => l.name).join(', ')}`);
    }

    const unionBitSet = new BitSet(nodeCount);

    nodeLabels.forEach(label => {
      const labelBitSet = this.labelInformation.get(label);
      if (labelBitSet) {
        unionBitSet.union(labelBitSet);
      }
    });

    return unionBitSet;
  }

  /**
   * Get the number of nodes that have the specified label.
   *
   * @param nodeLabel Label to count nodes for
   * @returns Number of nodes with this label
   */
  nodeCountForLabel(nodeLabel: NodeLabel): number {
    if (this.availableNodeLabels().has(nodeLabel)) {
      const bitSet = this.labelInformation.get(nodeLabel)!;
      return bitSet.cardinality();
    }

    throw new Error(
      StringFormatting.formatWithLocale('No label information for label %s present', nodeLabel)
    );
  }

  /**
   * Add a new label to the information (creates empty BitSet).
   *
   * @param nodeLabel Label to add
   */
  addLabel(nodeLabel: NodeLabel): void {
    if (!this.labelInformation.has(nodeLabel)) {
      this.labelInformation.set(nodeLabel, new BitSet());
    }
  }

  /**
   * Add a node ID to a specific label's BitSet.
   *
   * @param nodeId Node ID to add
   * @param nodeLabel Label to add the node to
   */
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    const bitSet = this.labelInformation.get(nodeLabel);
    if (bitSet) {
      bitSet.set(nodeId);
    }
  }

  /**
   * Check if this is a single-label information (always false for MultiLabel).
   */
  isSingleLabel(): boolean {
    return false;
  }

  /**
   * Convert to multi-label information (returns self, adds label if needed).
   *
   * @param nodeLabelToMutate Label to ensure exists
   * @returns This instance (already multi-label)
   */
  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    this.addLabel(nodeLabelToMutate);
    return this;
  }

  /**
   * Check if a specific node has a specific label.
   *
   * @param nodeId Node ID to check
   * @param nodeLabel Label to check for
   * @returns true if the node has the label
   */
  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    // Special case: ALL_NODES pseudo-label
    if (nodeLabel === NodeLabel.ALL_NODES) {
      return true;
    }

    const bitSet = this.labelInformation.get(nodeLabel);
    return bitSet !== undefined && bitSet.get(nodeId);
  }

  /**
   * Get all available node labels.
   *
   * @returns Set of all node labels in this information
   */
  availableNodeLabels(): Set<NodeLabel> {
    return new Set(this.labelInformation.keys());
  }

  /**
   * Get all labels for a specific node.
   *
   * @param nodeId Node ID to get labels for
   * @returns Array of labels that this node has
   */
  nodeLabelsForNodeId(nodeId: number): NodeLabel[] {
    const labels: NodeLabel[] = [];

    this.forEach((nodeLabel, bitSet) => {
      if (bitSet.get(nodeId)) {
        labels.push(nodeLabel);
      }
      return true; // Continue iteration
    });

    return labels;
  }

  /**
   * Iterate over all labels for a specific node using a consumer.
   *
   * @param nodeId Node ID to iterate labels for
   * @param consumer Function to process each label
   */
  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    this.forEach((nodeLabel, bitSet) => {
      if (bitSet.get(nodeId)) {
        return consumer.accept(nodeLabel);
      }
      return true; // Continue iteration
    });
  }

  /**
   * Validate that all specified labels exist in this information.
   *
   * @param nodeLabels Labels to validate
   * @throws Error if any labels don't exist
   */
  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void {
    const invalidLabels = nodeLabels.filter(label =>
      !this.labelInformation.has(label) && label !== NodeLabel.ALL_NODES
    );

    if (invalidLabels.length > 0) {
      throw new Error(
        StringFormatting.formatWithLocale(
          'Specified labels %s do not correspond to any of the node projections %s.',
          invalidLabels.map(l => l.name),
          Array.from(this.availableNodeLabels()).map(l => l.name)
        )
      );
    }
  }

  /**
   * Create an iterator over nodes that have any of the specified labels.
   *
   * @param labels Labels to iterate nodes for
   * @param nodeCount Total number of nodes
   * @returns Iterator over node IDs
   */
  nodeIterator(labels: NodeLabel[], nodeCount: number): Iterator<number> {
    // Special case: if ALL_NODES is requested, iterate all nodes
    if (labels.includes(NodeLabel.ALL_NODES)) {
      return new BatchNodeIterable.IdIterator(nodeCount);
    }

    // Create union BitSet and iterate over set bits
    const unionBitSet = this.unionBitSet(labels, nodeCount);
    return new BatchNodeIterable.BitSetIdIterator(unionBitSet);
  }

  /**
   * Get detailed statistics about this multi-label information.
   */
  getStatistics(): MultiLabelStatistics {
    const labelStats = new Map<NodeLabel, LabelStatistics>();
    let totalNodes = 0;
    let totalMemoryBytes = 0;

    this.labelInformation.forEach((bitSet, label) => {
      const cardinality = bitSet.cardinality();
      const memoryBytes = bitSet.estimateMemoryUsage?.() || Math.ceil(bitSet.size() / 8);

      labelStats.set(label, {
        nodeCount: cardinality,
        memoryUsageBytes: memoryBytes,
        density: bitSet.size() > 0 ? cardinality / bitSet.size() : 0
      });

      totalNodes += cardinality;
      totalMemoryBytes += memoryBytes;
    });

    return {
      labelCount: this.labelInformation.size,
      totalNodeMemberships: totalNodes,
      memoryUsageBytes: totalMemoryBytes,
      averageNodesPerLabel: this.labelInformation.size > 0 ? totalNodes / this.labelInformation.size : 0,
      labelStatistics: labelStats
    };
  }

  /**
   * Analyze memory efficiency compared to alternative storage approaches.
   */
  compareStorageEfficiency(nodeCount: number): StorageEfficiencyComparison {
    const bitSetMemoryBytes = this.getStatistics().memoryUsageBytes;

    // Alternative: Map<NodeLabel, Set<number>>
    const setBasedMemoryBytes = Array.from(this.labelInformation.entries())
      .reduce((total, [_, bitSet]) => {
        const nodeCount = bitSet.cardinality();
        return total + (nodeCount * 8) + 64; // 8 bytes per node ID + Set overhead
      }, 0);

    // Alternative: Array of label arrays per node
    const nodeArrayMemoryBytes = nodeCount * this.labelInformation.size * 8; // Worst case

    const bitSetEfficiency = ((setBasedMemoryBytes - bitSetMemoryBytes) / setBasedMemoryBytes) * 100;
    const arrayEfficiency = ((nodeArrayMemoryBytes - bitSetMemoryBytes) / nodeArrayMemoryBytes) * 100;

    return {
      bitSetMemoryMB: bitSetMemoryBytes / (1024 * 1024),
      setBasedMemoryMB: setBasedMemoryBytes / (1024 * 1024),
      nodeArrayMemoryMB: nodeArrayMemoryBytes / (1024 * 1024),
      efficiencyVsSetBased: bitSetEfficiency,
      efficiencyVsNodeArray: arrayEfficiency,
      isOptimal: bitSetEfficiency > 0 && arrayEfficiency > 0
    };
  }

  /**
   * Create a copy of this MultiLabelInformation with only the specified labels.
   */
  createProjection(labelProjection: NodeLabel[]): MultiLabelInformation {
    this.validateNodeLabelFilter(labelProjection);
    return this.filter(labelProjection);
  }

  /**
   * Get the intersection of nodes that have ALL specified labels.
   */
  intersectionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet {
    if (nodeLabels.length === 0) {
      return new BitSet(nodeCount);
    }

    this.validateNodeLabelFilter(nodeLabels);

    // Start with the first label's BitSet
    const result = this.labelInformation.get(nodeLabels[0])!.copy();

    // Intersect with remaining labels
    for (let i = 1; i < nodeLabels.length; i++) {
      const labelBitSet = this.labelInformation.get(nodeLabels[i])!;
      result.intersect(labelBitSet);
    }

    return result;
  }

  /**
   * Check if this MultiLabelInformation is equivalent to another.
   */
  isEquivalent(other: MultiLabelInformation): boolean {
    if (this.labelInformation.size !== other.labelInformation.size) {
      return false;
    }

    for (const [label, bitSet] of this.labelInformation.entries()) {
      const otherBitSet = other.labelInformation.get(label);
      if (!otherBitSet || !bitSet.equals(otherBitSet)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Merge another MultiLabelInformation into this one.
   */
  merge(other: MultiLabelInformation): MultiLabelInformation {
    const mergedMap = new Map(this.labelInformation);

    other.labelInformation.forEach((otherBitSet, label) => {
      const existingBitSet = mergedMap.get(label);
      if (existingBitSet) {
        const unionBitSet = existingBitSet.copy();
        unionBitSet.union(otherBitSet);
        mergedMap.set(label, unionBitSet);
      } else {
        mergedMap.set(label, otherBitSet.copy());
      }
    });

    return new MultiLabelInformation(mergedMap);
  }
}

/**
 * Builder for constructing MultiLabelInformation during graph loading.
 *
 * This builder is designed for concurrent construction where multiple threads
 * can add node-to-label mappings simultaneously. It uses atomic growing bit sets
 * to handle unknown final capacity and thread-safe operations.
 */
export class MultiLabelInformationBuilder implements LabelInformation.Builder {
  private readonly expectedCapacity: number;
  private readonly labelInformation: Map<NodeLabel, HugeAtomicGrowingBitSet>;
  private readonly starNodeLabelMappings: NodeLabel[];

  private constructor(
    expectedCapacity: number,
    labelInformation: Map<NodeLabel, HugeAtomicGrowingBitSet>,
    starNodeLabelMappings: NodeLabel[]
  ) {
    this.expectedCapacity = expectedCapacity;
    this.labelInformation = labelInformation;
    this.starNodeLabelMappings = starNodeLabelMappings;
  }

  /**
   * Add a node ID to a specific label.
   *
   * This method is thread-safe and can be called concurrently from multiple threads.
   * The atomic growing bit set will automatically expand as needed.
   *
   * @param nodeLabel Label to add the node to
   * @param nodeId Node ID to add
   */
  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
    this.labelInformation
      .computeIfAbsent(
        nodeLabel,
        () => HugeAtomicGrowingBitSet.create(this.expectedCapacity)
      )
      .set(nodeId);
  }

  /**
   * Build the final MultiLabelInformation.
   *
   * This performs the critical transformation from original node IDs to mapped node IDs
   * and chooses the optimal LabelInformation implementation based on the data.
   *
   * @param nodeCount Final number of nodes
   * @param mappedIdFn Function to map original node IDs to internal node IDs
   * @returns Optimized LabelInformation implementation
   */
  build(nodeCount: number, mappedIdFn: (id: number) => number): LabelInformation {
    const labelInformation = this.buildInner(nodeCount, mappedIdFn);

    // Automatic optimization: choose the best implementation
    if (labelInformation.size === 0 && this.starNodeLabelMappings.length === 0) {
      // No labels at all - use AllNodesLabelInformation
      return LabelInformationBuilders.allNodes().build(nodeCount, mappedIdFn);
    } else if (labelInformation.size === 1 && this.starNodeLabelMappings.length === 0) {
      // Single label - use SingleLabelInformation for memory efficiency
      const singleLabel = Array.from(labelInformation.keys())[0];
      return LabelInformationBuilders.singleLabel(singleLabel).build(nodeCount, mappedIdFn);
    }

    // Add star projections (labels that include all nodes)
    this.starNodeLabelMappings.forEach(starLabel => {
      const bitSet = new BitSet(nodeCount);
      bitSet.set(0, nodeCount); // Set all bits
      labelInformation.set(starLabel, bitSet);
    });

    return new MultiLabelInformation(labelInformation);
  }

  /**
   * Internal build method that handles the ID mapping transformation.
   */
  private buildInner(nodeCount: number, mappedIdFn: (id: number) => number): Map<NodeLabel, BitSet> {
    const result = new Map<NodeLabel, BitSet>();

    this.labelInformation.forEach((importBitSet, nodeLabel) => {
      const internalBitSet = new BitSet(nodeCount);

      // Transform original node IDs to internal node IDs
      importBitSet.forEachSetBit(originalNodeId => {
        const mappedNodeId = mappedIdFn(originalNodeId);
        internalBitSet.set(mappedNodeId);
      });

      result.set(nodeLabel, internalBitSet);
    });

    return result;
  }

  /**
   * Get the current number of labels being tracked.
   */
  getLabelCount(): number {
    return this.labelInformation.size;
  }

  /**
   * Get statistics about the current build state.
   */
  getBuildStatistics(): BuilderStatistics {
    let totalNodes = 0;
    let estimatedMemoryBytes = 0;

    this.labelInformation.forEach(bitSet => {
      totalNodes += bitSet.cardinality();
      estimatedMemoryBytes += bitSet.estimateMemoryUsage?.() || 1024;
    });

    return {
      labelCount: this.labelInformation.size,
      totalNodeMemberships: totalNodes,
      estimatedMemoryUsageBytes: estimatedMemoryBytes,
      starLabelCount: this.starNodeLabelMappings.length
    };
  }

  /**
   * Create a new builder with default settings.
   */
  static of(expectedCapacity: number): MultiLabelInformationBuilder {
    return MultiLabelInformationBuilder.ofWithLabels(expectedCapacity, [], []);
  }

  /**
   * Create a new builder with pre-defined labels and star mappings.
   */
  static ofWithLabels(
    expectedCapacity: number,
    availableNodeLabels: NodeLabel[],
    starNodeLabelMappings: NodeLabel[]
  ): MultiLabelInformationBuilder {
    const nodeLabelBitSetMap = new Map<NodeLabel, HugeAtomicGrowingBitSet>();

    availableNodeLabels.forEach(nodeLabel => {
      nodeLabelBitSetMap.set(nodeLabel, HugeAtomicGrowingBitSet.create(expectedCapacity));
    });

    return new MultiLabelInformationBuilder(expectedCapacity, nodeLabelBitSetMap, starNodeLabelMappings);
  }

  /**
   * Create a builder specifically optimized for large-scale imports.
   */
  static forLargeScale(expectedCapacity: number, labelCount: number): MultiLabelInformationBuilder {
    const builder = MultiLabelInformationBuilder.of(expectedCapacity);

    // Pre-allocate capacity based on expected label count
    const adjustedCapacity = Math.max(expectedCapacity, expectedCapacity * labelCount / 10);

    return builder;
  }
}

// Type definitions for statistics and analysis

/**
 * Statistics for individual labels.
 */
export interface LabelStatistics {
  nodeCount: number;
  memoryUsageBytes: number;
  density: number; // Ratio of set bits to total bits
}

/**
 * Overall statistics for MultiLabelInformation.
 */
export interface MultiLabelStatistics {
  labelCount: number;
  totalNodeMemberships: number;
  memoryUsageBytes: number;
  averageNodesPerLabel: number;
  labelStatistics: Map<NodeLabel, LabelStatistics>;
}

/**
 * Statistics for the builder during construction.
 */
export interface BuilderStatistics {
  labelCount: number;
  totalNodeMemberships: number;
  estimatedMemoryUsageBytes: number;
  starLabelCount: number;
}

/**
 * Comparison of storage efficiency between different approaches.
 */
export interface StorageEfficiencyComparison {
  bitSetMemoryMB: number;
  setBasedMemoryMB: number;
  nodeArrayMemoryMB: number;
  efficiencyVsSetBased: number;
  efficiencyVsNodeArray: number;
  isOptimal: boolean;
}

// Helper methods for Map operations
declare global {
  interface Map<K, V> {
    computeIfAbsent(key: K, supplier: () => V): V;
  }
}

// Polyfill for computeIfAbsent
if (!Map.prototype.computeIfAbsent) {
  Map.prototype.computeIfAbsent = function<K, V>(this: Map<K, V>, key: K, supplier: () => V): V {
    if (!this.has(key)) {
      this.set(key, supplier());
    }
    return this.get(key)!;
  };
}
