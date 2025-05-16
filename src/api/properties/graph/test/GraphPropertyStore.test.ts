import { ValueType } from '@/api/ValueType';
import { GraphPropertyStore } from '../GraphPropertyStore';
import { LongGraphPropertyValues } from '../abstract/LongGraphPropertyValues';

describe('GraphPropertyStore', () => {
  test('should store and retrieve properties', () => {
    // Create a store with some properties
    const store = GraphPropertyStore.builder()
      .putValue('age', mockLongValues(42))
      .putValue('score', mockLongValues(100))
      .build();

    // Verify property retrieval
    expect(store.hasProperty('age')).toBe(true);
    expect(store.propertyKeySet().size).toBe(2);
    expect(store.size()).toBe(2);
    expect(store.isEmpty()).toBe(false);

    // Get a specific property
    const ageProperty = store.getProperty('age');
    expect(ageProperty.key()).toBe('age');
    expect(ageProperty.valueType()).toBe(ValueType.LONG);

    // Test getPropertyOrNull
    const missingProperty = store.getPropertyOrNull('missing');
    expect(missingProperty).toBeNull();

    // Test getAllProperties
    const allProps = store.getAllProperties();
    expect(allProps.length).toBe(2);
    expect(allProps.some(p => p.key() === 'age')).toBe(true);
    expect(allProps.some(p => p.key() === 'score')).toBe(true);

    // Test getPropertyValues
    const ageValues = store.getPropertyValues('age', ValueType.LONG);
    expect(ageValues.valueType()).toBe(ValueType.LONG);
  });

  test('should support property removal', () => {
    // Create a store with some properties
    const builder = GraphPropertyStore.builder()
      .putValue('age', mockLongValues(42))
      .putValue('score', mockLongValues(100));

    // Remove a property
    const storeWithoutScore = builder.removeProperty('score').build();

    // Verify property was removed
    expect(storeWithoutScore.hasProperty('age')).toBe(true);
    expect(storeWithoutScore.hasProperty('score')).toBe(false);
    expect(storeWithoutScore.size()).toBe(1);
  });

  test('should support toBuilder for modifying existing stores', () => {
    // Create an initial store
    const initialStore = GraphPropertyStore.builder()
      .putValue('age', mockLongValues(42))
      .build();

    // Modify the store using toBuilder
    const updatedStore = initialStore.toBuilder()
      .putValue('score', mockLongValues(100))
      .build();

    // Verify both properties exist in the updated store
    expect(updatedStore.hasProperty('age')).toBe(true);
    expect(updatedStore.hasProperty('score')).toBe(true);

    // Original store should be unchanged
    expect(initialStore.hasProperty('score')).toBe(false);
  });

  test('should handle empty stores', () => {
    const emptyStore = GraphPropertyStore.empty();
    expect(emptyStore.isEmpty()).toBe(true);
    expect(emptyStore.size()).toBe(0);
    expect(emptyStore.propertyKeySet().size).toBe(0);
    expect(emptyStore.getAllProperties().length).toBe(0);
  });

  // Helper function to create mock values
  function mockLongValues(value: number): LongGraphPropertyValues {
    return {
      valueType: () => ValueType.LONG,
      longValue: () => value
    } as unknown as LongGraphPropertyValues;
  }
});
