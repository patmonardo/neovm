/**
 * Contains essential metadata about a graph stored in the GDS file format.
 * This record captures the key structural information needed to reconstruct
 * or understand a graph without loading all the data.
 */

import { RelationshipType } from '@/projection';
import { DatabaseInfo } from '@/api';

export class GraphInfo {
  /**
   * Creates a new GraphInfo instance.
   */
  constructor(
    private readonly _databaseInfo: DatabaseInfo,
    private readonly _idMapBuilderType: string,
    private readonly _nodeCount: number,
    private readonly _maxOriginalId: number,
    private readonly _relationshipTypeCounts: Map<RelationshipType, number>,
    private readonly _inverseIndexedRelationshipTypes: RelationshipType[]
  ) {}

  /**
   * Creates a new GraphInfoBuilder for constructing GraphInfo instances.
   */
  static builder(): GraphInfoBuilder {
    return new GraphInfoBuilder();
  }

  // GETTER METHODS
  databaseInfo(): DatabaseInfo {
    return this._databaseInfo;
  }

  idMapBuilderType(): string {
    return this._idMapBuilderType;
  }

  nodeCount(): number {
    return this._nodeCount;
  }

  maxOriginalId(): number {
    return this._maxOriginalId;
  }

  relationshipTypeCounts(): Map<RelationshipType, number> {
    return this._relationshipTypeCounts;
  }

  inverseIndexedRelationshipTypes(): RelationshipType[] {
    return this._inverseIndexedRelationshipTypes;
  }

  /**
   * Returns the total number of relationships across all types.
   */
  totalRelationshipCount(): number {
    return Array.from(this._relationshipTypeCounts.values())
      .reduce((sum, count) => sum + count, 0);
  }

  /**
   * Gets the count for a specific relationship type.
   */
  getRelationshipCount(relationshipType: RelationshipType): number {
    return this._relationshipTypeCounts.get(relationshipType) || 0;
  }

  /**
   * Checks if a relationship type has an inverse index.
   */
  hasInverseIndex(relationshipType: RelationshipType): boolean {
    return this._inverseIndexedRelationshipTypes.includes(relationshipType);
  }

  /**
   * Returns all relationship types present in the graph.
   */
  relationshipTypes(): RelationshipType[] {
    return Array.from(this._relationshipTypeCounts.keys());
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
