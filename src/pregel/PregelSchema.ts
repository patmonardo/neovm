import { ValueType } from '../api/ValueType';
import { GdsValue } from '../values/abstract/GdsValue';

/**
 * Defines the schema of properties that will be stored for each node
 * in a Pregel computation.
 */
export interface PregelSchema {
  /**
   * The set of all schema elements (properties)
   */
  readonly elements: Set<Element>;

  /**
   * Get a map of property keys to their types
   */
  propertiesMap(): Map<string, ValueType>;
}

/**
 * Visibility of properties in the Pregel schema
 */
export enum Visibility {
  /**
   * Properties that can be accessed from outside the Pregel computation
   */
  PUBLIC,

  /**
   * Properties that are only used internally within the Pregel computation
   */
  PRIVATE
}

/**
 * A schema element representing a single property in the Pregel schema
 */
export interface Element {
  /**
   * The name of the property
   */
  readonly propertyKey: string;

  /**
   * The type of the property
   */
  readonly propertyType: ValueType;

  /**
   * Optional default value for the property
   */
  readonly defaultValue?: GdsValue;

  /**
   * The visibility of the property
   */
  readonly visibility: Visibility;
}

/**
 * Builder for creating PregelSchema instances
 */
export class PregelSchemaBuilder {
  private elements: Set<Element> = new Set();

  /**
   * Add a property to the schema with PUBLIC visibility
   */
  add(propertyKey: string, propertyType: ValueType): PregelSchemaBuilder {
    return this.addWithVisibility(propertyKey, propertyType, Visibility.PUBLIC);
  }

  /**
   * Add a property to the schema with specified visibility
   */
  addWithVisibility(
    propertyKey: string,
    propertyType: ValueType,
    visibility: Visibility
  ): PregelSchemaBuilder {
    this.elements.add({
      propertyKey,
      propertyType,
      visibility
    });
    return this;
  }

  /**
   * Add a property with a default value to the schema
   */
  addWithDefault(
    propertyKey: string,
    defaultValue: GdsValue,
    visibility: Visibility
  ): PregelSchemaBuilder {
    this.elements.add({
      propertyKey,
      propertyType: defaultValue.type(),
      defaultValue,
      visibility
    });
    return this;
  }

  /**
   * Build the final PregelSchema
   */
  build(): PregelSchema {
    return {
      elements: new Set(this.elements),

      propertiesMap(): Map<string, ValueType> {
        const map = new Map<string, ValueType>();
        this.elements.forEach(element => {
          map.set(element.propertyKey, element.propertyType);
        });
        return map;
      }
    };
  }
}

/**
 * Factory for creating PregelSchema instances
 */
export class PregelSchemas {
  /**
   * Create a new schema builder
   */
  static builder(): PregelSchemaBuilder {
    return new PregelSchemaBuilder();
  }

  /**
   * Create an empty schema
   */
  static empty(): PregelSchema {
    return new PregelSchemaBuilder().build();
  }
}
