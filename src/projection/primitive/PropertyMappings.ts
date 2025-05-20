import { Aggregation } from "@/core/Aggregation";
import { PropertyMapping } from "../abstract/PropertyMapping";

/**
 * Collection of property mappings for configuring property filtering and aggregation.
 */
export class PropertyMappings implements Iterable<PropertyMapping> {
  /**
   * The property mappings.
   */
  private readonly _mappings: PropertyMapping[];

  /**
   * Creates a new PropertyMappings.
   *
   * @param mappings The property mappings
   */
  constructor(mappings: PropertyMapping[]) {
    this._mappings = mappings;
    this.checkForAggregationMixing();
  }

  /**
   * Returns the property mappings.
   */
  public mappings(): PropertyMapping[] {
    return this._mappings;
  }

  public size(): number {
    return this._mappings.length;
  }

  /**
   * Returns an iterator over the property mappings.
   */
  [Symbol.iterator](): Iterator<PropertyMapping> {
    return this._mappings[Symbol.iterator]();
  }

  /**
   * Returns a stream of the property mappings.
   */
  public stream(): PropertyMapping[] {
    return [...this._mappings];
  }

  /**
   * Returns the property keys.
   */
  public propertyKeys(): Set<string> {
    return new Set(
      this._mappings
        .map((mapping) => mapping.propertyKey())
        .filter((key): key is string => key !== null)
    );
  }

  /**
   * Checks if this mappings has any entries.
   */
  public hasMappings(): boolean {
    return this._mappings.length > 0;
  }

  /**
   * Returns the number of mappings.
   */
  public numberOfMappings(): number {
    return this._mappings.length;
  }

  /**
   * Checks if this mappings is empty.
   */
  public isEmpty(): boolean {
    return this._mappings.length === 0;
  }

  /**
   * Converts this mappings to an object.
   *
   * @param includeAggregation Whether to include aggregation info
   */
  public toObject(includeAggregation: boolean): Record<string, object> {
    const result: Record<string, object> = {};

    for (const mapping of this._mappings) {
      const [key, value] = mapping.toObject(includeAggregation);

      if (key in result) {
        throw new Error(`Duplicate key ${key}`);
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Merges this mappings with another.
   *
   * @param other The other mappings
   */
  public mergeWith(other: PropertyMappings): PropertyMappings {
    if (!this.hasMappings()) {
      return other;
    }

    if (!other.hasMappings()) {
      return this;
    }

    const builder = PropertyMappingsBuilder.create();

    // Add all unique mappings from both collections
    const seen = new Set<string>();

    for (const mapping of this._mappings) {
      const key = mapping.propertyKey();
      if (key !== null) {
        seen.add(key);
      }
      builder.addMapping(mapping);
    }

    for (const mapping of other.mappings()) {
      const key = mapping.propertyKey();
      if (key !== null && seen.has(key)) {
        continue; // Skip duplicates
      }
      builder.addMapping(mapping);
    }

    return builder.build();
  }

  /**
   * Validates that there is no mixing of NONE aggregation with other types.
   *
   * @throws Error if there is aggregation mixing
   */
  private checkForAggregationMixing(): void {
    const noneStrategyCount = this._mappings.filter(
      (m) => m.aggregation() === Aggregation.NONE
    ).length;

    if (noneStrategyCount > 0 && noneStrategyCount < this.numberOfMappings()) {
      throw new Error(
        "Conflicting relationship property aggregations, it is not allowed to mix `NONE` with aggregations."
      );
    }
  }
}

/**
 * Builder for PropertyMappings.
 */
export class PropertyMappingsBuilder {
  private _mappings: PropertyMapping[] = [];
  private _aggregation: Aggregation = Aggregation.DEFAULT;

  /**
   * Creates a new PropertyMappingsBuilder.
   */
  public static create(): PropertyMappingsBuilder {
    return new PropertyMappingsBuilder();
  }

  /**
   * Sets the default aggregation for the builder.
   *
   * @param aggregation The default aggregation
   */
  public withDefaultAggregation(
    aggregation: Aggregation
  ): PropertyMappingsBuilder {
    this._aggregation = aggregation ?? Aggregation.DEFAULT;
    return this;
  }

  /**
   * Adds a property mapping.
   *
   * @param mapping The mapping to add
   */
  public addMapping(mapping: PropertyMapping): PropertyMappingsBuilder {
    this._mappings.push(mapping);
    return this;
  }

  /**
   * Adds multiple property mappings.
   *
   * @param mappings The mappings to add
   */
  public addMappings(
    mappings: Iterable<PropertyMapping>
  ): PropertyMappingsBuilder {
    for (const mapping of mappings) {
      this._mappings.push(mapping);
    }
    return this;
  }

  /**
   * Adds a property mapping.
   * Alias for addMapping() to match the API expected by NodeProjectionBuilder
   *
   * @param mapping The mapping to add
   */
  public addProperty(mapping: PropertyMapping): PropertyMappingsBuilder {
    return this.addMapping(mapping);
  }

  /**
   * Adds multiple property mappings.
   *
   * @param properties The mappings to add
   */
  public addProperties(
    ...properties: PropertyMapping[]
  ): PropertyMappingsBuilder {
    for (const mapping of properties) {
      this.addMapping(mapping);
    }
    return this;
  }

  /**
   * Adds all property mappings from an iterable.
   * Alias for addMappings() to match the API expected by NodeProjectionBuilder
   *
   * @param properties The mappings to add
   */
  public addAllProperties(
    properties: Iterable<PropertyMapping>
  ): PropertyMappingsBuilder {
    return this.addMappings(properties);
  }

  /**
   * Copies values from another PropertyMappings.
   *
   * @param source The source to copy from
   */
  public from(source: PropertyMappings): PropertyMappingsBuilder {
    this._mappings.push(...source.mappings());
    return this;
  }

  /**
   * Checks if a mapping with the given key exists.
   *
   * @param key The key to check for
   */
  public hasMappingWithKey(key: string): boolean {
    return this._mappings.some((m) => m.propertyKey() === key);
  }

  /**
   * Builds the PropertyMappings.
   *
   * @returns A new PropertyMappings
   */
  public build(): PropertyMappings {
    // Apply default aggregation if needed
    if (this._aggregation !== Aggregation.DEFAULT) {
      this._mappings = this._mappings.map((mapping) =>
        mapping.setNonDefaultAggregation(this._aggregation)
      );
    }

    return new PropertyMappings(this._mappings);
  }
}

/**
 * Static functions and constants for PropertyMappings.
 */
export namespace PropertyMappings {
  /**
   * Creates PropertyMappings with the given mappings.
   *
   * @param mappings The property mappings
   */
  export function of(...mappings: PropertyMapping[]): PropertyMappings {
    if (!mappings || mappings.length === 0) {
      return new PropertyMappings([]);
    }
    return new PropertyMappings([...mappings]);
  }

  /**
   * Creates PropertyMappings from an object.
   *
   * @param propertyMappingInput The input object
   * @returns A new PropertyMappings
   */
  export function fromObject(propertyMappingInput: any): PropertyMappings {
    return fromObjectWithAggregation(propertyMappingInput, Aggregation.DEFAULT);
  }

  /**
   * Creates PropertyMappings from an object with a default aggregation.
   *
   * @param propertyMappingInput The input object
   * @param defaultAggregation The default aggregation
   * @returns A new PropertyMappings
   */
  export function fromObjectWithAggregation(
    propertyMappingInput: any,
    defaultAggregation: Aggregation
  ): PropertyMappings {
    if (propertyMappingInput instanceof PropertyMappings) {
      return PropertyMappings.builder()
        .from(propertyMappingInput)
        .withDefaultAggregation(defaultAggregation)
        .build();
    }

    if (typeof propertyMappingInput === "string") {
      const propertyMapping = propertyMappingInput;
      const map: Record<string, string> = {};
      map[propertyMapping] = propertyMapping;
      return fromObjectWithAggregation(map, defaultAggregation);
    }

    if (Array.isArray(propertyMappingInput)) {
      const builder =
        PropertyMappings.builder().withDefaultAggregation(defaultAggregation);

      for (const mapping of propertyMappingInput) {
        const propertyMappings = fromObjectWithAggregation(
          mapping,
          defaultAggregation
        ).mappings();

        for (const propertyMapping of propertyMappings) {
          const key = propertyMapping.propertyKey();

          if (key !== null && builder.hasMappingWithKey(key)) {
            throw new Error(`Duplicate property key \`${key}\``);
          }

          builder.addMapping(propertyMapping);
        }
      }

      return builder.build();
    }

    if (
      typeof propertyMappingInput === "object" &&
      propertyMappingInput !== null
    ) {
      const builder =
        PropertyMappings.builder().withDefaultAggregation(defaultAggregation);

      for (const [key, spec] of Object.entries(propertyMappingInput)) {
        const propertyMapping = PropertyMapping.fromObject(key, spec);
        builder.addMapping(propertyMapping);
      }

      return builder.build();
    }

    throw new Error(
      `Expected String or object for property mappings. Got ${
        propertyMappingInput?.constructor?.name || typeof propertyMappingInput
      }.`
    );
  }

  /**
   * Converts PropertyMappings to an object.
   *
   * @param propertyMappings The property mappings
   * @returns An object representation
   */
  export function toObject(
    propertyMappings: PropertyMappings
  ): Record<string, object> {
    return propertyMappings.toObject(true);
  }

  /**
   * Creates a new builder for PropertyMappings.
   *
   * @returns A new builder
   */
  export function builder(): PropertyMappingsBuilder {
    return PropertyMappingsBuilder.create();
  }
}
