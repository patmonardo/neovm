import { describe, expect, it, beforeEach } from 'vitest';
import { NodePropertyStore } from '../NodePropertyStore';
import { NodeProperty } from '../NodeProperty';
import { NodePropertyValues } from '../abstract/NodePropertyValues';
import { ValueType } from '@/api/ValueType';

// Create a mock NodePropertyValues implementation
class MockNodePropertyValues implements Partial<NodePropertyValues> {
  private values: Map<number, number> = new Map();

  constructor(initialValues?: Map<number, number>) {
    if (initialValues) {
      this.values = new Map(initialValues);
    }
  }

  doubleValue(nodeId: number): number {
    return this.values.get(nodeId) || 0;
  }

  longValue(nodeId: number): number {
    return Math.floor(this.doubleValue(nodeId));
  }

  floatValue(nodeId: number): number {
    return this.doubleValue(nodeId);
  }

  release(): void {}

  valueType(): ValueType {
    return ValueType.DOUBLE;
  }

  nodeCount(): number {
    return this.values.size;
  }

  dimension(): number {
    return 1;
  }

  // Add other required methods with basic implementations
  exists(_nodeId: number): boolean { return true; }
  doubleArrayValue(_nodeId: number): ArrayLike<number> | undefined { return undefined; }
  floatArrayValue(_nodeId: number): ArrayLike<number> | undefined { return undefined; }
  longArrayValue(_nodeId: number): ArrayLike<number> | undefined { return undefined; }
  getObject(nodeId: number): any { return this.doubleValue(nodeId); }
}

// Create a mock NodeProperty implementation
class MockNodeProperty implements Partial<NodeProperty> {
  private readonly _values: NodePropertyValues;
  private readonly _name: string;

  constructor(name: string, values: NodePropertyValues) {
    this._name = name;
    this._values = values;
  }

  values(): NodePropertyValues {
    return this._values;
  }

  name(): string {
    return this._name;
  }
}

describe('NodePropertyStore', () => {
  let ageValues: NodePropertyValues;
  let heightValues: NodePropertyValues;
  let ageProperty: NodeProperty;
  let heightProperty: NodeProperty;

  beforeEach(() => {
    // Create test data
    const ageData = new Map<number, number>([
      [1, 25],
      [2, 30],
      [3, 45]
    ]);

    const heightData = new Map<number, number>([
      [1, 175],
      [2, 182],
      [3, 168]
    ]);

    ageValues = new MockNodePropertyValues(ageData);
    heightValues = new MockNodePropertyValues(heightData);

    ageProperty = new MockNodeProperty('age', ageValues);
    heightProperty = new MockNodeProperty('height', heightValues);
  });

  it('should create an empty store', () => {
    const store = NodePropertyStore.empty();

    expect(store.count()).toBe(0);
    expect(store.isEmpty()).toBe(true);
    expect(Array.from(store.properties().keys())).toHaveLength(0);
  });

  it('should add and retrieve properties', () => {
    const store = NodePropertyStore.builder()
      .put('age', ageProperty)
      .put('height', heightProperty)
      .build();

    expect(store.count()).toBe(2);
    expect(store.isEmpty()).toBe(false);
    expect(store.hasProperty('age')).toBe(true);
    expect(store.hasProperty('weight')).toBe(false);

    const retrievedProperty = store.property('age');
    expect(retrievedProperty).toBeDefined();
    expect(retrievedProperty?.name()).toBe('age');

    // Test property values
    const values = store.propertyValues('age');
    expect(values).toBeDefined();
    expect(values?.doubleValue(1)).toBe(25);
    expect(values?.doubleValue(2)).toBe(30);
  });

  it('should remove properties', () => {
    const store = NodePropertyStore.builder()
      .put('age', ageProperty)
      .put('height', heightProperty)
      .removeProperty('age')
      .build();

    expect(store.count()).toBe(1);
    expect(store.hasProperty('age')).toBe(false);
    expect(store.hasProperty('height')).toBe(true);
  });

  it('should override properties with same key', () => {
    // Create a different age property
    const newAgeValues = new MockNodePropertyValues(new Map([
      [1, 26], // Changed from 25
      [2, 31]  // Changed from 30
    ]));
    const newAgeProperty = new MockNodeProperty('age', newAgeValues);

    const store = NodePropertyStore.builder()
      .put('age', ageProperty)
      .put('age', newAgeProperty) // Override
      .build();

    expect(store.count()).toBe(1);
    const values = store.propertyValues('age');
    expect(values?.doubleValue(1)).toBe(26); // Should be new value
  });

  it('should not override with putIfAbsent when key exists', () => {
    // Create a different age property
    const newAgeValues = new MockNodePropertyValues(new Map([
      [1, 26], // Changed from 25
      [2, 31]  // Changed from 30
    ]));
    const newAgeProperty = new MockNodeProperty('age', newAgeValues);

    const store = NodePropertyStore.builder()
      .put('age', ageProperty)
      .putIfAbsent('age', newAgeProperty) // Should not override
      .build();

    expect(store.count()).toBe(1);
    const values = store.propertyValues('age');
    expect(values?.doubleValue(1)).toBe(25); // Should still be original value
  });

  it('should set multiple properties at once', () => {
    const propertiesMap = new Map<string, NodeProperty>([
      ['age', ageProperty],
      ['height', heightProperty]
    ]);

    const store = NodePropertyStore.builder()
      .properties(propertiesMap)
      .build();

    expect(store.count()).toBe(2);
    expect(store.hasProperty('age')).toBe(true);
    expect(store.hasProperty('height')).toBe(true);
  });
});
