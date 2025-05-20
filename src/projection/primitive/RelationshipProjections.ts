import { ElementProjection } from "../abstract/ElementProjection";
import { AbstractProjections } from "../abstract/AbstractProjections";
import { PropertyMappings } from "./PropertyMappings";
import { RelationshipType } from "../RelationshipType";
import { RelationshipProjection } from "./RelationshipProjection";

/**
 * Collection of relationship projections for configuring relationship filtering in graph projections.
 */
export class RelationshipProjections extends AbstractProjections<
  RelationshipType,
  RelationshipProjection
> {
  /**
   * The underlying projections map.
   * This will be the single source of truth for projections.
   */
  private readonly _projections: Map<RelationshipType, RelationshipProjection>;

  /**
   * Creates a new RelationshipProjections.
   *
   * @param projections Map of relationship types to projections.
   *                    A defensive copy is made to ensure encapsulation.
   */
  constructor(projections: Map<RelationshipType, RelationshipProjection>) {
    super();
    // Ensure we store a copy, especially if the input map might be mutated elsewhere.
    // The 'create' method already does this, so this constructor will receive a new Map.
    this._projections = projections;
  }

  public static builder(): RelationshipProjectionsBuilder {
    return new RelationshipProjectionsBuilder();
  }

  /**
   * Returns the underlying projections map.
   * Consider returning a readonly view or a copy if strict immutability is required
   * for the returned map itself, though the class isn't named "Immutable".
   */
  public projections(): Map<RelationshipType, RelationshipProjection> {
    return this._projections;
  }

  // Other methods...
  public getProjection(
    type: RelationshipType
  ): RelationshipProjection | undefined {
    // Use the consistent internal property '_projections'
    return this._projections.get(type);
  }

  /**
   * A projection that includes all relationships with natural orientation.
   */
  public static readonly ALL: RelationshipProjections =
    RelationshipProjections.create(
      new Map([
        [RelationshipType.ALL_RELATIONSHIPS, RelationshipProjection.ALL],
      ])
    );

  /**
   * A projection that includes all relationships with undirected orientation.
   */
  public static readonly ALL_UNDIRECTED: RelationshipProjections =
    RelationshipProjections.create(
      new Map([
        [
          RelationshipType.ALL_RELATIONSHIPS,
          RelationshipProjection.ALL_UNDIRECTED,
        ],
      ])
    );


  /**
   * Creates RelationshipProjections from an object.
   *
   * @param object The object to create from
   * @returns A new RelationshipProjections
   */
  public static fromObject(object: any): RelationshipProjections {
    if (object === null || object === undefined) {
      return RelationshipProjections.ALL;
    }

    if (object instanceof RelationshipProjections) {
      return object;
    }

    if (typeof object === "string") {
      return RelationshipProjections.fromString(object);
    }

    if (
      object instanceof Map ||
      (typeof object === "object" && object !== null)
    ) {
      return RelationshipProjections.fromMap(object);
    }

    // Ensure 'object' is iterable before attempting to use Symbol.iterator
    if (object != null && typeof object[Symbol.iterator] === 'function') {
      return RelationshipProjections.fromList(object);
    }

    throw new Error(
      `Cannot construct a relationship projection out of a ${
        object?.constructor?.name || typeof object
      }`
    );
  }

  /**
   * Creates RelationshipProjections from a string.
   *
   * @param typeString The relationship type string
   * @returns A new RelationshipProjections
   */
  public static fromString(
    typeString: string | null | undefined
  ): RelationshipProjections {
    // Ensure typeString is not null/undefined before calling validateIdentifierName if it expects a string
    const validIdentifier = typeString || "";
    if (typeString !== ElementProjection.PROJECT_ALL) { // PROJECT_ALL might be a special case not needing validation
        RelationshipProjections.validateIdentifierName(validIdentifier);
    }


    if (!typeString) {
      // Consider if an empty string should lead to an empty projection or throw.
      // The original 'create' throws if projections map is empty.
      // For now, let's assume an empty string means no specific projection,
      // which might be invalid based on `create`'s logic.
      // This path might need to align with how `create` handles empty maps.
      // Let's make it consistent with `create` by projecting ALL if string is empty/null.
      // Or, if an empty projection is truly desired, `create` needs to allow it.
      // Based on `create` throwing on empty, an empty string should probably not result in an empty map.
      // Let's assume an empty string means "project all" or is invalid.
      // The original code did: return RelationshipProjections.create(new Map()); which would throw.
      // Let's make it return ALL for consistency with fromObject(null)
       return RelationshipProjections.ALL;
    }

    if (typeString === ElementProjection.PROJECT_ALL) {
      return RelationshipProjections.create( // This is fine
        new Map([
          [RelationshipType.ALL_RELATIONSHIPS, RelationshipProjection.ALL],
        ])
      );
    }

    const relationshipType = RelationshipType.of(typeString);
    const projection = RelationshipProjection.fromString(typeString); // Assuming this is correct
    return RelationshipProjections.create(
      new Map([[relationshipType, projection]])
    );
  }

  /**
   * Creates RelationshipProjections from a map.
   *
   * @param map The map to create from
   * @returns A new RelationshipProjections
   */
  private static fromMap(
    map: Map<string, any> | Record<string, any>
  ): RelationshipProjections {
    const projections = new Map<RelationshipType, RelationshipProjection>();

    const entries: Array<[string, any]> =
      map instanceof Map ? Array.from(map.entries()) : Object.entries(map);

    if (entries.length === 0) {
        // Consistent with `create` behavior: throw if no projections are defined.
        // Or, if fromMap with empty input should mean "ALL", then return RelationshipProjections.ALL
        throw new Error(
          "Cannot create RelationshipProjections from an empty map; at least one relationship type must be projected."
        );
    }

    for (const [name, spec] of entries) {
      RelationshipProjections.validateIdentifierName(name); // Validate each key
      const relationshipType = RelationshipType.of(name);
      const projection = RelationshipProjection.fromObject(
        spec,
        relationshipType
      );

      if (projections.has(relationshipType)) {
        throw new Error(`Duplicate key: ${name}`);
      }

      projections.set(relationshipType, projection);
    }

    return RelationshipProjections.create(projections);
  }

  /**
   * Creates RelationshipProjections from a list.
   *
   * @param items The items to create from
   * @returns A new RelationshipProjections
   */
  private static fromList(items: Iterable<any>): RelationshipProjections {
    const projections = new Map<RelationshipType, RelationshipProjection>();
    let hasItems = false;

    for (const item of items) {
      hasItems = true;
      const relationshipProjections = RelationshipProjections.fromObject(item);
      for (const [type, projection] of relationshipProjections.projections()) { // Uses the public accessor
        projections.set(type, projection);
      }
    }
    if (!hasItems) {
        // Consistent with `create` behavior: throw if no projections are defined.
        // Or, if fromList with empty input should mean "ALL", then return RelationshipProjections.ALL
         throw new Error(
          "Cannot create RelationshipProjections from an empty list; at least one relationship type must be projected."
        );
    }


    return RelationshipProjections.create(projections);
  }

  /**
   * Creates RelationshipProjections from a map.
   * This is the primary factory that ensures defensive copying and validation.
   *
   * @param projections Map of relationship types to projections
   * @returns A new RelationshipProjections
   */
  public static create(
    projections: Map<RelationshipType, RelationshipProjection>
  ): RelationshipProjections {
    if (projections.size === 0) {
      throw new Error(
        "An empty relationship projection was given; at least one relationship type must be projected."
      );
    }
    // Create a new Map instance to ensure the stored map is a copy
    return new RelationshipProjections(new Map(projections));
  }

  /**
   * Creates RelationshipProjections with a single projection.
   *
   * @param relationshipType The relationship type
   * @param projection The relationship projection
   * @returns A new RelationshipProjections
   */
  public static single(
    relationshipType: RelationshipType,
    projection: RelationshipProjection
  ): RelationshipProjections {
    // `create` will handle making the copy of the map
    return RelationshipProjections.create(
      new Map([[relationshipType, projection]])
    );
  }

  /**
   * Returns a projection that includes all relationships.
   *
   * @returns A projection for all relationships
   */
  public static all(): RelationshipProjections {
    return RelationshipProjections.ALL;
  }

  /**
   * Gets a relationship projection by type.
   *
   * @param relationshipType The relationship type
   * @returns The projection for the type
   * @throws Error if the relationship type does not exist
   */
  public getFilter(relationshipType: RelationshipType): RelationshipProjection {
    const filter = this.projections().get(relationshipType); // Uses the public accessor
    if (!filter) {
      throw new Error(
        `Relationship type does not exist: ${relationshipType.name()}`
      );
    }
    return filter;
  }

  /**
   * Adds property mappings to all projections.
   *
   * @param mappings The mappings to add
   * @returns A new RelationshipProjections
   */
  public addPropertyMappings(
    mappings: PropertyMappings
  ): RelationshipProjections {
    if (!mappings.hasMappings()) {
      return this;
    }

    return this.modifyProjections((p) =>
      p.withAdditionalPropertyMappings(mappings)
    );
  }

  /**
   * Modifies all projections using the given operator.
   *
   * @param operator The function to apply to each projection
   * @returns A new RelationshipProjections
   */
  private modifyProjections(
    operator: (projection: RelationshipProjection) => RelationshipProjection
  ): RelationshipProjections {
    const newProjections = new Map<RelationshipType, RelationshipProjection>();

    for (const [key, value] of this.projections()) { // Uses the public accessor
      newProjections.set(key, operator(value));
    }

    // This logic seems to ensure that if modifications result in an empty projection set,
    // it defaults to projecting ALL_RELATIONSHIPS with the operator applied.
    // This might be specific domain logic.
    if (newProjections.size === 0) {
      newProjections.set(
        RelationshipType.ALL_RELATIONSHIPS,
        operator(RelationshipProjection.ALL)
      );
    }

    return RelationshipProjections.create(newProjections);
  }

  /**
   * Returns a string representation of the type projections.
   *
   * @returns Pipe-separated list of types
   */
  public typeFilter(): string {
    if (this.isEmpty()) {
      return "";
    }

    const types = new Set<string>();
    for (const projection of this.projections().values()) { // Uses the public accessor
      // Assuming projection.type() returns the string name of the relationship type
      // If projection.type() returns RelationshipType, then use .name()
      // For now, assuming it's a string as per original intent.
      // If RelationshipProjection has a method like `getRelationshipType(): RelationshipType`
      // then it would be `types.add(projection.getRelationshipType().name())`
      // Let's assume `projection.type()` is the string identifier.
      types.add(projection.type());
    }

    return Array.from(types).join("|");
  }

  /**
   * Checks if this projections is empty.
   *
   * @returns True if empty
   */
  public isEmpty(): boolean {
    return this.projections().size === 0; // Uses the public accessor
  }

  /**
   * Converts this projections to an object.
   *
   * @returns Object representation
   */
  public toObject(): Record<string, any> {
    const value: Record<string, any> = {};

    for (const [identifier, projection] of this.projections()) { // Uses the public accessor
      value[identifier.name()] = projection.toObject();
    }

    return value;
  }

  /**
   * Converts a RelationshipProjections to an object.
   *
   * @param relationshipProjections The projections to convert
   * @returns Object representation
   */
  public static toObject(
    relationshipProjections: RelationshipProjections
  ): Record<string, any> {
    return relationshipProjections.toObject();
  }

  /**
   * Validates an identifier name.
   *
   * @param identifier The identifier to validate
   * @throws Error if the identifier is invalid
   */
  public static validateIdentifierName(identifier: string): void {
    if (identifier === RelationshipType.ALL_RELATIONSHIPS.name()) {
      throw new Error(
        `${RelationshipType.ALL_RELATIONSHIPS.name()} is a reserved relationship type and may not be used`
      );
    }
    // Add other validation rules if necessary (e.g., empty string, invalid characters)
    if (identifier.trim() === "") {
        throw new Error("Relationship type identifier cannot be empty or only whitespace.");
    }
  }

  // The static builder method is already defined above.
}

export class RelationshipProjectionsBuilder {
  // This internal 'projections' map is fine.
  public projections: Map<RelationshipType, RelationshipProjection> =
    new Map();

  constructor() {
    // The explicit initialization here is redundant if the property initializer is used,
    // but it doesn't hurt.
    this.projections = new Map<RelationshipType, RelationshipProjection>();
  }

  public putProjection(
    type: RelationshipType,
    projection: RelationshipProjection
  ): RelationshipProjectionsBuilder { // Ensure 'this' is typed correctly if needed, but Builder is fine
    RelationshipProjections.validateIdentifierName(type.name()); // Validate before putting
    this.projections.set(type, projection);
    return this;
  }

  public build(): RelationshipProjections {
    // The RelationshipProjections.create factory will handle empty check and defensive copy
    return RelationshipProjections.create(this.projections);
  }
}
