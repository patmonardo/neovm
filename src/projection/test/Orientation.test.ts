import { describe, it, expect } from "vitest";
import { Orientation } from "./Orientation";

describe("Orientation Enum and Namespace", () => {
  describe("Enum Values", () => {
    it("should have the correct numeric values for enum members", () => {
      expect(Orientation.NATURAL).toBe(0);
      expect(Orientation.REVERSE).toBe(1);
      expect(Orientation.UNDIRECTED).toBe(2);
    });

    it("should have the correct string keys for enum members", () => {
      expect(Orientation[0]).toBe("NATURAL");
      expect(Orientation[1]).toBe("REVERSE");
      expect(Orientation[2]).toBe("UNDIRECTED");
    });
  });

  describe("Orientation.inverse()", () => {
    it("should return REVERSE for NATURAL", () => {
      expect(Orientation.inverse(Orientation.NATURAL)).toBe(
        Orientation.REVERSE
      );
    });

    it("should return NATURAL for REVERSE", () => {
      expect(Orientation.inverse(Orientation.REVERSE)).toBe(
        Orientation.NATURAL
      );
    });

    it("should return UNDIRECTED for UNDIRECTED", () => {
      expect(Orientation.inverse(Orientation.UNDIRECTED)).toBe(
        Orientation.UNDIRECTED
      );
    });

    it("should throw an error for an invalid orientation value (though hard to pass to switch)", () => {
      // This case is tricky to test directly with TypeScript's enum type safety.
      // The default case in the switch is more of a safeguard for JavaScript interop
      // or if the enum was somehow bypassed.
      // We can test it by casting an invalid number.
      const invalidOrientation = 99 as Orientation;
      expect(() => Orientation.inverse(invalidOrientation)).toThrowError(
        `Unknown orientation: ${invalidOrientation}`
      );
    });
  });

  describe("Orientation.parse()", () => {
    it('should parse valid string "NATURAL" (case-insensitive)', () => {
      expect(Orientation.parse("NATURAL")).toBe(Orientation.NATURAL);
      expect(Orientation.parse("natural")).toBe(Orientation.NATURAL);
      expect(Orientation.parse("NaTuRaL")).toBe(Orientation.NATURAL);
    });

    it('should parse valid string "REVERSE" (case-insensitive)', () => {
      expect(Orientation.parse("REVERSE")).toBe(Orientation.REVERSE);
      expect(Orientation.parse("reverse")).toBe(Orientation.REVERSE);
    });

    it('should parse valid string "UNDIRECTED" (case-insensitive)', () => {
      expect(Orientation.parse("UNDIRECTED")).toBe(Orientation.UNDIRECTED);
      expect(Orientation.parse("undirected")).toBe(Orientation.UNDIRECTED);
    });

    it("should return the input if it is already a valid Orientation enum member", () => {
      expect(Orientation.parse(Orientation.NATURAL)).toBe(Orientation.NATURAL);
      expect(Orientation.parse(Orientation.REVERSE)).toBe(Orientation.REVERSE);
      expect(Orientation.parse(Orientation.UNDIRECTED)).toBe(
        Orientation.UNDIRECTED
      );
    });

    it("should throw an error for an invalid string", () => {
      const invalidString = "INVALID_ORIENTATION";
      expect(() => Orientation.parse(invalidString)).toThrowError(
        `Orientation \`${invalidString.toUpperCase()}\` is not supported. Must be one of: NATURAL, REVERSE, UNDIRECTED.`
      );
    });

    it("should throw a TypeError for an invalid number not corresponding to an enum value", () => {
      const invalidNumber = 99;
      expect(() => Orientation.parse(invalidNumber)).toThrowError(
        "Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got number."
      );
    });

    it("should throw a TypeError for null input", () => {
      expect(() => Orientation.parse(null)).toThrowError(
        "Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got null."
      );
    });

    it("should throw a TypeError for undefined input", () => {
      expect(() => Orientation.parse(undefined)).toThrowError(
        "Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got undefined."
      );
    });

    it("should throw a TypeError for a boolean input", () => {
      expect(() => Orientation.parse(true)).toThrowError(
        "Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got boolean."
      );
    });

    it("should handle object with valueOf returning a valid orientation number (which is then treated as a number)", () => {
      // The refactored parse first checks `typeof value === 'number'`
      // If valueOf() returns a number, it will be handled by that path.
      const objNatural = { valueOf: () => Orientation.NATURAL };
      expect(Orientation.parse(objNatural)).toBe(Orientation.NATURAL);

      const objReverse = { valueOf: () => 1 /* Orientation.REVERSE */ };
      expect(Orientation.parse(objReverse)).toBe(Orientation.REVERSE);
    });

    it("should throw a TypeError for an object with valueOf returning an invalid number", () => {
      const objInvalid = { valueOf: () => 99 };
      expect(() => Orientation.parse(objInvalid)).toThrowError(
        "Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got number."
      );
    });

    it("should throw a TypeError for a generic object input that is not a string or number", () => {
      const genericObject = { someProperty: "someValue" };
      expect(() => Orientation.parse(genericObject)).toThrowError(
        "Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got object."
      );
    });
  });

  describe("Orientation.toString()", () => {
    it('should return "NATURAL" for Orientation.NATURAL', () => {
      expect(Orientation.toString(Orientation.NATURAL)).toBe("NATURAL");
    });

    it('should return "REVERSE" for Orientation.REVERSE', () => {
      expect(Orientation.toString(Orientation.REVERSE)).toBe("REVERSE");
    });

    it('should return "UNDIRECTED" for Orientation.UNDIRECTED', () => {
      expect(Orientation.toString(Orientation.UNDIRECTED)).toBe("UNDIRECTED");
    });

    it("should return undefined string for an invalid orientation number (as per default enum behavior)", () => {
      // This reflects how TypeScript's default enum string conversion works for out-of-bound numbers.
      // Orientation[99] would be undefined.
      const invalidOrientation = 99 as Orientation;
      expect(Orientation.toString(invalidOrientation)).toBeUndefined();
      // If strict validation is desired in toString, the function would need to be modified.
      // For now, testing default behavior.
    });
  });
});
