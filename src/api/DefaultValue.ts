import { ValueType } from "./ValueType";
import { ValueConversion } from "./ValueConversion";
import { DefaultValueUtil } from "./DefaultValueUtil";

export class DefaultValue {
  public static readonly INTEGER_DEFAULT_FALLBACK: number = -2147483648;
  public static readonly LONG_DEFAULT_FALLBACK: number = 0;
  public static readonly FLOAT_DEFAULT_FALLBACK: number = Number.NaN;
  public static readonly DOUBLE_DEFAULT_FALLBACK: number = Number.NaN;

  private readonly _value: any | null;
  private readonly _isUserDefined: boolean;

  // Initialize DEFAULT first
  public static readonly DEFAULT: DefaultValue = new DefaultValue(null, false);

  // Then initialize other static fallbacks that depend on DEFAULT's methods
  // These are private to the class as per Java's GDS structure (often not directly exposed)
  private static readonly DOUBLE_ARRAY_DEFAULT_FALLBACK: Float64Array | null =
    DefaultValue.DEFAULT.doubleArrayValue();
  private static readonly LONG_ARRAY_DEFAULT_FALLBACK: number[] | null =
    DefaultValue.DEFAULT.longArrayValue();
  private static readonly FLOAT_ARRAY_DEFAULT_FALLBACK: Float32Array | null =
    DefaultValue.DEFAULT.floatArrayValue();

  private constructor(value: any | null, isUserDefined: boolean) {
    if (value === undefined) value = null;
    this._value = value;
    this._isUserDefined = isUserDefined;
  }

  public isUserDefined(): boolean {
    return this._isUserDefined;
  }

  public longValue(): number {
    if (this._value === null || this._value === undefined) {
      return DefaultValue.LONG_DEFAULT_FALLBACK;
    }
    if (typeof this._value === "number") {
      if (Number.isNaN(this._value)) return DefaultValue.LONG_DEFAULT_FALLBACK;
      return ValueConversion.exactDoubleToLong(this._value);
    }
    throw this.getInvalidTypeException("Long");
  }

  public doubleValue(): number {
    if (
      this._value === DefaultValue.LONG_DEFAULT_FALLBACK &&
      typeof this._value === "number"
    ) {
      return DefaultValue.DOUBLE_DEFAULT_FALLBACK;
    }
    if (this._value === null || this._value === undefined) {
      return DefaultValue.DOUBLE_DEFAULT_FALLBACK;
    }
    if (typeof this._value === "number") {
      if (Number.isInteger(this._value)) {
        return ValueConversion.exactLongToDouble(this._value);
      }
      return this._value;
    }
    throw this.getInvalidTypeException("Double");
  }

  public floatValue(): number {
    if (
      this._value === DefaultValue.LONG_DEFAULT_FALLBACK &&
      typeof this._value === "number"
    ) {
      return DefaultValue.FLOAT_DEFAULT_FALLBACK;
    }
    if (this._value === null || this._value === undefined) {
      return DefaultValue.FLOAT_DEFAULT_FALLBACK;
    }
    if (typeof this._value === "number") {
      if (Number.isInteger(this._value)) {
        return ValueConversion.exactLongToFloat(this._value);
      }
      return ValueConversion.notOverflowingDoubleToFloat(this._value);
    }
    throw this.getInvalidTypeException("Float");
  }

  public booleanValue(): boolean {
    if (this._value === null || this._value === undefined) return false;
    if (typeof this._value === "boolean") return this._value;
    throw this.getInvalidTypeException("Boolean");
  }

  public stringValue(): string | null {
    if (this._value === null || this._value === undefined) return null;
    return String(this._value);
  }

  public doubleArrayValue(): Float64Array | null {
    if (this._value === null || this._value === undefined) return null;
    if (this._value instanceof Float64Array) return this._value;
    if (this._value instanceof Float32Array) {
      return new Float64Array(this._value);
    }
    if (
      Array.isArray(this._value) &&
      this._value.every((item) => typeof item === "number")
    ) {
      const arr = this._value as number[];
      const result = new Float64Array(arr.length);
      for (let i = 0; i < arr.length; i++) {
        result[i] = ValueConversion.exactLongToDouble(arr[i]);
      }
      return result;
    }
    throw this.getInvalidTypeException("double[]");
  }

  public floatArrayValue(): Float32Array | null {
    if (this._value === null || this._value === undefined) return null;
    if (this._value instanceof Float32Array) return this._value;
    if (this._value instanceof Float64Array) {
      const result = new Float32Array(this._value.length);
      for (let i = 0; i < this._value.length; i++) {
        result[i] = ValueConversion.notOverflowingDoubleToFloat(this._value[i]);
      }
      return result;
    }
    if (
      Array.isArray(this._value) &&
      this._value.every((item) => typeof item === "number")
    ) {
      const arr = this._value as number[];
      const result = new Float32Array(arr.length);
      for (let i = 0; i < arr.length; i++) {
        result[i] = ValueConversion.exactLongToFloat(arr[i]);
      }
      return result;
    }
    throw this.getInvalidTypeException("float[]");
  }

  public longArrayValue(): number[] | null {
    if (this._value === null || this._value === undefined) return null;
    if (
      Array.isArray(this._value) &&
      this._value.every(
        (item) => Number.isInteger(item) && typeof item === "number"
      )
    ) {
      return this._value as number[];
    }
    if (
      this._value instanceof Float64Array ||
      this._value instanceof Float32Array
    ) {
      const arr = this._value as Float64Array | Float32Array;
      const result: number[] = [];
      for (let i = 0; i < arr.length; i++) {
        result[i] = ValueConversion.exactDoubleToLong(arr[i]);
      }
      return result;
    }
    throw this.getInvalidTypeException("long[]");
  }

  public getObject(): any | null {
    return this._value;
  }

  public isNullValue(): boolean {
    return this._value === null;
  }

  public toString(): string {
    return `DefaultValue(${this._value})`;
  }

  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof DefaultValue)) return false;

    function deepArrayEquals(a: any, b: any): boolean {
      if (
        !Array.isArray(a) &&
        !(a instanceof Float64Array) &&
        !(a instanceof Float32Array)
      )
        return false;
      if (
        !Array.isArray(b) &&
        !(b instanceof Float64Array) &&
        !(b instanceof Float32Array)
      )
        return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          if (typeof a[i] === "object" && typeof b[i] === "object") {
            if (!deepArrayEquals(a[i], b[i])) return false;
          } else {
            return false;
          }
        }
      }
      return true;
    }

    if (
      (Array.isArray(this._value) ||
        this._value instanceof Float64Array ||
        this._value instanceof Float32Array) &&
      (Array.isArray(other._value) ||
        other._value instanceof Float64Array ||
        other._value instanceof Float32Array)
    ) {
      return deepArrayEquals(this._value, other._value);
    }
    return this._value === other._value;
  }

  /**
   * Validates that this DefaultValue can be converted to the expected ValueType.
   * Throws descriptive error if not compatible.
   */
  public validateForType(expectedType: ValueType): void {
    try {
      switch (expectedType) {
        case ValueType.LONG:
          this.longValue();
          break;
        case ValueType.DOUBLE:
          this.doubleValue();
          break;
        case ValueType.DOUBLE_ARRAY:
          this.doubleArrayValue();
          break;
        case ValueType.FLOAT_ARRAY:
          this.floatArrayValue();
          break;
        case ValueType.LONG_ARRAY:
          this.longArrayValue();
          break;
        default:
          throw new Error(`Unsupported ValueType: ${expectedType}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Expected type")) {
        throw error; // Re-throw our formatted error
      }
      // Wrap unexpected errors
      throw new Error(
        `DefaultValue validation failed for type ${expectedType}: ${error}`
      );
    }
  }

  private getActualTypeName(): string {
    if (this._value === null) return "null";
    if (Array.isArray(this._value)) return "array";
    if (this._value instanceof Float64Array) return "Float64Array";
    if (this._value instanceof Float32Array) return "Float32Array";
    if (typeof this._value === "number") {
      if (Number.isInteger(this._value)) return "number (integer)";
      return "number (float)";
    }
    if (typeof this._value === "boolean") return "boolean";
    if (typeof this._value === "string") return "string";
    if (typeof this._value === "object") return "object";
    if (typeof this._value === "bigint") return "bigint";
    return typeof this._value; // Fallback for other types
  }

  // Simplified error method - just show what we tried to convert to
  private getInvalidTypeException(expectedType: string): Error {
    return new Error(
      `Cannot convert DefaultValue to ${expectedType}. ` +
        `Value: ${JSON.stringify(this._value)}, ` +
        `Type: ${this.getActualTypeName()}`
    );
  }

  /**
   * Creates a DefaultValue instance.
   * It's generally recommended to use the more specific factory methods
   * `DefaultValue.userDefined(value)` or `DefaultValue.systemDefault(value)`.
   *
   * @param value The underlying value for the default.
   * @param isUserDefined A boolean indicating if the default value was defined by the user.
   * @returns A new instance of DefaultValue.
   */
  public static create(
    value: any | null,
    isUserDefined: boolean
  ): DefaultValue {
    return new DefaultValue(value, isUserDefined);
  }

  /**
   * Creates a user-defined DefaultValue instance.
   * Use this when the default value comes from an explicit user configuration.
   *
   * @param value The underlying value for the default.
   * @returns A new instance of DefaultValue marked as user-defined.
   */
  public static userDefined(value: any | null): DefaultValue {
    return new DefaultValue(value, true);
  }

  /**
   * Creates a system-defined (non-user-defined) DefaultValue instance.
   * Use this for internal fallbacks or programmatically determined defaults.
   * For the common case of a null value that is not user-defined, `DefaultValue.DEFAULT` can be used.
   *
   * @param value The underlying value for the default.
   * @returns A new instance of DefaultValue marked as not user-defined.
   */
  public static systemDefault(value: any | null): DefaultValue {
    return new DefaultValue(value, false);
  }
}

// Namespace for factory functions
export namespace DefaultValue {
  // Helper to access the private constructor from within the merged namespace
  function ofFallBackValue(value: any | null): DefaultValue {
    return DefaultValue.create(value, false);
  }

  export function of(value: any): DefaultValue;
  export function of(value: any | null, isUserDefined: boolean): DefaultValue;
  export function of(
    value: any | null,
    type: ValueType,
    isUserDefined: boolean
  ): DefaultValue;
  export function of(
    arg1: any,
    arg2?: ValueType | boolean,
    arg3?: boolean
  ): DefaultValue {
    if (arg1 instanceof DefaultValue) {
      // Check if arg1 is already a DefaultValue instance
      return arg1;
    }
    // Signature: of(value, isUserDefined)
    if (typeof arg2 === "boolean" && arg3 === undefined) {
      const valToStore = Array.isArray(arg1)
        ? DefaultValueUtil.transformObjectToPrimitiveArray(arg1)
        : arg1;
      return DefaultValue.create(valToStore, arg2);
    }
    // Signature: of(value, type, isUserDefined)
    else if (
      arg2 !== undefined &&
      typeof arg2 !== "boolean" &&
      arg3 !== undefined
    ) {
      const value = arg1;
      const type = arg2 as ValueType;
      const isDef = arg3;
      if (
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        switch (type) {
          case ValueType.LONG:
            return DefaultValue.forLong();
          case ValueType.DOUBLE:
            return DefaultValue.forDouble();
          case ValueType.FLOAT:
            return DefaultValue.forFloat();
          case ValueType.DOUBLE_ARRAY:
            return DefaultValue.forDoubleArray();
          case ValueType.FLOAT_ARRAY:
            return DefaultValue.forFloatArray();
          case ValueType.LONG_ARRAY:
            return DefaultValue.forLongArray();
          default:
            return DefaultValue.create(null, isDef);
        }
      }
      let parsedValue = value;
      switch (type) {
        case ValueType.LONG:
          parsedValue =
            typeof value === "string"
              ? parseInt(value, 10)
              : ValueConversion.exactDoubleToLong(Number(value));
          break;
        case ValueType.DOUBLE:
          parsedValue =
            typeof value === "string" ? parseFloat(value) : Number(value);
          break;
        case ValueType.DOUBLE_ARRAY:
          parsedValue = DefaultValueUtil.parseDoubleArrayValue(value, type);
          break;
        case ValueType.FLOAT_ARRAY:
          parsedValue = DefaultValueUtil.parseFloatArrayValue(value, type);
          break;
        case ValueType.LONG_ARRAY:
          parsedValue = DefaultValueUtil.parseLongArrayValue(value, type);
          break;
      }
      return DefaultValue.create(parsedValue, isDef);
    }
    // Signature: of(value) -> isUserDefined = true
    else if (arg2 === undefined && arg3 === undefined) {
      const valToStore = Array.isArray(arg1)
        ? DefaultValueUtil.transformObjectToPrimitiveArray(arg1)
        : arg1;
      return DefaultValue.create(valToStore, true);
    }
    // Fallback or error for unexpected signature
    throw new Error("Invalid arguments for DefaultValue.of");
  }

  export function forInt(): DefaultValue {
    return ofFallBackValue(DefaultValue.INTEGER_DEFAULT_FALLBACK);
  }
  export function forLong(): DefaultValue {
    return ofFallBackValue(DefaultValue.LONG_DEFAULT_FALLBACK);
  }
  export function forDouble(): DefaultValue {
    return ofFallBackValue(DefaultValue.DOUBLE_DEFAULT_FALLBACK);
  }
  export function forFloat(): DefaultValue {
    return ofFallBackValue(DefaultValue.FLOAT_DEFAULT_FALLBACK);
  }

  export function forDoubleArray(): DefaultValue {
    // Access the private static member from the class directly
    return ofFallBackValue(DefaultValue["DOUBLE_ARRAY_DEFAULT_FALLBACK"]);
  }
  export function forFloatArray(): DefaultValue {
    return ofFallBackValue(DefaultValue["FLOAT_ARRAY_DEFAULT_FALLBACK"]);
  }
  export function forLongArray(): DefaultValue {
    return ofFallBackValue(DefaultValue["LONG_ARRAY_DEFAULT_FALLBACK"]);
  }
}
