import { PropertySchema } from "@/api/schema/abstract/PropertySchema";
import { GraphProperty } from "../GraphProperty";
import { GraphPropertyValues } from "../GraphPropertyValues";

/**
 * Implementation of the GraphProperty interface.
 */
export class DefGraphProperty implements GraphProperty {
  private readonly propertyValues: GraphPropertyValues;
  private readonly schema: PropertySchema;

  /**
   * Creates a new GraphProperty implementation.
   *
   * @param values The property values
   * @param schema The property schema
   */
  constructor(values: GraphPropertyValues, schema: PropertySchema) {
    this.propertyValues = values;
    this.schema = schema;
  }

  values(): GraphPropertyValues {
    return this.propertyValues;
  }

  propertySchema(): PropertySchema {
    return this.schema;
  }

  key(): string {
    return this.schema.key();
  }

  valueType() {
    return this.schema.valueType();
  }

  propertyState() {
    return this.schema.state();
  }
}
