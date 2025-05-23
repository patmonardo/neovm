import { PropertySchema } from "@/api/schema";
import { NodeProperty } from "../NodeProperty";
import { NodePropertyValues } from "../NodePropertyValues";

/**
 * Implementation of the NodeProperty interface.
 */

export class DefNodeProperty implements NodeProperty {
  /**
   * Creates a new NodeProperty implementation.
   *
   * @param _values The node property values
   * @param _schema The property schema
   */
  constructor(
    private readonly _values: NodePropertyValues,
    private readonly _schema: PropertySchema
  ) {}

  values(): NodePropertyValues {
    return this._values;
  }

  schema(): PropertySchema {
    return this._schema;
  }

  key(): string {
    return this._schema.key();
  }

  valueType() {
    return this._schema.valueType();
  }

  propertyState() {
    return this._schema.state();
  }
}
