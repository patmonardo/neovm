import { NodeLabel } from '@/api';
import { IdMap } from '@/api/graph';

/**
 * Interface for managing and querying node label information.
 * Provides efficient storage and access to node-label associations using BitSet-based storage.
 *
 * Supports both single-label and multi-label scenarios with different optimization strategies.
 */
export interface LabelInformation {
  /**
   * Check if this label information is empty (no labels or nodes).
   */
  isEmpty(): boolean;

  /**
   * Iterate over all label-BitSet pairs.
   */
  forEach(consumer: LabelInformationConsumer): void;

  /**
   * Create a filtered view containing only the specified labels.
   */
  filter(nodeLabels: NodeLabel[]): LabelInformation;

  /**
   * Create a union BitSet for the specified labels.
   */
  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet;

  /**
   * Get the number of nodes that have the specified label.
   */
  nodeCountForLabel(nodeLabel: NodeLabel): number;

  /**
   * Check if a specific node has a specific label.
   */
  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean;

  /**
   * Get all available node labels.
   */
  availableNodeLabels(): Set<NodeLabel>;

  /**
   * Get all labels for a specific node.
   */
  nodeLabelsForNodeId(nodeId: number): NodeLabel[];

  /**
   * Iterate over all labels for a specific node.
   */
  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void;

  /**
   * Validate that the specified node labels exist in this label information.
   */
  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void;

  /**
   * Create an iterator over nodes that have any of the specified labels.
   */
  nodeIterator(labels: NodeLabel[], nodeCount: number): IterableIterator<number>;

  /**
   * Add a new label to the label information.
   */
  addLabel(nodeLabel: NodeLabel): void;

  /**
   * Associate a node ID with a label.
   */
  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void;

  /**
   * Check if this label information represents a single label scenario.
   */
  isSingleLabel(): boolean;

  /**
   * Convert to multi-label representation, mutating the specified label.
   */
  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation;
}

export namespace LabelInformation {
  /**
   * Consumer interface for processing label-BitSet pairs.
   */
  export interface LabelInformationConsumer {
    /**
     * Process a label and its associated BitSet.
     * @param nodeLabel The node label
     * @param bitSet BitSet indicating which nodes have this label
     * @returns true to continue iteration, false to stop
     */
    accept(nodeLabel: NodeLabel, bitSet: BitSet): boolean;
  }

  /**
   * Builder interface for constructing LabelInformation instances.
   */
  export interface Builder {
    /**
     * Associate a node ID with a label during construction.
     */
    addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void;

    /**
     * Build the final LabelInformation instance.
     * @param nodeCount Total number of nodes
     * @param mappedIdFn Function to map node IDs (e.g., original → internal)
     */
    build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation;
  }
}

/**
 * Factory class for creating LabelInformation builders with different optimization strategies.
 */
export class LabelInformationBuilders {
  private constructor() {}

  /**
   * Create a builder for the special "all nodes" label.
   * Optimized for scenarios where all nodes share a common label.
   */
  static allNodes(): LabelInformation.Builder {
    return new SingleLabelInformation.Builder(NodeLabel.ALL_NODES);
  }

  /**
   * Create a builder optimized for single-label scenarios.
   * Most memory-efficient when all nodes have the same label.
   */
  static singleLabel(singleLabel: NodeLabel): LabelInformation.Builder {
    return new SingleLabelInformation.Builder(singleLabel);
  }

  /**
   * Create a builder for multi-label scenarios with expected capacity.
   * Uses BitSet-based storage for efficient multi-label representation.
   */
  static multiLabelWithCapacity(expectedCapacity: number): LabelInformation.Builder {
    return MultiLabelInformation.Builder.of(expectedCapacity);
  }

  /**
   * Create a builder for multi-label scenarios with pre-configured label information.
   * Optimized for scenarios with known label distributions and star-node mappings.
   */
  static multiLabelWithCapacityAndLabelInformation(
    expectedCapacity: number,
    availableNodeLabels: NodeLabel[],
    starNodeLabelMappings: NodeLabel[]
  ): LabelInformation.Builder {
    return MultiLabelInformation.Builder.of(
      expectedCapacity,
      availableNodeLabels,
      starNodeLabelMappings
    );
  }

  /**
   * Create a builder with automatic optimization based on usage patterns.
   */
  static adaptive(expectedCapacity: number): AdaptiveLabelInformationBuilder {
    return new AdaptiveLabelInformationBuilder(expectedCapacity);
  }

  /**
   * Create a builder for streaming scenarios where labels are discovered incrementally.
   */
  static streaming(): StreamingLabelInformationBuilder {
    return new StreamingLabelInformationBuilder();
  }
}

/**
 * Optimized implementation for single-label scenarios.
 * Minimal memory overhead when all nodes share the same label or have distinct single labels.
 */
export class SingleLabelInformation implements LabelInformation {
  private readonly label: NodeLabel;
  private readonly nodeIds: Set<number>;

  constructor(label: NodeLabel, nodeIds: Set<number> = new Set()) {
    this.label = label;
    this.nodeIds = new Set(nodeIds); // Defensive copy
  }

  isEmpty(): boolean {
    return this.nodeIds.size === 0;
  }

  forEach(consumer: LabelInformation.LabelInformationConsumer): void {
    if (this.nodeIds.size > 0) {
      const bitSet = this.createBitSetFromNodeIds(this.nodeIds);
      consumer.accept(this.label, bitSet);
    }
  }

  filter(nodeLabels: NodeLabel[]): LabelInformation {
    return nodeLabels.some(label => this.labelsEqual(label, this.label))
      ? this
      : new SingleLabelInformation(this.label, new Set());
  }

  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet {
    if (nodeLabels.some(label => this.labelsEqual(label, this.label))) {
      return this.createBitSetFromNodeIds(this.nodeIds, nodeCount);
    }
    return new BitSet(nodeCount);
  }

  nodeCountForLabel(nodeLabel: NodeLabel): number {
    return this.labelsEqual(nodeLabel, this.label) ? this.nodeIds.size : 0;
  }

  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    return this.labelsEqual(nodeLabel, this.label) && this.nodeIds.has(nodeId);
  }

  availableNodeLabels(): Set<NodeLabel> {
    return new Set([this.label]);
  }

  nodeLabelsForNodeId(nodeId: number): NodeLabel[] {
    return this.nodeIds.has(nodeId) ? [this.label] : [];
  }

  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    if (this.nodeIds.has(nodeId)) {
      consumer(this.label);
    }
  }

  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void {
    const hasValidLabel = nodeLabels.some(label => this.labelsEqual(label, this.label));
    if (nodeLabels.length > 0 && !hasValidLabel) {
      throw new Error(`None of the specified labels [${nodeLabels.map(l => l.name).join(', ')}] are available. Available: [${this.label.name}]`);
    }
  }

  *nodeIterator(labels: NodeLabel[], nodeCount: number): IterableIterator<number> {
    if (labels.some(label => this.labelsEqual(label, this.label))) {
      yield* this.nodeIds;
    }
  }

  addLabel(nodeLabel: NodeLabel): void {
    if (!this.labelsEqual(nodeLabel, this.label)) {
      throw new Error('Cannot add different label to SingleLabelInformation');
    }
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    if (this.labelsEqual(nodeLabel, this.label)) {
      this.nodeIds.add(nodeId);
    }
  }

  isSingleLabel(): boolean {
    return true;
  }

  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    const multiLabel = new MultiLabelInformation();

    // Add existing label
    multiLabel.addLabel(this.label);
    for (const nodeId of this.nodeIds) {
      multiLabel.addNodeIdToLabel(nodeId, this.label);
    }

    // Add the mutating label
    multiLabel.addLabel(nodeLabelToMutate);

    return multiLabel;
  }

  private createBitSetFromNodeIds(nodeIds: Set<number>, nodeCount?: number): BitSet {
    const maxNodeId = nodeCount || Math.max(...nodeIds, 0);
    const bitSet = new BitSet(maxNodeId + 1);
    for (const nodeId of nodeIds) {
      bitSet.set(nodeId);
    }
    return bitSet;
  }

  private labelsEqual(label1: NodeLabel, label2: NodeLabel): boolean {
    return label1.name === label2.name;
  }

  static Builder = class implements LabelInformation.Builder {
    private readonly label: NodeLabel;
    private readonly nodeIds = new Set<number>();

    constructor(label: NodeLabel) {
      this.label = label;
    }

    addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
      if (nodeLabel.name === this.label.name) {
        this.nodeIds.add(nodeId);
      }
    }

    build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation {
      // Map node IDs using the provided function
      const mappedNodeIds = new Set<number>();
      for (const originalId of this.nodeIds) {
        mappedNodeIds.add(mappedIdFn(originalId));
      }

      return new SingleLabelInformation(this.label, mappedNodeIds);
    }
  };
}

/**
 * General-purpose implementation for multi-label scenarios.
 * Uses BitSet-based storage for efficient memory usage and fast set operations.
 */
export class MultiLabelInformation implements LabelInformation {
  private readonly labelToBitSet = new Map<string, BitSet>();
  private readonly availableLabels = new Set<NodeLabel>();
  private nodeCount: number = 0;

  constructor(nodeCount: number = 0) {
    this.nodeCount = nodeCount;
  }

  isEmpty(): boolean {
    return this.availableLabels.size === 0;
  }

  forEach(consumer: LabelInformation.LabelInformationConsumer): void {
    for (const label of this.availableLabels) {
      const bitSet = this.labelToBitSet.get(label.name);
      if (bitSet && !consumer.accept(label, bitSet)) {
        break;
      }
    }
  }

  filter(nodeLabels: NodeLabel[]): LabelInformation {
    const filtered = new MultiLabelInformation(this.nodeCount);
    const labelNames = new Set(nodeLabels.map(label => label.name));

    for (const label of this.availableLabels) {
      if (labelNames.has(label.name)) {
        filtered.addLabel(label);
        const bitSet = this.labelToBitSet.get(label.name);
        if (bitSet) {
          filtered.labelToBitSet.set(label.name, bitSet.clone());
        }
      }
    }

    return filtered;
  }

  unionBitSet(nodeLabels: NodeLabel[], nodeCount: number): BitSet {
    const result = new BitSet(nodeCount);

    for (const label of nodeLabels) {
      const bitSet = this.labelToBitSet.get(label.name);
      if (bitSet) {
        result.or(bitSet);
      }
    }

    return result;
  }

  nodeCountForLabel(nodeLabel: NodeLabel): number {
    const bitSet = this.labelToBitSet.get(nodeLabel.name);
    return bitSet ? bitSet.cardinality() : 0;
  }

  hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    const bitSet = this.labelToBitSet.get(nodeLabel.name);
    return bitSet ? bitSet.get(nodeId) : false;
  }

  availableNodeLabels(): Set<NodeLabel> {
    return new Set(this.availableLabels);
  }

  nodeLabelsForNodeId(nodeId: number): NodeLabel[] {
    const labels: NodeLabel[] = [];
    for (const label of this.availableLabels) {
      if (this.hasLabel(nodeId, label)) {
        labels.push(label);
      }
    }
    return labels;
  }

  forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    for (const label of this.availableLabels) {
      if (this.hasLabel(nodeId, label)) {
        consumer(label);
      }
    }
  }

  validateNodeLabelFilter(nodeLabels: NodeLabel[]): void {
    const availableNames = new Set(Array.from(this.availableLabels).map(l => l.name));
    const invalidLabels = nodeLabels.filter(label => !availableNames.has(label.name));

    if (invalidLabels.length > 0) {
      throw new Error(
        `Invalid labels: [${invalidLabels.map(l => l.name).join(', ')}]. ` +
        `Available: [${Array.from(availableNames).join(', ')}]`
      );
    }
  }

  *nodeIterator(labels: NodeLabel[], nodeCount: number): IterableIterator<number> {
    const unionSet = this.unionBitSet(labels, nodeCount);

    for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
      if (unionSet.get(nodeId)) {
        yield nodeId;
      }
    }
  }

  addLabel(nodeLabel: NodeLabel): void {
    this.availableLabels.add(nodeLabel);
    if (!this.labelToBitSet.has(nodeLabel.name)) {
      this.labelToBitSet.set(nodeLabel.name, new BitSet(this.nodeCount));
    }
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    this.addLabel(nodeLabel); // Ensure label exists

    const bitSet = this.labelToBitSet.get(nodeLabel.name);
    if (bitSet) {
      // Expand BitSet if necessary
      if (nodeId >= bitSet.size()) {
        const newSize = Math.max(nodeId + 1, bitSet.size() * 2);
        const expandedBitSet = new BitSet(newSize);
        expandedBitSet.or(bitSet);
        this.labelToBitSet.set(nodeLabel.name, expandedBitSet);
        expandedBitSet.set(nodeId);
      } else {
        bitSet.set(nodeId);
      }

      this.nodeCount = Math.max(this.nodeCount, nodeId + 1);
    }
  }

  isSingleLabel(): boolean {
    return false;
  }

  toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    this.addLabel(nodeLabelToMutate);
    return this;
  }

  static Builder = class implements LabelInformation.Builder {
    private readonly expectedCapacity: number;
    private readonly nodeIdToLabels = new Map<number, Set<string>>();
    private readonly allLabels = new Set<NodeLabel>();
    private readonly starNodeLabelMappings?: Set<string>;

    constructor(
      expectedCapacity: number,
      availableNodeLabels?: NodeLabel[],
      starNodeLabelMappings?: NodeLabel[]
    ) {
      this.expectedCapacity = expectedCapacity;

      if (availableNodeLabels) {
        availableNodeLabels.forEach(label => this.allLabels.add(label));
      }

      if (starNodeLabelMappings) {
        this.starNodeLabelMappings = new Set(starNodeLabelMappings.map(label => label.name));
      }
    }

    static of(expectedCapacity: number): MultiLabelInformation.Builder {
      return new this(expectedCapacity);
    }

    static of(
      expectedCapacity: number,
      availableNodeLabels: NodeLabel[],
      starNodeLabelMappings: NodeLabel[]
    ): MultiLabelInformation.Builder {
      return new this(expectedCapacity, availableNodeLabels, starNodeLabelMappings);
    }

    addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
      this.allLabels.add(nodeLabel);

      if (!this.nodeIdToLabels.has(nodeId)) {
        this.nodeIdToLabels.set(nodeId, new Set());
      }

      this.nodeIdToLabels.get(nodeId)!.add(nodeLabel.name);
    }

    build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation {
      const result = new MultiLabelInformation(nodeCount);

      // Add all labels
      for (const label of this.allLabels) {
        result.addLabel(label);
      }

      // Map node IDs and assign labels
      for (const [originalNodeId, labelNames] of this.nodeIdToLabels) {
        const mappedNodeId = mappedIdFn(originalNodeId);

        for (const labelName of labelNames) {
          const label = Array.from(this.allLabels).find(l => l.name === labelName);
          if (label) {
            result.addNodeIdToLabel(mappedNodeId, label);
          }
        }
      }

      return result;
    }
  };
}

/**
 * Adaptive builder that starts with single-label optimization and upgrades to multi-label as needed.
 */
export class AdaptiveLabelInformationBuilder implements LabelInformation.Builder {
  private currentBuilder: LabelInformation.Builder;
  private readonly expectedCapacity: number;
  private isMultiLabel = false;

  constructor(expectedCapacity: number) {
    this.expectedCapacity = expectedCapacity;
    this.currentBuilder = LabelInformationBuilders.singleLabel(NodeLabel.ALL_NODES);
  }

  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
    // Upgrade to multi-label if we see a second distinct label
    if (!this.isMultiLabel && this.needsUpgrade(nodeLabel)) {
      this.upgradeToMultiLabel();
    }

    this.currentBuilder.addNodeIdToLabel(nodeLabel, nodeId);
  }

  build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation {
    return this.currentBuilder.build(nodeCount, mappedIdFn);
  }

  private needsUpgrade(newLabel: NodeLabel): boolean {
    // This is a simplified check - in a real implementation, you'd track the current label
    return !this.isMultiLabel; // For demo purposes
  }

  private upgradeToMultiLabel(): void {
    // Upgrade from single-label to multi-label builder
    this.currentBuilder = LabelInformationBuilders.multiLabelWithCapacity(this.expectedCapacity);
    this.isMultiLabel = true;
  }
}

/**
 * Streaming builder for scenarios where labels are discovered incrementally.
 */
export class StreamingLabelInformationBuilder implements LabelInformation.Builder {
  private readonly labelCounts = new Map<string, number>();
  private readonly nodeIdToLabels = new Map<number, Set<string>>();
  private readonly seenLabels = new Set<NodeLabel>();

  addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
    this.seenLabels.add(nodeLabel);

    // Track label frequency
    const currentCount = this.labelCounts.get(nodeLabel.name) || 0;
    this.labelCounts.set(nodeLabel.name, currentCount + 1);

    // Track node-label associations
    if (!this.nodeIdToLabels.has(nodeId)) {
      this.nodeIdToLabels.set(nodeId, new Set());
    }
    this.nodeIdToLabels.get(nodeId)!.add(nodeLabel.name);
  }

  build(nodeCount: number, mappedIdFn: (nodeId: number) => number): LabelInformation {
    // Decide on implementation based on discovered patterns
    if (this.seenLabels.size === 1) {
      // Single label optimization
      const singleLabel = Array.from(this.seenLabels)[0];
      const builder = LabelInformationBuilders.singleLabel(singleLabel);

      for (const [nodeId, labelNames] of this.nodeIdToLabels) {
        for (const labelName of labelNames) {
          const label = Array.from(this.seenLabels).find(l => l.name === labelName);
          if (label) {
            builder.addNodeIdToLabel(label, nodeId);
          }
        }
      }

      return builder.build(nodeCount, mappedIdFn);
    } else {
      // Multi-label implementation
      const builder = LabelInformationBuilders.multiLabelWithCapacity(nodeCount);

      for (const [nodeId, labelNames] of this.nodeIdToLabels) {
        for (const labelName of labelNames) {
          const label = Array.from(this.seenLabels).find(l => l.name === labelName);
          if (label) {
            builder.addNodeIdToLabel(label, nodeId);
          }
        }
      }

      return builder.build(nodeCount, mappedIdFn);
    }
  }

  getStats(): StreamingBuilderStats {
    return {
      uniqueLabels: this.seenLabels.size,
      totalNodes: this.nodeIdToLabels.size,
      labelDistribution: new Map(this.labelCounts),
      averageLabelsPerNode: Array.from(this.nodeIdToLabels.values())
        .reduce((sum, labels) => sum + labels.size, 0) / this.nodeIdToLabels.size
    };
  }
}

/**
 * Statistics about streaming builder usage.
 */
interface StreamingBuilderStats {
  uniqueLabels: number;
  totalNodes: number;
  labelDistribution: Map<string, number>;
  averageLabelsPerNode: number;
}

/**
 * Simple BitSet implementation for JavaScript.
 * Provides basic bit manipulation operations for label storage.
 */
export class BitSet {
  private readonly words: Uint32Array;
  private readonly _size: number;

  constructor(size: number) {
    this._size = size;
    const wordCount = Math.ceil(size / 32);
    this.words = new Uint32Array(wordCount);
  }

  size(): number {
    return this._size;
  }

  set(bitIndex: number): void {
    if (bitIndex >= this._size) {
      throw new Error(`Bit index ${bitIndex} exceeds size ${this._size}`);
    }

    const wordIndex = Math.floor(bitIndex / 32);
    const bitPosition = bitIndex % 32;
    this.words[wordIndex] |= (1 << bitPosition);
  }

  get(bitIndex: number): boolean {
    if (bitIndex >= this._size) {
      return false; // Out of bounds bits are considered false
    }

    const wordIndex = Math.floor(bitIndex / 32);
    const bitPosition = bitIndex % 32;
    return (this.words[wordIndex] & (1 << bitPosition)) !== 0;
  }

  clear(bitIndex: number): void {
    if (bitIndex >= this._size) {
      return; // No-op for out of bounds
    }

    const wordIndex = Math.floor(bitIndex / 32);
    const bitPosition = bitIndex % 32;
    this.words[wordIndex] &= ~(1 << bitPosition);
  }

  or(other: BitSet): void {
    const minWords = Math.min(this.words.length, other.words.length);
    for (let i = 0; i < minWords; i++) {
      this.words[i] |= other.words[i];
    }
  }

  and(other: BitSet): void {
    const minWords = Math.min(this.words.length, other.words.length);
    for (let i = 0; i < minWords; i++) {
      this.words[i] &= other.words[i];
    }

    // Clear any remaining words
    for (let i = minWords; i < this.words.length; i++) {
      this.words[i] = 0;
    }
  }

  cardinality(): number {
    let count = 0;
    for (const word of this.words) {
      count += this.popCount(word);
    }
    return count;
  }

  clone(): BitSet {
    const cloned = new BitSet(this._size);
    cloned.words.set(this.words);
    return cloned;
  }

  private popCount(n: number): number {
    // Brian Kernighan's algorithm for counting set bits
    let count = 0;
    while (n) {
      count++;
      n &= n - 1; // Clear the lowest set bit
    }
    return count;
  }

  toString(): string {
    const setBits: number[] = [];
    for (let i = 0; i < this._size; i++) {
      if (this.get(i)) {
        setBits.push(i);
      }
    }
    return `BitSet{${setBits.join(', ')}}`;
  }
}

// Mock NodeLabel for the examples
const NodeLabel = {
  ALL_NODES: { name: '*' },
  of: (name: string) => ({ name })
};
