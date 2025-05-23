import { PrimitiveValues } from '@/values';
import { ValueType } from '@/api/ValueType';
import { DefLongValue } from '@/values/primitive/DefLongValue';
import { DefByteLongArray } from '@/values/primitive/DefByteLongArray';
import { DefShortLongArray } from "@/values/primitive/DefShortLongArray";
import { DefIntLongArray } from '@/values/primitive/DefIntLongArray';
import { DefFloatingPointValue } from '@/values/primitive/DefFloatingPointValue';
import { DefFloatArray } from '@/values/primitive/DefFloatArray';
import { GdsNoValue } from '@/values/abstract/GdsNoValue';

describe('PrimitiveValues', () => {
  // Test constants
  describe('constants', () => {
    test('NO_VALUE should be a singleton', () => {
      expect(PrimitiveValues.NO_VALUE).toBe(GdsNoValue.NO_VALUE);
    });

    test('EMPTY_LONG_ARRAY should be a valid empty array', () => {
      const emptyArray = PrimitiveValues.EMPTY_LONG_ARRAY;
      expect(emptyArray.length()).toBe(0);
      expect(emptyArray.type()).toBe(ValueType.LONG_ARRAY);
    });
  });

  // Test direct factory methods
  describe('factory methods', () => {
    test('longValue creates IntegralValue', () => {
      const value = PrimitiveValues.longValue(42);
      expect(value.type()).toBe(ValueType.LONG);
      expect(value.asObject()).toBe(42);
    });

    test('floatingPointValue creates FloatingPointValue', () => {
      const value = PrimitiveValues.floatingPointValue(3.14);
      expect(value.type()).toBe(ValueType.DOUBLE);
      expect(value.asObject()).toBeCloseTo(3.14);
    });

    test('longArray creates LongArray from number[]', () => {
      const array = PrimitiveValues.longArray([1, 2, 3]);
      expect(array.type()).toBe(ValueType.LONG_ARRAY);
      expect(array.length()).toBe(3);
      expect(array.longValue(0)).toBe(1);
    });

    test('intArray creates LongArray from Int32Array', () => {
      const array = PrimitiveValues.intArray(new Int32Array([1, 2, 3]));
      expect(array.type()).toBe(ValueType.LONG_ARRAY);
      expect(array instanceof DefIntLongArray).toBe(true);
    });

    test('shortArray creates LongArray from Int16Array', () => {
      const array = PrimitiveValues.shortArray(new Int16Array([1, 2, 3]));
      expect(array.type()).toBe(ValueType.LONG_ARRAY);
      expect(array instanceof DefShortLongArray).toBe(true);
    });

    test('byteArray creates LongArray from Uint8Array', () => {
      const array = PrimitiveValues.byteArray(new Uint8Array([1, 2, 3]));
      expect(array.type()).toBe(ValueType.LONG_ARRAY);
      expect(array instanceof DefByteLongArray).toBe(true);
    });

    test('floatArray creates FloatArray from Float32Array', () => {
      const array = PrimitiveValues.floatArray(new Float32Array([1.1, 2.2, 3.3]));
      expect(array.type()).toBe(ValueType.FLOAT_ARRAY);
      expect(array instanceof DefFloatArray).toBe(true);
    });

    test('doubleArray creates DoubleArray from Float64Array', () => {
      const array = PrimitiveValues.doubleArray(new Float64Array([1.1, 2.2, 3.3]));
      expect(array.type()).toBe(ValueType.DOUBLE_ARRAY);
    });
  });

  // Test automatic type detection via create() and of()
  describe('automatic type detection', () => {
    test('create() handles integer values', () => {
      const value = PrimitiveValues.create(42);
      expect(value.type()).toBe(ValueType.LONG);
      expect(value instanceof DefLongValue).toBe(true);
    });

    test('create() handles floating point values', () => {
      const value = PrimitiveValues.create(3.14);
      expect(value.type()).toBe(ValueType.DOUBLE);
      expect(value instanceof DefFloatingPointValue).toBe(true);
    });

    test('create() handles typed arrays', () => {
      expect(PrimitiveValues.create(new Uint8Array([1, 2, 3])).type()).toBe(ValueType.LONG_ARRAY);
      expect(PrimitiveValues.create(new Int16Array([1, 2, 3])).type()).toBe(ValueType.LONG_ARRAY);
      expect(PrimitiveValues.create(new Int32Array([1, 2, 3])).type()).toBe(ValueType.LONG_ARRAY);
      expect(PrimitiveValues.create(new Float32Array([1, 2, 3])).type()).toBe(ValueType.FLOAT_ARRAY);
      expect(PrimitiveValues.create(new Float64Array([1, 2, 3])).type()).toBe(ValueType.DOUBLE_ARRAY);
    });

    test('create() handles JavaScript arrays', () => {
      // Integer array should become LongArray
      const intArray = PrimitiveValues.create([1, 2, 3]);
      expect(intArray.type()).toBe(ValueType.LONG_ARRAY);

      // Mixed array with floats should become DoubleArray
      const floatArray = PrimitiveValues.create([1, 2, 3.5]);
      expect(floatArray.type()).toBe(ValueType.DOUBLE_ARRAY);

      // Empty array should become EMPTY_LONG_ARRAY
      const emptyArray = PrimitiveValues.create([]);
      expect(emptyArray).toBe(PrimitiveValues.EMPTY_LONG_ARRAY);
    });

    test('create() handles null/undefined as NO_VALUE', () => {
      expect(PrimitiveValues.create(null)).toBe(PrimitiveValues.NO_VALUE);
      expect(PrimitiveValues.create(undefined)).toBe(PrimitiveValues.NO_VALUE);
    });
  });

  // Test error conditions
  describe('error conditions', () => {
    test('create() throws for unsupported types', () => {
      expect(() => PrimitiveValues.create({})).toThrow();
      expect(() => PrimitiveValues.create("string")).toThrow();
      expect(() => PrimitiveValues.create(true)).toThrow();
      expect(() => PrimitiveValues.create(Symbol())).toThrow();
    });

    test('create() throws for arrays with null elements', () => {
      expect(() => PrimitiveValues.create([1, null, 3])).toThrow();
      expect(() => PrimitiveValues.create([1, undefined, 3])).toThrow();
    });
  });

  // Test conversions and edge cases
  describe('conversions and edge cases', () => {
    test('MAX_SAFE_INTEGER handled correctly', () => {
      const max = PrimitiveValues.create(Number.MAX_SAFE_INTEGER);
      expect(max.type()).toBe(ValueType.LONG);
      expect(max.asObject()).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('MIN_SAFE_INTEGER handled correctly', () => {
      const min = PrimitiveValues.create(Number.MIN_SAFE_INTEGER);
      expect(min.type()).toBe(ValueType.LONG);
      expect(min.asObject()).toBe(Number.MIN_SAFE_INTEGER);
    });

    test('NaN is handled as floating point value', () => {
      const nanValue = PrimitiveValues.create(NaN);
      expect(nanValue.type()).toBe(ValueType.DOUBLE);
      expect(Number.isNaN(nanValue.asObject())).toBe(true);
    });

    test('Infinity is handled as floating point value', () => {
      const infValue = PrimitiveValues.create(Infinity);
      expect(infValue.type()).toBe(ValueType.DOUBLE);
      expect(infValue.asObject()).toBe(Infinity);
    });

    test('Zero is handled as long value', () => {
      const zero = PrimitiveValues.create(0);
      expect(zero.type()).toBe(ValueType.LONG);
      expect(zero.asObject()).toBe(0);
    });
  });
});
