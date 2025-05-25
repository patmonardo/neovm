import { RelationshipType } from '@/projection';
import { DatabaseInfo } from '@/api';

/**
 * Contains essential metadata about a graph stored in the GDS file format.
 * This record captures the key structural information needed to reconstruct
 * or understand a graph without loading all the data.
 */
export class GraphInfo {
  /**
   * Creates a new GraphInfo instance.
   *
   * @param databaseInfo Information about the source database
   * @param idMapBuilderType The type of ID mapping strategy used
   * @param nodeCount Total number of nodes in the graph
   * @param maxOriginalId The highest original node ID encountered
   * @param relationshipTypeCounts Map of relationship types to their counts
   * @param inverseIndexedRelationshipTypes List of relationship types that have inverse indexes
   */
  constructor(
    public readonly databaseInfo: DatabaseInfo,
    public readonly idMapBuilderType: string,
    public readonly nodeCount: number,
    public readonly maxOriginalId: number,
    public readonly relationshipTypeCounts: Map<RelationshipType, number>,
    public readonly inverseIndexedRelationshipTypes: RelationshipType[]
  ) {}

  /**
   * Creates a new GraphInfoBuilder for constructing GraphInfo instances.
   */
  static builder(): GraphInfoBuilder {
    return new GraphInfoBuilder();
  }

  /**
   * Returns the total number of relationships across all types.
   */
  get totalRelationshipCount(): number {
    return Array.from(this.relationshipTypeCounts.values())
      .reduce((sum, count) => sum + count, 0);
  }

  /**
   * Gets the count for a specific relationship type.
   */
  getRelationshipCount(relationshipType: RelationshipType): number {
    return this.relationshipTypeCounts.get(relationshipType) || 0;
  }

  /**
   * Checks if a relationship type has an inverse index.
   */
  hasInverseIndex(relationshipType: RelationshipType): boolean {
    return this.inverseIndexedRelationshipTypes.includes(relationshipType);
  }

  /**
   * Returns all relationship types present in the graph.
   */
  get relationshipTypes(): RelationshipType[] {
    return Array.from(this.relationshipTypeCounts.keys());
  }
}

/**
 * Builder class for constructing GraphInfo instances.
 */
export class GraphInfoBuilder {
  private _databaseInfo?: DatabaseInfo;
  private _idMapBuilderType?: string;
  private _nodeCount?: number;
  private _maxOriginalId?: number;
  private _relationshipTypeCounts = new Map<RelationshipType, number>();
  private _inverseIndexedRelationshipTypes: RelationshipType[] = [];

  databaseInfo(databaseInfo: DatabaseInfo): this {
    this._databaseInfo = databaseInfo;
    return this;
  }

  idMapBuilderType(idMapBuilderType: string): this {
    this._idMapBuilderType = idMapBuilderType;
    return this;
  }

  nodeCount(nodeCount: number): this {
    this._nodeCount = nodeCount;
    return this;
  }

  maxOriginalId(maxOriginalId: number): this {
    this._maxOriginalId = maxOriginalId;
    return this;
  }

  relationshipTypeCounts(relationshipTypeCounts: Map<RelationshipType, number>): this {
    this._relationshipTypeCounts = new Map(relationshipTypeCounts);
    return this;
  }

  addRelationshipTypeCount(relationshipType: RelationshipType, count: number): this {
    this._relationshipTypeCounts.set(relationshipType, count);
    return this;
  }

  inverseIndexedRelationshipTypes(types: RelationshipType[]): this {
    this._inverseIndexedRelationshipTypes = [...types];
    return this;
  }

  addInverseIndexedRelationshipType(relationshipType: RelationshipType): this {
    this._inverseIndexedRelationshipTypes.push(relationshipType);
    return this;
  }

  build(): GraphInfo {
    if (!this._databaseInfo) throw new Error('databaseInfo is required');
    if (!this._idMapBuilderType) throw new Error('idMapBuilderType is required');
    if (this._nodeCount === undefined) throw new Error('nodeCount is required');
    if (this._maxOriginalId === undefined) throw new Error('maxOriginalId is required');

    return new GraphInfo(
      this._databaseInfo,
      this._idMapBuilderType,
      this._nodeCount,
      this._maxOriginalId,
      this._relationshipTypeCounts,
      this._inverseIndexedRelationshipTypes
    );
  }
}
