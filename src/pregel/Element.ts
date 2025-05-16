import { ValueType } from '../api/ValueType';
import { GdsValue } from '../values/abstract/GdsValue';
import { Visibility } from './PregelSchema';

/**
 * Represents a schema element in the Pregel computation framework.
 * An element defines a property that will be stored for each node.
 */
export interface Element {
  /**
   * The name/key of the property
   */
  readonly propertyKey: string;

  /**
   * Optional default value for the property
   */
  readonly defaultValue?: GdsValue;

  /**
   * The data type of the property
   */
  readonly propertyType: ValueType;

  /**
   * The visibility of the property (PUBLIC or PRIVATE)
   */
  readonly visibility: Visibility;
}

/**
 * Factory for creating Element instances
 */
export class Elements {
  /**
   * Create a new element with the given key, type and visibility
   */
  static of(
    propertyKey: string,
    propertyType: ValueType,
    visibility: Visibility = Visibility.PUBLIC
  ): Element {
    return {
      propertyKey,
      propertyType,
      visibility
    };
  }

  /**
   * Create a new element with a default value
   */
  static withDefault(
    propertyKey: string,
    defaultValue: GdsValue,
    visibility: Visibility = Visibility.PUBLIC
  ): Element {
    return {
      propertyKey,
      defaultValue,
      propertyType: defaultValue.type(),
      visibility
    };
  }
}
