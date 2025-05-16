import { DefaultValue } from "@/api/DefaultValue";
import { Property } from "@/api/properties/Property";
import { PropertyState } from "@/api/PropertyState";
import { PropertySchema } from "@/api/schema/abstract/PropertySchema";
import { GraphPropertyValues } from "../abstract/GraphPropertyValues";
import { GraphPropertyImpl } from "../primitive/GraphPropertyImpl";

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
        DefaultValue.of(values.valueType()),
        PropertyState.PERSISTENT
      )
    );
  }
}

