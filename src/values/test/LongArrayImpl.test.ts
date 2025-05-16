import { LongArrayImpl } from '@/values/primitive/LongArrayImpl';
import { ValueType } from '@/api/ValueType';

describe('LongArrayImpl', () => {
  // Test core functionality
  describe('core functionality', () => {
    test('should store and retrieve values correctly', () => {
      const longArray = new LongArrayImpl([1000000000, 2000000000, 3000000000]);

      // Test basic properties
      expect(longArray.length()).toBe(3);
      expect(longArray.type()).toBe(ValueType.LONG_ARRAY);

      // Test value access
      expect(longArray.longValue(0)).toBe(1000000000);
      expect(longArray.longValue(1)).toBe(2000000000);
      expect(longArray.longValue(2)).toBe(3000000000);

      // Test array copy
      const copy = longArray.longArrayValue();
      expect(Array.isArray(copy)).toBe(true);
      expect(copy).toEqual([1000000000, 2000000000, 3000000000]);

      // Test it's a copy
      copy[0] = 999;
      expect(longArray.longValue(0)).toBe(1000000000);
    });
  });

  // Test equality methods (focus on primary cases)
  describe('equals methods', () => {
    test('should compare correctly with same type', () => {
      const arr1 = new LongArrayImpl([1, 2, 3]);
      const arr2 = new LongArrayImpl([1, 2, 3]);
      const arr3 = new LongArrayImpl([1, 2, 4]);

      expect(arr1.equals(arr1)).toBe(true); // Same reference
      expect(arr1.equals(arr2)).toBe(true); // Same values
      expect(arr1.equals(arr3)).toBe(false); // Different values
      expect(arr1.equals(null)).toBe(false);
      expect(arr1.equals({})).toBe(false);
    });

    test('should handle typed array equality', () => {
      const arr = new LongArrayImpl([1, 2, 3]);

      // Test a few key typed array comparisons
      expect(arr.equalsBytes(new Uint8Array([1, 2, 3]))).toBe(true);
      expect(arr.equalsInts(new Int32Array([1, 2, 3]))).toBe(true);
      expect(arr.equalsDoubles(new Float64Array([1, 2, 3]))).toBe(true);

      // Different values
      expect(arr.equalsBytes(new Uint8Array([1, 2, 4]))).toBe(false);
    });
  });

  // Test hash code and toString
  describe('hashCode and toString', () => {
    test('should generate consistent hash codes', () => {
      const arr1 = new LongArrayImpl([1, 2, 3]);
      const arr2 = new LongArrayImpl([1, 2, 3]);

      expect(arr1.hashCode()).toBe(arr2.hashCode());
    });

    test('should format toString correctly', () => {
      const arr = new LongArrayImpl([1, 2, 3]);
      expect(arr.toString()).toBe('LongArray[1, 2, 3]');
    });
  });

  // Test edge cases
  describe('edge cases', () => {
    test('should handle large numbers', () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      const arr = new LongArrayImpl([maxSafe, -maxSafe]);

      expect(arr.longValue(0)).toBe(maxSafe);
      expect(arr.longValue(1)).toBe(-maxSafe);
    });

    test('should handle empty arrays', () => {
      const empty = new LongArrayImpl([]);
      expect(empty.length()).toBe(0);
      expect(empty.toString()).toBe('LongArray[]');
    });
  });
});
