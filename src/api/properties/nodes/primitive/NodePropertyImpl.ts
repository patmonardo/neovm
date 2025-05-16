import { NodeProperty } from '../NodeProperty';
import { PropertySchema } from '@/api/schema/abstract/PropertySchema';
import { NodePropertyValues } from '../abstract/NodePropertyValues';

/**
 * Implementation of the NodeProperty interface.
 */
export class NodePropertyImpl implements NodeProperty {
  /**
   * Creates a new NodeProperty implementation.
   *
   * @param propertyValues The node property values
   * @param schema The property schema
   */
  constructor(
    private readonly propertyValues: NodePropertyValues,
    private readonly schema: PropertySchema
  ) {}

  values(): NodePropertyValues {
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
