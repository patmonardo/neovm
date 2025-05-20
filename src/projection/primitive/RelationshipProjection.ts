import { ElementProjection } from "../abstract/ElementProjection";
import { PropertyMappings } from "./PropertyMappings";
import { Orientation } from "../Orientation";
import { Aggregation } from "@/core/Aggregation";
import { RelationshipType } from "../RelationshipType";

/**
 * Represents a projection for relationships in a graph.
 */
export class RelationshipProjection extends ElementProjection {
  // Static constants
  public static readonly TYPE_KEY = "type";
  public static readonly ORIENTATION_KEY = "orientation";
  public static readonly AGGREGATION_KEY = "aggregation";
  public static readonly INDEX_INVERSE_KEY = "indexInverse";

  private static _ALL: RelationshipProjection | null = null;
  private static _ALL_UNDIRECTED: RelationshipProjection | null = null;

  // Static getters for constants that need lazy initialization
  public static get ALL(): RelationshipProjection {
    if (!this._ALL) {
      this._ALL = new RelationshipProjection(
        ElementProjection.PROJECT_ALL,
        Orientation.NATURAL
      );
    }
    return this._ALL;
  }

  public static get ALL_UNDIRECTED(): RelationshipProjection {
    if (!this._ALL_UNDIRECTED) {
      this._ALL_UNDIRECTED = new RelationshipProjection(
        ElementProjection.PROJECT_ALL,
        Orientation.UNDIRECTED
      );
    }
    return this._ALL_UNDIRECTED;
  }

  // Private fields
  private readonly _type: string;
  private readonly _orientation: Orientation;
  private readonly _aggregation: Aggregation;
  private readonly _indexInverse: boolean;
  private readonly _properties: PropertyMappings;

  /**
   * Creates a new RelationshipProjection.
   */
  constructor(
    type: string,
    orientation: Orientation = Orientation.NATURAL,
    aggregation: Aggregation = Aggregation.DEFAULT,
    indexInverse: boolean = false,
    properties: PropertyMappings = PropertyMappings.of()
  ) {
    super();
    this._type = type || "";
    this._orientation = orientation;
    this._aggregation = aggregation;
    this._indexInverse = indexInverse;
    this._properties = properties;
    this.check(); // Validate during construction
  }

  // Getters
  public type(): string {
    return this._type;
  }

  public orientation(): Orientation {
    return this._orientation;
  }

  public aggregation(): Aggregation {
    return this._aggregation;
  }

  public indexInverse(): boolean {
    return this._indexInverse;
  }

  public properties(): PropertyMappings {
    return this._properties;
  }

  /**
   * Validates the relationship projection configuration.
   */
  protected check(): void {
    if (this.orientation() === Orientation.UNDIRECTED && this.indexInverse()) {
      throw new Error(
        `Relationship projection \`${this.type()}\` cannot be UNDIRECTED and inverse indexed. ` +
          `Indexing the inverse orientation is only allowed for NATURAL and REVERSE.`
      );
    }
  }

  /**
   * Checks if the projection defines a global aggregation that requires at least
   * one property mapping, such as `MIN`.
   */
  public checkAggregation(): void {
    this.check();

    if (this.properties().isEmpty()) {
      switch (this.aggregation()) {
        case Aggregation.COUNT:
        case Aggregation.SUM:
        case Aggregation.MIN:
        case Aggregation.MAX:
          throw new Error(
            `Setting a global \`${this.aggregation()}\` aggregation requires at least one property mapping.`
          );
      }
    }
  }

  /**
   * Checks if this projection includes all relationships.
   */
  public projectAll(): boolean {
    return this.type() === ElementProjection.PROJECT_ALL;
  }

  /**
   * Determines whether to include aggregation in serialization.
   */
  protected includeAggregation(): boolean {
    return true;
  }

  /**
   * Writes relationship projection data to the provided object.
   */
  protected writeToObject(value: Record<string, any>): void {
    value[RelationshipProjection.TYPE_KEY] = this.type();
    value[RelationshipProjection.ORIENTATION_KEY] =
      this.orientation().toString();
    value[RelationshipProjection.AGGREGATION_KEY] =
      this.aggregation().toString();
    value[RelationshipProjection.INDEX_INVERSE_KEY] = this.indexInverse();
  }

  /**
   * Creates a new projection with additional property mappings.
   */
  public withAdditionalPropertyMappings(
    mappings: PropertyMappings
  ): RelationshipProjection {
    // Apply the same aggregation to the new mappings
    const withSameAggregation = PropertyMappings.of(
      ...Array.from(mappings).map((mapping) =>
        mapping.setNonDefaultAggregation(this.aggregation())
      )
    );

    const newMappings = this.properties().mergeWith(withSameAggregation);

    // If properties haven't changed, return this instance
    if (newMappings === this.properties()) {
      return this;
    }

    // Create a new instance with updated properties
    return new RelationshipProjection(
      this.type(),
      this.orientation(),
      this.aggregation(),
      this.indexInverse(),
      newMappings
    );
  }

  /**
   * Checks if this relationship projection represents a multi-graph.
   */
  public isMultiGraph(): boolean {
    const somePropertyIsNotAggregated = Array.from(this.properties()).some(
      (mapping) => Aggregation.equivalentToNone(mapping.aggregation())
    );

    return (
      Aggregation.equivalentToNone(this.aggregation()) &&
      (this.properties().isEmpty() || somePropertyIsNotAggregated)
    );
  }

  // Static factory methods

  /**
   * Creates a relationship projection from a string.
   */
  public static fromString(type: string): RelationshipProjection {
    return new RelationshipProjection(type);
  }

  /**
   * Creates a relationship projection from a map.
   */
  public static fromMap(
    map: Record<string, any>,
    relationshipType: RelationshipType
  ): RelationshipProjection {
    RelationshipProjection.validateConfigKeys(map);

    const type = String(
      map[RelationshipProjection.TYPE_KEY] || relationshipType.name
    );

    let orientation = Orientation.NATURAL;
    if (map[RelationshipProjection.ORIENTATION_KEY]) {
      orientation = Orientation.parse(
        map[RelationshipProjection.ORIENTATION_KEY]
      );
    }

    let indexInverse = false;
    if (map[RelationshipProjection.INDEX_INVERSE_KEY] !== undefined) {
      indexInverse = Boolean(map[RelationshipProjection.INDEX_INVERSE_KEY]);
    }

    let aggregation = Aggregation.DEFAULT;
    if (map[RelationshipProjection.AGGREGATION_KEY]) {
      aggregation = Aggregation.parse(
        map[RelationshipProjection.AGGREGATION_KEY]
      );
    }

    // Handle properties
    const propertiesObj = map[ElementProjection.PROPERTIES_KEY] || {};
    const properties = PropertyMappings.fromObjectWithAggregation(propertiesObj, aggregation);

    return new RelationshipProjection(
      type,
      orientation,
      aggregation,
      indexInverse,
      properties
    );
  }

  /**
   * Creates a relationship projection from an object.
   */
  public static fromObject(
    object: any,
    relationshipType: RelationshipType
  ): RelationshipProjection {
    if (object === null || object === undefined) {
      return RelationshipProjection.ALL;
    }

    if (typeof object === "string") {
      return RelationshipProjection.fromString(object);
    }

    if (typeof object === "object") {
      // Convert to case-insensitive map
      const caseInsensitiveMap: Record<string, any> = {};
      for (const key in object) {
        caseInsensitiveMap[key.toLowerCase()] = object[key];
      }
      return RelationshipProjection.fromMap(
        caseInsensitiveMap,
        relationshipType
      );
    }

    throw new Error(
      `Cannot construct a relationship filter out of a ${typeof object}`
    );
  }
  /**
   * Creates a relationship projection with specified parameters.
   * Handles multiple possible parameter combinations.
   */
  public static of(
    type: string,
    orientationOrAggregation?: Orientation | Aggregation,
    aggregation?: Aggregation
  ): RelationshipProjection {
    if (aggregation !== undefined) {
      // Called with type, orientation, aggregation
      return new RelationshipProjection(
        type,
        orientationOrAggregation as Orientation,
        aggregation
      );
    } else if (orientationOrAggregation !== undefined) {
      // Need to determine if orientationOrAggregation is an Orientation or Aggregation
      // Check if it matches any Orientation enum value
      if (
        orientationOrAggregation === Orientation.NATURAL ||
        orientationOrAggregation === Orientation.REVERSE ||
        orientationOrAggregation === Orientation.UNDIRECTED
      ) {
        // It's an Orientation
        return new RelationshipProjection(type, orientationOrAggregation);
      } else {
        // It's an Aggregation
        return new RelationshipProjection(
          type,
          Orientation.NATURAL,
          orientationOrAggregation as Aggregation
        );
      }
    }
    // Called with type only
    return new RelationshipProjection(type);
  }

  /**
   * Validates that the map contains only allowed keys.
   */
  private static validateConfigKeys(map: Record<string, any>): void {
    const allowedKeys = [
      RelationshipProjection.TYPE_KEY,
      RelationshipProjection.ORIENTATION_KEY,
      RelationshipProjection.AGGREGATION_KEY,
      ElementProjection.PROPERTIES_KEY,
      RelationshipProjection.INDEX_INVERSE_KEY,
    ];

    for (const key of Object.keys(map)) {
      if (!allowedKeys.includes(key.toLowerCase())) {
        throw new Error(
          `Unexpected key: ${key}. Allowed keys are: ${allowedKeys.join(", ")}`
        );
      }
    }
  }
}
