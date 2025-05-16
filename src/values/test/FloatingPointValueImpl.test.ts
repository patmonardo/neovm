import { ValueType } from '@/api/ValueType';
import { FloatingPointValue } from '@/values/abstract/FloatingPointValue';
import { FloatingPointValueImpl } from '@/values/primitive/FloatingPointValueImpl';

describe('FloatingPointValueImpl', () => {
  // Test construction and value retrieval
  describe('construction and value retrieval', () => {
    test('should store and return the correct value', () => {
      const value = new FloatingPointValueImpl(3.14159);
      expect(value.doubleValue()).toBe(3.14159);

      const zeroValue = new FloatingPointValueImpl(0);
      expect(zeroValue.doubleValue()).toBe(0);

      const negativeValue = new FloatingPointValueImpl(-2.718);
      expect(negativeValue.doubleValue()).toBe(-2.718);
    });
  });

  // Test type method
  describe('type()', () => {
    test('should return ValueType.DOUBLE', () => {
      const value = new FloatingPointValueImpl(3.14);
      expect(value.type()).toBe(ValueType.DOUBLE);
    });
  });

  // Test asObject method
  describe('asObject()', () => {
    test('should return the number value', () => {
      const value = new FloatingPointValueImpl(3.14);
      expect(value.asObject()).toBe(3.14);
    });
  });

  // Test equals method
  describe('equals()', () => {
    test('should return true for the same instance', () => {
      const value = new FloatingPointValueImpl(3.14);
      expect(value.equals(value)).toBe(true);
    });

    test('should return true for another FloatingPointValueImpl with the same value', () => {
      const value1 = new FloatingPointValueImpl(3.14);
      const value2 = new FloatingPointValueImpl(3.14);
      expect(value1.equals(value2)).toBe(true);
    });

    test('should handle special values correctly', () => {
      // NaN should equal NaN (unlike JavaScript's === operator)
      const nanValue1 = new FloatingPointValueImpl(NaN);
      const nanValue2 = new FloatingPointValueImpl(NaN);
      expect(nanValue1.equals(nanValue2)).toBe(true);

      // Positive and negative zero are distinct in IEEE 754
      const posZero = new FloatingPointValueImpl(0);
      const negZero = new FloatingPointValueImpl(-0);
      expect(posZero.equals(negZero)).toBe(false);

      // Infinity values
      const posInf1 = new FloatingPointValueImpl(Infinity);
      const posInf2 = new FloatingPointValueImpl(Infinity);
      const negInf = new FloatingPointValueImpl(-Infinity);
      expect(posInf1.equals(posInf2)).toBe(true);
      expect(posInf1.equals(negInf)).toBe(false);
    });

    test('should return false for another FloatingPointValueImpl with a different value', () => {
      const value1 = new FloatingPointValueImpl(3.14);
      const value2 = new FloatingPointValueImpl(2.71);
      expect(value1.equals(value2)).toBe(false);
    });

    test('should return false for non-FloatingPointValue objects', () => {
      const value = new FloatingPointValueImpl(3.14);
      expect(value.equals(3.14)).toBe(false);
      expect(value.equals("3.14")).toBe(false);
      expect(value.equals(null)).toBe(false);
      expect(value.equals(undefined)).toBe(false);
      expect(value.equals({})).toBe(false);
    });

    test('should handle duck typing with other FloatingPointValue implementations', () => {
      const value = new FloatingPointValueImpl(3.14);

      // Create a mock FloatingPointValue
      class MockFloatingPointValue implements FloatingPointValue {
        doubleValue(): number { return 3.14; }
        type(): ValueType { return ValueType.DOUBLE; }
        asObject(): unknown { return 3.14; }
        equals(): boolean { return false; }
        hashCode(): number { return 0; }
        toString(): string { return "3.14"; }
      }

      const mockValue = new MockFloatingPointValue();
      expect(value.equals(mockValue)).toBe(true);
    });
  });

  // Test hashCode method
  describe('hashCode()', () => {
    test('should return a consistent hash value for the same number', () => {
      const value1 = new FloatingPointValueImpl(3.14);
      const value2 = new FloatingPointValueImpl(3.14);
      expect(value1.hashCode()).toBe(value2.hashCode());
    });

    test('should return different hash values for different numbers', () => {
      const value1 = new FloatingPointValueImpl(3.14);
      const value2 = new FloatingPointValueImpl(2.71);
      expect(value1.hashCode()).not.toBe(value2.hashCode());
    });

    test('should handle special values', () => {
      // Just ensuring these don't throw
      expect(() => new FloatingPointValueImpl(NaN).hashCode()).not.toThrow();
      expect(() => new FloatingPointValueImpl(Infinity).hashCode()).not.toThrow();
      expect(() => new FloatingPointValueImpl(-Infinity).hashCode()).not.toThrow();

      // 0.0 and -0.0 should have different hash codes
      const posZero = new FloatingPointValueImpl(0);
      const negZero = new FloatingPointValueImpl(-0);
      expect(posZero.hashCode()).not.toBe(negZero.hashCode());
    });
  });

  // Test toString method
  describe('toString()', () => {
    test('should return the string representation of the number', () => {
      expect(new FloatingPointValueImpl(3.14).toString()).toBe('3.14');
      expect(new FloatingPointValueImpl(-2.718).toString()).toBe('-2.718');
      expect(new FloatingPointValueImpl(0).toString()).toBe('0');
      expect(new FloatingPointValueImpl(NaN).toString()).toBe('NaN');
      expect(new FloatingPointValueImpl(Infinity).toString()).toBe('Infinity');
    });
  });
});
