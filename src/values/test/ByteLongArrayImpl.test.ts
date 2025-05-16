import { ByteLongArrayImpl } from '@/values/primitive/ByteLongArrayImpl';
import { ValueType } from '@/api/ValueType';

describe('ByteLongArrayImpl', () => {
  // Test construction and basic array operations
  describe('construction and array operations', () => {
    test('should store and retrieve values correctly', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const longArray = new ByteLongArrayImpl(byteArr);

      // Test length
      expect(longArray.length()).toBe(3);

      // Test individual value retrieval
      expect(longArray.longValue(0)).toBe(1);
      expect(longArray.longValue(1)).toBe(2);
      expect(longArray.longValue(2)).toBe(3);

      // Test full array copy
      const copy = longArray.longArrayValue();
      expect(Array.isArray(copy)).toBe(true);
      expect(copy).toEqual([1, 2, 3]);
    });
  });

  // Test type method
  describe('type()', () => {
    test('should return ValueType.LONG_ARRAY', () => {
      const longArray = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));
      expect(longArray.type()).toBe(ValueType.LONG_ARRAY);
    });
  });

  // Test asObject method
  describe('asObject()', () => {
    test('should return the underlying byte array', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const longArray = new ByteLongArrayImpl(byteArr);

      const obj = longArray.asObject();
      expect(obj instanceof Uint8Array).toBe(true);
      expect(obj).toBe(byteArr); // Should return the exact same reference
    });
  });

  // Test equality methods
  describe('equality methods', () => {
    test('equals() should work with same type', () => {
      const arr1 = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));
      const arr2 = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));
      const arr3 = new ByteLongArrayImpl(new Uint8Array([1, 2, 4]));

      expect(arr1.equals(arr1)).toBe(true); // Same instance
      expect(arr1.equals(arr2)).toBe(true); // Same values
      expect(arr1.equals(arr3)).toBe(false); // Different values
    });

    test('specialized equals methods should work with different array types', () => {
      const byteArr = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));

      // Test all specialized equals methods
      expect(byteArr.equalsBytes(new Uint8Array([1, 2, 3]))).toBe(true);
      expect(byteArr.equalsShorts(new Int16Array([1, 2, 3]))).toBe(true);
      expect(byteArr.equalsInts(new Int32Array([1, 2, 3]))).toBe(true);
      expect(byteArr.equalsLongs([1, 2, 3])).toBe(true);
      expect(byteArr.equalsFloats(new Float32Array([1, 2, 3]))).toBe(true);
      expect(byteArr.equalsDoubles(new Float64Array([1, 2, 3]))).toBe(true);

      // Test with different values
      expect(byteArr.equalsBytes(new Uint8Array([1, 2, 4]))).toBe(false);
      expect(byteArr.equalsShorts(new Int16Array([1, 2, 4]))).toBe(false);
      expect(byteArr.equalsInts(new Int32Array([1, 2, 4]))).toBe(false);
      expect(byteArr.equalsLongs([1, 2, 4])).toBe(false);
      expect(byteArr.equalsFloats(new Float32Array([1, 2, 4]))).toBe(false);
      expect(byteArr.equalsDoubles(new Float64Array([1, 2, 4]))).toBe(false);
    });
  });

  // Test hashCode method
  describe('hashCode()', () => {
    test('should return consistent hash for equal arrays', () => {
      const arr1 = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));
      const arr2 = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));
      const arr3 = new ByteLongArrayImpl(new Uint8Array([1, 2, 4]));

      expect(arr1.hashCode()).toBe(arr2.hashCode());
      expect(arr1.hashCode()).not.toBe(arr3.hashCode());
    });
  });

  // Test toString method
  describe('toString()', () => {
    test('should return formatted array string', () => {
      const arr = new ByteLongArrayImpl(new Uint8Array([1, 2, 3]));
      expect(arr.toString()).toBe('LongArray[1, 2, 3]');
    });
  });

  // Test edge cases
  describe('edge cases', () => {
    test('should handle empty arrays', () => {
      const emptyArr = new ByteLongArrayImpl(new Uint8Array([]));
      expect(emptyArr.length()).toBe(0);
      expect(emptyArr.longArrayValue()).toEqual([]);
      expect(emptyArr.toString()).toBe('LongArray[]');
      expect(emptyArr.equals(new ByteLongArrayImpl(new Uint8Array([])))).toBe(true);
    });
  });
});
