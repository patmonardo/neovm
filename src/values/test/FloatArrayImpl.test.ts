import { FloatArrayImpl } from '@/values/primitive/FloatArrayImpl';
import { ValueType } from '@/api/ValueType';

describe('FloatArrayImpl', () => {
  // Test basic functionality
  describe('basic operations', () => {
    test("should store and retrieve values correctly", () => {
      const arr = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));

      // Test basic properties
      expect(arr.length()).toBe(3);
      expect(arr.type()).toBe(ValueType.FLOAT_ARRAY);

      // Test value access
      expect(arr.doubleValue(0)).toBeCloseTo(1.1);
      expect(arr.doubleValue(1)).toBeCloseTo(2.2);
      expect(arr.doubleValue(2)).toBeCloseTo(3.3);
    });

    test("should convert to double array correctly", () => {
      const arr = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));
      const doubles = arr.doubleArrayValue();

      expect(doubles instanceof Float64Array).toBe(true);
      expect(doubles.length).toBe(3);
      expect(doubles[0]).toBeCloseTo(1.1);
      expect(doubles[1]).toBeCloseTo(2.2);
      expect(doubles[2]).toBeCloseTo(3.3);
    });
  });

  // Test equality methods
  describe('equality', () => {
    test('should handle same instance equality', () => {
      const arr = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));
      expect(arr.equals(arr)).toBe(true);
    });

    test('should correctly compare with other FloatArrayImpl', () => {
      const arr1 = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));
      const arr2 = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));
      const arr3 = new FloatArrayImpl(new Float32Array([1.1, 2.2, 4.4]));

      expect(arr1.equals(arr2)).toBe(true);
      expect(arr1.equals(arr3)).toBe(false);
    });

    test('should handle cross-type array equality', () => {
      const floatArr = new FloatArrayImpl(new Float32Array([1, 2, 3]));

      // Test equality with various array types
      expect(floatArr.equalsBytes(new Uint8Array([1, 2, 3]))).toBe(true);
      expect(floatArr.equalsShorts(new Int16Array([1, 2, 3]))).toBe(true);
      expect(floatArr.equalsInts(new Int32Array([1, 2, 3]))).toBe(true);
      expect(floatArr.equalsLongs([1, 2, 3])).toBe(true);
      expect(floatArr.equalsFloats(new Float32Array([1, 2, 3]))).toBe(true);
      expect(floatArr.equalsDoubles(new Float64Array([1, 2, 3]))).toBe(true);

      // Test inequality
      expect(floatArr.equalsBytes(new Uint8Array([1, 2, 4]))).toBe(false);
    });

    test('should handle null, undefined and non-value objects', () => {
      const arr = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));

      expect(arr.equals(null)).toBe(false);
      expect(arr.equals(undefined)).toBe(false);
      expect(arr.equals({})).toBe(false);
      expect(arr.equals("not an array")).toBe(false);
    });
  });

  // Test special cases
  describe('special values', () => {
    test('should handle NaN values correctly', () => {
      const arr1 = new FloatArrayImpl(new Float32Array([NaN, 2.2]));
      const arr2 = new FloatArrayImpl(new Float32Array([NaN, 2.2]));

      // This may need adjustment based on how your equality methods handle NaN
      expect(arr1.equals(arr2)).toBe(false); // Standard JS behavior: NaN !== NaN
    });

    test('should handle empty arrays', () => {
      const empty = new FloatArrayImpl(new Float32Array([]));

      expect(empty.length()).toBe(0);
      expect(empty.toString()).toBe('FloatArray[]');
      expect(empty.equals(new FloatArrayImpl(new Float32Array([])))).toBe(true);
    });

    test('should handle Infinity values', () => {
      const arr = new FloatArrayImpl(new Float32Array([Infinity, -Infinity]));

      expect(arr.doubleValue(0)).toBe(Infinity);
      expect(arr.doubleValue(1)).toBe(-Infinity);
    });
  });

  // Test hashCode and toString
  describe('hashCode and toString', () => {
    test('should generate consistent hash codes for equal arrays', () => {
      const arr1 = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));
      const arr2 = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));

      expect(arr1.hashCode()).toBe(arr2.hashCode());
    });

    test('should format array contents correctly in toString', () => {
      const arr = new FloatArrayImpl(new Float32Array([1.1, 2.2, 3.3]));
      expect(arr.toString()).toBe('FloatArray[1.100000023841858, 2.200000047683716, 3.299999952316284]');
    });
  });
});
