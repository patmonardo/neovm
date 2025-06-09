import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyState } from "@/api";
import { Aggregation } from "@/core";
import { RelationshipPropertySchema } from "@/api/schema";
import { RelationshipProperty } from "../RelationshipProperty";
import { Properties } from "../Properties";

/**
 * Implementation of RelationshipProperty.
 */
export class DefaultRelationshipProperty implements RelationshipProperty {
  /**
   * Creates a new RelationshipProperty implementation.
   *
   * @param propertyValues The property values
   * @param propertySchema The relationship property schema
   */
  constructor(
    private readonly _propertyValues: Properties,
    private readonly _propertySchema: RelationshipPropertySchema
  ) {}

  values(): Properties {
    return this._propertyValues;
  }

  propertySchema(): RelationshipPropertySchema {
    return this._propertySchema;
  }

  key(): string {
    return this._propertySchema.key();
  }

  valueType(): ValueType {
    return this._propertySchema.valueType();
  }

  defaultValue(): DefaultValue {
    return this._propertySchema.defaultValue();
  }

  propertyState(): PropertyState {
    return this._propertySchema.state();
  }

  aggregation(): Aggregation {
    return this._propertySchema.aggregation();
  }
}
