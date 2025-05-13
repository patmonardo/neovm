import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue";
import { PropertyState } from "@/api/PropertyState";
import { Aggregation } from "@/core/Aggregation";
import { PropertySchema } from "./PropertySchema";

/**
 * Schema definition for relationship properties in a graph
 * Extends the general PropertySchema with relationship-specific functionality.
 */
export abstract class RelationshipPropertySchema extends PropertySchema {
  /**
   * Returns the aggregation strategy for this property.
   * This determines how multiple values for the same relationship are combined.
   *
   * @returns The aggregation strategy
   */
  abstract aggregation(): Aggregation;

  /**
   * Returns a normalized version of this schema where DEFAULT aggregation
   * is resolved to a concrete aggregation.
   *
   * @returns A normalized schema
   */
  normalize(): RelationshipPropertySchema {
    if (this.aggregation() === Aggregation.DEFAULT) {
      return RelationshipPropertySchema.of(
        this.key(),
        this.valueType(),
        this.defaultValue(),
        this.state(),
        Aggregation.resolve(this.aggregation())
      );
    }
    return this;
  }
}

/**
 * Concrete implementation of RelationshipPropertySchema.
 */
class RelationshipPropertySchemaImpl extends RelationshipPropertySchema {
  /**
   * Creates a new RelationshipPropertySchema implementation.
   *
   * @param _key The property key
   * @param _valueType The value type
   * @param _defaultValue The default value
   * @param _state The property state
   * @param _aggregation The aggregation strategy
   */
  constructor(
    private readonly _key: string,
    private readonly _valueType: ValueType,
    private readonly _defaultValue: DefaultValue,
    private readonly _state: PropertyState,
    private readonly _aggregation: Aggregation
  ) {
    super();
  }

  key(): string {
    return this._key;
  }

  valueType(): ValueType {
    return this._valueType;
  }

  defaultValue(): DefaultValue {
    return this._defaultValue;
  }

  state(): PropertyState {
    return this._state;
  }

  aggregation(): Aggregation {
    return this._aggregation;
  }

  /**
   * Checks whether this schema equals another object.
   *
   * @param obj The object to compare
   * @returns True if the objects are equal
   */
  equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof RelationshipPropertySchemaImpl)) return false;

    return (
      this._key === obj._key &&
      this._valueType === obj._valueType &&
      this._defaultValue.equals(obj._defaultValue) &&
      this._state === obj._state &&
      this._aggregation === obj._aggregation
    );
  }

  /**
   * Computes a hash code for this schema.
   *
   * @returns The hash code
   */
  hashCode(): number {
    let result = this._key.length;
    result = 31 * result + this._valueType;
    result = 31 * result + this._defaultValue.hashCode();
    result = 31 * result + this._state;
    result = 31 * result + this._aggregation;
    return result;
  }

  /**
   * Returns a string representation of this schema.
   *
   * @returns String representation
   */
  toString(): string {
    return `RelationshipPropertySchema{key=${this._key}, valueType=${
      ValueType[this._valueType]
    }, defaultValue=${this._defaultValue}, state=${
      PropertyState[this._state]
    }, aggregation=${Aggregation[this._aggregation]}}`;
  }
}

/**
 * Namespace providing factory methods and utilities for RelationshipPropertySchema.
 */
export namespace RelationshipPropertySchema {
  /**
   * Private implementation function that centralizes schema creation
   */
  function createImpl(
    propertyKey: string,
    valueType: ValueType,
    defaultValue?: DefaultValue,
    propertyState?: PropertyState,
    aggregation?: Aggregation
  ): RelationshipPropertySchema {
    // Fill in default values
    const actualDefaultValue = defaultValue ?? DefaultValue.of(valueType);
    const actualPropertyState = propertyState ?? PropertyState.PERSISTENT;
    const actualAggregation = aggregation ?? Aggregation.DEFAULT;

    // Create and potentially normalize the schema
    const schema = new RelationshipPropertySchemaImpl(
      propertyKey,
      valueType,
      actualDefaultValue,
      actualPropertyState,
      actualAggregation
    );

    if (actualAggregation === Aggregation.DEFAULT) {
      return new RelationshipPropertySchemaImpl(
        propertyKey,
        valueType,
        actualDefaultValue,
        actualPropertyState,
        Aggregation.resolve(actualAggregation)
      );
    }

    return schema;
  }

  // Define all valid overload signatures
  export function of(propertyKey: string, valueType: ValueType): RelationshipPropertySchema;
  export function of(propertyKey: string, valueType: ValueType, aggregation: Aggregation): RelationshipPropertySchema;
  export function of(propertyKey: string, valueType: ValueType, propertyState: PropertyState): RelationshipPropertySchema;
  export function of(propertyKey: string, valueType: ValueType, defaultValue: DefaultValue): RelationshipPropertySchema;
  export function of(
    propertyKey: string,
    valueType: ValueType,
    defaultValue: DefaultValue,
    propertyState: PropertyState
  ): RelationshipPropertySchema;
  export function of(
    propertyKey: string,
    valueType: ValueType,
    defaultValue: DefaultValue,
    propertyState: PropertyState,
    aggregation: Aggregation
  ): RelationshipPropertySchema;

  // Single implementation that handles all combinations
  export function of(
    propertyKey: string,
    valueType: ValueType,
    arg3?: Aggregation | PropertyState | DefaultValue,
    arg4?: PropertyState,
    arg5?: Aggregation
  ): RelationshipPropertySchema {
    // Case: Just key and value type
    if (arg3 === undefined) {
      return createImpl(propertyKey, valueType);
    }

    // Case: Third arg is Aggregation
    if (typeof arg3 === "number" && Object.values(Aggregation).includes(arg3 as Aggregation)) {
      return createImpl(propertyKey, valueType, undefined, undefined, arg3 as Aggregation);
    }

    // Case: Third arg is PropertyState
    if (typeof arg3 === "number" && Object.values(PropertyState).includes(arg3 as PropertyState)) {
      return createImpl(propertyKey, valueType, undefined, arg3 as PropertyState);
    }

    // Case: Third arg is DefaultValue
    if (arg3 instanceof DefaultValue) {
      // Case: With DefaultValue only
      if (arg4 === undefined) {
        return createImpl(propertyKey, valueType, arg3);
      }

      // Case: With DefaultValue and PropertyState
      if (arg5 === undefined) {
        return createImpl(propertyKey, valueType, arg3, arg4);
      }

      // Case: With all args
      return createImpl(propertyKey, valueType, arg3, arg4, arg5);
    }

    // Fallback: Use default values for anything we couldn't determine
    return createImpl(propertyKey, valueType);
  }
}
