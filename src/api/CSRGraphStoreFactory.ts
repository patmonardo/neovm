import { NodeProjections } from "@/projection";
import { Orientation } from "@/projection";
import { RelationshipProjection } from "@/projection";
import { RelationshipProjections } from "@/projection";
import { RelationshipType } from "@/projection";
import {
  DatabaseInfo,
  DatabaseLocation,
  ImmutableDatabaseInfo,
} from "./DatabaseInfo";
import { GraphStoreFactory } from "./GraphStoreFactory";
import { GraphLoaderContext } from "./GraphLoaderContext";
import { MutableGraphSchema } from "./schema/primitive/MutableGraphSchema";
import { HugeIntArray } from "../collections/ha/HugeIntArray";
import { HugeLongArray } from "../collections/ha/HugeLongArray";
import { GraphProjectConfig } from "../config/GraphProjectConfig";
import { GraphDimensions } from "../core/GraphDimensions";
import { IdMapBehaviorServiceProvider } from "../core/IdMapBehaviorServiceProvider";
import { HugeGraph } from "../core/huge/HugeGraph";
import { AdjacencyBuffer } from "../core/AdjacencyBuffer";
import { AdjacencyListBehavior } from "../core/loading/AdjacencyListBehavior";
import { CSRGraphStore } from "../core/loading/CSRGraphStore";
import { Capabilities } from "../core/loading/Capabilities";
import { GraphStoreBuilder } from "../core/loading/GraphStoreBuilder";
import { Nodes } from "../core/loading/Nodes";
import { RelationshipImportResult } from "../core/loading/RelationshipImportResult";
import { NodePropertiesFromStoreBuilder } from "../core/loading/nodeproperties/NodePropertiesFromStoreBuilder";
import { ProgressTracker } from "../core/utils/progress/tasks/ProgressTracker";
import { Estimate } from "../mem/Estimate";
import { MemoryEstimation } from "../mem/MemoryEstimation";
import { MemoryEstimations } from "../mem/MemoryEstimations";
import { MemoryUsage } from "../mem/MemoryUsage";
import { formatWithLocale } from "../utils/StringFormatting";
import { ResolvedPropertyMapping } from "../RelationshipProjection"; // Assuming it's part of RelationshipProjection or similar

export abstract class CSRGraphStoreFactory<
  CONFIG extends GraphProjectConfig
> extends GraphStoreFactory<CSRGraphStore, CONFIG> {
  constructor(
    graphProjectConfig: CONFIG,
    capabilities: Capabilities,
    loadingContext: GraphLoaderContext,
    dimensions: GraphDimensions
  ) {
    super(graphProjectConfig, capabilities, loadingContext, dimensions);
  }

  protected createGraphStore(
    nodes: Nodes,
    relationshipImportResult: RelationshipImportResult
  ): CSRGraphStore {
    const schema = MutableGraphSchema.of(
      nodes.schema(),
      relationshipImportResult.relationshipSchema(),
      new Map() // Assuming Map.of() translates to an empty map or a map from a specific structure
    );

    const databaseInfo = ImmutableDatabaseInfo.builder()
      .databaseId(this.loadingContext.databaseId())
      .databaseLocation(DatabaseLocation.LOCAL)
      .build();

    return new GraphStoreBuilder() // Assuming GraphStoreBuilder can build CSRGraphStore
      .databaseInfo(databaseInfo)
      .capabilities(this.capabilities)
      .schema(schema)
      .nodes(nodes)
      .relationshipImportResult(relationshipImportResult)
      .concurrency(this.graphProjectConfig.readConcurrency())
      .build() as CSRGraphStore; // Cast if build() returns a more generic GraphStore
  }

  protected logLoadingSummary(graphStore: CSRGraphStore): void {
    this.progressTracker().logDebug(() => {
      const sizeInBytes = MemoryUsage.sizeOf(graphStore);
      if (sizeInBytes >= 0) {
        const memoryUsage = Estimate.humanReadable(sizeInBytes);
        return formatWithLocale(
          "Actual memory usage of the loaded graph: %s",
          memoryUsage
        );
      } else {
        return "Actual memory usage of the loaded graph could not be determined.";
      }
    });
  }

  protected abstract progressTracker(): ProgressTracker;

  public static getMemoryEstimation(
    nodeProjections: NodeProjections,
    relationshipProjections: RelationshipProjections,
    isLoading: boolean
  ): MemoryEstimation {
    const builder = MemoryEstimations.builder("graph projection");

    // node information
    builder.add(
      "nodeIdMap",
      IdMapBehaviorServiceProvider.getIdMapBehavior().memoryEstimation()
    );

    // nodeProperties
    nodeProjections.allProperties().forEach((property) =>
      builder.add(
        property.propertyKey, // Assuming property has a key
        NodePropertiesFromStoreBuilder.memoryEstimation()
      )
    );

    // relationships
    relationshipProjections
      .projections()
      .forEach((relationshipProjection, relationshipType) => {
        const undirected =
          relationshipProjection.orientation() === Orientation.UNDIRECTED;
        if (isLoading) {
          builder.max([
            // Max of a list of estimations
            CSRGraphStoreFactory.relationshipEstimationDuringLoading(
              relationshipType,
              relationshipProjection,
              undirected
            ),
            CSRGraphStoreFactory.relationshipEstimationAfterLoading(
              relationshipType,
              relationshipProjection,
              undirected
            ),
          ]);
        } else {
          // In Java: builder.add(MemoryEstimations.builder(HugeGraph.class).build());
          // This might be a placeholder or a specific type token.
          // For now, creating a generic builder for HugeGraph.
          builder.add(MemoryEstimations.builder("HugeGraph").build()); // Or pass HugeGraph constructor if API supports
          builder.add(
            CSRGraphStoreFactory.relationshipEstimationAfterLoading(
              relationshipType,
              relationshipProjection,
              undirected
            )
          );
        }
      });

    return builder.build();
  }

  private static relationshipEstimationDuringLoading(
    relationshipType: RelationshipType,
    relationshipProjection: RelationshipProjection,
    undirected: boolean
  ): MemoryEstimation {
    const duringLoadingEstimation = MemoryEstimations.builder(
      "size during loading"
    );

    CSRGraphStoreFactory.addRelationshipEstimationsDuringLoading(
      relationshipType,
      relationshipProjection,
      undirected,
      false,
      duringLoadingEstimation
    );

    if (relationshipProjection.indexInverse()) {
      CSRGraphStoreFactory.addRelationshipEstimationsDuringLoading(
        relationshipType,
        relationshipProjection,
        undirected,
        true,
        duringLoadingEstimation
      );
    }

    return duringLoadingEstimation.build();
  }

  private static addRelationshipEstimationsDuringLoading(
    relationshipType: RelationshipType,
    relationshipProjection: RelationshipProjection,
    undirected: boolean,
    printIndexSuffix: boolean,
    estimationBuilder: MemoryEstimations.Builder // Assuming Builder type from MemoryEstimations
  ): void {
    const indexSuffix = printIndexSuffix ? " (inverse index)" : "";

    estimationBuilder.add(
      formatWithLocale(
        "adjacency loading buffer for '%s'%s",
        relationshipType.name, // Assuming RelationshipType has a name property
        indexSuffix
      ),
      AdjacencyBuffer.memoryEstimation(
        relationshipType,
        relationshipProjection.properties().mappings().length, // Count of properties
        undirected
      )
    );

    estimationBuilder.perNode(
      formatWithLocale(
        "offsets for '%s'%s",
        relationshipType.name,
        indexSuffix
      ),
      HugeLongArray.memoryEstimation // Pass the static method itself
    );
    estimationBuilder.perNode(
      formatWithLocale(
        "degrees for '%s'%s",
        relationshipType.name,
        indexSuffix
      ),
      HugeIntArray.memoryEstimation // Pass the static method itself
    );

    relationshipProjection
      .properties()
      .mappings()
      .forEach((resolvedPropertyMapping: ResolvedPropertyMapping) =>
        estimationBuilder.perNode(
          formatWithLocale(
            "property '%s.%s'%s",
            relationshipType.name,
            resolvedPropertyMapping.propertyKey(),
            indexSuffix
          ),
          HugeLongArray.memoryEstimation // Assuming properties also use HugeLongArray
        )
      );
  }

  private static relationshipEstimationAfterLoading(
    relationshipType: RelationshipType,
    relationshipProjection: RelationshipProjection,
    undirected: boolean
  ): MemoryEstimation {
    const afterLoadingEstimation =
      MemoryEstimations.builder("size after loading");

    CSRGraphStoreFactory.addRelationshipEstimationsAfterLoading(
      relationshipType,
      relationshipProjection,
      undirected,
      false,
      afterLoadingEstimation
    );
    if (relationshipProjection.indexInverse()) {
      CSRGraphStoreFactory.addRelationshipEstimationsAfterLoading(
        relationshipType,
        relationshipProjection,
        undirected,
        true,
        afterLoadingEstimation
      );
    }

    return afterLoadingEstimation.build();
  }

  private static addRelationshipEstimationsAfterLoading(
    relationshipType: RelationshipType,
    relationshipProjection: RelationshipProjection,
    undirected: boolean,
    printIndexSuffix: boolean,
    afterLoadingEstimation: MemoryEstimations.Builder // Assuming Builder type
  ): void {
    const indexSuffix = printIndexSuffix ? " (inverse index)" : "";

    afterLoadingEstimation.add(
      formatWithLocale(
        "adjacency list for '%s'%s",
        relationshipType.name, // Assuming RelationshipType has a name property
        indexSuffix
      ),
      AdjacencyListBehavior.adjacencyListEstimation(
        relationshipType,
        undirected
      )
    );

    relationshipProjection
      .properties()
      .mappings()
      .forEach((resolvedPropertyMapping: ResolvedPropertyMapping) => {
        afterLoadingEstimation.add(
          formatWithLocale(
            "property '%s.%s%s", // Original had a missing ' before %s
            relationshipType.name,
            resolvedPropertyMapping.propertyKey(),
            indexSuffix
          ),
          AdjacencyListBehavior.adjacencyPropertiesEstimation(
            // Assuming this estimates a single property
            relationshipType,
            undirected
            // May need property type or specific details if estimation varies per property
          )
        );
      });
  }
}
