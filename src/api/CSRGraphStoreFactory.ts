import { NodeProjections } from "@/projection";
import { Orientation } from "@/projection";
import { RelationshipProjection } from "@/projection";
import { RelationshipProjections } from "@/projection";
import { RelationshipType } from "@/projection";
import { DatabaseLocation } from "@/api";
import { DatabaseInfo } from "@/api";
import { GraphStoreFactory } from "@/api";
import { GraphLoaderContext } from "@/api";
import { MutableGraphSchema } from "@/api/schema";
import { HugeIntArray } from "../collections";
import { HugeLongArray } from "../collections";
import { GraphProjectConfig } from "@/config";
import { GraphDimensions } from "../core";
import { IdMapBehaviorServiceProvider } from "@/core";
import { AdjacencyBuffer } from "@/core/loading";
import { AdjacencyListBehavior } from "@/core/loading";
import { CSRGraphStore } from "@/core/loading";
import { Capabilities } from "@/core/loading";
import { GraphStoreBuilder } from "@/core/loading";
import { Nodes } from "@/core/loading";
import { RelationshipImportResult } from "@/core/loading";
import { NodePropertiesFromStoreBuilder } from "@/core/loading/nodeproperties";
import { ProgressTracker } from "../core/utils/progress";
import { Estimate } from "../mem";
import { MemoryEstimation } from "@/mem";
import { MemoryEstimations } from "@/mem";
import { MemoryUsage } from "@/mem";
import { formatWithLocale } from "@/utils";
import { ResolvedPropertyMapping } from "../RelationshipProjection";

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
      relationshipImportResult.relationshipSchema,
      new Map()
    );

    const databaseInfo = DatabaseInfo.builder()
      .databaseId(this.loadingContext.databaseId())
      .databaseLocation(DatabaseLocation.LOCAL)
      .build();

    return new GraphStoreBuilder()
      .databaseInfo(databaseInfo)
      .capabilities(this.capabilities)
      .schema(schema)
      .nodes(nodes)
      .relationshipImportResult(relationshipImportResult)
      .concurrency(Concurrency.of(this.graphProjectConfig.readConcurrency))
      .build();
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

    builder.add(
      "nodeIdMap",
      IdMapBehaviorServiceProvider.getIdMapBehavior().memoryEstimation()
    );

    nodeProjections
      .allProperties()
      .forEach((property) =>
        builder.add(
          property.propertyKey,
          NodePropertiesFromStoreBuilder.memoryEstimation()
        )
      );

    relationshipProjections
      .projections()
      .forEach((relationshipProjection, relationshipType) => {
        const undirected =
          relationshipProjection.orientation() === Orientation.UNDIRECTED;
        if (isLoading) {
          builder.max([
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
          builder.add(MemoryEstimations.builder("HugeGraph").build());
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
    estimationBuilder: MemoryEstimations.Builder
  ): void {
    const indexSuffix = printIndexSuffix ? " (inverse index)" : "";

    estimationBuilder.add(
      formatWithLocale(
        "adjacency loading buffer for '%s'%s",
        relationshipType.name,
        indexSuffix
      ),
      AdjacencyBuffer.memoryEstimation(
        relationshipType,
        relationshipProjection.properties().mappings().length,
        undirected
      )
    );

    estimationBuilder.perNode(
      formatWithLocale(
        "offsets for '%s'%s",
        relationshipType.name,
        indexSuffix
      ),
      HugeLongArray.memoryEstimation
    );
    estimationBuilder.perNode(
      formatWithLocale(
        "degrees for '%s'%s",
        relationshipType.name,
        indexSuffix
      ),
      HugeIntArray.memoryEstimation
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
          HugeLongArray.memoryEstimation
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
    afterLoadingEstimation: MemoryEstimations.Builder
  ): void {
    const indexSuffix = printIndexSuffix ? " (inverse index)" : "";

    afterLoadingEstimation.add(
      formatWithLocale(
        "adjacency list for '%s'%s",
        relationshipType.name,
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
            "property '%s.%s'%s",
            relationshipType.name,
            resolvedPropertyMapping.propertyKey(),
            indexSuffix
          ),
          AdjacencyListBehavior.adjacencyPropertiesEstimation(
            relationshipType,
            undirected
          )
        );
      });
  }
}
