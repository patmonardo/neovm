import { ValueType } from '@/api/ValueType';
import { DoubleGraphPropertyValues } from '../abstract/DoubleGraphPropertyValues';

describe('DoubleGraphPropertyValues', () => {
  test('should create from single value', () => {
    const values = DoubleGraphPropertyValues.of(3.14);
    expect(values.valueType()).toBe(ValueType.DOUBLE);

    // Test doubleValues()
    const doubleValues = Array.from(values.doubleValues());
    expect(doubleValues.length).toBe(1);
    expect(doubleValues[0]).toBeCloseTo(3.14);

    // Test objects()
    const objects = Array.from(values.objects());
    expect(objects.length).toBe(1);
    expect(objects[0]).toBeCloseTo(3.14);
  });

  test('should create from array of values', () => {
    const values = DoubleGraphPropertyValues.of([1.1, 2.2, 3.3]);
    expect(values.valueType()).toBe(ValueType.DOUBLE);

    const doubleValues = Array.from(values.doubleValues());
    expect(doubleValues.length).toBe(3);
    expect(doubleValues[0]).toBeCloseTo(1.1);
    expect(doubleValues[1]).toBeCloseTo(2.2);
    expect(doubleValues[2]).toBeCloseTo(3.3);
  });

  test('should throw on unsupported operations', () => {
    const values = DoubleGraphPropertyValues.of(3.14);

    // Should throw when accessing as wrong type
    expect(() => values.longValues()).toThrow();
    expect(() => values.doubleArrayValues()).toThrow();
    expect(() => values.floatArrayValues()).toThrow();
    expect(() => values.longArrayValues()).toThrow();
  });

  test('should return correct value count', () => {
    expect(DoubleGraphPropertyValues.of(42).valueCount()).toBe(1);
    expect(DoubleGraphPropertyValues.of([1, 2, 3]).valueCount()).toBe(3);
    expect(DoubleGraphPropertyValues.of([]).valueCount()).toBe(0);
  });
});
