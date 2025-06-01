/**
 * GRAPH PROJECT RESULT - SIMPLE DATA CONTAINER
 *
 * Base result class for graph projection operations.
 * Public fields because Neo4j needs to render them for UI.
 */

export class GraphProjectResult {
  public readonly graphName: string;
  public readonly nodeCount: number;
  public readonly relationshipCount: number;
  public readonly projectMillis: number;

  constructor(
    graphName: string,
    nodeCount: number,
    relationshipCount: number,
    projectMillis: number
  ) {
    this.graphName = graphName;
    this.nodeCount = nodeCount;
    this.relationshipCount = relationshipCount;
    this.projectMillis = projectMillis;
  }

  static builder(graphName: string): GraphProjectResultBuilder {
    return new GraphProjectResultBuilder(graphName);
  }
}

export class GraphProjectResultBuilder {
  private nodeCount: number = 0;
  private relationshipCount: number = 0;
  private projectMillis: number = 0;

  constructor(private readonly graphName: string) {}

  withNodeCount(nodeCount: number): this {
    this.nodeCount = nodeCount;
    return this;
  }

  withRelationshipCount(relationshipCount: number): this {
    this.relationshipCount = relationshipCount;
    return this;
  }

  withProjectMillis(projectMillis: number): this {
    this.projectMillis = projectMillis;
    return this;
  }

  build(): GraphProjectResult {
    return new GraphProjectResult(
      this.graphName,
      this.nodeCount,
      this.relationshipCount,
      this.projectMillis
    );
  }
}
