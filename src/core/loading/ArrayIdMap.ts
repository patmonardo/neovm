// import { NodeLabel } from "@/projection";
// import { FilteredIdMap } from "@/api/FilteredIdMap";
// import { IdMap } from "@/api";
// import { LabeledIdMap } from "@/api";
// import { HugeLongArray } from "@/collections/ha/HugeLongArray";
// import { HugeSparseCollections } from "@/collections";
// import { HugeSparseLongArray } from "@/collections";
// import { Concurrency } from "@/concurrency";
// import { Estimate } from "@/mem";
// import { MemoryEstimation } from "@/mem";
// import { MemoryEstimations } from "@/mem";
// import { MemoryRange } from "@/mem";
// import { Optional } from "@/utils";
// import { OptionalLong } from "@/utils";
// import { ArrayIdMapBuilder } from "./ArrayIdMapBuilder";
// import { ArrayIdMapBuilderOps } from "./ArrayIdMapBuilderOps";
// import { LabelInformation } from "./LabelInformation";
// import { FilteredLabeledIdMap } from "./FilteredLabeledIdMap"; // Assuming this class exists

export class ArrayIdMap {};

// export class ArrayIdMap extends LabeledIdMap {
//   private static readonly ESTIMATION: MemoryEstimation =
//     MemoryEstimations.builder(ArrayIdMap) // In TS, passing the class itself is for informational purposes
//       .perNode("Neo4j identifiers", HugeLongArray.memoryEstimation)
//       .rangePerGraphDimension(
//         "Mapping from Neo4j identifiers to internal identifiers",
//         (dimensions, concurrency) =>
//           HugeSparseCollections.estimateLong(
//             dimensions.highestPossibleNodeCount(),
//             dimensions.nodeCount()
//           )
//       )
//       .perGraphDimension("Node Label BitSets", (dimensions, concurrency) =>
//         MemoryRange.of(
//           BigInt(dimensions.estimationNodeLabelCount()) *
//             Estimate.sizeOfBitset(dimensions.nodeCount())
//         )
//       )
//       .build();

//   private readonly highestNeoId: number;
//   private readonly internalToOriginalIds: HugeLongArray;
//   private readonly originalToInternalIds: HugeSparseLongArray;

//   public static memoryEstimation(): MemoryEstimation {
//     return ArrayIdMap.ESTIMATION;
//   }

//   constructor(
//     internalToOriginalIds: HugeLongArray,
//     originalToInternalIds: HugeSparseLongArray,
//     labelInformation: LabelInformation,
//     nodeCount: number | number,
//     highestNeoId: number | number
//   ) {
//     super(labelInformation, nodeCount);
//     this.internalToOriginalIds = internalToOriginalIds;
//     this.originalToInternalIds = originalToInternalIds;
//     this.highestNeoId = BigInt(highestNeoId);
//   }

//   public override toMappedNodeId(originalNodeId: number | number): number {
//     return this.originalToInternalIds.get(originalNodeId);
//   }

//   public override typeId(): string {
//     return ArrayIdMapBuilder.ID;
//   }

//   public override toOriginalNodeId(mappedNodeId: number | number): number {
//     return this.internalToOriginalIds.get(mappedNodeId);
//   }

//   public override toRootNodeId(mappedNodeId: number | number): number {
//     // In ArrayIdMap, mappedNodeId is already the root ID if not filtered
//     return BigInt(mappedNodeId);
//   }

//   public override rootIdMap(): IdMap {
//     return this;
//   }

//   public override containsOriginalId(originalNodeId: number | number): boolean {
//     return this.originalToInternalIds.contains(originalNodeId);
//   }

//   public override rootNodeCount(): OptionalLong {
//     return OptionalLong.of(this.nodeCount());
//   }

//   public override highestOriginalId(): number {
//     return this.highestNeoId;
//   }

//   public override withFilteredLabels(
//     nodeLabels: NodeLabel[],
//     concurrency: Concurrency
//   ): Optional<FilteredIdMap> {
//     this.labelInformation.validateNodeLabelFilter(nodeLabels);

//     if (this.labelInformation.isEmpty()) {
//       return Optional.empty();
//     }

//     const unionBitSet = this.labelInformation.unionBitSet(
//       nodeLabels,
//       this.nodeCount()
//     );

//     if (unionBitSet.isEmpty()) {
//       // Added check for empty result after union
//       return Optional.empty();
//     }

//     let nodeId = -1n;
//     let cursor = 0n;
//     const newNodeCount = BigInt(unionBitSet.cardinality());
//     const newInternalToOriginalIds = HugeLongArray.newArray(newNodeCount); // Renamed from newGraphIds

//     // Iterate over the set bits in the unionBitSet
//     // These bits are the *current* internal IDs that match the label filter
//     nodeId = unionBitSet.nextSetBit(nodeId + 1n);
//     while (nodeId !== -1n) {
//       // `nodeId` here is an internal ID from the *current* (root) ArrayIdMap.
//       // We need to store this `nodeId` (which is a root internal ID) into the new dense array.
//       // The value stored is the original root internal ID. The index is the new filtered internal ID.
//       newInternalToOriginalIds.set(cursor, nodeId);
//       cursor++;
//       nodeId = unionBitSet.nextSetBit(nodeId + 1n);
//     }

//     // `newInternalToOriginalIds` now maps: newFilteredInternalId -> originalRootInternalId
//     // We need `newOriginalToInternalIds` which maps: originalRootInternalId -> newFilteredInternalId
//     const newOriginalToInternalIds = ArrayIdMapBuilderOps.buildSparseIdMap(
//       newNodeCount,
//       this.originalToInternalIds.capacity(), // Capacity of the original sparse map
//       concurrency,
//       newInternalToOriginalIds // This is the forward map for the filtered set
//     );

//     const newLabelInformation = this.labelInformation.filter(nodeLabels);

//     const rootToFilteredIdMap = new ArrayIdMap(
//       newInternalToOriginalIds,
//       newOriginalToInternalIds,
//       newLabelInformation,
//       newNodeCount,
//       this.highestNeoId // highestNeoId remains the same for the filtered map context
//     );

//     return Optional.of(new FilteredLabeledIdMap(this, rootToFilteredIdMap));
//   }
// }
