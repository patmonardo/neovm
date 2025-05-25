import { ValueType } from '@/api';
import { NodePropertyValues, LongNodePropertyValues } from '@/api/properties/nodes';

/**
 * NodePropertyValues implementation which always returns a given default property value.
 * Used as a fallback when properties are missing or for providing default values.
 */
export abstract class NullPropertyMap implements NodePropertyValues {

  dimension(): number | undefined {
    return 1;
  }

  // Abstract methods that subclasses must implement
  abstract getObject(nodeId: number): any;
  abstract valueType(): ValueType;
  abstract nodeCount(): number;
}

/**
 * Null property map that returns a constant double value for all nodes.
 */
export class DoubleNullPropertyMap extends NullPropertyMap {
  private readonly defaultValue: number;

  constructor(defaultValue: number) {
    super();
    this.defaultValue = defaultValue;
  }

  doubleValue(nodeId: number): number {
    return this.defaultValue;
  }

  getObject(nodeId: number): number {
    return this.doubleValue(nodeId);
  }

  valueType(): ValueType {
    return ValueType.DOUBLE;
  }

  getMaxDoublePropertyValue(): number | undefined {
    return undefined;
  }

  nodeCount(): number {
    return 0;
  }
}

/**
 * Null property map that returns a constant long value for all nodes.
 */
export class LongNullPropertyMap extends NullPropertyMap implements LongNodePropertyValues {
  private readonly defaultValue: number;

  constructor(defaultValue: number) {
    super();
    this.defaultValue = defaultValue;
  }

  longValue(nodeId: number): number {
    return this.defaultValue;
  }

  getObject(nodeId: number): number {
    return this.longValue(nodeId);
  }

  getMaxLongPropertyValue(): number | undefined {
    return undefined;
  }

  valueType(): ValueType {
    return ValueType.LONG;
  }

  nodeCount(): number {
    return 0;
  }
}

/**
 * Factory for creating null property maps with common default values.
 */
export class NullPropertyMapFactory {
  /**
   * Create a double null property map with zero default.
   */
  static doubleZero(): DoubleNullPropertyMap {
    return new DoubleNullPropertyMap(0.0);
  }

  /**
   * Create a double null property map with NaN default.
   */
  static doubleNaN(): DoubleNullPropertyMap {
    return new DoubleNullPropertyMap(NaN);
  }

  /**
   * Create a double null property map with custom default.
   */
  static doubleDefault(defaultValue: number): DoubleNullPropertyMap {
    return new DoubleNullPropertyMap(defaultValue);
  }

  /**
   * Create a long null property map with zero default.
   */
  static longZero(): LongNullPropertyMap {
    return new LongNullPropertyMap(0);
  }

  /**
   * Create a long null property map with -1 default (common for missing IDs).
   */
  static longMissing(): LongNullPropertyMap {
    return new LongNullPropertyMap(-1);
  }

  /**
   * Create a long null property map with custom default.
   */
  static longDefault(defaultValue: number): LongNullPropertyMap {
    return new LongNullPropertyMap(defaultValue);
  }
}
