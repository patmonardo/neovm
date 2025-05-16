import { BitSet } from '../collections/BitSet';
import { NodeLabel } from '../NodeLabel';
import { BatchNodeIterable } from '../api/BatchNodeIterable';
import { IdMap } from '../api/IdMap';
import { HugeAtomicGrowingBitSet } from '../utils/paged/HugeAtomicGrowingBitSet';
import { LabelInformation } from './LabelInformation';
import { StringFormatting } from '../utils/StringFormatting';
import { ElementIdentifier } from '../ElementIdentifier'; // Assuming NodeLabel implements this or is compatible
import { PrimitiveLongIterator } from '../utils/PrimitiveIterators';
import { LabelInformationBuilders } from './LabelInformationBuilders';

export class MultiLabelInformation implements LabelInformation {
  private readonly labelInformationMap: Map<NodeLabel, BitSet>; // Renamed from labelInformation

  private constructor(labelInformationMap: Map<NodeLabel, BitSet>) {
    this.labelInformationMap = labelInformationMap;
  }

  public isEmpty(): boolean {
    return this.labelInformationMap.size === 0;
  }

  public forEach(consumer: LabelInformation.LabelInformationConsumer): void {
    for (const [nodeLabel, bitSet] of this.labelInformationMap.entries()) {
      if (!consumer.accept(nodeLabel, bitSet)) {
        return;
      }
    }
  }

  public filter(nodeLabels: NodeLabel[]): LabelInformation {
    const filteredMap = new Map<NodeLabel, BitSet>();
    for (const nodeLabel of nodeLabels) {
      const bitSet = this.labelInformationMap.get(nodeLabel);
      if (bitSet) { // Ensure the label exists in the current map
        filteredMap.set(nodeLabel, bitSet);
      }
    }
    return new MultiLabelInformation(filteredMap);
  }

  public unionBitSet(nodeLabels: NodeLabel[], nodeCount: number | number): BitSet {
    // Original assertion: assert labelInformation.keySet().containsAll(nodeLabels);
    // This can be checked explicitly if strictness is required:
    // for (const nl of nodeLabels) {
    //   if (!this.labelInformationMap.has(nl)) throw new Error(`Label ${nl} not found for union.`);
    // }

    const union = new BitSet(nodeCount);
    for (const label of nodeLabels) {
      const bitSet = this.labelInformationMap.get(label);
      if (bitSet) {
        union.union(bitSet);
      }
    }
    return union;
  }

  public nodeCountForLabel(nodeLabel: NodeLabel): number {
    if (this.availableNodeLabels().has(nodeLabel)) {
      const bitSet = this.labelInformationMap.get(nodeLabel);
      return BigInt(bitSet ? bitSet.cardinality() : 0);
    }
    throw new Error(
      StringFormatting.formatWithLocale("No label information for label %s present", nodeLabel.toString())
    );
  }

  public addLabel(nodeLabel: NodeLabel): void {
    if (!this.labelInformationMap.has(nodeLabel)) {
      this.labelInformationMap.set(nodeLabel, new BitSet());
    }
  }

  public addNodeIdToLabel(nodeId: number | number, nodeLabel: NodeLabel): void {
    let bitSet = this.labelInformationMap.get(nodeLabel);
    if (!bitSet) {
      bitSet = new BitSet();
      this.labelInformationMap.set(nodeLabel, bitSet);
    }
    bitSet.set(nodeId);
  }

  public isSingleLabel(): boolean {
    return false;
  }

  public toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    this.addLabel(nodeLabelToMutate);
    return this;
  }

  public hasLabel(nodeId: number | number, nodeLabel: NodeLabel): boolean {
    if (nodeLabel.equals(NodeLabel.ALL_NODES)) {
      return true; // Or check if nodeId is part of any label if ALL_NODES isn't explicitly stored
    }
    const bitSet = this.labelInformationMap.get(nodeLabel);
    return bitSet ? bitSet.get(nodeId) : false;
  }

  public availableNodeLabels(): Set<NodeLabel> {
    return new Set(this.labelInformationMap.keys());
  }

  public nodeLabelsForNodeId(nodeId: number | number): NodeLabel[] {
    const labels: NodeLabel[] = [];
    this.forEach((nodeLabel, bitSet) => {
      if (bitSet.get(nodeId)) {
        labels.push(nodeLabel);
      }
      return true; // Continue iteration
    });
    return labels;
  }

  public forEachNodeLabel(nodeId: number | number, consumer: IdMap.NodeLabelConsumer): void {
    this.forEach((nodeLabel, bitSet) => {
      if (bitSet.get(nodeId)) {
        return consumer.accept(nodeLabel);
      }
      return true; // Continue iteration
    });
  }

  public validateNodeLabelFilter(nodeLabels: NodeLabel[]): void {
    const available = this.availableNodeLabels();
    const invalidLabels: NodeLabel[] = nodeLabels.filter(label => !available.has(label));

    if (invalidLabels.length > 0) {
      throw new Error(StringFormatting.formatWithLocale(
        "Specified labels %s do not correspond to any of the node projections %s.",
        invalidLabels.map(l => l.toString()).join(', '),
        Array.from(available).map(l => l.toString()).join(', ')
      ));
    }
  }

  public nodeIterator(labels: NodeLabel[], nodeCount: number | number): PrimitiveLongIterator {
    if (labels.some(label => label.equals(NodeLabel.ALL_NODES))) {
      return new BatchNodeIterable.IdIterator(nodeCount);
    }
    return new BatchNodeIterable.BitSetIdIterator(this.unionBitSet(labels, nodeCount));
  }

  // --- Nested Builder Class ---
  public static Builder = class implements LabelInformation.Builder {
    private readonly expectedCapacity: number;
    private readonly labelInfoMap: Map<NodeLabel, HugeAtomicGrowingBitSet>; // Renamed
    private readonly starNodeLabelMappings: NodeLabel[];

    private constructor(
      expectedCapacity: number | number,
      labelInformation: Map<NodeLabel, HugeAtomicGrowingBitSet>,
      starNodeLabelMappings: NodeLabel[]
    ) {
      this.expectedCapacity = BigInt(expectedCapacity);
      this.labelInfoMap = labelInformation;
      this.starNodeLabelMappings = starNodeLabelMappings;
    }

    public static of(
      expectedCapacity: number | number,
      availableNodeLabels: NodeLabel[] = [], // Default to empty array
      starNodeLabelMappings: NodeLabel[] = [] // Default to empty array
    ): MultiLabelInformation.Builder {
      const capacity = BigInt(expectedCapacity);
      const nodeLabelBitSetMap = new Map<NodeLabel, HugeAtomicGrowingBitSet>();
      for (const nodeLabel of availableNodeLabels) {
        nodeLabelBitSetMap.set(nodeLabel, HugeAtomicGrowingBitSet.create(capacity));
      }
      // Java's Collectors.toConcurrentMap is not directly translated; using a standard Map.
      return new MultiLabelInformation.Builder(capacity, nodeLabelBitSetMap, starNodeLabelMappings);
    }

    public addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number | number): void {
      let bitSet = this.labelInfoMap.get(nodeLabel);
      if (!bitSet) {
        bitSet = HugeAtomicGrowingBitSet.create(this.expectedCapacity);
        this.labelInfoMap.set(nodeLabel, bitSet);
      }
      bitSet.set(nodeId);
    }

    private buildInner(nodeCount: number, mappedIdFn: (id: number) => number): Map<NodeLabel, BitSet> {
      const resultMap = new Map<NodeLabel, BitSet>();
      for (const [key, importBitSet] of this.labelInfoMap.entries()) {
        const internBitSet = new BitSet(nodeCount);
        importBitSet.forEachSetBit(neoId => internBitSet.set(mappedIdFn(BigInt(neoId))));
        resultMap.set(key, internBitSet);
      }
      return resultMap;
    }

    public build(nodeCountInput: number | number, mappedIdFn: (id: number | number) => number): LabelInformation {
      const nodeCount = BigInt(nodeCountInput);
      const finalMappedIdFn = (id: number | number) => mappedIdFn(BigInt(id)); // Ensure number

      const builtLabelInformation = this.buildInner(nodeCount, finalMappedIdFn);

      if (builtLabelInformation.size === 0 && this.starNodeLabelMappings.length === 0) {
        return LabelInformationBuilders.allNodes().build(nodeCount, finalMappedIdFn);
      } else if (builtLabelInformation.size === 1 && this.starNodeLabelMappings.length === 0) {
        const singleLabel = Array.from(builtLabelInformation.keys())[0];
        // The original Java code returns a SingleLabelInformation here.
        // We'll use the mock builder for now.
        return LabelInformationBuilders.singleLabel(singleLabel).build(nodeCount, finalMappedIdFn);
      }

      // set the whole range for '*' projections
      for (const starLabel of this.starNodeLabelMappings) {
        const bitSet = new BitSet(nodeCount);
        bitSet.setRange(0n, nodeCount); // Use 0n for number
        builtLabelInformation.set(starLabel, bitSet);
      }

      return new MultiLabelInformation(builtLabelInformation);
    }
  };
}
