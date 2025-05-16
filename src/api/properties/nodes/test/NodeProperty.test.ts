import { describe, expect, it } from 'vitest';
import { NodeProperty } from '../NodeProperty';
import { PropertyState } from '@/api/PropertyState';
import { ValueType } from '@/api/ValueType';
import { DoubleNodePropertyValues } from '../abstract/DoubleNodePropertyValues';

describe('NodeProperty', () => {
  // Simple implementation for testing
  class SimpleDoubleNodeValues implements Partial<DoubleNodePropertyValues> {
    private readonly values: Map<number, number>;

    constructor(values: Map<number, number>) {
      this.values = values;
    }

    doubleValue(nodeId: number): number {
      return this.values.has(nodeId) ? this.values.get(nodeId)! : 0;
    }

    valueType(): ValueType {
      return ValueType.DOUBLE;
    }

    nodeCount(): number {
      return this.values.size;
    }

    // Minimal implementation of required methods
    dimension(): number { return 1; }
    release(): void {}
    exists(nodeId: number): boolean { return this.values.has(nodeId); }
    getObject(nodeId: number): any { return this.doubleValue(nodeId); }
    longValue(nodeId: number): number { return Math.floor(this.doubleValue(nodeId)); }
    floatValue(nodeId: number): number { return this.doubleValue(nodeId); }
  }

  it('should create a property using the factory method', () => {
    // 1. Create a simple values object with some test data
    const testData = new Map<number, number>([
      [1, 10.5],
      [2, 20.5],
      [3, 30.5]
    ]);
    const values = new SimpleDoubleNodeValues(testData);

    // 2. Use the NodeProperty.of factory to create a property
    const property = NodeProperty.of('score', PropertyState.PERSISTENT, values);

    // 3. Verify the property was created correctly
    expect(property.key()).toBe('score');
    expect(property.valueType()).toBe(ValueType.DOUBLE);
    expect(property.propertyState()).toBe(PropertyState.PERSISTENT);

    // 4. Verify we can access values through the property
    expect(property.values().doubleValue(1)).toBe(10.5);
    expect(property.values().doubleValue(2)).toBe(20.5);
    expect(property.values().doubleValue(3)).toBe(30.5);
  });
});
