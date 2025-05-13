import { DefaultValue } from "./DefaultValue";

/**
 * Represents the data types that can be used for properties in the graph.
 */
export enum ValueType {
  LONG,
  FLOAT,
  DOUBLE,
  BOOLEAN,
  STRING,
  BIGINT,
  LONG_ARRAY,
  FLOAT_ARRAY,
  DOUBLE_ARRAY,
  BOOLEAN_ARRAY,
  STRING_ARRAY,
  BIGINT_ARRAY,
  UNTYPED_ARRAY,
  UNKNOWN,
}

/**
 * Extension methods and utilities for the ValueType enum.
 */
export namespace ValueType {
  /**
   * Returns the name of the value type.
   *
   * @param valueType The value type
   * @returns The name of the value type
   */
  export function name(valueType: ValueType): string {
    return ValueType[valueType];
  }

  /**
   * Returns the fallback default value for this type.
   *
   * @param valueType The value type
   * @returns The fallback default value
   */
  export function fallbackValue(valueType: ValueType): DefaultValue {
    // Delegate to the more complete implementation in ValueTypeUtils
    return ValueTypeUtils.fallbackValue(valueType);
  }
}

/**
 * Visitor interface for ValueType.
 */
export interface ValueTypeVisitor<RESULT> {
  visitLong(): RESULT;
  visitFloat(): RESULT;
  visitDouble(): RESULT;
  visitBoolean(): RESULT;
  visitString(): RESULT;
  visitBigInt(): RESULT;
  visitLongArray(): RESULT;
  visitFloatArray(): RESULT;
  visitDoubleArray(): RESULT;
  visitBooleanArray(): RESULT;
  visitStringArray(): RESULT;
  visitBigIntArray(): RESULT;
  visitUntypedArray?(): RESULT;
  visitUnknown?(): RESULT | null;
}

/**
 * Methods and properties for ValueType.
 * Since TypeScript enums can't have methods, we implement them as functions.
 */
export namespace ValueTypeUtils {
  /**
   * Returns the Cypher name for a value type.
   */
  export function cypherName(type: ValueType): string {
    switch (type) {
      case ValueType.LONG:
        return "Integer";
      case ValueType.BIGINT:
        return "BigInt"; // Or "Integer" if you prefer them to map to the same Cypher type
      case ValueType.DOUBLE:
      case ValueType.FLOAT: // FLOAT often maps to DOUBLE's Cypher type
        return "Float";
      case ValueType.BOOLEAN:
        return "Boolean";
      case ValueType.STRING:
        return "String";
      case ValueType.LONG_ARRAY:
        return "List of Integer";
      case ValueType.BIGINT_ARRAY:
        return "List of BigInt"; // Or "List of Integer"
      case ValueType.DOUBLE_ARRAY:
      case ValueType.FLOAT_ARRAY: // FLOAT_ARRAY often maps to DOUBLE_ARRAY's Cypher type
        return "List of Float";
      case ValueType.BOOLEAN_ARRAY:
        return "List of Boolean";
      case ValueType.STRING_ARRAY:
        return "List of String";
      case ValueType.UNTYPED_ARRAY:
        return "List of Any";
      case ValueType.UNKNOWN:
        return "Unknown";
      default:
      const _exhaustiveCheck: never = type;
        return `Unknown Type (${type}) is a ${_exhaustiveCheck} ValueType`;
    }
  }

  /**
   * Returns the CSV name for a value type.
   */
  export function csvName(type: ValueType): string {
    switch (type) {
      case ValueType.LONG:
        return "long"; // Represents JS number from GDS long
      case ValueType.BIGINT:
        return "bigint"; // Represents JS BigInt
      case ValueType.DOUBLE:
        return "double";
      case ValueType.FLOAT:
        return "float";
      case ValueType.BOOLEAN:
        return "boolean";
      case ValueType.STRING:
        return "string";
      case ValueType.LONG_ARRAY:
        return "long[]"; // Represents JS number[] from GDS long[]
      case ValueType.BIGINT_ARRAY:
        return "bigint[]";
      case ValueType.DOUBLE_ARRAY:
        return "double[]";
      case ValueType.FLOAT_ARRAY:
        return "float[]";
      case ValueType.BOOLEAN_ARRAY:
        return "boolean[]";
      case ValueType.STRING_ARRAY:
        return "string[]";
      case ValueType.UNTYPED_ARRAY:
        return "Any[]"; // Or a more specific CSV representation if needed
      case ValueType.UNKNOWN:
        throw new Error("Value Type UNKNOWN is not supported in CSV");
      default:
        const _exhaustiveCheck: never = type; // For compile-time exhaustiveness checking
        throw new Error(
          `Unknown Type (${type}) is a ${_exhaustiveCheck} ValueType`
        ); // Runtime fallback
    }
  }

  /**
   * Returns the fallback value for a value type.
   */
  export function fallbackValue(type: ValueType): DefaultValue {
    switch (type) {
      case ValueType.LONG:
        return DefaultValue.forLong(); // Assumes DefaultValue.of(0)
      case ValueType.BIGINT:
        return DefaultValue.of(0n); // Fallback for NeoVM BigInt
      case ValueType.DOUBLE:
        return DefaultValue.forDouble();
      case ValueType.FLOAT:
        return DefaultValue.forDouble(); // GDS FLOAT often maps to double
      case ValueType.BOOLEAN:
        return DefaultValue.of(false);
      case ValueType.STRING:
        return DefaultValue.of(""); // Common fallback for String
      case ValueType.LONG_ARRAY:
        return DefaultValue.forLongArray(); // Assumes DefaultValue.of([]) for number[]
      case ValueType.BIGINT_ARRAY:
        return DefaultValue.of([]); // Fallback for NeoVM BigInt[]
      case ValueType.DOUBLE_ARRAY:
        return DefaultValue.forDoubleArray();
      case ValueType.FLOAT_ARRAY:
        return DefaultValue.forFloatArray();
      case ValueType.BOOLEAN_ARRAY:
        return DefaultValue.of([]); // Fallback for Boolean[]
      case ValueType.STRING_ARRAY:
        return DefaultValue.of([]); // Fallback for String[]
      case ValueType.UNTYPED_ARRAY:
        return DefaultValue.of([]); // Fallback for UntypedArray
      case ValueType.UNKNOWN:
        return DefaultValue.DEFAULT; // Or a more specific DefaultValue.of(null)
      default:
        // This ensures that if a new ValueType is added to the enum
        // and not handled here, a compile-time error will occur if _exhaustiveCheck is used.
        // For safety, throwing an error is better than returning a generic default.
        const _exhaustiveCheck: never = type; // Uncomment for compile-time check
        throw new Error(
          `Unknown Type (${type}) is a ${_exhaustiveCheck} ValueType`
        );
    }
  }

  /**
   * Accepts a visitor for the value type.
   */
  export function accept<RESULT>(
    type: ValueType,
    visitor: ValueTypeVisitor<RESULT>
  ): RESULT | null {
    switch (type) {
      case ValueType.LONG:
        return visitor.visitLong();
      case ValueType.FLOAT:
        return visitor.visitFloat(); // Direct call
      case ValueType.DOUBLE:
        return visitor.visitDouble();
      case ValueType.BOOLEAN:
        return visitor.visitBoolean(); // Direct call
      case ValueType.STRING:
        return visitor.visitString();
      case ValueType.BIGINT:
        return visitor.visitBigInt(); // Direct call
      case ValueType.LONG_ARRAY:
        return visitor.visitLongArray();
      case ValueType.FLOAT_ARRAY:
        return visitor.visitFloatArray();
      case ValueType.DOUBLE_ARRAY:
        return visitor.visitDoubleArray();
      case ValueType.BOOLEAN_ARRAY:
        return visitor.visitBooleanArray(); // Direct call
      case ValueType.STRING_ARRAY:
        return visitor.visitStringArray(); // Direct call
      case ValueType.BIGINT_ARRAY:
        return visitor.visitBigIntArray(); // Direct call
      case ValueType.UNTYPED_ARRAY:
        if (visitor.visitUntypedArray) {
          return visitor.visitUntypedArray();
        }
        // Fallback or throw if visitUntypedArray is not implemented
        throw new Error("UntypedArray not supported by this visitor");
      case ValueType.UNKNOWN:
        if (visitor.visitUnknown) {
          return visitor.visitUnknown();
        }
        // Fallback or throw if visitUnknown is not implemented
        // Returning null might be acceptable if visitUnknown is truly optional for some visitors
        return null;
      default:
        //const _exhaustiveCheck: never = type;
        throw new Error(
          `Value Type ${ValueType[type as ValueType]} not supported by visitor`
        );
    }
  }
  /**
   * Checks if one value type is compatible with another for NeoVM.
   * 'type' is compatible with 'other' if a value of 'type' can be used where 'other' is expected.
   */
  export function isCompatibleWith(type: ValueType, other: ValueType): boolean {
    if (type === other) {
      return true;
    }

    // UNTYPED_ARRAY is a special case: it can hold any other array type.
    // So, if 'other' is UNTYPED_ARRAY, any array 'type' is compatible.
    if (other === ValueType.UNTYPED_ARRAY) {
      switch (type) {
        case ValueType.LONG_ARRAY:
        case ValueType.FLOAT_ARRAY:
        case ValueType.DOUBLE_ARRAY:
        case ValueType.BOOLEAN_ARRAY:
        case ValueType.STRING_ARRAY:
        case ValueType.BIGINT_ARRAY:
        case ValueType.UNTYPED_ARRAY: // self-compatibility already handled
          return true;
        default:
          // Non-array types are not compatible with UNTYPED_ARRAY
          return false;
      }
    }

    // If 'type' is UNTYPED_ARRAY, it's only compatible if 'other' is also UNTYPED_ARRAY (handled by type === other)
    // or if we define that an UNTYPED_ARRAY can be narrowed to a specific array type (less common for 'isCompatibleWith')

    // Numeric type compatibilities (consider if NeoVM allows implicit widening)
    // Example: A FLOAT might be considered compatible where a DOUBLE is expected.
    if (type === ValueType.FLOAT && other === ValueType.DOUBLE) {
      return true; // A float can be widened to a double
    }
    // Example: A LONG (JS number) might be considered compatible where a BIGINT is expected.
    if (type === ValueType.LONG && other === ValueType.BIGINT) {
      return true; // A JS number (representing LONG) can be converted to BigInt
    }
    // Consider the reverse: is BIGINT compatible with LONG? Only if it fits and precision is not lost.
    // For 'isCompatibleWith', this is often false unless the system guarantees safe conversion.
    // if (type === ValueType.BIGINT && other === ValueType.LONG) {
    //   return false; // Or true if NeoVM has specific rules for this
    // }

    // Array types: Generally, array types are only compatible with themselves or UNTYPED_ARRAY.
    // e.g., LONG_ARRAY is not compatible with DOUBLE_ARRAY unless explicitly defined.

    // All other cases are not compatible by default
    return false;
  }

  /**
   * Creates a ValueType from a CSV name.
   */
  export function fromCsvName(csvName: string): ValueType {
    // Iterate over all numeric enum values to find a match
    for (const key in ValueType) {
      if (isNaN(Number(key))) {
        // Process only string keys of the enum
        const enumValue = ValueType[key as keyof typeof ValueType];
        if (typeof enumValue === "number") {
          // Ensure it's a numeric enum member
          try {
            if (ValueTypeUtils.csvName(enumValue as ValueType) === csvName) {
              return enumValue as ValueType;
            }
          } catch {
            // Skip types that don't support CSV (like UNKNOWN)
          }
        }
      }
    }

    const supportedCsvNames = Object.values(ValueType)
      .filter((v) => typeof v === "number")
      .map((v) => {
        try {
          return ValueTypeUtils.csvName(v as ValueType);
        } catch {
          return null;
        }
      })
      .filter((name) => name !== null)
      .join(", ");

    throw new Error(
      `Unknown value type from CSV name: '${csvName}'. Supported CSV names are: ${supportedCsvNames}`
    );
  }
}
