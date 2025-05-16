import { Properties } from "../Properties";
import { RelationshipPropertySchema } from "@/api/schema/abstract/RelationshipPropertySchema";
import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue";
import { PropertyState } from "@/api/PropertyState";
import { Aggregation } from "@/core/Aggregation";
import { RelationshipProperty } from "../abstract/RelationshipProperty";

/**
 * Implementation of RelationshipProperty.
 */
export class RelationshipPropertyImpl implements RelationshipProperty {
  /**
   * Creates a new RelationshipProperty implementation.
   *
   * @param propertyValues The property values
   * @param schema The relationship property schema
   */
  constructor(
    private readonly propertyValues: Properties,
    private readonly schema: RelationshipPropertySchema
  ) {}

  values(): Properties {
    return this.propertyValues;
  }

  propertySchema(): RelationshipPropertySchema {
    return this.schema;
  }

  key(): string {
    return this.schema.key();
  }

  valueType(): ValueType {
    return this.schema.valueType();
  }

  defaultValue(): DefaultValue {
    return this.schema.defaultValue();
  }

  propertyState(): PropertyState {
    return this.schema.state();
  }

  aggregation(): Aggregation {
    return this.schema.aggregation();
  }
}
