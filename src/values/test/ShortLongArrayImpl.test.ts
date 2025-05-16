import { ShortLongArrayImpl } from '@/values/primitive/ShortLongArrayImpl';
import { ValueType } from '@/api/ValueType';

describe('ShortLongArrayImpl', () => {
  // Test construction and basic array operations
  describe("construction and array operations", () => {
    test("should store and retrieve values correctly", () => {
      const shortArr = new Int16Array([100, 200, 300]); // Values within short range
      const longArray = new ShortLongArrayImpl(shortArr);

      // Test length
      expect(longArray.length()).toBe(3);

      // Test individual value retrieval
      expect(longArray.longValue(0)).toBe(100);
      expect(longArray.longValue(1)).toBe(200);
      expect(longArray.longValue(2)).toBe(300);

      // Test full array copy
      const copy = longArray.longArrayValue();
      expect(Array.isArray(copy)).toBe(true);
      expect(copy).toEqual([100, 200, 300]);

      // Verify it's a copy, not the original reference
      copy[0] = 999;
      expect(longArray.longValue(0)).toBe(100); // Original unchanged
    });
  });

  // Test type method
  describe("type()", () => {
    test("should return ValueType.LONG_ARRAY", () => {
      const longArray = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));
      expect(longArray.type()).toBe(ValueType.LONG_ARRAY);
    });
  });

  // Test asObject method
  describe("asObject()", () => {
    test("should return a direct reference to the backing Int16Array", () => {
      const shortArr = new Int16Array([1, 2, 3]);
      const longArray = new ShortLongArrayImpl(shortArr);

      const obj = longArray.asObject();
      expect(obj instanceof Int16Array).toBe(true);
      expect(Array.from(obj)).toEqual([1, 2, 3]);

      // Since asObject() returns the internal reference,
      // modifying it WILL affect the internal state
      obj[0] = 999;
      expect(longArray.longValue(0)).toBe(999);
    });
  });

  // Test equality methods
  describe("equality methods", () => {
    test("equals() should work with same type", () => {
      const arr1 = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));
      const arr2 = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));
      const arr3 = new ShortLongArrayImpl(new Int16Array([1, 2, 4]));

      expect(arr1.equals(arr1)).toBe(true); // Same instance
      expect(arr1.equals(arr2)).toBe(true); // Same values
      expect(arr1.equals(arr3)).toBe(false); // Different values
      expect(arr1.equals(null)).toBe(false); // Null handling
    });

    test("specialized equals methods should work with different array types", () => {
      const shortArr = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));

      // Test all specialized equals methods
      expect(shortArr.equalsBytes(new Uint8Array([1, 2, 3]))).toBe(true);
      expect(shortArr.equalsShorts(new Int16Array([1, 2, 3]))).toBe(true);
      expect(shortArr.equalsInts(new Int32Array([1, 2, 3]))).toBe(true);
      expect(shortArr.equalsLongs([1, 2, 3])).toBe(true);
      expect(shortArr.equalsFloats(new Float32Array([1, 2, 3]))).toBe(true);
      expect(shortArr.equalsDoubles(new Float64Array([1, 2, 3]))).toBe(true);

      // Test with different values
      expect(shortArr.equalsBytes(new Uint8Array([1, 2, 4]))).toBe(false);
      expect(shortArr.equalsShorts(new Int16Array([1, 2, 4]))).toBe(false);
      expect(shortArr.equalsInts(new Int32Array([1, 2, 4]))).toBe(false);
      expect(shortArr.equalsLongs([1, 2, 4])).toBe(false);
      expect(shortArr.equalsFloats(new Float32Array([1, 2, 4]))).toBe(false);
      expect(shortArr.equalsDoubles(new Float64Array([1, 2, 4]))).toBe(false);
    });
  });

  // Test hashCode method
  describe("hashCode()", () => {
    test("should return consistent hash for equal arrays", () => {
      const arr1 = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));
      const arr2 = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));
      const arr3 = new ShortLongArrayImpl(new Int16Array([1, 2, 4]));

      expect(arr1.hashCode()).toBe(arr2.hashCode());
      expect(arr1.hashCode()).not.toBe(arr3.hashCode());
    });
  });

  // Test toString method
  describe("toString()", () => {
    test("should return formatted array string", () => {
      const arr = new ShortLongArrayImpl(new Int16Array([1, 2, 3]));
      expect(arr.toString()).toBe("LongArray[1, 2, 3]");
    });

    test("should handle empty arrays", () => {
      const emptyArr = new ShortLongArrayImpl(new Int16Array([]));
      expect(emptyArr.toString()).toBe("LongArray[]");
    });
  });

  // Test edge cases
  describe("edge cases", () => {
    test("should handle empty arrays", () => {
      const emptyArr = new ShortLongArrayImpl(new Int16Array([]));
      expect(emptyArr.length()).toBe(0);
      expect(emptyArr.longArrayValue()).toEqual([]);
    });

    test("should handle Int16Array range limits", () => {
      const maxShort = 32767; // Max 16-bit signed integer
      const minShort = -32768; // Min 16-bit signed integer

      const extremeValues = new ShortLongArrayImpl(
        new Int16Array([maxShort, minShort])
      );
      expect(extremeValues.longValue(0)).toBe(maxShort);
      expect(extremeValues.longValue(1)).toBe(minShort);
    });

    test("should handle negative values", () => {
      const negativeValues = new ShortLongArrayImpl(
        new Int16Array([-1, -2, -3])
      );
      expect(negativeValues.longValue(0)).toBe(-1);
      expect(negativeValues.longArrayValue()).toEqual([-1, -2, -3]);
    });
  });
});
