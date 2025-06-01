/**
 * NULL PROPERTY MAP - DEFAULT VALUE PROVIDERS
 *
 * NodePropertyValues implementations that return constant default values.
 * Used as fallbacks when properties are missing or for providing defaults.
 */

import { ValueType } from '@/api';
import { NodePropertyValues, LongNodePropertyValues } from '@/api/properties/nodes';

export abstract class NullPropertyMap implements NodePropertyValues {
  dimension(): number {
    return 1;
  }

  // Default implementations that return defaults/errors for missing methods
  doubleValue(nodeId: number): number {
    throw new Error('doubleValue not supported by this property map');
  }

  longValue(nodeId: number): number {
    throw new Error('longValue not supported by this property map');
  }

  doubleArrayValue(nodeId: number): number[] {
    throw new Error('doubleArrayValue not supported by this property map');
  }

  floatArrayValue(nodeId: number): Float32Array {
    throw new Error('floatArrayValue not supported by this property map');
  }

  longArrayValue(nodeId: number): number[] {
    throw new Error('longArrayValue not supported by this property map');
  }

  // Methods that return "empty" for null property maps
  getMaxDoublePropertyValue(): number | undefined {
    return undefined;
  }

  getMaxLongPropertyValue(): number | undefined {
    return undefined;
  }

  hasValue(nodeId: number): boolean {
    return true; // Null maps always "have" their default value
  }

  // Abstract methods that subclasses must implement
  abstract getObject(nodeId: number): any;
  abstract valueType(): ValueType;
  abstract nodeCount(): number;

  // Static factory methods on the main class
  static doubleZero(): DoubleNullPropertyMap {
    return new DoubleNullPropertyMap(0.0);
  }

  static doubleNaN(): DoubleNullPropertyMap {
    return new DoubleNullPropertyMap(NaN);
  }

  static doubleDefault(defaultValue: number): DoubleNullPropertyMap {
    return new DoubleNullPropertyMap(defaultValue);
  }

  static longZero(): LongNullPropertyMap {
    return new LongNullPropertyMap(0);
  }

  static longMissing(): LongNullPropertyMap {
    return new LongNullPropertyMap(-1);
  }

  static longDefault(defaultValue: number): LongNullPropertyMap {
    return new LongNullPropertyMap(defaultValue);
  }
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

  valueType(): ValueType {
    return ValueType.LONG;
  }

  nodeCount(): number {
    return 0;
  }
}
