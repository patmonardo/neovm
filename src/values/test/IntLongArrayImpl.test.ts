import { IntLongArrayImpl } from '@/values/primitive/IntLongArrayImpl';
import { ValueType } from '@/api/ValueType';

describe('IntLongArrayImpl', () => {
  // Test construction and basic array operations
  describe('construction and array operations', () => {
    test('should store and retrieve values correctly', () => {
      const intArr = new Int32Array([100000, 200000, 300000]); // Values too large for byte array
      const longArray = new IntLongArrayImpl(intArr);

      // Test length
      expect(longArray.length()).toBe(3);

      // Test individual value retrieval
      expect(longArray.longValue(0)).toBe(100000);
      expect(longArray.longValue(1)).toBe(200000);
      expect(longArray.longValue(2)).toBe(300000);

      // Test full array copy
      const copy = longArray.longArrayValue();
      expect(Array.isArray(copy)).toBe(true);
      expect(copy).toEqual([100000, 200000, 300000]);

      // Verify it's a copy, not the original reference
      copy[0] = 999999;
      expect(longArray.longValue(0)).toBe(100000); // Original unchanged
    });
  });

  // Test type method
  describe('type()', () => {
    test('should return ValueType.LONG_ARRAY', () => {
      const longArray = new IntLongArrayImpl(new Int32Array([1, 2, 3]));
      expect(longArray.type()).toBe(ValueType.LONG_ARRAY);
    });
  });

  // Test asObject method
  describe('asObject()', () => {
    test('should return an array of numbers', () => {
      const intArr = new Int32Array([1, 2, 3]);
      const longArray = new IntLongArrayImpl(intArr);

      const obj = longArray.asObject();
      expect(Array.isArray(obj)).toBe(true);
      expect(obj).toEqual([1, 2, 3]);
    });
  });

  // Test equality methods
  describe('equality methods', () => {
    test('equals() should work with same type', () => {
      const arr1 = new IntLongArrayImpl(new Int32Array([1, 2, 3]));
      const arr2 = new IntLongArrayImpl(new Int32Array([1, 2, 3]));
      const arr3 = new IntLongArrayImpl(new Int32Array([1, 2, 4]));

      expect(arr1.equals(arr1)).toBe(true); // Same instance
      expect(arr1.equals(arr2)).toBe(true); // Same values
      expect(arr1.equals(arr3)).toBe(false); // Different values
    });

    test('specialized equals methods should work with different array types', () => {
      const intArr = new IntLongArrayImpl(new Int32Array([1, 2, 3]));

      // Test all specialized equals methods
      expect(intArr.equalsBytes(new Uint8Array([1, 2, 3]))).toBe(true);
      expect(intArr.equalsShorts(new Int16Array([1, 2, 3]))).toBe(true);
      expect(intArr.equalsInts(new Int32Array([1, 2, 3]))).toBe(true);
      expect(intArr.equalsLongs([1, 2, 3])).toBe(true);
      expect(intArr.equalsFloats(new Float32Array([1, 2, 3]))).toBe(true);
      expect(intArr.equalsDoubles(new Float64Array([1, 2, 3]))).toBe(true);

      // Test with different values
      expect(intArr.equalsBytes(new Uint8Array([1, 2, 4]))).toBe(false);
      expect(intArr.equalsShorts(new Int16Array([1, 2, 4]))).toBe(false);
      expect(intArr.equalsInts(new Int32Array([1, 2, 4]))).toBe(false);
      expect(intArr.equalsLongs([1, 2, 4])).toBe(false);
      expect(intArr.equalsFloats(new Float32Array([1, 2, 4]))).toBe(false);
      expect(intArr.equalsDoubles(new Float64Array([1, 2, 4]))).toBe(false);
    });

    // Specific for IntLongArrayImpl - test with values outside byte range
    test('should correctly compare values outside of byte range', () => {
      const intArr = new IntLongArrayImpl(new Int32Array([200, 1000, 100000]));
      const sameValues = new IntLongArrayImpl(new Int32Array([200, 1000, 100000]));

      expect(intArr.equals(sameValues)).toBe(true);

      // These would overflow a Uint8Array implementation
      expect(intArr.equalsInts(new Int32Array([200, 1000, 100000]))).toBe(true);
    });
  });

  // Test hashCode method
  describe('hashCode()', () => {
    test('should return consistent hash for equal arrays', () => {
      const arr1 = new IntLongArrayImpl(new Int32Array([1, 2, 3]));
      const arr2 = new IntLongArrayImpl(new Int32Array([1, 2, 3]));
      const arr3 = new IntLongArrayImpl(new Int32Array([1, 2, 4]));

      expect(arr1.hashCode()).toBe(arr2.hashCode());
      expect(arr1.hashCode()).not.toBe(arr3.hashCode());
    });

    test('should produce appropriate hash codes for large values', () => {
      const largeValues = new IntLongArrayImpl(new Int32Array([100000, 200000, 300000]));
      expect(typeof largeValues.hashCode()).toBe('number');
    });
  });

  // Test toString method
  describe('toString()', () => {
    test('should return formatted array string', () => {
      const arr = new IntLongArrayImpl(new Int32Array([1, 2, 3]));
      expect(arr.toString()).toBe('LongArray[1, 2, 3]');
    });

    test('should format large values properly', () => {
      const arr = new IntLongArrayImpl(new Int32Array([100000, 200000]));
      expect(arr.toString()).toBe('LongArray[100000, 200000]');
    });
  });

  // Test edge cases
  describe('edge cases', () => {
    test('should handle empty arrays', () => {
      const emptyArr = new IntLongArrayImpl(new Int32Array([]));
      expect(emptyArr.length()).toBe(0);
      expect(emptyArr.longArrayValue()).toEqual([]);
      expect(emptyArr.toString()).toBe('LongArray[]');
      expect(emptyArr.equals(new IntLongArrayImpl(new Int32Array([])))).toBe(true);
    });

    test('should handle negative values', () => {
      const negativeValues = new IntLongArrayImpl(new Int32Array([-1, -2, -3]));
      expect(negativeValues.longValue(0)).toBe(-1);
      expect(negativeValues.longArrayValue()).toEqual([-1, -2, -3]);
    });

    test('should handle Int32Array range limits', () => {
      const maxInt = 2147483647; // Max 32-bit signed integer
      const minInt = -2147483648; // Min 32-bit signed integer

      const extremeValues = new IntLongArrayImpl(new Int32Array([maxInt, minInt]));
      expect(extremeValues.longValue(0)).toBe(maxInt);
      expect(extremeValues.longValue(1)).toBe(minInt);
    });
  });
});
