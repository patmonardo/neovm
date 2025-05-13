import {
  HugeLongArray,
  HugeSparseLongArray,
  HugeCursor,
  IdMap,
  LabelInformation,
  NodesBuilder,
  Concurrency,
  DefaultPool,
  ParallelUtil
} from './arrayIdMapBuilderOpsTypes'; // Adjust path
import { ArrayIdMap } from './ArrayIdMap'; // Actual class
import { OptionalLong } from '../utils/OptionalLong'; // Assuming this exists

// Package-private class in Java, translates to a namespace with exported functions.
export namespace ArrayIdMapBuilderOps {

  export function build(
    internalToOriginalIds: HugeLongArray,
    nodeCountInput: number | number,
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeIdInput: number | number,
    concurrency: Concurrency
  ): ArrayIdMap {
    const nodeCount = BigInt(nodeCountInput);
    let highestNodeId = BigInt(highestNodeIdInput);

    if (highestNodeId === NodesBuilder.UNKNOWN_MAX_ID) {
      const maxIdOpt = findMaxNodeId(internalToOriginalIds, nodeCount); // Pass nodeCount for iteration limit
      highestNodeId = maxIdOpt.isPresent() ? maxIdOpt.getAsLong() : NodesBuilder.UNKNOWN_MAX_ID;
    }

    // If highestNodeId is still UNKNOWN_MAX_ID (e.g., no nodes),
    // then capacity for HugeSparseLongArray might be 0 or a default.
    // The Java code passes highestNodeId + 1. If highestNodeId is -1, this is 0.
    const sparseMapCapacity = highestNodeId === NodesBuilder.UNKNOWN_MAX_ID ? 0n : highestNodeId + 1n;


    const originalToInternalIds = buildSparseIdMap(
      nodeCount,
      sparseMapCapacity, // Use calculated capacity
      concurrency,
      internalToOriginalIds
    );

    const labelInfo = labelInformationBuilder.build(nodeCount, (originalId: number) => originalToInternalIds.get(originalId));

    return new ArrayIdMap(
      internalToOriginalIds,
      originalToInternalIds,
      labelInfo,
      nodeCount,
      highestNodeId // Pass the resolved highestNodeId
    );
  }

  // nodeCount parameter added to limit iteration, as HugeLongArray.size() might be total capacity
  function findMaxNodeId(nodeIds: HugeLongArray, count: number): OptionalLong {
    if (count === 0n) {
      return OptionalLong.empty();
    }

    let maxId = NodesBuilder.UNKNOWN_MAX_ID; // Initialize with a value smaller than any valid ID
    let found = false;

    // Initialize maxId with the first element if possible, to handle all negative IDs correctly.
    if (count > 0n) {
        maxId = nodeIds.get(0n);
        found = true;
    }

    for (let i = 1n; i < count; i++) {
      const id = nodeIds.get(i);
      if (id > maxId) {
        maxId = id;
      }
    }
    return found ? OptionalLong.of(maxId) : OptionalLong.empty();
  }

  export function buildSparseIdMap( // Made exportable if ArrayIdMap needs it, as in Java
    nodeCount: number | number, // Number of internal IDs
    highestOriginalNodeIdPlusOne: number | number, // Capacity for the sparse array
    concurrency: Concurrency,
    graphIds: HugeLongArray // Maps internalGdsId -> originalNeo4jId
  ): HugeSparseLongArray {
    const idMapBuilder = HugeSparseLongArray.builder(
      IdMap.NOT_FOUND,
      highestOriginalNodeIdPlusOne // This is the capacity argument
    );

    // ParallelUtil.readParallel will call addNodes with ranges of internalGdsIds
    ParallelUtil.readParallel(
      concurrency,
      nodeCount, // Iterate from internalGdsId 0 to nodeCount-1
      DefaultPool.INSTANCE,
      (startInternalId, endInternalId) =>
        addNodes(graphIds, idMapBuilder, startInternalId, endInternalId)
    );
    return idMapBuilder.build();
  }

  // This function iterates from internal GDS ID `startNode` to `endNode`.
  // For each `internalGdsId` in this range, it gets the `originalNeo4jId = graphIds.get(internalGdsId)`.
  // Then, it stores this mapping in the sparse builder: `builder.set(originalNeo4jId, internalGdsId)`.
  function addNodes(
    graphIds: HugeLongArray, // internalGdsId -> originalNeo4jId
    builder: HugeSparseLongArray.Builder,
    startInternalGdsId: number,
    endInternalGdsId: number
  ): void {
    // Simplified loop, bypassing complex cursor logic for the mock.
    // This achieves the same logical result as the Java cursor loop for this specific task.
    for (let internalId = startInternalGdsId; internalId < endInternalGdsId; internalId++) {
      const originalNeo4jId = graphIds.get(internalId);
      // Ensure originalNeo4jId is not some sentinel indicating "not present" if graphIds can be sparse,
      // though HugeLongArray is typically dense.
      if (originalNeo4jId !== IdMap.NOT_FOUND) { // Example check, adapt if necessary
          builder.set(originalNeo4jId, internalId);
      }
    }
  }
}
