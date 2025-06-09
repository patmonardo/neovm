import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyState } from "@/api";
import { Aggregation } from "@/core";
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

  abstract equals(obj: unknown): boolean;
  abstract hashCode(): number;
  abstract toString(): string;

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
 * Factory methods and implementation for RelationshipPropertySchema.
 */
export namespace RelationshipPropertySchema {
  /**
   * Implementation class (private to the namespace)
   */
  class DefaultRelationshipPropertySchema extends RelationshipPropertySchema {
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

    equals(obj: unknown): boolean {
      if (this === obj) return true;
      if (!(obj instanceof DefaultRelationshipPropertySchema)) return false;

      return (
        this._key === obj._key &&
        this._valueType === obj._valueType &&
        this._defaultValue.equals(obj._defaultValue) &&
        this._state === obj._state &&
        this._aggregation === obj._aggregation
      );
    }

    hashCode(): number {
      let result = this._key.length;
      result = 31 * result + this._valueType;
      result = 31 * result + this._defaultValue.longValue();
      result = 31 * result + this._state;
      result = 31 * result + this._aggregation;
      return result;
    }

    toString(): string {
      return `RelationshipPropertySchema{key=${this._key}, valueType=${
        ValueType[this._valueType]
      }, defaultValue=${this._defaultValue}, state=${
        PropertyState[this._state]
      }, aggregation=${Aggregation[this._aggregation]}}`;
    }
  }

  /**
   * Creates a relationship property schema with the given key and value type.
   */

  // Define all valid overload signatures
  export function of(
    propertyKey: string,
    valueType: ValueType
  ): RelationshipPropertySchema;
  export function of(
    propertyKey: string,
    valueType: ValueType,
    defaultValue: DefaultValue
  ): RelationshipPropertySchema;
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
  /**
   * Creates a relationship property schema with the given key and value type.
   */
  export function of(
    key: string,
    valueType: ValueType,
    defaultValue: DefaultValue = DefaultValue.of(0),
    state: PropertyState = PropertyState.PERSISTENT,
    aggregation: Aggregation = Aggregation.NONE
  ): RelationshipPropertySchema {
    return new DefaultRelationshipPropertySchema(
      key,
      valueType,
      defaultValue,
      state,
      aggregation
    );
  }
}
