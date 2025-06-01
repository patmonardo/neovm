/**
 * METADATA STORE - GRAPH EXPORT METADATA
 *
 * Record containing all metadata needed to export/import a GraphStore.
 * Captures graph info, schemas, and statistics for file I/O operations.
 *
 * This is the bridge between in-memory GraphStore and file persistence.
 */

import { RelationshipType } from "@/projection";
import { IdMap } from "@/api";
import { GraphStore } from "@/api/GraphStore";
import { NodeSchema } from "@/api/schema";
import { RelationshipSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { GraphInfo } from "./file/GraphInfo";

export class MetaDataStore {
  constructor(
    public readonly graphInfo: GraphInfo,
    public readonly nodeSchema: NodeSchema,
    public readonly relationshipSchema: RelationshipSchema,
    public readonly graphPropertySchema: Map<string, PropertySchema>
  ) {}

  /**
   * Extract metadata from a GraphStore for export operations.
   *
   * @param graphStore The graph store to extract metadata from
   * @returns MetaDataStore containing all export metadata
   * @throws Error if GraphStore has untyped IdMap (cannot be exported)
   */
  static of(graphStore: GraphStore): MetaDataStore {
    // Collect relationship type counts for export
    const relTypeCounts = new Map<RelationshipType, number>();
    for (const relType of graphStore.relationshipTypes()) {
      relTypeCounts.set(relType, graphStore.relationshipCount(relType));
    }

    // Validate that IdMap is typed (required for export)
    const idMapTypeId = graphStore.nodes().typeId();
    if (idMapTypeId === IdMap.NO_TYPE) {
      throw new Error(
        `Cannot write graph store with untyped id map. Got instance of \`${
          graphStore.nodes().constructor.name
        }\``
      );
    }

    // Build GraphInfo with all statistics and metadata
    const graphInfo = GraphInfo.builder()
      .databaseInfo(graphStore.databaseInfo())
      .idMapBuilderType(idMapTypeId)
      .nodeCount(graphStore.nodeCount())
      .maxOriginalId(graphStore.nodes().highestOriginalId())
      .relationshipTypeCounts(relTypeCounts)
      .inverseIndexedRelationshipTypes(
        graphStore.inverseIndexedRelationshipTypes()
      )
      .build();

    // Extract schema information
    const schema = graphStore.schema();

    return new MetaDataStore(
      graphInfo,
      schema.nodeSchema(),
      schema.relationshipSchema(),
      schema.graphProperties()
    );
  }
}
