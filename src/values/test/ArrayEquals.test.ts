import { ArrayEquals } from '@/values';

describe('ArrayEquals', () => {
  // Test typed comparison methods
  describe('typed comparisons', () => {
    test('byteAndShort should correctly compare arrays', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const matchingShortArr = new Int16Array([1, 2, 3]);
      const differentShortArr = new Int16Array([1, 2, 4]);
      const differentLengthShortArr = new Int16Array([1, 2]);

      expect(ArrayEquals.byteAndShort(byteArr, matchingShortArr)).toBe(true);
      expect(ArrayEquals.byteAndShort(byteArr, differentShortArr)).toBe(false);
      expect(ArrayEquals.byteAndShort(byteArr, differentLengthShortArr)).toBe(false);
    });

    test('byteAndInt should correctly compare arrays', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const matchingIntArr = new Int32Array([1, 2, 3]);
      const differentIntArr = new Int32Array([1, 2, 4]);

      expect(ArrayEquals.byteAndInt(byteArr, matchingIntArr)).toBe(true);
      expect(ArrayEquals.byteAndInt(byteArr, differentIntArr)).toBe(false);
    });

    test('byteAndLong should correctly compare arrays', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const matchingLongArr = [1, 2, 3];
      const differentLongArr = [1, 2, 4];

      expect(ArrayEquals.byteAndLong(byteArr, matchingLongArr)).toBe(true);
      expect(ArrayEquals.byteAndLong(byteArr, differentLongArr)).toBe(false);
    });

    test('byteAndFloat should correctly compare arrays', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const matchingFloatArr = new Float32Array([1, 2, 3]);
      const differentFloatArr = new Float32Array([1, 2, 3.1]);

      expect(ArrayEquals.byteAndFloat(byteArr, matchingFloatArr)).toBe(true);
      expect(ArrayEquals.byteAndFloat(byteArr, differentFloatArr)).toBe(false);
    });

    test('byteAndDouble should correctly compare arrays', () => {
      const byteArr = new Uint8Array([1, 2, 3]);
      const matchingDoubleArr = new Float64Array([1, 2, 3]);
      const differentDoubleArr = new Float64Array([1, 2, 3.1]);

      expect(ArrayEquals.byteAndDouble(byteArr, matchingDoubleArr)).toBe(true);
      expect(ArrayEquals.byteAndDouble(byteArr, differentDoubleArr)).toBe(false);
    });

    test('shortAndInt should correctly compare arrays', () => {
      const shortArr = new Int16Array([1, 2, 3]);
      const matchingIntArr = new Int32Array([1, 2, 3]);
      const differentIntArr = new Int32Array([1, 2, 4]);

      expect(ArrayEquals.shortAndInt(shortArr, matchingIntArr)).toBe(true);
      expect(ArrayEquals.shortAndInt(shortArr, differentIntArr)).toBe(false);
    });

    // We'll test a few more specific comparison methods as samples
    test('intAndDouble should correctly compare arrays', () => {
      const intArr = new Int32Array([1, 2, 3]);
      const matchingDoubleArr = new Float64Array([1, 2, 3]);
      const differentDoubleArr = new Float64Array([1, 2, 3.1]);

      expect(ArrayEquals.intAndDouble(intArr, matchingDoubleArr)).toBe(true);
      expect(ArrayEquals.intAndDouble(intArr, differentDoubleArr)).toBe(false);
    });

    test('floatAndDouble should correctly compare arrays', () => {
      const floatArr = new Float32Array([1, 2, 3]);
      const matchingDoubleArr = new Float64Array([1, 2, 3]);
      const differentDoubleArr = new Float64Array([1, 2, 3.00001]); // Very small difference

      expect(ArrayEquals.floatAndDouble(floatArr, matchingDoubleArr)).toBe(true);
      expect(ArrayEquals.floatAndDouble(floatArr, differentDoubleArr)).toBe(false);
    });
  });

  // Test generic object comparison methods
  describe('object comparisons', () => {
    test('byteAndObject should handle various array types', () => {
      const byteArr = new Uint8Array([1, 2, 3]);

      // Same type
      expect(ArrayEquals.byteAndObject(byteArr, new Uint8Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.byteAndObject(byteArr, new Uint8Array([1, 2, 4]))).toBe(false);

      // Different types
      expect(ArrayEquals.byteAndObject(byteArr, new Int16Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.byteAndObject(byteArr, new Int32Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.byteAndObject(byteArr, [1, 2, 3])).toBe(true);
      expect(ArrayEquals.byteAndObject(byteArr, new Float32Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.byteAndObject(byteArr, new Float64Array([1, 2, 3]))).toBe(true);

      // Non-array types
      expect(ArrayEquals.byteAndObject(byteArr, "123")).toBe(false);
      expect(ArrayEquals.byteAndObject(byteArr, 123)).toBe(false);
      expect(ArrayEquals.byteAndObject(byteArr, null)).toBe(false);
      expect(ArrayEquals.byteAndObject(byteArr, undefined)).toBe(false);
      expect(ArrayEquals.byteAndObject(byteArr, {})).toBe(false);
    });

    test('intAndObject should handle various array types', () => {
      const intArr = new Int32Array([1, 2, 3]);

      // Same type
      expect(ArrayEquals.intAndObject(intArr, new Int32Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.intAndObject(intArr, new Int32Array([1, 2, 4]))).toBe(false);

      // Different types
      expect(ArrayEquals.intAndObject(intArr, new Uint8Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.intAndObject(intArr, new Int16Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.intAndObject(intArr, [1, 2, 3])).toBe(true);
      expect(ArrayEquals.intAndObject(intArr, new Float32Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.intAndObject(intArr, new Float64Array([1, 2, 3]))).toBe(true);
    });

    // Test one more object comparison method as a sample
    test('doubleAndObject should handle various array types', () => {
      const doubleArr = new Float64Array([1, 2, 3]);

      // Same type
      expect(ArrayEquals.doubleAndObject(doubleArr, new Float64Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.doubleAndObject(doubleArr, new Float64Array([1, 2, 4]))).toBe(false);

      // Different types
      expect(ArrayEquals.doubleAndObject(doubleArr, new Uint8Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.doubleAndObject(doubleArr, new Int16Array([1, 2, 3]))).toBe(true);
      expect(ArrayEquals.doubleAndObject(doubleArr, [1, 2, 3])).toBe(true);
      expect(ArrayEquals.doubleAndObject(doubleArr, new Float32Array([1, 2, 3]))).toBe(true);
    });
  });

  // Test edge cases
  describe('edge cases', () => {
    test('should handle empty arrays', () => {
      const emptyByteArr = new Uint8Array([]);
      const emptyIntArr = new Int32Array([]);
      const emptyArr: number[] = [];

      expect(ArrayEquals.byteAndInt(emptyByteArr, emptyIntArr)).toBe(true);
      expect(ArrayEquals.byteAndLong(emptyByteArr, emptyArr)).toBe(true);
      expect(ArrayEquals.intAndObject(emptyIntArr, emptyByteArr)).toBe(true);
    });

    test('should handle arrays with different lengths', () => {
      const byteArr1 = new Uint8Array([1, 2, 3]);
      const byteArr2 = new Uint8Array([1, 2]);

      expect(ArrayEquals.byteAndObject(byteArr1, byteArr2)).toBe(false);
    });

    test('should identify same reference as equal', () => {
      const byteArr = new Uint8Array([1, 2, 3]);

      // This test relies on the implementation of arraysEqual which checks if a === b first
      expect(ArrayEquals.byteAndObject(byteArr, byteArr)).toBe(true);
    });
  });
});
