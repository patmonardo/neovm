import { describe, it, expect } from 'vitest';
import { ValueConversion } from '../ValueConversion';

describe('ValueConversion', () => {
  describe('formatWithLocale', () => {
    it('should format with %d for integers', () => {
      expect(ValueConversion.formatWithLocale('Value is %d', 123)).toBe('Value is 123');
      expect(ValueConversion.formatWithLocale('Value is %d', 123.7)).toBe('Value is 123');
    });

    it('should format with %.2f for floats to 2 decimal places', () => {
      expect(ValueConversion.formatWithLocale('Amount: %.2f', 123.456)).toBe('Amount: 123.46');
      expect(ValueConversion.formatWithLocale('Amount: %.2f', 123)).toBe('Amount: 123.00');
    });

    it('should format with %s for strings', () => {
      expect(ValueConversion.formatWithLocale('Name: %s', 'test')).toBe('Name: test');
    });

    it('should handle multiple arguments', () => {
      expect(ValueConversion.formatWithLocale('%d, %.2f, %s', 10, 20.5, 'hello')).toBe('10, 20.50, hello');
    });

    it('should return original match if not enough arguments', () => {
      expect(ValueConversion.formatWithLocale('Val: %d %s', 10)).toBe('Val: 10 %s');
    });

    it('should ignore extra arguments', () => {
      expect(ValueConversion.formatWithLocale('Val: %d', 10, 20, 30)).toBe('Val: 10');
    });
  });

  describe('exactDoubleToLong', () => {
    it('should convert integer doubles to long (number)', () => {
      expect(ValueConversion.exactDoubleToLong(123.0)).toBe(123);
      expect(ValueConversion.exactDoubleToLong(0.0)).toBe(0);
      expect(ValueConversion.exactDoubleToLong(-456.0)).toBe(-456);
    });

    it('should throw for non-integer doubles', () => {
      expect(() => ValueConversion.exactDoubleToLong(123.45)).toThrowError(
        /Cannot safely convert 123.45 into an long value/
      );
    });

    it('should handle Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER', () => {
      expect(ValueConversion.exactDoubleToLong(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
      expect(ValueConversion.exactDoubleToLong(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe("exactLongToDouble", () => {
    const limit = Math.pow(2, 53); // 9007199254740992
    const justOverLimit = limit + 2; // Smallest representable double > limit (9007199254740994)
    const justUnderNegativeLimit = -limit - 2; // Largest representable double < -limit (-9007199254740994)

    it("should convert long (number) within +/- 2^53 (inclusive) to double", () => {
      expect(ValueConversion.exactLongToDouble(123)).toBe(123);
      expect(ValueConversion.exactLongToDouble(0)).toBe(0);
      expect(ValueConversion.exactLongToDouble(-456)).toBe(-456);
      expect(ValueConversion.exactLongToDouble(Number.MAX_SAFE_INTEGER)).toBe(
        Number.MAX_SAFE_INTEGER
      ); // 2^53 - 1
      expect(ValueConversion.exactLongToDouble(Number.MIN_SAFE_INTEGER)).toBe(
        Number.MIN_SAFE_INTEGER
      ); // -(2^53 - 1)
      expect(ValueConversion.exactLongToDouble(limit - 1)).toBe(limit - 1); // 2^53 - 1
      expect(ValueConversion.exactLongToDouble(-(limit - 1))).toBe(
        -(limit - 1)
      ); // -(2^53 - 1)
      expect(ValueConversion.exactLongToDouble(limit)).toBe(limit); // 2^53 itself
      expect(ValueConversion.exactLongToDouble(-limit)).toBe(-limit); // -2^53 itself
    });

    it("should throw for long (number) outside +/- 2^53", () => {
      // Values that are representably different and outside the inclusive limit
      expect(() =>
        ValueConversion.exactLongToDouble(justOverLimit)
      ).toThrowError(/Cannot safely convert \d+ into an double value/);
      expect(() =>
        ValueConversion.exactLongToDouble(justUnderNegativeLimit)
      ).toThrowError(/Cannot safely convert -\d+ into an double value/);

      // Test with a significantly larger number as well
      const veryLargeNumber = limit * 2;
      expect(() =>
        ValueConversion.exactLongToDouble(veryLargeNumber)
      ).toThrowError(/Cannot safely convert \d+ into an double value/);
      expect(() =>
        ValueConversion.exactLongToDouble(-veryLargeNumber)
      ).toThrowError(/Cannot safely convert -\d+ into an double value/);
    });
  });

  describe('exactLongToFloat', () => {
    const limit = Math.pow(2, 24); // 16777216
    it('should convert long (number) within +/- (2^24 -1) to float (number)', () => {
      expect(ValueConversion.exactLongToFloat(123)).toBe(123);
      expect(ValueConversion.exactLongToFloat(0)).toBe(0);
      expect(ValueConversion.exactLongToFloat(limit - 1)).toBe(limit - 1);
      expect(ValueConversion.exactLongToFloat(-(limit - 1))).toBe(-(limit - 1));
    });

    it('should throw for long (number) equal to or outside +/- 2^24', () => {
      expect(() => ValueConversion.exactLongToFloat(limit)).toThrowError(
        /Cannot safely convert \d+ into a float value/
      );
      expect(() => ValueConversion.exactLongToFloat(-limit)).toThrowError(
        /Cannot safely convert -\d+ into a float value/
      );
      expect(() => ValueConversion.exactLongToFloat(limit + 100)).toThrowError(
        /Cannot safely convert \d+ into a float value/
      );
    });
  });

  describe('notOverflowingDoubleToFloat', () => {
    const FLOAT_MAX_VALUE = 3.4028234663852886e+38;
    it('should convert doubles within float range', () => {
      expect(ValueConversion.notOverflowingDoubleToFloat(123.45)).toBe(123.45);
      expect(ValueConversion.notOverflowingDoubleToFloat(FLOAT_MAX_VALUE)).toBe(FLOAT_MAX_VALUE);
      expect(ValueConversion.notOverflowingDoubleToFloat(-FLOAT_MAX_VALUE)).toBe(-FLOAT_MAX_VALUE);
    });

    it('should throw for doubles outside float range (overflow)', () => {
      expect(() => ValueConversion.notOverflowingDoubleToFloat(FLOAT_MAX_VALUE * 2)).toThrowError(
        /Cannot safely convert \d+\.?\d*e\+\d+ into a float value/
      );
      expect(() => ValueConversion.notOverflowingDoubleToFloat(-FLOAT_MAX_VALUE * 2)).toThrowError(
        /Cannot safely convert -\d+\.?\d*e\+\d+ into a float value/
      );
    });

    it('should handle NaN, Infinity, -Infinity correctly', () => {
        expect(ValueConversion.notOverflowingDoubleToFloat(Number.NaN)).toBeNaN();
        // Java's Float.MAX_VALUE is finite, so Infinity should throw
        expect(() => ValueConversion.notOverflowingDoubleToFloat(Infinity)).toThrowError(
            /Cannot safely convert Infinity into a float value/
        );
        expect(() => ValueConversion.notOverflowingDoubleToFloat(-Infinity)).toThrowError(
            /Cannot safely convert -Infinity into a float value/
        );
    });
  });

  describe('exactBigIntToNumber', () => {
    it('should convert BigInt within safe integer range to number', () => {
      expect(ValueConversion.exactBigIntToNumber(BigInt(123))).toBe(123);
      expect(ValueConversion.exactBigIntToNumber(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
      expect(ValueConversion.exactBigIntToNumber(BigInt(Number.MIN_SAFE_INTEGER))).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should throw for BigInt outside safe integer range', () => {
      const justOverMax = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
      const justUnderMin = BigInt(Number.MIN_SAFE_INTEGER) - 1n;
      expect(() => ValueConversion.exactBigIntToNumber(justOverMax)).toThrowError(
        /Value is outside the safe integer range/
      );
      expect(() => ValueConversion.exactBigIntToNumber(justUnderMin)).toThrowError(
        /Value is outside the safe integer range/
      );
    });
  });

  describe('exactNumberToBigInt', () => {
    it('should convert integer numbers to BigInt', () => {
      expect(ValueConversion.exactNumberToBigInt(123)).toBe(BigInt(123));
      expect(ValueConversion.exactNumberToBigInt(Number.MAX_SAFE_INTEGER)).toBe(BigInt(Number.MAX_SAFE_INTEGER));
    });

    it('should throw for non-integer numbers', () => {
      expect(() => ValueConversion.exactNumberToBigInt(123.45)).toThrowError(
        /Cannot convert non-integer number 123.45 to BigInt/
      );
    });
  });

  describe('exactBigIntToFloat32', () => {
    const limit = 1n << 24n;
    it('should convert BigInt within +/- (2^24 -1) to number (for float32)', () => {
      expect(ValueConversion.exactBigIntToFloat32(123n)).toBe(123);
      expect(ValueConversion.exactBigIntToFloat32(limit - 1n)).toBe(Number(limit - 1n));
      expect(ValueConversion.exactBigIntToFloat32(-(limit - 1n))).toBe(Number(-(limit - 1n)));
    });

    it('should throw for BigInt equal to or outside +/- 2^24', () => {
      expect(() => ValueConversion.exactBigIntToFloat32(limit)).toThrowError(
        /loss of precision for integers > \+\/- \d+/
      );
      expect(() => ValueConversion.exactBigIntToFloat32(-limit)).toThrowError(
        /loss of precision for integers > \+\/- \d+/
      );
    });
  });
});
