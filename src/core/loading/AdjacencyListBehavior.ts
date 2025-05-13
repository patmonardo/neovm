import {
  LongSupplier,
  PropertyMappings,
  Aggregation,
  AggregationHelper,
  RelationshipType,
  AdjacencyCompressorFactory,
  GdsFeatureToggles,
  CompressedAdjacencyListBuilderFactory,
  UncompressedAdjacencyListBuilderFactory,
  PackedAdjacencyListBuilderFactory,
  MemoryTracker,
  DeltaVarLongCompressor,
  RawCompressor,
  PackedCompressor,
  MixedCompressor,
  MemoryEstimation,
  MemoryEstimations,
  UncompressedAdjacencyList,
  CompressedAdjacencyList,
  BiFunction,
} from './adjacencyListBehaviorTypes'; // Adjust path as needed

export namespace AdjacencyListBehavior {
  export function asConfigured(
    nodeCountSupplier: LongSupplier,
    propertyMappings: PropertyMappings,
    aggregationsInput: Aggregation[] // Changed name to avoid conflict
  ): AdjacencyCompressorFactory {
    const resolvedAggregations = aggregationsInput.map(AggregationHelper.resolve);
    const noAggregation = aggregationsInput.map(AggregationHelper.resolve).every(AggregationHelper.equivalentToNone);

    if (GdsFeatureToggles.USE_PACKED_ADJACENCY_LIST.isEnabled()) {
      return packed(nodeCountSupplier, propertyMappings, resolvedAggregations, noAggregation);
    } else if (GdsFeatureToggles.USE_MIXED_ADJACENCY_LIST.isEnabled()) {
      return mixed(nodeCountSupplier, propertyMappings, resolvedAggregations, noAggregation);
    } else if (GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST.isEnabled()) {
      return uncompressed(nodeCountSupplier, propertyMappings, resolvedAggregations, noAggregation);
    } else {
      return compressed(nodeCountSupplier, propertyMappings, resolvedAggregations, noAggregation);
    }
  }

  export function compressed(
    nodeCountSupplier: LongSupplier,
    propertyMappings: PropertyMappings,
    aggregations: Aggregation[],
    noAggregation: boolean
  ): AdjacencyCompressorFactory {
    return DeltaVarLongCompressor.factory(
      nodeCountSupplier,
      CompressedAdjacencyListBuilderFactory.of(),
      propertyMappings,
      aggregations,
      noAggregation,
      MemoryTracker.create()
    );
  }

  export function uncompressed(
    nodeCountSupplier: LongSupplier,
    propertyMappings: PropertyMappings,
    aggregations: Aggregation[],
    noAggregation: boolean
  ): AdjacencyCompressorFactory {
    return RawCompressor.factory(
      nodeCountSupplier,
      UncompressedAdjacencyListBuilderFactory.of(),
      propertyMappings,
      aggregations,
      noAggregation,
      MemoryTracker.create()
    );
  }

  export function packed(
    nodeCountSupplier: LongSupplier,
    propertyMappings: PropertyMappings,
    aggregations: Aggregation[],
    noAggregation: boolean
  ): AdjacencyCompressorFactory {
    return PackedCompressor.factory(
      nodeCountSupplier,
      PackedAdjacencyListBuilderFactory.of(),
      propertyMappings,
      aggregations,
      noAggregation,
      MemoryTracker.create()
    );
  }

  export function mixed(
    nodeCountSupplier: LongSupplier,
    propertyMappings: PropertyMappings,
    aggregations: Aggregation[],
    noAggregation: boolean
  ): AdjacencyCompressorFactory {
    return MixedCompressor.factory(
      nodeCountSupplier,
      PackedAdjacencyListBuilderFactory.of(),
      CompressedAdjacencyListBuilderFactory.of(),
      propertyMappings,
      aggregations,
      noAggregation,
      MemoryTracker.create()
    );
  }

  export function adjacencyListEstimation(avgDegree: number, nodeCount: number): MemoryEstimation;
  export function adjacencyListEstimation(relationshipType: RelationshipType, undirected: boolean): MemoryEstimation;
  export function adjacencyListEstimation(
    param1: number | RelationshipType,
    param2: number | boolean
  ): MemoryEstimation {
    if (GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST.isEnabled()) {
      if (typeof param1 === 'number' && typeof param2 === 'number') {
        return UncompressedAdjacencyList.adjacencyListEstimation(param1, param2);
      } else if (param1 instanceof RelationshipType && typeof param2 === 'boolean') {
        return UncompressedAdjacencyList.adjacencyListEstimation(param1, param2);
      }
    } else {
      if (typeof param1 === 'number' && typeof param2 === 'number') {
        return CompressedAdjacencyList.adjacencyListEstimation(param1, param2);
      } else if (param1 instanceof RelationshipType && typeof param2 === 'boolean') {
        return CompressedAdjacencyList.adjacencyListEstimation(param1, param2);
      }
    }
    throw new Error("Invalid parameters for adjacencyListEstimation");
  }

  export function adjacencyListsFromStarEstimation(undirected: boolean): MemoryEstimation {
    const estimationMethod: BiFunction<RelationshipType, boolean, MemoryEstimation> =
      GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST.isEnabled()
        ? UncompressedAdjacencyList.adjacencyListEstimation
        : CompressedAdjacencyList.adjacencyListEstimation;

    return MemoryEstimations.setup("Adjacency Lists", (dimensions: MemoryEstimations.Dimensions) => {
      const builder = MemoryEstimations.builder();
      const relCounts = dimensions.relationshipCounts();

      if (relCounts.size === 0) {
        builder.add(adjacencyListEstimation(RelationshipType.ALL_RELATIONSHIPS, undirected));
      } else {
        relCounts.forEach((count, type) => {
          builder.add(type.name, estimationMethod(type, undirected));
        });
      }
      return builder.build();
    });
  }

  export function adjacencyPropertiesEstimation(
    relationshipType: RelationshipType,
    undirected: boolean
  ): MemoryEstimation {
    // This method in Java directly calls UncompressedAdjacencyList.
    // It does not seem to depend on the GdsFeatureToggles for compressed/uncompressed choice.
    return UncompressedAdjacencyList.adjacencyPropertiesEstimation(relationshipType, undirected);
  }

  export function adjacencyPropertiesFromStarEstimation(undirected: boolean): MemoryEstimation {
    return MemoryEstimations.setup("", (dimensions: MemoryEstimations.Dimensions) => {
      const builder = MemoryEstimations.builder();
      const relCounts = dimensions.relationshipCounts();

      if (relCounts.size === 0) {
        // The original Java code uses ALL_RELATIONSHIPS here.
        builder.add(UncompressedAdjacencyList.adjacencyPropertiesEstimation(
            RelationshipType.ALL_RELATIONSHIPS,
            undirected
        ));
      } else {
        relCounts.forEach((count, type) => {
          builder.add(
            type.name,
            UncompressedAdjacencyList.adjacencyPropertiesEstimation(type, undirected)
          );
        });
      }
      return builder.build();
    });
  }
}
