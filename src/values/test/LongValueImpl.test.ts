import { LongValueImpl } from '@/values/primitive/LongValueImpl';
import { ValueType } from '@/api/ValueType';

describe('LongValueImpl', () => {
  // Test constructors and value retrieval
  describe('construction and value retrieval', () => {
    test('should store and return the correct value', () => {
      const smallValue = new LongValueImpl(42);
      expect(smallValue.longValue()).toBe(42);

      const largeValue = new LongValueImpl(Number.MAX_SAFE_INTEGER);
      expect(largeValue.longValue()).toBe(Number.MAX_SAFE_INTEGER);

      const negativeValue = new LongValueImpl(-123);
      expect(negativeValue.longValue()).toBe(-123);
    });
  });

  // Test type method
  describe('type()', () => {
    test('should return ValueType.LONG', () => {
      const value = new LongValueImpl(42);
      expect(value.type()).toBe(ValueType.LONG);
    });
  });

  // Test asObject method
  describe('asObject()', () => {
    test('should return the number value', () => {
      const value = new LongValueImpl(42);
      expect(value.asObject()).toBe(42);
    });
  });

  // Test equals method
  describe('equals()', () => {
    test('should return true for the same instance', () => {
      const value = new LongValueImpl(42);
      expect(value.equals(value)).toBe(true);
    });

    test('should return true for another LongValueImpl with the same value', () => {
      const value1 = new LongValueImpl(42);
      const value2 = new LongValueImpl(42);
      expect(value1.equals(value2)).toBe(true);
    });

    test('should return false for another LongValueImpl with a different value', () => {
      const value1 = new LongValueImpl(42);
      const value2 = new LongValueImpl(43);
      expect(value1.equals(value2)).toBe(false);
    });

    test('should return false for non-IntegralValue objects', () => {
      const value = new LongValueImpl(42);
      expect(value.equals(42)).toBe(false);
      expect(value.equals("42")).toBe(false);
      expect(value.equals(null)).toBe(false);
      expect(value.equals(undefined)).toBe(false);
      expect(value.equals({})).toBe(false);
    });
  });

  // Test hashCode method
  describe('hashCode()', () => {
    test('should return a consistent hash value for the same number', () => {
      const value1 = new LongValueImpl(42);
      const value2 = new LongValueImpl(42);
      expect(value1.hashCode()).toBe(value2.hashCode());
    });

    test('should return different hash values for different numbers', () => {
      const value1 = new LongValueImpl(42);
      const value2 = new LongValueImpl(43);
      expect(value1.hashCode()).not.toBe(value2.hashCode());
    });

    test('should handle the full range of JavaScript integers', () => {
      // Test some boundary values
      const maxSafeInt = new LongValueImpl(Number.MAX_SAFE_INTEGER);
      const minSafeInt = new LongValueImpl(Number.MIN_SAFE_INTEGER);

      // Just checking that these don't throw and return a number
      expect(typeof maxSafeInt.hashCode()).toBe('number');
      expect(typeof minSafeInt.hashCode()).toBe('number');
    });
  });

  // Test toString method
  describe('toString()', () => {
    test('should return the string representation of the number', () => {
      expect(new LongValueImpl(42).toString()).toBe('42');
      expect(new LongValueImpl(-123).toString()).toBe('-123');
      expect(new LongValueImpl(0).toString()).toBe('0');
      expect(new LongValueImpl(Number.MAX_SAFE_INTEGER).toString())
        .toBe(Number.MAX_SAFE_INTEGER.toString());
    });
  });
});
