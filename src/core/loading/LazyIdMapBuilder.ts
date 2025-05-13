import {
  AtomicBoolean,
  ShardedLongLongMap,
  NodesBuilder,
  GraphFactory,
  NodeLabelToken,
  PropertyValues,
  LoadingExceptions,
  PartialIdMap,
  HighLimitIdMap,
  HighLimitIdMapAndProperties,
  ImmutableHighLimitIdMapAndProperties,
  Concurrency,
  PropertyState,
  MutableNodeSchema,
  NodePropertyStore,
  Optional, // Using the simple Optional mock for boolean
  MockPropertyValues, // For testing/example
} from './lazyIdMapBuilderTypes'; // Adjust path
import { OptionalLong } from '../utils/OptionalLong'; // Assuming this exists

export class LazyIdMapBuilder implements PartialIdMap {
  private readonly isEmptyAtomic: AtomicBoolean = new AtomicBoolean(true); // Renamed to avoid conflict
  private readonly intermediateIdMapBuilder: ShardedLongLongMap.Builder;
  private readonly nodesBuilder: NodesBuilder;

  constructor(
    concurrency: Concurrency,
    hasLabelInformation?: boolean, // Optional<Boolean> -> boolean | undefined
    hasProperties?: boolean,
    usePooledLocalNodesBuilder?: boolean,
    propertyState?: PropertyState // propertyState can be optional if not always provided
  ) {
    this.intermediateIdMapBuilder = ShardedLongLongMap.builder(concurrency);
    let nb = GraphFactory.initNodesBuilder()
      .concurrency(concurrency)
      .deduplicateIds(false); // Default from Java

    // Handle Optional<Boolean> by checking for undefined
    if (hasLabelInformation !== undefined) {
      nb = nb.hasLabelInformation(hasLabelInformation);
    }
    if (hasProperties !== undefined) {
      nb = nb.hasProperties(hasProperties);
    }
    if (usePooledLocalNodesBuilder !== undefined) {
      nb = nb.usePooledBuilderProvider(usePooledLocalNodesBuilder);
    }
    if (propertyState !== undefined) {
      nb = nb.propertyState(propertyState);
    }
    this.nodesBuilder = nb.build(); // Call build on the configured NodesBuilder
                                    // The mock NodesBuilder.build() returns Nodes,
                                    // but the instance itself is the builder.
                                    // Correcting this: GraphFactory.initNodesBuilder() returns the builder,
                                    // and we call build() on it later in *this* class's build method.
                                    // So, this.nodesBuilder should store the builder instance.
    // Re-evaluating the above: The Java code calls .build() on GraphFactory.initNodesBuilder()...build()
    // This means this.nodesBuilder IS the NodesBuilder instance.
    this.nodesBuilder = nb; // Store the configured builder instance
  }

  public prepareForFlush(): void {
    this.isEmptyAtomic.set(false);
  }

  public addNode(nodeId: number | number, nodeLabels: NodeLabelToken): number {
    const originalNodeId = BigInt(nodeId);
    LoadingExceptions.checkPositiveId(originalNodeId);

    const intermediateId = this.intermediateIdMapBuilder.addNode(originalNodeId);

    // deduplication
    if (intermediateId < 0n) {
      return -(intermediateId + 1n);
    }

    this.nodesBuilder.addNode(intermediateId, nodeLabels);
    return intermediateId;
  }

  public addNodeWithProperties(
    nodeId: number | number,
    properties: PropertyValues,
    nodeLabels: NodeLabelToken
  ): number {
    const originalNodeId = BigInt(nodeId);
    LoadingExceptions.checkPositiveId(originalNodeId);
    const intermediateId = this.intermediateIdMapBuilder.addNode(originalNodeId);


    // deduplication
    if (intermediateId < 0n) {
      return -(intermediateId + 1n);
    }

    if (properties.isEmpty()) {
      this.nodesBuilder.addNode(intermediateId, nodeLabels);
    } else {
      this.nodesBuilder.addNode(intermediateId, nodeLabels, properties);
    }

    return intermediateId;
  }

  public toMappedNodeId(originalNodeId: number | number): number {
    // "The LazyIdMap is used during the node phase of the graph import.
    // It produces intermediate ids that are used to store node properties.
    // The actual mapping to the final internal id happens later."
    // This implies it should return the intermediate ID, or if it's meant to be
    // an identity map for original IDs at this stage, it should return originalNodeId.
    // The Java code returns originalNodeId.
    return BigInt(originalNodeId);
  }

  public rootNodeCount(): OptionalLong {
    return this.isEmptyAtomic.getAcquire() // or .get()
      ? OptionalLong.empty()
      : OptionalLong.of(this.nodesBuilder.importedNodes());
  }

  public build(): HighLimitIdMapAndProperties {
    const nodes: Nodes = this.nodesBuilder.build(); // Now call build on NodesBuilder
    const intermediateIdMap: ShardedLongLongMap = this.intermediateIdMapBuilder.build();
    const internalIdMap: IdMap = nodes.idMap();

    const idMap = new HighLimitIdMap(intermediateIdMap, internalIdMap);

    // Anonymous class for PartialIdMap
    const partialIdMapForProperties: PartialIdMap = {
      toMappedNodeId: (intermediateIdInput: number | number): number => {
        const intermediateId = BigInt(intermediateIdInput);
        // This partial id map is used to construct the final node properties.
        // During import, the node properties are indexed by the intermediate id
        // produced by the LazyIdMap. To get the correct mapped id, we have to
        // go through the actual high limit id map.
        return idMap.toMappedNodeId(intermediateIdMap.toOriginalNodeId(intermediateId));
      },
      rootNodeCount: (): OptionalLong => {
        return OptionalLong.of(intermediateIdMap.size());
      }
    };

    return ImmutableHighLimitIdMapAndProperties.builder()
      .idMap(idMap)
      .intermediateIdMap(partialIdMapForProperties) // Use the created anonymous map
      .schema(nodes.schema())
      .propertyStore(nodes.properties())
      .build();
  }
}
