import { NodeLabel } from "../../NodeLabel"; // Adjust path
import { FilteredIdMap } from "../../api/FilteredIdMap"; // Adjust path
import { IdMap, NodeLabelConsumer } from "../../api/IdMap"; // Adjust path
import { LabeledIdMap } from "../../api/LabeledIdMap"; // Adjust path
import { OptionalLong } from "../utils/OptionalLong"; // Adjust path

export class FilteredLabeledIdMap
  extends LabeledIdMap
  implements FilteredIdMap
{
  private readonly originalToRootIdMap: IdMap;
  // rootToFilteredIdMap is also a LabeledIdMap in the Java constructor,
  // but its methods used here are covered by the IdMap interface.
  // For type safety, if LabeledIdMap specific methods of rootToFilteredIdMap were used,
  // this type should be LabeledIdMap.
  private readonly rootToFilteredIdMap: IdMap; // Or LabeledIdMap if its specific methods are needed

  constructor(originalToRootIdMap: IdMap, rootToFilteredIdMap: LabeledIdMap) {
    // The super constructor needs LabelInformation and nodeCount from the rootToFilteredIdMap
    super(
      rootToFilteredIdMap.labelInformation(),
      rootToFilteredIdMap.nodeCount()
    );
    this.originalToRootIdMap = originalToRootIdMap;
    this.rootToFilteredIdMap = rootToFilteredIdMap;
  }

  public typeId(): string {
    return this.originalToRootIdMap.typeId();
  }

  public rootNodeCount(): OptionalLong {
    // originalToRootIdMap.rootNodeCount() might return undefined if not on IdMap base
    // Ensure IdMap interface or originalToRootIdMap's concrete type has rootNodeCount
    const rnc = this.originalToRootIdMap.rootNodeCount
      ? this.originalToRootIdMap.rootNodeCount()
      : OptionalLong.empty();
    return rnc || OptionalLong.empty(); // Ensure it always returns an OptionalLong
  }

  public toRootNodeId(filteredNodeId: number): number {
    return this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
  }

  public toFilteredNodeId(rootNodeId: number): number {
    return this.rootToFilteredIdMap.toMappedNodeId(rootNodeId);
  }

  public toOriginalNodeId(filteredNodeId: number): number {
    return this.originalToRootIdMap.toOriginalNodeId(
      this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId)
    );
  }

  public toMappedNodeId(originalNodeId: number): number {
    return this.rootToFilteredIdMap.toMappedNodeId(
      this.originalToRootIdMap.toMappedNodeId(originalNodeId)
    );
  }

  public containsOriginalId(originalNodeId: number): boolean {
    // Ensure originalToRootIdMap.toMappedNodeId exists and returns a valid ID for containsOriginalId
    const rootNodeId = this.originalToRootIdMap.toMappedNodeId(originalNodeId);
    // If toMappedNodeId can return a special value for non-existent, handle it.
    // Assuming it returns a value that rootToFilteredIdMap.containsOriginalId can process.
    return this.rootToFilteredIdMap.containsOriginalId(rootNodeId);
  }

  public highestOriginalId(): number {
    return this.originalToRootIdMap.highestOriginalId();
  }

  public containsRootNodeId(rootNodeId: number): boolean {
    return this.rootToFilteredIdMap.containsOriginalId(rootNodeId);
  }

  public rootIdMap(): IdMap {
    return this.originalToRootIdMap;
  }

  // Methods from LabeledIdMap (and IdMap) that are overridden
  public nodeLabels(filteredNodeId: number): ReadonlyArray<NodeLabel> {
    if (!this.originalToRootIdMap.nodeLabels) {
      throw new Error(
        "'nodeLabels' method not available on originalToRootIdMap"
      );
    }
    return this.originalToRootIdMap.nodeLabels(
      this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId)
    );
  }

  public forEachNodeLabel(
    filteredNodeId: number,
    consumer: NodeLabelConsumer
  ): void {
    if (!this.originalToRootIdMap.forEachNodeLabel) {
      throw new Error(
        "'forEachNodeLabel' method not available on originalToRootIdMap"
      );
    }
    this.originalToRootIdMap.forEachNodeLabel(
      this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId),
      consumer
    );
  }

  public hasLabel(filteredNodeId: number, label: NodeLabel): boolean {
    if (!this.originalToRootIdMap.hasLabel) {
      throw new Error("'hasLabel' method not available on originalToRootIdMap");
    }
    return this.originalToRootIdMap.hasLabel(
      this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId),
      label
    );
  }

  // These methods imply mutation and might belong to a mutable version of IdMap/LabeledIdMap
  public addNodeLabel(nodeLabel: NodeLabel): void {
    if (!this.originalToRootIdMap.addNodeLabel) {
      throw new Error(
        "'addNodeLabel' method not available on originalToRootIdMap"
      );
    }
    this.originalToRootIdMap.addNodeLabel(nodeLabel);
  }

  public addNodeIdToLabel(filteredNodeId: number, nodeLabel: NodeLabel): void {
    if (!this.originalToRootIdMap.addNodeIdToLabel) {
      throw new Error(
        "'addNodeIdToLabel' method not available on originalToRootIdMap"
      );
    }
    this.originalToRootIdMap.addNodeIdToLabel(
      this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId),
      nodeLabel
    );
  }
}
