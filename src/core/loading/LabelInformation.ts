/**
 *
 * Manages which nodes have which labels using efficient BitSet storage.
 */

import { NodeLabel } from '@/projection';
import { IdMap } from '@/api';
import { BitSet } from '@/collections';

export interface LabelInformation {
  isEmpty(): boolean;
  forEach(consumer: LabelInformationConsumer): void;
  filter(nodeLabels: NodeLabel[]): LabelInformation;
  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet;
  nodeCountForLabel(nodeLabel: NodeLabel): number;
  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean;
  availableNodeLabels(): Set<NodeLabel>;
  nodeLabelsForNodeId(nodeId: number): NodeLabel[];
  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void;
  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void;
  nodeIterator(labels: NodeLabel[], nodeCount: number): IterableIterator<number>;
  addLabel(nodeLabel: NodeLabel): void;
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void;
  isSingleLabel(): boolean;
  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation;
}

export interface LabelInformationConsumer {
  accept(nodeLabel: NodeLabel, bitSet: BitSet): boolean;
}

export interface LabelInformationBuilder {
  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void;
  build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation;
}

// Simple implementation using Map<string, Set<number>>
export class SimpleLabelInformation implements LabelInformation {
  private readonly labelToNodes = new Map<string, Set<number>>();

  isEmpty(): boolean {
    return this.labelToNodes.size === 0;
  }

  forEach(consumer: LabelInformationConsumer): void {
    for (const [labelName, nodeIds] of this.labelToNodes) {
      const bitSet = this.createBitSet(nodeIds);
      if (!consumer.accept(NodeLabel.of(labelName), bitSet)) {
        break;
      }
    }
  }

  filter(nodeLabels: NodeLabel[]): LabelInformation {
    const result = new SimpleLabelInformation();
    const labelNames = new Set(nodeLabels.map(l => l.name()));

    for (const [labelName, nodeIds] of this.labelToNodes) {
      if (labelNames.has(labelName)) {
        result.labelToNodes.set(labelName, new Set(nodeIds));
      }
    }

    return result;
  }

  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet {
    const allNodes = new Set<number>();

    for (const label of nodeLabels) {
      const nodeIds = this.labelToNodes.get(label.name());
      if (nodeIds) {
        nodeIds.forEach(id => allNodes.add(id));
      }
    }

    return this.createBitSet(allNodes, nodeCount);
  }

  nodeCountForLabel(nodeLabel: NodeLabel): number {
    return this.labelToNodes.get(nodeLabel.name())?.size || 0;
  }

  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    return this.labelToNodes.get(nodeLabel.name())?.has(nodeId) || false;
  }

  availableNodeLabels(): Set<NodeLabel> {
    return new Set(Array.from(this.labelToNodes.keys()).map(NodeLabel.of));
  }

  nodeLabelsForNodeId(nodeId: number): NodeLabel[] {
    const labels: NodeLabel[] = [];
    for (const [labelName, nodeIds] of this.labelToNodes) {
      if (nodeIds.has(nodeId)) {
        labels.push(NodeLabel.of(labelName));
      }
    }
    return labels;
  }

  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    for (const [labelName, nodeIds] of this.labelToNodes) {
      if (nodeIds.has(nodeId)) {
        consumer(NodeLabel.of(labelName));
      }
    }
  }

  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void {
    const available = new Set(this.labelToNodes.keys());
    const invalid = nodeLabels.filter(l => !available.has(l.name()));

    if (invalid.length > 0) {
      throw new Error(`Invalid labels: ${invalid.map(l => l.name).join(', ')}`);
    }
  }

  *nodeIterator(labels: NodeLabel[], nodeCount: number): IterableIterator<number> {
    const allNodes = new Set<number>();

    for (const label of labels) {
      const nodeIds = this.labelToNodes.get(label.name());
      if (nodeIds) {
        nodeIds.forEach(id => allNodes.add(id));
      }
    }

    for (const nodeId of Array.from(allNodes).sort((a, b) => a - b)) {
      yield nodeId;
    }
  }

  addLabel(nodeLabel: NodeLabel): void {
    if (!this.labelToNodes.has(nodeLabel.name())) {
      this.labelToNodes.set(nodeLabel.name(), new Set());
    }
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.addLabel(nodeLabel);
    this.labelToNodes.get(nodeLabel.name())!.add(nodeId);
  }

  isSingleLabel(): boolean {
    return this.labelToNodes.size <= 1;
  }

  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    this.addLabel(nodeLabelToMutate);
    return this;
  }

  private createBitSet(nodeIds: Set<number>, size?: number): BitSet {
    // TODO: Use real BitSet when available
    return new new BitSet(size);
  }
}

// Simple builder
export class SimpleLabelInformationBuilder implements LabelInformationBuilder {
  private readonly labelInfo = new SimpleLabelInformation();

  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
    this.labelInfo.addNodeIdToLabel(nodeId, nodeLabel);
  }

  build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation {
    const result = new SimpleLabelInformation();

    this.labelInfo.forEach((label, bitSet) => {
      result.addLabel(label);
      // Apply mapping function to node IDs
      for (let i = 0; i < nodeCount; i++) {
        if (bitSet.get(i)) {
          result.addNodeIdToLabel(mappedIdFn(i), label);
        }
      }
      return true;
    });

    return result;
  }
}

// Factory
export const LabelInformation = {
  builder(): LabelInformationBuilder {
    return new SimpleLabelInformationBuilder();
  }
};
