import { DefaultValue } from "@/api";
import { PropertyState } from "@/api";
import { Property } from "@/api/properties";
import { PropertySchema } from "@/api/schema/";
import { GraphPropertyValues } from "./GraphPropertyValues";
import { DefaultGraphProperty } from "./primitive/DefaultGraphProperty";

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
    return new DefaultGraphProperty(
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

