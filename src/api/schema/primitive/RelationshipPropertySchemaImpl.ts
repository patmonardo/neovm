import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue";
import { PropertyState } from "@/api/PropertyState";
import { Aggregation } from "@/core/Aggregation";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";

/**
 * Concrete implementation of RelationshipPropertySchema.
 */
export class RelationshipPropertySchemaImpl extends RelationshipPropertySchema {
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
    result = 31 * result + this._defaultValue.get<number>();
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
