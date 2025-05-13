import { ValueType } from "./ValueType";

/**
 * Represents default values for graph properties.
 * Provides type-safe access to default values for different value types.
 */
export class DefaultValue {
  // Static default values for each type
  private static readonly DEFAULT_LONG = 0n;
  private static readonly DEFAULT_DOUBLE = 0.0;
  private static readonly DEFAULT_FLOAT = 0.0;
  private static readonly DEFAULT_STRING = "";
  private static readonly DEFAULT_BOOLEAN = false;
  // Assuming array defaults are empty arrays of the correct type
  private static readonly DEFAULT_LONG_ARRAY: readonly number[] = Object.freeze([]);
  private static readonly DEFAULT_DOUBLE_ARRAY: readonly number[] = Object.freeze([]);
  private static readonly DEFAULT_FLOAT_ARRAY: readonly number[] = Object.freeze([]);
  private static readonly DEFAULT_STRING_ARRAY: readonly string[] = Object.freeze([]);


  public readonly isUserDefined: boolean;

  /**
   * Creates a default value for the specified value type.
   *
   * @param valueType The value type
   * @param value Optional explicit default value
   * @param isUserDefined True if this default value was explicitly set by a user.
   */
  constructor(
    private readonly valueType: ValueType,
    private readonly value?: any,
    isUserDefined: boolean = false // Default to false if not specified
  ) {
    this.isUserDefined = isUserDefined;
  }

  /**
   * Gets the default value as the appropriate type.
   */
  public get<T>(): T {
    if (this.isUserDefined && this.value !== undefined) {
      // If user-defined, return the stored value, even if it's null
      // (unless it was constructed with undefined, which means use type default)
      return this.value as T;
    }
    if (!this.isUserDefined && this.value !== undefined) {
        // This case could happen if DefaultValue.DEFAULT is constructed with a specific value
        // but isUserDefined is false.
        return this.value as T;
    }


    // Return type-appropriate system default
    switch (this.valueType) {
      case ValueType.LONG:
        return DefaultValue.DEFAULT_LONG as unknown as T;
      case ValueType.DOUBLE:
        return DefaultValue.DEFAULT_DOUBLE as unknown as T;
      case ValueType.FLOAT:
        return DefaultValue.DEFAULT_FLOAT as unknown as T;
      case ValueType.STRING:
        return DefaultValue.DEFAULT_STRING as unknown as T;
      case ValueType.BOOLEAN:
        return DefaultValue.DEFAULT_BOOLEAN as unknown as T;
      case ValueType.LONG_ARRAY:
        return DefaultValue.DEFAULT_LONG_ARRAY as unknown as T;
      case ValueType.DOUBLE_ARRAY:
        return DefaultValue.DEFAULT_DOUBLE_ARRAY as unknown as T;
      case ValueType.FLOAT_ARRAY:
        return DefaultValue.DEFAULT_FLOAT_ARRAY as unknown as T;
      case ValueType.STRING_ARRAY:
        return DefaultValue.DEFAULT_STRING_ARRAY as unknown as T;
      default:
        // For unknown or complex types without a specific system default,
        // returning null or undefined might be appropriate if value is also undefined.
        // Or throw, as it currently does.
        if (this.value !== undefined) return this.value as T; // Fallback for types not listed if value exists
        throw new Error(
          `No system default value for type: ${ValueType[this.valueType]}`
        );
    }
  }

  /**
   * Returns whether this default value is considered "null-like".
   * This checks the actual resolved value.
   */
  public isNullValue(): boolean {
    const val = this.get<any>();
    return val === null || val === undefined;
  }

  /**
   * Returns the value type of this default value.
   */
  public getValueType(): ValueType {
    return this.valueType;
  }

  /**
   * Compares this DefaultValue to another for equality.
   * Two DefaultValues are equal if they have the same isUserDefined status
   * and their underlying values are deeply equal.
   * @param other The other DefaultValue to compare.
   * @returns True if equal, false otherwise.
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof DefaultValue)) return false;

    if (this.isUserDefined !== other.isUserDefined) return false;
    if (this.valueType !== other.valueType) return false; // Also check type for stricter equality

    // Compare the actual values they represent
    // We need a robust way to compare these values, potentially reusing
    // the logic from NodeProjections.defaultValuesEqual or a shared utility.
    // For now, let's assume a simple comparison for the `get()` value.
    // A proper deep comparison would be needed here.
    // This is a placeholder for a deep equality check.
    const thisVal = this.get<any>();
    const otherVal = other.get<any>();

    // Basic deep equality check (can be extracted to a helper)
    function deepCompare(a: any, b: any): boolean {
        if (a === b) return true;
        if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
            // For BigInt, direct comparison works
            if (typeof a === 'number' && typeof b === 'number') return a === b;
            return a === b; // Handles primitives and different types
        }

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!deepCompare(a[i], b[i])) return false;
            }
            return true;
        }

        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (!bKeys.includes(key) || !deepCompare(a[key], b[key])) return false;
        }
        return true;
    }
    return deepCompare(thisVal, otherVal);
  }
}

export namespace DefaultValue {
  // System Default: isUserDefined is false.
  // The value here is undefined, so get() will return the type-specific static default.
  export const DEFAULT = new DefaultValue(ValueType.LONG, undefined, false); // Default type is LONG, not user-defined

  export const LONG_DEFAULT_FALLBACK = -1;
  export const DOUBLE_DEFAULT_FALLBACK = Number.NaN;

  /**
   * Factory methods for DefaultValue.
   */

  /**
   * Creates a system default value for the specified type.
   * isUserDefined will be false.
   */
  export function forType(valueType: ValueType): DefaultValue {
    // The 'value' is undefined, so get() will use the static defaults. isUserDefined is false.
    return new DefaultValue(valueType, undefined, false);
  }

  /**
   * Creates a user-defined long (number) value.
   */
  export function forLong(value: number = 0): DefaultValue {
    return new DefaultValue(ValueType.LONG, value, true);
  }

  /**
   * Creates a user-defined double value.
   */
  export function forDouble(value: number = 0.0): DefaultValue {
    return new DefaultValue(ValueType.DOUBLE, value, true);
  }

  /**
   * Creates a user-defined string value.
   */
  export function forString(value: string = ""): DefaultValue {
    return new DefaultValue(ValueType.STRING, value, true);
  }

  /**
   * Creates a user-defined DefaultValue from any supplied value.
   * Determines the type automatically. isUserDefined will be true.
   */
  export function of(value: any): DefaultValue {
    // All values created by 'of' are considered user-defined.
    if (value === undefined || value === null) {
      // User explicitly provided null/undefined. Store it as such.
      // We need a ValueType for null/undefined if we want to store them directly.
      // Or, as currently, default to a type like LONG and store the null/undefined value.
      return new DefaultValue(ValueType.LONG, value, true); // User provided null/undefined
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        // User provided an empty array. Determine a default array type or store as specific type.
        return new DefaultValue(ValueType.LONG_ARRAY, value, true); // Default to LONG_ARRAY for empty arrays
      }
      const firstElement = value[0];
      if (typeof firstElement === "number") {
        return new DefaultValue(ValueType.LONG_ARRAY, value, true);
      } else if (typeof firstElement === "number") {
        // Could be FLOAT_ARRAY or DOUBLE_ARRAY, defaulting to DOUBLE_ARRAY
        return new DefaultValue(ValueType.DOUBLE_ARRAY, value, true);
      } else if (typeof firstElement === "string") {
        return new DefaultValue(ValueType.STRING_ARRAY, value, true);
      }
       // Add other array types if necessary
    }

    if (typeof value === "number") {
      return new DefaultValue(ValueType.LONG, value, true);
    } else if (typeof value === "number") {
      return new DefaultValue(ValueType.DOUBLE, value, true);
    } else if (typeof value === "string") {
      return new DefaultValue(ValueType.STRING, value, true);
    } else if (typeof value === "boolean") {
      return new DefaultValue(ValueType.BOOLEAN, value, true);
    }

    throw new Error(`Unsupported value type for DefaultValue.of: ${typeof value}`);
  }

  // User-defined array values
  export function forLongArray(value: number[] = []): DefaultValue {
    return new DefaultValue(ValueType.LONG_ARRAY, value, true);
  }

  export function forDoubleArray(value: number[] = []): DefaultValue {
    return new DefaultValue(ValueType.DOUBLE_ARRAY, value, true);
  }

  export function forFloatArray(value: number[] = []): DefaultValue {
    return new DefaultValue(ValueType.FLOAT_ARRAY, value, true);
  }

  export function forStringArray(value: string[] = []): DefaultValue {
    return new DefaultValue(ValueType.STRING_ARRAY, value, true);
  }
}
