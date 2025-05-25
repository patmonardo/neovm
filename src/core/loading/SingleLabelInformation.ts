import { NodeLabel } from '@/api';
import { IdMap } from '@/api/graph';
import { BitSet } from '@/core/utils';
import { BatchNodeIterable } from '@/api/graph';
import { LabelInformation, LabelInformationConsumer } from './LabelInformation';
import { LabelInformationBuilders } from './LabelInformationBuilders';
import { StringJoining, StringFormatting } from '@/utils';

/**
 * Optimized label information implementation for graphs with a single node label.
 *
 * This implementation provides significant memory and performance benefits when all nodes
 * in the graph share the same label. Instead of maintaining BitSets for each label,
 * it simply stores the single label and assumes all nodes have that label.
 *
 * Key optimizations:
 * - No BitSet storage required (100% memory savings vs multi-label)
 * - O(1) label lookup for any node
 * - Simplified iteration and filtering logic
 * - Reduced complexity for single-label graphs
 */
export class SingleLabelInformation implements LabelInformation {
  private readonly nodeCount: number;
  private readonly label: NodeLabel;
  private readonly labelSet: Set<NodeLabel>;

  private constructor(nodeCount: number, label: NodeLabel) {
    this.nodeCount = nodeCount;
    this.label = label;
    this.labelSet = new Set([label]);
  }

  isEmpty(): boolean {
    // Single label is never empty - all nodes have the label
    return false;
  }

  forEach(consumer: LabelInformationConsumer): void {
    // Single label information doesn't maintain BitSets
    throw new Error('There are no BitSets in single label information');
  }

  filter(nodeLabels: NodeLabel[]): LabelInformation {
    // Filtering a single label returns itself if the label matches
    if (nodeLabels.length === 0) {
      return this;
    }

    // Check if our single label is in the filter
    const hasOurLabel = nodeLabels.some(label => label.equals?.(this.label) || label === this.label);

    if (hasOurLabel) {
      return this; // Return self if our label is requested
    } else {
      // Return empty label information if our label is not requested
      return LabelInformationBuilders.empty().build(0, (id) => id);
    }
  }

  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet {
    // Check if our label is in the requested labels
    const hasOurLabel = nodeLabels.some(label =>
      label.equals?.(this.label) ||
      label === this.label ||
      label === NodeLabel.ALL_NODES
    );

    if (!hasOurLabel) {
      throw new Error('Union with single label information requires the label to be present in the request');
    }

    // Create a BitSet with all bits set (all nodes have this label)
    const bitSet = new BitSet(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      bitSet.set(i);
    }
    return bitSet;
  }

  nodeCountForLabel(nodeLabel: NodeLabel): number {
    if (nodeLabel.equals?.(this.label) || nodeLabel === this.label) {
      return this.nodeCount;
    }

    throw new Error(
      StringFormatting.formatWithLocale('No label information for label %s present', nodeLabel)
    );
  }

  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    // In single label information, all nodes have the single label
    return nodeLabel.equals?.(this.label) || nodeLabel === this.label;
  }

  availableNodeLabels(): Set<NodeLabel> {
    return this.labelSet;
  }

  nodeLabelsForNodeId(nodeId: number): NodeLabel[] {
    // All nodes have the single label
    return [this.label];
  }

  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    // All nodes have the single label
    consumer.accept(this.label);
  }

  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void {
    const invalidLabels = nodeLabels.filter(filterLabel =>
      !filterLabel.equals?.(this.label) &&
      filterLabel !== this.label &&
      filterLabel !== NodeLabel.ALL_NODES
    );

    if (invalidLabels.length > 0) {
      throw new Error(
        StringFormatting.formatWithLocale(
          'Specified labels %s do not correspond to any of the node projections %s.',
          invalidLabels,
          Array.from(this.availableNodeLabels())
        )
      );
    }
  }

  nodeIterator(labels: NodeLabel[], nodeCount: number): Iterator<number> {
    const hasOurLabel = labels.length === 1 && (
      labels[0].equals?.(this.label) ||
      labels[0] === this.label ||
      labels[0] === NodeLabel.ALL_NODES
    );

    if (hasOurLabel) {
      return new BatchNodeIterable.IdIterator(nodeCount);
    } else {
      throw new Error(
        StringFormatting.formatWithLocale(
          'Unknown labels: %s',
          StringJoining.join(labels.map(label => label.name))
        )
      );
    }
  }

  addLabel(nodeLabel: NodeLabel): void {
    throw new Error('Adding labels is not supported in SingleLabelInformation');
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    throw new Error('Adding node id to label is not supported in SingleLabelInformation');
  }

  isSingleLabel(): boolean {
    return true;
  }

  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    return LabelInformationBuilders
      .multiLabelWithCapacityAndLabelInformation(
        this.nodeCount,
        [nodeLabelToMutate],
        this.availableNodeLabels()
      )
      .build(this.nodeCount, (id) => id);
  }

  /**
   * Get the single label for this information.
   */
  getSingleLabel(): NodeLabel {
    return this.label;
  }

  /**
   * Get statistics about this single label information.
   */
  getStats(): SingleLabelStats {
    return {
      label: this.label,
      nodeCount: this.nodeCount,
      memoryUsageBytes: this.estimateMemoryUsage(),
      isOptimal: true
    };
  }

  /**
   * Compare memory usage with equivalent multi-label implementation.
   */
  compareWithMultiLabel(): MemoryComparisonResult {
    // SingleLabel: just stores one label reference + node count
    const singleLabelMemory = 32; // Object overhead + references

    // MultiLabel would need: BitSet + HashMap + label references
    const multiLabelMemory = Math.ceil(this.nodeCount / 8) + 64; // BitSet + overhead

    return {
      singleLabelMemoryBytes: singleLabelMemory,
      multiLabelMemoryBytes: multiLabelMemory,
      memoryReduction: multiLabelMemory - singleLabelMemory,
      efficiencyGain: ((multiLabelMemory - singleLabelMemory) / multiLabelMemory) * 100
    };
  }

  private estimateMemoryUsage(): number {
    // Very minimal memory usage: just object overhead + label reference
    return 32;
  }

  /**
   * Create a new SingleLabelInformation instance.
   */
  static of(nodeCount: number, label: NodeLabel): SingleLabelInformation {
    return new SingleLabelInformation(nodeCount, label);
  }
}

/**
 * Builder for SingleLabelInformation.
 *
 * This builder is used when the graph loading process determines that all
 * nodes will have the same label, allowing for the optimization to single
 * label information.
 */
export class SingleLabelInformationBuilder implements LabelInformation.Builder {
  private readonly label: NodeLabel;

  constructor(label: NodeLabel) {
    this.label = label;
  }

  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
    throw new Error('This builder does not support adding labels');
  }

  build(nodeCount: number, mappedIdFn: (id: number) => number): LabelInformation {
    return new SingleLabelInformation(nodeCount, this.label);
  }

  /**
   * Get the label this builder will create information for.
   */
  getLabel(): NodeLabel {
    return this.label;
  }

  /**
   * Check if this builder can handle multiple labels.
   */
  isMultiLabel(): boolean {
    return false;
  }
}

/**
 * Statistics about single label information.
 */
interface SingleLabelStats {
  label: NodeLabel;
  nodeCount: number;
  memoryUsageBytes: number;
  isOptimal: boolean;
}

/**
 * Comparison result between single and multi-label memory usage.
 */
interface MemoryComparisonResult {
  singleLabelMemoryBytes: number;
  multiLabelMemoryBytes: number;
  memoryReduction: number;
  efficiencyGain: number;
}
