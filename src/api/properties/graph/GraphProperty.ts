import { Property } from "../Property";
import { GraphPropertyValues } from "./GraphPropertyValues";
import { PropertySchema } from "@/api/schema/PropertySchema";
import { PropertyState } from "@/api/PropertyState";
import { ValueType } from "@/api/ValueType";
/**
 * Represents a property at the graph level.
 * This specializes the general Property interface for graph properties.
 */
export interface GraphProperty extends Property<GraphPropertyValues> {}

/**
 * Namespace providing factory methods and utilities for GraphProperty.
 */
export namespace GraphProperty {
  /**
   * Creates a new GraphProperty with the given key and values.
   *
   * @param key The property key
   * @param values The property values
   * @returns A new GraphProperty instance
   */
  export function of(key: string, values: GraphPropertyValues): GraphProperty {
    return new GraphPropertyImpl(
      values,
      PropertySchema.of(
        key,
        values.valueType(),
        ValueType.fallbackValue(values.valueType()), // Fixed: Call static function
        PropertyState.PERSISTENT
      )
    );
  }
}

/**
 * Implementation of the GraphProperty interface.
 */
class GraphPropertyImpl implements GraphProperty {
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
