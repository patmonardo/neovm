import { ElementProjection, InlineProperties, InlinePropertiesBuilder } from './ElementProjection';
import { PropertyMappings } from './PropertyMappings';
import { Aggregation } from '@/core/Aggregation';
import { RelationshipType } from './RelationshipType';
import { Orientation } from './Orientation';

/**
 * Options for creating a RelationshipProjection.
 */
export interface RelationshipProjectionOptions {
  /** Relationship type */
  type: string;
  /** Relationship orientation */
  orientation?: Orientation;
  /** Aggregation strategy */
  aggregation?: Aggregation;
  /** Whether to index inverse relationships */
  indexInverse?: boolean;
}

/**
 * Represents a projection for relationships in a graph.
 */
export class RelationshipProjection extends ElementProjection {
  /**
   * A projection that includes all relationships with natural orientation.
   */
  public static readonly ALL: RelationshipProjection = RelationshipProjection.of({
    type: ElementProjection.PROJECT_ALL,
    orientation: Orientation.NATURAL
  });

  /**
   * A projection that includes all relationships with undirected orientation.
   */
  public static readonly ALL_UNDIRECTED: RelationshipProjection = RelationshipProjection.of({
    type: ElementProjection.PROJECT_ALL,
    orientation: Orientation.UNDIRECTED
  });

  /**
   * Key used for relationship types in configuration objects.
   */
  public static readonly TYPE_KEY = "type";

  /**
   * Key used for orientation in configuration objects.
   */
  public static readonly ORIENTATION_KEY = "orientation";

  /**
   * Key used for aggregation in configuration objects.
   */
  public static readonly AGGREGATION_KEY = "aggregation";

  /**
   * Key used for indexInverse in configuration objects.
   */
  public static readonly INDEX_INVERSE_KEY = "indexInverse";

  /**
   * The relationship type.
   */
  private readonly _type: string;

  /**
   * The relationship orientation.
   */
  private readonly _orientation: Orientation;

  /**
   * The aggregation strategy.
   */
  private readonly _aggregation: Aggregation;

  /**
   * Whether to index inverse relationships.
   */
  private readonly _indexInverse: boolean;

  /**
   * The property mappings.
   */
  private readonly _properties: PropertyMappings;

  /**
   * Creates a new RelationshipProjection.
   */
  constructor(
    type: string,
    orientation: Orientation,
    aggregation: Aggregation,
    indexInverse: boolean,
    properties: PropertyMappings
  ) {
    super();
    this._type = type;
    this._orientation = orientation;
    this._aggregation = aggregation;
    this._indexInverse = indexInverse;
    this._properties = properties;
    this.check();
  }

  /**
   * Returns the relationship type.
   */
  public type(): string {
    return this._type;
  }

  /**
   * Returns the relationship orientation.
   */
  public orientation(): Orientation {
    return this._orientation;
  }

  /**
   * Returns the aggregation strategy.
   */
  public aggregation(): Aggregation {
    return this._aggregation;
  }

  /**
   * Returns whether to index inverse relationships.
   */
  public indexInverse(): boolean {
    return this._indexInverse;
  }

  /**
   * Returns the property mappings.
   */
  public override properties(): PropertyMappings {
    return this._properties;
  }

  /**
   * Checks if this projection includes all relationships.
   */
  public projectAll(): boolean {
    return this.type() === ElementProjection.PROJECT_ALL;
  }

  /**
   * Creates a new projection with additional property mappings.
   *
   * @param mappings The mappings to add
   */
  public withAdditionalPropertyMappings(mappings: PropertyMappings): RelationshipProjection {
    const withSameAggregation = PropertyMappings.builder()
      .from(mappings)
      .withDefaultAggregation(this.aggregation())
      .build();

    const newMappings = this.properties().mergeWith(withSameAggregation);

    if (newMappings === this.properties()) {
      return this;
    }

    return new RelationshipProjection(
      this.type(),
      this.orientation(),
      this.aggregation(),
      this.indexInverse(),
      newMappings
    );
  }

  /**
   * Validates the projection configuration.
   *
   * @throws Error if the configuration is invalid
   */
  private check(): void {
    if (this.orientation() === Orientation.UNDIRECTED && this.indexInverse()) {
      throw new Error(
        `Relationship projection \`${this.type()}\` cannot be UNDIRECTED and inverse indexed. ` +
        "Indexing the inverse orientation is only allowed for NATURAL and REVERSE."
      );
    }
  }

  /**
   * Checks if the aggregation configuration is valid.
   *
   * @throws Error if the aggregation configuration is invalid
   */
  public checkAggregation(): void {
    this.check();

    if (this.properties().isEmpty()) {
      switch (this.aggregation()) {
        case Aggregation.COUNT:
        case Aggregation.SUM:
        case Aggregation.MIN:
        case Aggregation.MAX:
          throw new Error(`Setting a global \`${Aggregation[this.aggregation()]}\` aggregation requires at least one property mapping.`);
      }
    }
  }

  /**
   * Checks if this projection represents a multi-graph.
   */
  public isMultiGraph(): boolean {
    const somePropertyIsNotAggregated = this.properties()
      .mappings()
      .some(m => Aggregation.equivalentToNone(m.aggregation()));

    return Aggregation.equivalentToNone(this.aggregation()) &&
      (this.properties().isEmpty() || somePropertyIsNotAggregated);
  }

  /**
   * Checks if aggregation should be included in serialized objects.
   */
  protected includeAggregation(): boolean {
    return true;
  }

  /**
   * Writes this projection's specific properties to the given object.
   *
   * @param value The object to write to
   */
  protected writeToObject(value: Record<string, any>): void {
    value[RelationshipProjection.TYPE_KEY] = this.type();
    value[RelationshipProjection.ORIENTATION_KEY] = Orientation[this.orientation()];
    value[RelationshipProjection.AGGREGATION_KEY] = Aggregation[this.aggregation()];
    value[RelationshipProjection.INDEX_INVERSE_KEY] = this.indexInverse();
  }

  /**
   * Creates a RelationshipProjection from a configuration object.
   *
   * @param object The object to create from
   * @param relationshipType The default relationship type
   * @returns A new RelationshipProjection
   */
  public static fromObject(object: any, relationshipType: RelationshipType): RelationshipProjection {
    if (object === null || object === undefined) {
      return RelationshipProjection.ALL;
    }

    if (typeof object === 'string') {
      return RelationshipProjection.fromString(object);
    }

    if (object instanceof Map || (typeof object === 'object' && object !== null)) {
      const map: Record<string, any> = {};

      // Convert Map or object to case-insensitive record
      if (object instanceof Map) {
        for (const [key, value] of object.entries()) {
          map[key.toLowerCase()] = value;
        }
      } else {
        for (const key of Object.keys(object)) {
          map[key.toLowerCase()] = object[key];
        }
      }

      return RelationshipProjection.fromMap(map, relationshipType);
    }

    throw new Error(`Cannot construct a relationship filter out of a ${object?.constructor?.name || typeof object}`);
  }

  /**
   * Creates a RelationshipProjection from a string.
   *
   * @param type The relationship type
   * @returns A new RelationshipProjection
   */
  public static fromString(type: string | null | undefined): RelationshipProjection {
    return RelationshipProjection.builder().type(type || "").build();
  }

  /**
   * Creates a RelationshipProjection from a map.
   *
   * @param map The map to create from
   * @param relationshipType The default relationship type
   * @returns A new RelationshipProjection
   */
  public static fromMap(map: Record<string, any>, relationshipType: RelationshipType): RelationshipProjection {
    RelationshipProjection.validateConfigKeys(map);

    const builder = RelationshipProjection.builder();
    const type = String(map[RelationshipProjection.TYPE_KEY.toLowerCase()] || relationshipType.name());

    builder.type(type);

    const orientationKey = RelationshipProjection.ORIENTATION_KEY.toLowerCase();
    if (orientationKey in map) {
      builder.orientation(Orientation.parse(ElementProjection.nonEmptyString(map, orientationKey)));
    }

    const indexInverseKey = RelationshipProjection.INDEX_INVERSE_KEY.toLowerCase();
    if (indexInverseKey in map) {
      builder.indexInverse(!!map[indexInverseKey]);
    }

    const aggregationKey = RelationshipProjection.AGGREGATION_KEY.toLowerCase();
    if (aggregationKey in map) {
      const aggregation = Aggregation.parse(ElementProjection.nonEmptyString(map, aggregationKey));
      builder.aggregation(aggregation);
    }

    // Get properties from config
    const propsKey = ElementProjection.PROPERTIES_KEY.toLowerCase();
    const properties = map[propsKey] || {};

    // Parse properties with or without aggregation
    const hasAggregation = aggregationKey in map;
    const propertyMappings = hasAggregation
      ? PropertyMappings.fromObjectWithAggregation(properties, builder.getAggregation())
      : PropertyMappings.fromObject(properties);

    builder.properties(propertyMappings);
    return builder.build();
  }

  /**
   * Creates a RelationshipProjection with the given options.
   * Single method that replaces all the overlapping Java factory methods.
   *
   * @param options Configuration options or type string
   * @returns A new RelationshipProjection
   */
  public static of(options: RelationshipProjectionOptions | string): RelationshipProjection {
    const builder = RelationshipProjection.builder();

    if (typeof options === 'string') {
      // String shorthand for type
      builder.type(options);
    } else {
      // Full options object
      builder.type(options.type);

      if (options.orientation !== undefined) {
        builder.orientation(options.orientation);
      }

      if (options.aggregation !== undefined) {
        builder.aggregation(options.aggregation);
      }

      if (options.indexInverse !== undefined) {
        builder.indexInverse(options.indexInverse);
      }
    }

    return builder.build();
  }

  /**
   * Creates a new builder for RelationshipProjection.
   *
   * @returns A new builder
   */
  public static builder(): RelationshipProjectionBuilder {
    return new RelationshipProjectionBuilder();
  }

  /**
   * Validates the configuration keys in a map.
   *
   * @param map The map to validate
   * @throws Error if the map contains invalid keys
   */
  private static validateConfigKeys(map: Record<string, any>): void {
    const validKeys = [
      RelationshipProjection.TYPE_KEY.toLowerCase(),
      RelationshipProjection.ORIENTATION_KEY.toLowerCase(),
      RelationshipProjection.AGGREGATION_KEY.toLowerCase(),
      ElementProjection.PROPERTIES_KEY.toLowerCase(),
      RelationshipProjection.INDEX_INVERSE_KEY.toLowerCase()
    ];

    const invalidKeys = Object.keys(map)
      .map(key => key.toLowerCase())
      .filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid keys in relationship projection: ${invalidKeys.join(', ')}. ` +
        `Valid keys are: ${validKeys.join(', ')}.`
      );
    }
  }
}

/**
 * Builder for RelationshipProjection.
 */
export class RelationshipProjectionBuilder implements InlineProperties<RelationshipProjectionBuilder> {
  private _type: string = "";
  private _orientation: Orientation = Orientation.NATURAL;
  private _aggregation: Aggregation = Aggregation.DEFAULT;
  private _indexInverse: boolean = false;
  private _properties: PropertyMappings | null = null;
  private _propertiesBuilder: InlinePropertiesBuilder | null = null;

  /**
   * Sets the type for the projection.
   *
   * @param type The relationship type
   * @returns This builder
   */
  public type(type: string | null | undefined): RelationshipProjectionBuilder {
    this._type = type || "";
    return this;
  }

  /**
   * Sets the orientation for the projection.
   *
   * @param orientation The relationship orientation
   * @returns This builder
   */
  public orientation(orientation: Orientation): RelationshipProjectionBuilder {
    this._orientation = orientation;
    return this;
  }

  /**
   * Gets the current aggregation.
   *
   * @returns The current aggregation
   */
  public getAggregation(): Aggregation {
    return this._aggregation;
  }

  /**
   * Sets the aggregation strategy for the projection.
   *
   * @param aggregation The aggregation strategy
   * @returns This builder
   */
  public aggregation(aggregation: Aggregation): RelationshipProjectionBuilder {
    this._aggregation = aggregation;
    return this;
  }

  /**
   * Sets whether to index inverse relationships.
   *
   * @param indexInverse Whether to index inverse relationships
   * @returns This builder
   */
  public indexInverse(indexInverse: boolean): RelationshipProjectionBuilder {
    this._indexInverse = indexInverse;
    return this;
  }

  /**
   * Sets the property mappings for the projection.
   *
   * @param properties The property mappings
   * @returns This builder
   */
  public properties(properties: PropertyMappings): RelationshipProjectionBuilder {
    this._properties = properties;
    return this;
  }

  /**
   * Builds the RelationshipProjection.
   *
   * @returns A new RelationshipProjection
   */
  public build(): RelationshipProjection {
    this.buildProperties();
    return new RelationshipProjection(
      this._type,
      this._orientation,
      this._aggregation,
      this._indexInverse,
      this._properties || PropertyMappings.of()
    );
  }

  /**
   * Adds a property mapping.
   *
   * @param mapping The mapping to add
   * @returns This builder
   */
  public addProperty(mapping: any): RelationshipProjectionBuilder {
    this.inlineBuilder().propertiesBuilder().addProperty(mapping);
    return this;
  }

  /**
   * Adds multiple property mappings.
   *
   * @param properties The mappings to add
   * @returns This builder
   */
  public addProperties(...properties: any[]): RelationshipProjectionBuilder {
    this.inlineBuilder().propertiesBuilder().addProperties(...properties);
    return this;
  }

  /**
   * Adds all property mappings from an iterable.
   *
   * @param properties The mappings to add
   * @returns This builder
   */
  public addAllProperties(properties: Iterable<any>): RelationshipProjectionBuilder {
    this.inlineBuilder().propertiesBuilder().addAllProperties(properties);
    return this;
  }

  /**
   * Finalizes the property building process.
   */
  public buildProperties(): void {
    if (this._propertiesBuilder) {
      this._propertiesBuilder.build();
    }
  }

  /**
   * Gets the inline properties builder.
   *
   * @returns The inline properties builder
   */
  public inlineBuilder(): InlinePropertiesBuilder {
    if (!this._propertiesBuilder) {
      this._propertiesBuilder = new InlinePropertiesBuilder(
        () => this._properties,
        (newProperties) => { this._properties = newProperties; }
      );
    }
    return this._propertiesBuilder;
  }
}
