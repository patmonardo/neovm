/**
 * GRAPH DROP RELATIONSHIP RESULT - SIMPLE DATA CONTAINER
 *
 * Result of dropping relationships from a graph. Just holds the data, nothing fancy.
 */

import { DeletionResult } from './DeletionResult';

export class GraphDropRelationshipResult {
  public readonly graphName: string;
  public readonly relationshipType: string;
  public readonly deletedRelationships: number;
  public readonly deletedProperties: Map<string, number>;

  constructor(
    graphName: string,
    relationshipType: string,
    deletionResult: DeletionResult
  ) {
    this.graphName = graphName;
    this.relationshipType = relationshipType;
    this.deletedRelationships = deletionResult.deletedRelationships();
    this.deletedProperties = new Map(Object.entries(deletionResult.deletedProperties()));
  }
}
