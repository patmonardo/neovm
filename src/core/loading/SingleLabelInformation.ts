import { NodeLabel } from '../../NodeLabel';
import { LabelInformation, LabelInformationConsumer } from './LabelInformation';
import { IdMap } from '../../api/IdMap';
import { BitSet } from '../../utils/BitSet';
import { BatchNodeIterable } from '../../api/BatchNodeIterable';
import { StringJoining } from '../../utils/StringJoining';
import { StringFormatting } from '../../utils/StringFormatting';
import { PrimitiveIterator } from '../../utils/PrimitiveIterator';
import { LabelInformationBuilders } from './LabelInformationBuilders';
import { LongUnaryOperator, identityLongUnaryOperator } from '../../utils/functional/LongUnaryOperator';

export class SingleLabelInformation implements LabelInformation {
  private readonly nodeCount: number;
  private readonly label: NodeLabel;
  private readonly labelSet: ReadonlySet<NodeLabel>;

  private constructor(nodeCount: number, label: NodeLabel) {
    this.nodeCount = nodeCount;
    this.label = label;
    this.labelSet = new Set([label]);
  }

  public isEmpty(): boolean {
    // In GDS, "empty" LabelInformation usually means no BitSets are stored,
    // not that there are no labels. SingleLabelInformation is considered "empty"
    // in this context because it doesn't manage complex BitSet structures.
    return true;
  }

  public forEach(consumer: LabelInformationConsumer): void {
    throw new Error("There are not BitSets in empty label information");
  }

  public filter(nodeLabels: ReadonlyArray<NodeLabel>): LabelInformation {
    // Filtering a SingleLabelInformation doesn't change its nature if the label is present.
    // If the label isn't in nodeLabels, it might imply an empty result,
    // but GDS's SingleLabelInformation returns `this`.
    return this;
  }

  public unionBitSet(nodeLabels: ReadonlyArray<NodeLabel>, nodeCount: number): BitSet {
    throw new Error("Union with empty label information is not supported");
  }

  public nodeCountForLabel(nodeLabel: NodeLabel): number {
    if (nodeLabel.equals(this.label) || nodeLabel.equals(NodeLabel.ALL_NODES)) {
      return this.nodeCount;
    }
    throw new Error(
      StringFormatting.formatWithLocale("No label information for label %s present", nodeLabel.name())
    );
  }

  public hasLabel(nodeId: number, nodeLabel: NodeLabel): boolean {
    // All nodes are considered to have `this.label` or `NodeLabel.ALL_NODES`.
    return nodeLabel.equals(this.label) || nodeLabel.equals(NodeLabel.ALL_NODES);
  }

  public availableNodeLabels(): ReadonlySet<NodeLabel> {
    return this.labelSet;
  }

  public nodeLabelsForNodeId(nodeId: number): ReadonlyArray<NodeLabel> {
    return [this.label];
  }

  public forEachNodeLabel(nodeId: number, consumer: IdMap.NodeLabelConsumer): void {
    consumer.accept(this.label);
  }

  public validateNodeLabelFilter(nodeLabels: ReadonlyArray<NodeLabel>): void {
    const invalidLabels = nodeLabels.filter(
      (filterLabel) => !filterLabel.equals(this.label) && !filterLabel.equals(NodeLabel.ALL_NODES)
    );

    if (invalidLabels.length > 0) {
      throw new Error(
        StringFormatting.formatWithLocale(
          "Specified labels %s do not correspond to any of the node projections %s.",
          invalidLabels.map(l => l.name()), // In Java, ElementIdentifier.toString() is used
          Array.from(this.availableNodeLabels()).map(l => l.name())
        )
      );
    }
  }

  public nodeIterator(
    labels: ReadonlyArray<NodeLabel>,
    nodeCount: number // This nodeCount param seems redundant given this.nodeCount
  ): PrimitiveIterator.OfLong {
    if (
      labels.length === 1 &&
      (labels.some(l => l.equals(this.label)) || labels.some(l => l.equals(NodeLabel.ALL_NODES)))
    ) {
      return new BatchNodeIterable.IdIterator(this.nodeCount); // Use this.nodeCount
    } else {
      throw new Error(
        StringFormatting.formatWithLocale(
          "Unknown labels: %s",
          StringJoining.join(labels.map((l) => l.name()))
        )
      );
    }
  }

  public addLabel(nodeLabel: NodeLabel): void {
    throw new Error("Adding labels is not supported");
  }

  public addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    throw new Error("Adding node id to label is not supported");
  }

  public isSingleLabel(): boolean {
    return true;
  }

  public toMultiLabel(nodeLabelToMutate: NodeLabel): LabelInformation {
    return LabelInformationBuilders.multiLabelWithCapacityAndLabelInformation(
      this.nodeCount,
      [nodeLabelToMutate], // List.of(nodeLabelToMutate)
      this.availableNodeLabels()
    ).build(this.nodeCount, identityLongUnaryOperator);
  }

  public static Builder = class SingleLabelInformationBuilder implements LabelInformation.Builder {
    private readonly label: NodeLabel;

    constructor(label: NodeLabel) {
      this.label = label;
    }

    // Note: Java params are (NodeLabel, long), TS interface is (long, NodeLabel)
    // The provided Java code has (NodeLabel, long) for addNodeIdToLabel in the Builder.
    // Let's stick to the Java signature for this specific builder method.
    public addNodeIdToLabel(nodeLabel: NodeLabel, nodeId: number): void {
      // The Java code has (NodeLabel nodeLabel, long nodeId)
      // but the LabelInformation.Builder interface in Java is (long nodeId, NodeLabel nodeLabel)
      // The implementation here throws, so the order doesn't functionally matter.
      // For consistency with the Java class's own builder method signature:
      if (!nodeLabel.equals(this.label)) {
         console.warn(`Attempted to add label ${nodeLabel.name()} to SingleLabelInformation for ${this.label.name()}`);
      }
      // Still, it's an unsupported operation.
      throw new Error("This builder does not support adding labels");
    }

    public build(nodeCount: number, mappedIdFn: LongUnaryOperator): LabelInformation {
      // mappedIdFn is ignored in the Java version of SingleLabelInformation.Builder.build
      return new SingleLabelInformation(nodeCount, this.label);
    }
  };
}
