import { NodePropertyValues } from './NodePropertyValues';

/**
 * Getter interface for node properties.
 */
export interface NodePropertyContainer {
  /**
   * Returns the property values for a property key.
   * NOTE: Avoid using this on the hot path, favor caching the NodePropertyValues object when possible.
   *
   * @param propertyKey The node property key
   * @returns The values associated with that key
   */
  nodeProperties(propertyKey: string): NodePropertyValues;

  /**
   * Returns the set of all available node property keys.
   *
   * @returns Array of available property keys
   */
  availableNodeProperties(): Array<string>;
}

/**
 * Namespace containing utility functions for NodePropertyContainer.
 */
export namespace NodePropertyContainer {
  /**
   * Creates an empty NodePropertyContainer with no properties.
   *
   * @returns An empty NodePropertyContainer
   */
  export function empty(): NodePropertyContainer {
    return {
      nodeProperties(_propertyKey: string): NodePropertyValues {
        throw new Error(`No node properties available`);
      },

      availableNodeProperties(): Array<string> {
        return new Array<string>();
      }
    };
  }
}
