import { NodeLabel } from '@/projection';
import { IdMap } from '@/api';
import { BitSet } from '@/collections';

/**
 * PATH DHARMA ANALYSIS - LabelInformation 🏷️
 *
 * LABEL MANAGEMENT SYSTEM - Efficient node-to-label mapping with BitSet optimization
 *
 * Manages which nodes have which labels using efficient storage strategies.
 * Provides both Set<number> for building and BitSet for querying performance.
 *
 * DESIGN PATTERN: Builder + Strategy
 * - Builder: Standardized construction of LabelInformation instances
 * - Strategy: Different storage strategies (Single vs Multi-label)
 *
 * PATH OPERATORS:
 * PathOp₁: Builder accumulation → Internal Map<NodeLabel, Set<number>>
 * PathOp₂: Build finalization → ID mapping + optimization
 * PathOp₃: Query operations → BitSet conversion for performance
 */

// ====================================================================
// CORE INTERFACES - Standard contracts
// ====================================================================

export interface LabelInformation {
  isEmpty(): boolean;
  forEach(consumer: LabelInformationConsumer): void;
  filter(nodeLabels: Set<NodeLabel>): LabelInformation;
  unionBitSet(nodeLabels: Set<NodeLabel>, nodeCount: number): BitSet;
  nodeCountForLabel(nodeLabel: NodeLabel): number;
  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean;
  availableNodeLabels(): Set<NodeLabel>;
  nodeLabelsForNodeId(nodeId: number): Set<NodeLabel>;
  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void;
  validateNodeLabelFilter(nodeLabels: Set<NodeLabel>): void;
  nodeIterator(labels: Set<NodeLabel>, nodeCount: number): IterableIterator<number>;

  // Mutation methods (for building)
  addLabel(nodeLabel: NodeLabel): void;
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void;
  isSingleLabel(): boolean;
  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation;
}

export interface LabelInformationConsumer {
  accept(nodeLabel: NodeLabel, bitSet: BitSet): boolean;
}

// ====================================================================
// STANDARDIZED BUILDER - One clean builder pattern
// ====================================================================

export class LabelInformationBuilder {
  private readonly labelToNodes = new Map<NodeLabel, Set<number>>();
  private builderType: 'auto' | 'single' | 'multi' = 'auto';
  public singleLabel?: NodeLabel;

  /** Create builder that auto-detects single vs multi-label. */
  static create(): LabelInformationBuilder {
    return new LabelInformationBuilder();
  }

  /** Create builder optimized for single label scenarios. */
  static forSingleLabel(label: NodeLabel): LabelInformationBuilder {
    const builder = new LabelInformationBuilder();
    builder.builderType = 'single';
    builder.singleLabel = label;
    builder.addLabel(label);
    return builder;
  }

  /** Create builder optimized for multi-label scenarios. */
  static forMultiLabel(expectedCapacity?: number): LabelInformationBuilder {
    const builder = new LabelInformationBuilder();
    builder.builderType = 'multi';
    return builder;
  }

  /** Create builder for all nodes (special case). */
  static forAllNodes(): LabelInformationBuilder {
    return LabelInformationBuilder.forSingleLabel(NodeLabel.ALL_NODES);
  }

  /** Add a label to the builder. */
  addLabel(nodeLabel: NodeLabel): LabelInformationBuilder {
    if (!this.labelToNodes.has(nodeLabel)) {
      this.labelToNodes.set(nodeLabel, new Set());
    }
    return this;
  }

  /** Add a node ID to a specific label. */
  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): LabelInformationBuilder {
    this.addLabel(nodeLabel);
    this.labelToNodes.get(nodeLabel)!.add(nodeId);
    return this;
  }

  /** Add multiple node IDs to a label. */
  addNodeIdsToLabel(nodeLabel: NodeLabel, nodeIds: Iterable<number>): LabelInformationBuilder {
    this.addLabel(nodeLabel);
    const labelSet = this.labelToNodes.get(nodeLabel)!;
    for (const nodeId of nodeIds) {
      labelSet.add(nodeId);
    }
    return this;
  }

  /** Build the final LabelInformation with optional ID mapping. */
  build(nodeCount?: number, mappedIdFn?: (nodeId: number) => number): LabelInformation {
    // Determine optimal implementation based on builder type and data
    const labelCount = this.labelToNodes.size;
    const shouldUseSingle = labelCount <= 1 || this.builderType === 'single';

    if (shouldUseSingle && labelCount === 1) {
      return this.buildSingleLabelInformation(nodeCount, mappedIdFn);
    } else {
      return this.buildMultiLabelInformation(nodeCount, mappedIdFn);
    }
  }

  private buildSingleLabelInformation(
    nodeCount?: number,
    mappedIdFn?: (nodeId: number) => number
  ): SingleLabelInformation {
    const [label, nodeIds] = Array.from(this.labelToNodes.entries())[0];

    if (mappedIdFn) {
      const mappedIds = new Set<number>();
      for (const nodeId of nodeIds) {
        mappedIds.add(mappedIdFn(nodeId));
      }
      return new SingleLabelInformation(label, mappedIds, nodeCount);
    } else {
      return new SingleLabelInformation(label, nodeIds, nodeCount);
    }
  }

  private buildMultiLabelInformation(
    nodeCount?: number,
    mappedIdFn?: (nodeId: number) => number
  ): MultiLabelInformation {
    const result = new MultiLabelInformation(nodeCount);

    for (const [label, nodeIds] of this.labelToNodes) {
      result.addLabel(label);

      if (mappedIdFn) {
        for (const nodeId of nodeIds) {
          result.addNodeIdToLabel(mappedIdFn(nodeId), label);
        }
      } else {
        for (const nodeId of nodeIds) {
          result.addNodeIdToLabel(nodeId, label);
        }
      }
    }

    return result;
  }
}

// ====================================================================
// OPTIMIZED IMPLEMENTATIONS - Strategy pattern for different scenarios
// ====================================================================

/** Optimized implementation for single label scenarios. */
export class SingleLabelInformation implements LabelInformation {
  private readonly label: NodeLabel;
  private readonly nodeIds: Set<number>;
  private readonly nodeCount?: number;

  constructor(label: NodeLabel, nodeIds: Set<number>, nodeCount?: number) {
    this.label = label;
    this.nodeIds = nodeIds;
    this.nodeCount = nodeCount;
  }

  isEmpty(): boolean {
    return this.nodeIds.size === 0;
  }

  forEach(consumer: LabelInformationConsumer): void {
    const bitSet = this.createBitSet(this.nodeIds, this.nodeCount);
    consumer.accept(this.label, bitSet);
  }

  filter(nodeLabels: Set<NodeLabel>): LabelInformation {
    if (nodeLabels.has(this.label)) {
      return new SingleLabelInformation(this.label, new Set(this.nodeIds), this.nodeCount);
    }
    return new MultiLabelInformation(this.nodeCount); // Empty multi-label
  }

  unionBitSet(nodeLabels: Set<NodeLabel>, nodeCount: number): BitSet {
    if (nodeLabels.has(this.label)) {
      return this.createBitSet(this.nodeIds, nodeCount);
    }
    return new BitSet(nodeCount); // Empty BitSet
  }

  nodeCountForLabel(nodeLabel: NodeLabel): number {
    return nodeLabel === this.label ? this.nodeIds.size : 0;
  }

  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    return nodeLabel === this.label && this.nodeIds.has(nodeId);
  }

  availableNodeLabels(): Set<NodeLabel> {
    return new Set([this.label]);
  }

  nodeLabelsForNodeId(nodeId: number): Set<NodeLabel> {
    return this.nodeIds.has(nodeId) ? new Set([this.label]) : new Set();
  }

  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    if (this.nodeIds.has(nodeId)) {
      consumer.accept(this.label);
    }
  }

  validateNodeLabelFilter(nodeLabels: Set<NodeLabel>): void {
    const invalid = Array.from(nodeLabels).filter(label => label !== this.label);
    if (invalid.length > 0) {
      const labelNames = invalid.map(label => label.name).join(', ');
      throw new Error(
        `Invalid node labels: ${labelNames}. Available labels: ${this.label.name}`
      );
    }
  }

  *nodeIterator(labels: Set<NodeLabel>, nodeCount: number): IterableIterator<number> {
    if (labels.has(this.label)) {
      for (const nodeId of Array.from(this.nodeIds).sort((a, b) => a - b)) {
        yield nodeId;
      }
    }
  }

  addLabel(nodeLabel: NodeLabel): void {
    if (nodeLabel !== this.label) {
      throw new Error('Cannot add different label to SingleLabelInformation. Use toMultiLabel() first.');
    }
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    if (nodeLabel !== this.label) {
      throw new Error('Cannot add node to different label in SingleLabelInformation.');
    }
    this.nodeIds.add(nodeId);
  }

  isSingleLabel(): boolean {
    return true;
  }

  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    const multi = new MultiLabelInformation(this.nodeCount);
    multi.addLabel(this.label);
    multi.addLabel(nodeLabelToMutate);

    for (const nodeId of this.nodeIds) {
      multi.addNodeIdToLabel(nodeId, this.label);
    }

    return multi;
  }

  private createBitSet(nodeIds: Set<number>, size?: number): BitSet {
    const bitSet = new BitSet(size);
    for (const nodeId of nodeIds) {
      bitSet.set(nodeId);
    }
    return bitSet;
  }
}

/** General implementation for multi-label scenarios. */
export class MultiLabelInformation implements LabelInformation {
  private readonly labelToNodes = new Map<NodeLabel, Set<number>>();
  private readonly nodeCount?: number;

  constructor(nodeCount?: number) {
    this.nodeCount = nodeCount;
  }

  isEmpty(): boolean {
    return this.labelToNodes.size === 0;
  }

  forEach(consumer: LabelInformationConsumer): void {
    for (const [label, nodeIds] of this.labelToNodes) {
      const bitSet = this.createBitSet(nodeIds, this.nodeCount);
      if (!consumer.accept(label, bitSet)) {
        break;
      }
    }
  }

  filter(nodeLabels: Set<NodeLabel>): LabelInformation {
    const result = new MultiLabelInformation(this.nodeCount);
    for (const [label, nodeIds] of this.labelToNodes) {
      if (nodeLabels.has(label)) {
        result.labelToNodes.set(label, new Set(nodeIds));
      }
    }
    return result;
  }

  unionBitSet(nodeLabels: Set<NodeLabel>, nodeCount: number): BitSet {
    const allNodes = new Set<number>();
    for (const label of nodeLabels) {
      const nodeIds = this.labelToNodes.get(label);
      if (nodeIds) {
        nodeIds.forEach(id => allNodes.add(id));
      }
    }
    return this.createBitSet(allNodes, nodeCount);
  }

  nodeCountForLabel(nodeLabel: NodeLabel): number {
    return this.labelToNodes.get(nodeLabel)?.size || 0;
  }

  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    return this.labelToNodes.get(nodeLabel)?.has(nodeId) || false;
  }

  availableNodeLabels(): Set<NodeLabel> {
    return new Set(this.labelToNodes.keys());
  }

  nodeLabelsForNodeId(nodeId: number): Set<NodeLabel> {
    const labels = new Set<NodeLabel>();
    for (const [label, nodeIds] of this.labelToNodes) {
      if (nodeIds.has(nodeId)) {
        labels.add(label);
      }
    }
    return labels;
  }

  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    for (const [label, nodeIds] of this.labelToNodes) {
      if (nodeIds.has(nodeId)) {
        if (!consumer.accept(label)) {
          break;
        }
      }
    }
  }

  validateNodeLabelFilter(nodeLabels: Set<NodeLabel>): void {
    const available = this.availableNodeLabels();
    const invalid = Array.from(nodeLabels).filter(label => !available.has(label));

    if (invalid.length > 0) {
      const labelNames = invalid.map(label => label.name).join(', ');
      const availableNames = Array.from(available).map(l => l.name).join(', ');
      throw new Error(
        `Invalid node labels: ${labelNames}. Available labels: ${availableNames}`
      );
    }
  }

  *nodeIterator(labels: Set<NodeLabel>, nodeCount: number): IterableIterator<number> {
    const allNodes = new Set<number>();
    for (const label of labels) {
      const nodeIds = this.labelToNodes.get(label);
      if (nodeIds) {
        nodeIds.forEach(id => allNodes.add(id));
      }
    }

    for (const nodeId of Array.from(allNodes).sort((a, b) => a - b)) {
      yield nodeId;
    }
  }

  addLabel(nodeLabel: NodeLabel): void {
    if (!this.labelToNodes.has(nodeLabel)) {
      this.labelToNodes.set(nodeLabel, new Set());
    }
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.addLabel(nodeLabel);
    this.labelToNodes.get(nodeLabel)!.add(nodeId);
  }

  isSingleLabel(): boolean {
    return this.labelToNodes.size <= 1;
  }

  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    this.addLabel(nodeLabelToMutate);
    return this;
  }

  private createBitSet(nodeIds: Set<number>, size?: number): BitSet {
    const bitSet = new BitSet(size);
    for (const nodeId of nodeIds) {
      bitSet.set(nodeId);
    }
    return bitSet;
  }
}

// ====================================================================
// CLEAN FACTORY METHODS - Single entry point
// ====================================================================

export const LabelInformation = {
  /** Create builder for auto-detecting optimal storage strategy. */
  builder(): LabelInformationBuilder {
    return LabelInformationBuilder.create();
  },

  /** Create builder optimized for single label scenarios. */
  singleLabel(label: NodeLabel): LabelInformationBuilder {
    return LabelInformationBuilder.forSingleLabel(label);
  },

  /** Create builder optimized for multi-label scenarios. */
  multiLabel(expectedCapacity?: number): LabelInformationBuilder {
    return LabelInformationBuilder.forMultiLabel(expectedCapacity);
  },

  /** Create builder for all nodes (special case). */
  allNodes(): LabelInformationBuilder {
    return LabelInformationBuilder.forAllNodes();
  }
};
