import { GraphProjectConfig } from "../../config/GraphProjectConfig"; // Adjust path as needed

/*
 public fields because Neo4j needs to render them
 not pretty having it here in core, but with UI responsibilities
 maybe revisit one day
*/
export class GraphProjectResult {
  public readonly graphName: string;
  public readonly nodeCount: number; // Assuming long fits into number, otherwise use number
  public readonly relationshipCount: number; // Assuming long fits into number, otherwise use number
  public readonly projectMillis: number; // Assuming long fits into number, otherwise use number

  protected constructor(
    graphName: string,
    nodeCount: number | number,
    relationshipCount: number | number,
    projectMillis: number | number
  ) {
    this.graphName = graphName;
    this.nodeCount = Number(nodeCount);
    this.relationshipCount = Number(relationshipCount);
    this.projectMillis = Number(projectMillis);
  }
}

// Nested Builder class equivalent
export namespace GraphProjectResult {
  // protected fields because this guy is all about reuse via inheritance :grimace:
  export abstract class Builder<
    T extends GraphProjectResult,
    // Self extends Builder<T, Self> is a common pattern for fluent builders in TS
    // to ensure 'this' is typed correctly in subclasses.
    Self extends Builder<T, Self>
  > {
    protected readonly graphName: string;
    protected nodeCount: number | number = 0n; // Default to 0 or 0n
    protected relationshipCount: number | number = 0n; // Default to 0 or 0n
    protected projectMillis: number | number = 0n; // Default to 0 or 0n

    protected constructor(config: GraphProjectConfig) {
      this.graphName = config.graphName();
    }

    // The 'as Self' cast is often needed in abstract builders to return the concrete subclass type.
    public withNodeCount(nodeCount: number | number): Self {
      this.nodeCount = nodeCount;
      return this as unknown as Self;
    }

    public withRelationshipCount(relationshipCount: number | number): Self {
      this.relationshipCount = relationshipCount;
      return this as unknown as Self;
    }

    // Changed to return Self for fluency, common in builder patterns.
    // If it strictly must be void and not chainable, then:
    // public withProjectMillis(projectMillis: number | number): void {
    public withProjectMillis(projectMillis: number | number): Self {
      this.projectMillis = projectMillis;
      return this as unknown as Self;
    }

    public abstract build(): T;
  }
}
