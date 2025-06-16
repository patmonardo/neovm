import { ValueType } from '@/api/ValueType';
import { DefaultLongGraphPropertyValues } from '../primitive/DefaultLongGraphPropertyValues';

describe('LongGraphPropertyValuesImpl', () => {
  test('should store and retrieve values correctly', () => {
    // Single value
    const singleValue = new DefaultLongGraphPropertyValues([42]);
    expect(singleValue.valueType()).toBe(ValueType.LONG);
    expect(singleValue.valueCount()).toBe(1);

    // Multiple values
    const multipleValues = new DefaultLongGraphPropertyValues([1, 2, 3]);
    expect(multipleValues.valueCount()).toBe(3);

    // Check iteration
    const values: number[] = [];
    for (const val of multipleValues.longValues()) {
      values.push(val);
    }
    expect(values).toEqual([1, 2, 3]);

    // Check objects() returns the same values
    const objects: number[] = [];
    for (const obj of multipleValues.objects()) {
      objects.push(obj);
    }
    expect(objects).toEqual([1, 2, 3]);
  });

  test('should convert to double values correctly', () => {
    const longValues = new DefaultLongGraphPropertyValues([1, 2, 3]);

    // Convert to array for testing
    const doubleValues: number[] = [];
    for (const val of longValues.doubleValues()) {
      doubleValues.push(val);
    }

    expect(doubleValues).toEqual([1, 2, 3]);
  });

  test('should throw for unsupported conversions', () => {
    const values = new DefaultLongGraphPropertyValues([1, 2, 3]);
    expect(() => Array.from(values.doubleArrayValues())).toThrow();
    expect(() => Array.from(values.floatArrayValues())).toThrow();
    expect(() => Array.from(values.longArrayValues())).toThrow();

    // Verify the error message mentions the correct types
    try {
      expect(() => Array.from(values.doubleArrayValues())).toThrow();
    } catch (e: any) {
      expect(e.message).toContain(ValueType[ValueType.DOUBLE_ARRAY]);
      expect(e.message).toContain(ValueType[ValueType.LONG]);
    }
  });

  test('should handle empty values', () => {
    const emptyValues = new DefaultLongGraphPropertyValues([]);
    expect(emptyValues.valueCount()).toBe(0);

    // Check that iteration works with empty arrays
    const values: number[] = [];
    for (const val of emptyValues.longValues()) {
      values.push(val);
    }
    expect(values).toEqual([]);
  });
});
