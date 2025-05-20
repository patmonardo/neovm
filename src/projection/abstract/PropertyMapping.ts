import { DefaultValue } from "@/api/DefaultValue";
import { Aggregation } from "@/core/Aggregation";
import { ElementProjection } from "./ElementProjection";

/**
 * Represents a property mapping for graph elements.
 */
export interface PropertyMapping {
  /**
   * Property key in the result map Graph.nodeProperties(`propertyKey`)
   */
  propertyKey(): string | null;

  /**
   * Property name in the graph (a:Node {`propertyKey`:xyz})
   */
  neoPropertyKey(): string | null;

  /**
   * Default value to use if the property is not present.
   */
  defaultValue(): DefaultValue;

  /**
   * Aggregation to use for this property.
   */
  aggregation(): Aggregation;

  /**
   * Checks if this mapping has a valid name.
   */
  hasValidName(): boolean;

  /**
   * Checks if this property exists in the graph.
   */
  exists(): boolean;

  /**
   * Converts this mapping to a plain object.
   *
   * @param includeAggregation Whether to include aggregation info
   */
  toObject(includeAggregation: boolean): [string, object];

  /**
   * Sets a non-default aggregation if the current aggregation is default.
   *
   * @param aggregation The new aggregation
   */
  setNonDefaultAggregation(aggregation: Aggregation): PropertyMapping;
}

/**
 * Interface for PropertyMapping creation options
 */
export interface PropertyMappingOptions {
  /** Neo4j property key */
  neoPropertyKey?: string | null;
  /** Default value */
  defaultValue?: DefaultValue | any;
  /** Aggregation strategy */
  aggregation?: Aggregation;
}

/**
 * Implementation of PropertyMapping.
 */
class PropertyMappingImpl implements PropertyMapping {
  constructor(
    private readonly _propertyKey: string | null,
    private readonly _neoPropertyKey: string | null,
    private readonly _defaultValue: DefaultValue,
    private readonly _aggregation: Aggregation
  ) {
    this.validateProperties();
  }

  propertyKey(): string | null {
    return this._propertyKey;
  }

  neoPropertyKey(): string | null {
    return this._neoPropertyKey ?? this._propertyKey;
  }

  defaultValue(): DefaultValue {
    return this._defaultValue;
  }

  aggregation(): Aggregation {
    return this._aggregation;
  }

  hasValidName(): boolean {
    const key = this.neoPropertyKey();
    return key !== null && key !== "";
  }

  exists(): boolean {
    return false;
  }

  toObject(includeAggregation: boolean): [string, object] {
    const value: Record<string, any> = {};
    value[PropertyMapping.PROPERTY_KEY] = this.neoPropertyKey();
    value[PropertyMapping.DEFAULT_VALUE_KEY] = this.defaultValue();

    if (includeAggregation) {
      const { RelationshipProjection } = require("./RelationshipProjection");

      value[RelationshipProjection.AGGREGATION_KEY] =
        Aggregation[this.aggregation()];
    }

    return [this.propertyKey() as string, value];
  }

  setNonDefaultAggregation(aggregation: Aggregation): PropertyMapping {
    if (
      aggregation === Aggregation.DEFAULT ||
      this._aggregation !== Aggregation.DEFAULT
    ) {
      return this;
    }

    return new PropertyMappingImpl(
      this._propertyKey,
      this._neoPropertyKey,
      this._defaultValue,
      aggregation
    );
  }

  private validateProperties(): void {
    if (
      this.neoPropertyKey() === ElementProjection.PROJECT_ALL &&
      this._aggregation !== Aggregation.COUNT
    ) {
      throw new Error(
        "A '*' property key can only be used in combination with count aggregation."
      );
    }

    PropertyMapping.validatePropertyKey(this._propertyKey);
  }
}

/**
 * Static methods and constants for PropertyMapping.
 */
export namespace PropertyMapping {
  export const PROPERTY_KEY = "property";
  export const DEFAULT_VALUE_KEY = "defaultValue";

  /**
   * Validates a property key.
   *
   * @param propertyKey The property key to validate
   * @throws Error if the property key is invalid
   */
  export function validatePropertyKey(propertyKey: string | null): void {
    if (propertyKey === null || propertyKey === "") {
      throw new Error("Property key must not be empty.");
    }
  }

  /**
   * Creates a PropertyMapping from a string or object.
   *
   * @param propertyKey The property key
   * @param stringOrMap The property configuration
   * @returns A new PropertyMapping
   */
  export function fromObject(
    propertyKey: string,
    stringOrMap: any
  ): PropertyMapping {
    if (typeof stringOrMap === "string") {
      const neoPropertyKey = stringOrMap;
      return fromObject(propertyKey, { [PROPERTY_KEY]: neoPropertyKey });
    } else if (typeof stringOrMap === "object" && stringOrMap !== null) {
      const propertyMap = new Map<string, any>();

      // Convert to case-insensitive map
      for (const key in stringOrMap) {
        propertyMap.set(key.toLowerCase(), stringOrMap[key]);
      }

      const propertyNameValue = propertyMap.has(PROPERTY_KEY.toLowerCase())
        ? propertyMap.get(PROPERTY_KEY.toLowerCase())
        : propertyKey;

      if (typeof propertyNameValue !== "string") {
        throw new Error(
          `Expected the value of '${PROPERTY_KEY}' to be of type String, but was '${typeof propertyNameValue}'.`
        );
      }
      const { RelationshipProjection } = require("./RelationshipProjection");

      const neoPropertyKey = propertyNameValue;

      const aggregationKey =
        RelationshipProjection.AGGREGATION_KEY.toLowerCase();
      let aggregation: Aggregation;

      if (!propertyMap.has(aggregationKey)) {
        aggregation = Aggregation.DEFAULT;
      } else {
        const aggregationValue = propertyMap.get(aggregationKey);
        if (typeof aggregationValue === "string") {
          aggregation = Aggregation.parse(aggregationValue);
        } else {
          throw new Error(
            `Expected the value of '${
              RelationshipProjection.AGGREGATION_KEY
            }' to be of type String, but was '${typeof aggregationValue}'`
          );
        }
      }

      const defaultValueKey = DEFAULT_VALUE_KEY.toLowerCase();
      const defaultValue = propertyMap.get(defaultValueKey);
      //const isUserDefined = propertyMap.has(defaultValueKey);

      return of(propertyKey, {
        neoPropertyKey,
        defaultValue: DefaultValue.of(defaultValue),
        aggregation,
      });
    } else {
      throw new Error(
        `Expected stringOrMap to be of type String or Map, but got ${typeof stringOrMap}`
      );
    }
  }

  /**
   * Creates a PropertyMapping with optional configuration.
   * A single factory method that replaces the multiple Java overloads.
   *
   * @param propertyKey The property key
   * @param options Optional configuration options
   * @returns A new PropertyMapping
   */
  export function of(
    propertyKey: string,
    options?: PropertyMappingOptions | string
  ): PropertyMapping {
    // Handle string shorthand for neoPropertyKey
    if (typeof options === "string") {
      return of(propertyKey, { neoPropertyKey: options });
    }

    const opts = options || {};

    // Extract options with defaults
    const neoPropertyKey = opts.neoPropertyKey ?? null;
    let defaultValue = opts.defaultValue;

    // Convert raw value to DefaultValue if needed
    if (defaultValue !== undefined && !(defaultValue instanceof DefaultValue)) {
      defaultValue = DefaultValue.of(defaultValue);
    } else if (defaultValue === undefined) {
      defaultValue = DefaultValue.DEFAULT;
    }

    const aggregation = opts.aggregation ?? Aggregation.DEFAULT;

    return new PropertyMappingImpl(
      propertyKey,
      neoPropertyKey,
      defaultValue as DefaultValue,
      aggregation
    );
  }
}
