import { NodeLabel } from './NodeLabel';
import { NodeProjections } from './NodeProjections'; // Adjusted import to remove NodeProjectionsBuilder
import { NodeProjection } from './NodeProjection';

/**
 * Immutable implementation of NodeProjections.
 */
export class ImmutableNodeProjections extends NodeProjections {
  /**
   * Creates a new ImmutableNodeProjections with the given projections map.
   * A defensive copy of the projections map is made.
   *
   * @param projections Map of node labels to projections
   */
  private readonly _projections: Map<NodeLabel, NodeProjection>;

  constructor(projections: Map<NodeLabel, NodeProjection>) {
    // Pass a new map to super to ensure immutability of the stored collection
    super();
    this._projections = new Map(projections); // Make a defensive copy
  }

  /**
   * Returns the projections map.
   *
   * @returns A map of node labels to projections
   */
  public projections(): Map<NodeLabel, NodeProjection> {
    return new Map(this._projections); // Return a defensive copy
  }

  /**
   * Adds property mappings and returns a new ImmutableNodeProjections.
   *
   * @param mappings Property mappings to add
   * @returns A new ImmutableNodeProjections with updated mappings
   */
  public addPropertyMappings(mappings: any): ImmutableNodeProjections {
    const newProjectionsMap = new Map(this._projections);
    // Logic to apply mappings and create new NodeProjection instances
    for (const [label, projection] of newProjectionsMap.entries()) {
      // Assuming `withAdditionalPropertyMappings` is a method on NodeProjection
      newProjectionsMap.set(label, projection.withAdditionalPropertyMappings(mappings));
    }
    return new ImmutableNodeProjections(newProjectionsMap);
  }

  /**
   * Creates a builder for ImmutableNodeProjections.
   *
   * @returns A new builder instance
   */
  public static builder(): ImmutableNodeProjections.Builder {
    return new ImmutableNodeProjections.Builder();
  }

  /**
   * Creates ImmutableNodeProjections from a map of projections.
   *
   * @param projections Map of node labels to projections
   * @returns A new ImmutableNodeProjections
   */
  public static of(projections: Map<NodeLabel, NodeProjection>): ImmutableNodeProjections {
    // The constructor already handles making a defensive copy.
    return new ImmutableNodeProjections(projections);
  }

  /**
   * Creates an empty ImmutableNodeProjections.
   *
   * @returns An empty instance
   */
  public static empty(): ImmutableNodeProjections {
    return new ImmutableNodeProjections(new Map());
  }

  // Override methods that might mutate if NodeProjections is mutable
  // For example, if NodeProjections had an addPropertyMappings that mutated,
  // ImmutableNodeProjections would need to override it to return a new instance.
  // public addPropertyMappings(mappings: PropertyMappings): ImmutableNodeProjections {
  //   const newProjectionsMap = new Map(this.projections()); // Get current projections
  //   // Logic to apply mappings and create new NodeProjection instances
  //   // This is a placeholder for the actual logic
  //   for (const [label, projection] of newProjectionsMap.entries()) {
  //       newProjectionsMap.set(label, projection.withAdditionalPropertyMappings(mappings));
  //   }
  //   return new ImmutableNodeProjections(newProjectionsMap);
  // }
}

// Define the Builder within a namespace tied to ImmutableNodeProjections
export namespace ImmutableNodeProjections {
  /**
   * Builder class for ImmutableNodeProjections.
   */
  export class Builder { // Extend the base builder
    // _projections is inherited from NodeProjectionsBuilder (if it's protected or public)
    // If NodeProjectionsBuilder._projections is private, this builder needs its own
    // and to pass it correctly. Assuming it's accessible (e.g., protected).

    private readonly _projections: Map<NodeLabel, NodeProjection>;

    constructor() {
      this._projections = new Map(); // Initialize the projections map
    }

    // putProjection is inherited if its signature is compatible.
    // If NodeProjectionsBuilder.putProjection returns NodeProjectionsBuilder,
    // we might need to override it to return `this` typed as `ImmutableNodeProjections.Builder`.
    // However, `return this;` in the base class often works correctly with derived types.

    // public putProjection(label: NodeLabel, projection: NodeProjection): this {
    //   super.putProjection(label, projection);
    //   return this;
    // }

    /**
     * Builds the immutable node projections.
     *
     * @returns A new ImmutableNodeProjections
     */
    public build(): ImmutableNodeProjections {
      // 'this._projections' is inherited from NodeProjectionsBuilder
      // The ImmutableNodeProjections constructor will make a defensive copy.
      return new ImmutableNodeProjections(this._projections);
    }
  }
}
