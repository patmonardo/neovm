import { DefaultValue } from "@/api/DefaultValue";
import { Aggregation } from "@/core/Aggregation";
import { PropertyMapping } from "./PropertyMapping";
import { PropertyMappings } from "./PropertyMappings";
import { PropertyMappingsBuilder } from "./PropertyMappings";

/**
 * Base class for projections of graph elements (nodes or relationships).
 */
export abstract class ElementProjection {
  /**
   * Wildcard symbol to project all properties.
   */
  public static readonly PROJECT_ALL = "*";

  /**
   * Key used for properties in configuration objects.
   */
  public static readonly PROPERTIES_KEY = "properties";

  /**
   * Returns the property mappings for this projection.
   */
  public properties(): PropertyMappings {
    return PropertyMappings.of();
  }

  /**
   * Creates a new projection with additional property mappings.
   *
   * @param mappings The mappings to add
   */
  public abstract withAdditionalPropertyMappings(
    mappings: PropertyMappings
  ): ElementProjection;

  /**
   * Checks if this projection includes all properties.
   */
  public abstract projectAll(): boolean;

  /**
   * Converts this projection to a plain object.
   */
  public toObject(): Record<string, any> {
    const value: Record<string, any> = {};
    this.writeToObject(value);
    value[ElementProjection.PROPERTIES_KEY] = this.properties().toObject(
      this.includeAggregation()
    );
    return value;
  }

  /**
   * Writes this projection's specific properties to the given object.
   *
   * @param value The object to write to
   */
  protected abstract writeToObject(value: Record<string, any>): void;

  /**
   * Checks if aggregation should be included in serialized objects.
   */
  protected abstract includeAggregation(): boolean;

  /**
   * Creates an ElementProjection from a configuration object.
   *
   * @param config The configuration object
   * @param constructor Function that creates a projection from property mappings
   */
  public static create<T extends ElementProjection>(
    config: Record<string, any>,
    constructor: (propertyMappings: PropertyMappings) => T
  ): T {
    const properties = config[ElementProjection.PROPERTIES_KEY] ?? {};
    const propertyMappings = PropertyMappings.fromObject(properties);
    return constructor(propertyMappings);
  }

  /**
   * Gets a non-empty string from a configuration object.
   *
   * @param config The configuration object
   * @param key The key to lookup
   * @returns The string value
   * @throws Error if the value is not a non-empty string
   */
  protected static nonEmptyString(
    config: Record<string, any>,
    key: string
  ): string {
    const value = config[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`'${value}' is not a valid value for the key '${key}'`);
    }
    return value;
  }
}

/**
 * Interface for classes that support inline property addition.
 */
export interface InlineProperties<Self extends InlineProperties<Self>> {
  /**
   * Adds a property mapping.
   *
   * @param mapping The mapping to add
   */
  addProperty(mapping: PropertyMapping): Self;

  /**
   * Adds a property with the given key, neo property key, and default value.
   *
   * @param propertyKey The property key
   * @param neoPropertyKey The neo property key
   * @param defaultValue The default value
   */
  addProperty(
    propertyKey: string,
    neoPropertyKey: string,
    defaultValue: DefaultValue
  ): Self;

  /**
   * Adds a property with the given key, neo property key, default value, and aggregation.
   *
   * @param propertyKey The property key
   * @param neoPropertyKey The neo property key
   * @param defaultValue The default value
   * @param aggregation The aggregation
   */
  addProperty(
    propertyKey: string,
    neoPropertyKey: string,
    defaultValue: DefaultValue,
    aggregation: Aggregation
  ): Self;

  /**
   * Adds multiple property mappings.
   *
   * @param properties The mappings to add
   */
  addProperties(...properties: PropertyMapping[]): Self;

  /**
   * Adds all property mappings from an iterable.
   *
   * @param properties The mappings to add
   */
  addAllProperties(properties: Iterable<PropertyMapping>): Self;

  /**
   * Finalizes the property building process.
   */
  buildProperties(): void;

  /**
   * Gets the inline properties builder.
   */
  inlineBuilder(): InlinePropertiesBuilder;
}
/**
 * Builder for inline properties.
 */
export class InlinePropertiesBuilder {
  // Change this from PropertyMappings.Builder to PropertyMappingsBuilder
  private _propertiesBuilder: PropertyMappingsBuilder | null = null;

  /**
   * Creates a new InlinePropertiesBuilder.
   *
   * @param getProperties Function to get current properties
   * @param setProperties Function to set new properties
   */
  constructor(
    private readonly getProperties: () => PropertyMappings | null,
    private readonly setProperties: (
      properties: PropertyMappings | null
    ) => void
  ) {}

  /**
   * Builds the property mappings.
   */
  public build(): void {
    if (this._propertiesBuilder !== null) {
      if (this.getProperties() !== null) {
        throw new Error(
          "Cannot have both, a complete mapping from `properties` " +
            "and other properties from `addProperty`. If you want to " +
            "combine those, make sure to call `properties` first and " +
            "then use `addProperty` and never set a new `properties` " +
            "again."
        );
      }
      this.setProperties(this._propertiesBuilder.build());
    }
  }

  /**
   * Gets the property mappings builder.
   */
  // Change the return type from PropertyMappings.Builder to PropertyMappingsBuilder
  public propertiesBuilder(): PropertyMappingsBuilder {
    if (this._propertiesBuilder === null) {
      this._propertiesBuilder = PropertyMappings.builder();
      const properties = this.getProperties();
      if (properties !== null) {
        this._propertiesBuilder.from(properties);
        this.setProperties(null);
      }
    }
    return this._propertiesBuilder;
  }
}
