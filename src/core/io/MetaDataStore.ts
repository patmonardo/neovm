import { RelationshipType } from "@/projection";
import { GraphStore } from "@/api";
import { IdMap } from "@/api";
import { NodeSchema } from "@/api/schema";
import { RelationshipSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { GraphInfo } from "./file/GraphInfo";

/**
 * Record containing all metadata information extracted from a GraphStore.
 * This includes structural information, schema definitions, and graph-level properties.
 */
export class MetaDataStore {
  constructor(
    public readonly _graphInfo: GraphInfo,
    public readonly _nodeSchema: NodeSchema,
    public readonly _relationshipSchema: RelationshipSchema,
    public readonly _graphPropertySchema: Map<string, PropertySchema>
  ) {}

  /**
   * Factory method that extracts metadata from a GraphStore.
   *
   * @param graphStore The GraphStore to extract metadata from
   * @returns A new MetaDataStore instance with extracted metadata
   * @throws Error if the GraphStore has an untyped ID map
   */
  static of(graphStore: GraphStore): MetaDataStore {
    // Extract relationship type counts
    const relTypeCounts = new Map<RelationshipType, number>();
    for (const relationshipType of graphStore.relationshipTypes()) {
      relTypeCounts.set(relationshipType, graphStore.relationshipCount(relationshipType));
    }

    // Validate that the ID map has a type
    const idMapTypeId = graphStore.nodes().typeId();

    if (idMapTypeId === IdMap.NO_TYPE) {
      throw new Error(
        `Cannot write graph store with untyped id map. Got instance of \`${graphStore.nodes().constructor.name}\``
      );
    }

    // Build GraphInfo with structural metadata
    const graphInfo = GraphInfo.builder()
      .databaseInfo(graphStore.databaseInfo())
      .idMapBuilderType(idMapTypeId)
      .nodeCount(graphStore.nodeCount())
      .maxOriginalId(graphStore.nodes().highestOriginalId())
      .relationshipTypeCounts(relTypeCounts)
      .inverseIndexedRelationshipTypes(graphStore.inverseIndexedRelationshipTypes())
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

  /**
   * Gets the graph information.
   */
  graphInfo(): GraphInfo {
    return this._graphInfo;
  }

  /**
   * Gets the node schema.
   */
  nodeSchema(): NodeSchema {
    return this._nodeSchema;
  }

  /**
   * Gets the relationship schema.
   */
  relationshipSchema(): RelationshipSchema {
    return this._relationshipSchema;
  }

  /**
   * Gets the graph property schema.
   */
  graphPropertySchema(): Map<string, PropertySchema> {
    return this._graphPropertySchema;
  }

  /**
   * Returns a string representation of this metadata store.
   */
  toString(): string {
    return `MetaDataStore{` +
      `graphInfo=${this._graphInfo}, ` +
      `nodeSchema=${this._nodeSchema}, ` +
      `relationshipSchema=${this._relationshipSchema}, ` +
      `graphPropertySchema=${this._graphPropertySchema}` +
      `}`;
  }

  /**
   * Checks equality with another MetaDataStore.
   */
  equals(other: MetaDataStore): boolean {
    return this._graphInfo.equals?.(other.graphInfo) &&
           this._nodeSchema.equals?.(other.nodeSchema) &&
           this._relationshipSchema.equals?.(other.relationshipSchema) &&
           this.mapsEqual(this._graphPropertySchema, other._graphPropertySchema);
  }

  /**
   * Helper method to compare Map equality.
   */
  private mapsEqual(map1: Map<string, PropertySchema>, map2: Map<string, PropertySchema>): boolean {
    if (map1.size !== map2.size) return false;

    for (const [key, value] of map1) {
      const otherValue = map2.get(key);
      if (!otherValue || !value.equals?.(otherValue)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a hash code for this metadata store.
   */
  hashCode(): number {
    let hash = 17;
    hash = hash * 31 + (this._graphInfo.hashCode?.() || 0);
    hash = hash * 31 + (this._nodeSchema.hashCode?.() || 0);
    hash = hash * 31 + (this._relationshipSchema.hashCode?.() || 0);
    hash = hash * 31 + this.mapHashCode(this._graphPropertySchema);
    return hash;
  }

  /**
   * Helper method to compute hash code for Map.
   */
  private mapHashCode(map: Map<string, PropertySchema>): number {
    let hash = 0;
    for (const [key, value] of map) {
      hash += key.length + (value.hashCode?.() || 0);
    }
    return hash;
  }
}
