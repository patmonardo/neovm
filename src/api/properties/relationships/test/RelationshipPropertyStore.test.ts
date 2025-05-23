import { ValueType } from '@/api/ValueType';
import { RelationshipPropertyStore } from '../RelationshipPropertyStore';
import { RelationshipProperty } from '../RelationshipProperty';

describe('RelationshipPropertyStore', () => {
  test('should store and retrieve properties', () => {
    // Create a store with some properties
    const store = RelationshipPropertyStore.builder()
      .putRelationshipProperty('weight', mockRelationshipProperty('weight', 5.0))
      .putRelationshipProperty('since', mockRelationshipProperty('since', 2023))
      .build();

    // Verify property retrieval
    expect(store.containsKey('weight')).toBe(true);
    expect(store.keySet().size).toBe(2);
    expect(store.isEmpty()).toBe(false);

    // Get a specific property
    const weightProperty = store.get('weight');
    expect(weightProperty).toBeDefined();
    expect(weightProperty?.key()).toBe('weight');

    // Test property values retrieval
    const values = store.values();
    expect(values.length).toBe(2);
    expect(values.some(p => p.key() === 'weight')).toBe(true);
    expect(values.some(p => p.key() === 'since')).toBe(true);
  });

  test('should filter properties', () => {
    // Create a store with multiple properties
    const store = RelationshipPropertyStore.builder()
      .putRelationshipProperty('weight', mockRelationshipProperty('weight', 5.0))
      .putRelationshipProperty('since', mockRelationshipProperty('since', 2023))
      .build();

    // Filter to just one property
    const filteredStore = store.filter('weight');

    // Verify filtered store
    expect(filteredStore.isEmpty()).toBe(false);
    expect(filteredStore.keySet().size).toBe(1);
    expect(filteredStore.containsKey('weight')).toBe(true);
    expect(filteredStore.containsKey('since')).toBe(false);
  });

  test('should handle missing properties', () => {
    // Create a store with one property
    const store = RelationshipPropertyStore.builder()
      .putRelationshipProperty('weight', mockRelationshipProperty('weight', 5.0))
      .build();

    // Verify behavior with missing property
    expect(store.get('missing')).toBeUndefined();

    // Filtering on missing property should return empty store
    const filteredStore = store.filter('missing');
    expect(filteredStore.isEmpty()).toBe(true);
    expect(filteredStore.keySet().size).toBe(0);
  });

  test('should handle empty stores', () => {
    const emptyStore = RelationshipPropertyStore.empty();
    expect(emptyStore.isEmpty()).toBe(true);
    expect(emptyStore.keySet().size).toBe(0);
    expect(emptyStore.values().length).toBe(0);
  });

  test('should handle putIfAbsent', () => {
    // Create store with initial property
    const builder = RelationshipPropertyStore.builder()
      .putRelationshipProperty('weight', mockRelationshipProperty('weight', 5.0));

    // Add a property with putIfAbsent
    builder.putIfAbsent('color', mockRelationshipProperty('color', 'red'));

    // Try to override existing property - should not change
    builder.putIfAbsent('weight', mockRelationshipProperty('weight', 10.0));

    const store = builder.build();

    // Verify results
    expect(store.keySet().size).toBe(2);
    expect(store.containsKey('color')).toBe(true);

    // Original weight property should be preserved
    const weightProp = store.get('weight');
    expect(weightProp).toBeDefined();
  });

  // Helper function to create mock relationship properties
  function mockRelationshipProperty(key: string, value: any): RelationshipProperty {
    return {
      key: () => key,
      value: () => value,
      valueType: () => typeof value === 'number'
        ? (Number.isInteger(value) ? ValueType.LONG : ValueType.DOUBLE)
        : ValueType.STRING
    } as unknown as RelationshipProperty;
  }
});
