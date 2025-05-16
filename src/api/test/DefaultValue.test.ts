import { describe, it, expect } from "vitest";
import { DefaultValue } from "../DefaultValue";
import { ValueType } from "../ValueType";

describe("DefaultValue basic usage", () => {
  it("creates user-defined and system default values", () => {
    const userVal = DefaultValue.userDefined(42);
    expect(userVal.isUserDefined()).toBe(true);
    expect(userVal.longValue()).toBe(42);

    const sysVal = DefaultValue.systemDefault(99);
    expect(sysVal.isUserDefined()).toBe(false);
    expect(sysVal.longValue()).toBe(99);
  });

  it("uses the create factory for explicit user-defined flag", () => {
    const val = DefaultValue.create("hello", true);
    expect(val.isUserDefined()).toBe(true);
    expect(val.stringValue()).toBe("hello");

    const val2 = DefaultValue.create("world", false);
    expect(val2.isUserDefined()).toBe(false);
    expect(val2.stringValue()).toBe("world");
  });

  it("uses namespace .of() for various signatures", () => {
    // of(value)
    const v1 = DefaultValue.of(123);
    expect(v1.isUserDefined()).toBe(true);
    expect(v1.longValue()).toBe(123);

    // of(value, isUserDefined)
    const v2 = DefaultValue.of(456, false);
    expect(v2.isUserDefined()).toBe(false);
    expect(v2.longValue()).toBe(456);

    // of(value, type, isUserDefined)
    const v3 = DefaultValue.of("789", ValueType.LONG, true);
    expect(v3.isUserDefined()).toBe(true);
    expect(v3.longValue()).toBe(789);

    // of(DefaultValue instance) returns same instance
    expect(DefaultValue.of(v3)).toBe(v3);
  });

  it("returns correct fallbacks for system defaults", () => {
    expect(DefaultValue.forLong().longValue()).toBe(DefaultValue.LONG_DEFAULT_FALLBACK);
    expect(DefaultValue.forDouble().doubleValue()).toBeNaN();
    expect(DefaultValue.forFloat().floatValue()).toBeNaN();
    expect(DefaultValue.forDoubleArray().doubleArrayValue()).toBeNull();
    expect(DefaultValue.forFloatArray().floatArrayValue()).toBeNull();
    expect(DefaultValue.forLongArray().longArrayValue()).toBeNull();
  });

  it("handles null and undefined correctly", () => {
    expect(DefaultValue.userDefined(null).isNullValue()).toBe(true);
    expect(DefaultValue.of(null).isNullValue()).toBe(true);
    expect(DefaultValue.of(undefined).isNullValue()).toBe(true);
  });

  it("compares values with equals()", () => {
    const a = DefaultValue.of(5);
    const b = DefaultValue.of(5);
    const c = DefaultValue.of(6);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);

    const arr1 = DefaultValue.of([1, 2, 3]);
    const arr2 = DefaultValue.of([1, 2, 3]);
    const arr3 = DefaultValue.of([1, 2, 4]);
    expect(arr1.equals(arr2)).toBe(true);
    expect(arr1.equals(arr3)).toBe(false);
  });
});
