import { GdsNoValue } from '@/values/abstract/GdsNoValue';
import { ValueType } from '@/api/ValueType';

describe('GdsNoValue', () => {
  // Test the singleton pattern
  test('should be a singleton', () => {
    const noValue1 = GdsNoValue.NO_VALUE;
    const noValue2 = GdsNoValue.NO_VALUE;

    // Should be the same instance
    expect(noValue1).toBe(noValue2);

    // Should not be able to create new instances
    // @ts-expect-error - Constructor is private
    expect(() => new GdsNoValue()).toThrow();
  });

  // Test the value type
  test('should have UNKNOWN value type', () => {
    const noValue = GdsNoValue.NO_VALUE;
    expect(noValue.type()).toBe(ValueType.UNKNOWN);
  });

  // Test object representation
  test('asObject() should return null', () => {
    const noValue = GdsNoValue.NO_VALUE;
    expect(noValue.asObject()).toBeNull();
  });

  // Test equality comparison
  test('equals() should compare correctly', () => {
    const noValue = GdsNoValue.NO_VALUE;

    // Should equal itself
    expect(noValue.equals(noValue)).toBe(true);

    // Should equal another reference to NO_VALUE
    expect(noValue.equals(GdsNoValue.NO_VALUE)).toBe(true);

    // Should not equal other types
    expect(noValue.equals(null)).toBe(false);
    expect(noValue.equals(undefined)).toBe(false);
    expect(noValue.equals(0)).toBe(false);
    expect(noValue.equals("NO_VALUE")).toBe(false);
  });

  // Test hash code
  test('hashCode() should return 0', () => {
    const noValue = GdsNoValue.NO_VALUE;
    expect(noValue.hashCode()).toBe(0);
  });

  // Test string representation
  test('toString() should return "NO_VALUE"', () => {
    const noValue = GdsNoValue.NO_VALUE;
    expect(noValue.toString()).toBe("NO_VALUE");
  });
});
