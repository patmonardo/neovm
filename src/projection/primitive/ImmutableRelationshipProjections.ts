import {
  RelationshipProjections,
  RelationshipProjectionsBuilder
} from './RelationshipProjections';
import { RelationshipType } from '../RelationshipType';
import { RelationshipProjection } from './RelationshipProjection';

/**
 * Immutable implementation of RelationshipProjections.
 */
export class ImmutableRelationshipProjections extends RelationshipProjections {
  /**
   * Creates a new ImmutableRelationshipProjections.
   * A defensive copy of the projections map is made.
   *
   * @param projections Map of relationship types to projections
   */
  constructor(projections: Map<RelationshipType, RelationshipProjection>) {
    // Pass a new map to super to ensure immutability of the stored collection
    super(new Map(projections));
  }

  /**
   * Creates a builder for ImmutableRelationshipProjections.
   *
   * @returns A new builder
   */
  public static builder(): ImmutableRelationshipProjections.Builder { // Correct return type
    return new ImmutableRelationshipProjections.Builder();
  }

  /**
   * Creates ImmutableRelationshipProjections from a map of projections.
   *
   * @param projections Map of relationship types to projections
   * @returns A new ImmutableRelationshipProjections
   */
  public static of(projections: Map<RelationshipType, RelationshipProjection>): ImmutableRelationshipProjections {
    // The constructor handles making a defensive copy.
    return new ImmutableRelationshipProjections(projections);
  }

  /**
   * Creates an empty ImmutableRelationshipProjections.
   *
   * @returns An empty instance
   */
  public static empty(): ImmutableRelationshipProjections {
    return new ImmutableRelationshipProjections(new Map());
  }

  // If RelationshipProjections has mutable methods, override them here
  // to return new instances of ImmutableRelationshipProjections.
  // Example:
  // public addPropertyMappings(mappings: PropertyMappings): ImmutableRelationshipProjections {
  //   const newProjectionsMap = new Map(this.projections());
  //   for (const [type, projection] of newProjectionsMap.entries()) {
  //       newProjectionsMap.set(type, projection.withAdditionalPropertyMappings(mappings));
  //   }
  //   return new ImmutableRelationshipProjections(newProjectionsMap);
  // }
}

// Define the Builder within a namespace tied to ImmutableRelationshipProjections
export namespace ImmutableRelationshipProjections {
  /**
   * Builder class for ImmutableRelationshipProjections.
   */
  export class Builder extends RelationshipProjectionsBuilder { // Extend the base builder
    // _projections is inherited from RelationshipProjectionsBuilder (if protected/public)

    constructor() {
      super();
    }

    // putProjection is inherited if its signature is compatible.
    // If RelationshipProjectionsBuilder.putProjection returns RelationshipProjectionsBuilder,
    // we might need to override it to return `this` typed as `ImmutableRelationshipProjections.Builder`.
    // However, `return this;` in the base class often works correctly with derived types.

    // public putProjection(type: RelationshipType, projection: RelationshipProjection): this {
    //   super.putProjection(type, projection);
    //   return this;
    // }

    /**
     * Builds the immutable relationship projections.
     *
     * @returns A new ImmutableRelationshipProjections
     */
    public build(): ImmutableRelationshipProjections {
      // 'this._projections' is inherited from RelationshipProjectionsBuilder
      // The ImmutableRelationshipProjections constructor will make a defensive copy.
      return new ImmutableRelationshipProjections(this.projections);
    }
  }
}
