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
   * Visitor interface for ValueType.
   */
  export interface Visitor<RESULT> {
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
   * Returns the name of the value type.
   */
  export function name(valueType: ValueType): string {
    return ValueType[valueType];
  }

  /**
   * Returns the CSV name for a value type.
   */
  export function csvName(type: ValueType): string {
    switch (type) {
      case ValueType.LONG:
        return "long";
      case ValueType.BIGINT:
        return "bigint";
      case ValueType.DOUBLE:
        return "double";
      case ValueType.FLOAT:
        return "float";
      case ValueType.BOOLEAN:
        return "boolean";
      case ValueType.STRING:
        return "string";
      case ValueType.LONG_ARRAY:
        return "long[]";
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
        return "Any[]";
      case ValueType.UNKNOWN:
        throw new Error("Value Type UNKNOWN is not supported in CSV");
      default:
        const _exhaustiveCheck: never = type;
        throw new Error(
          `Unknown Type (${type}) is a ${_exhaustiveCheck} ValueType`
        );
    }
  }

  /**
   * Returns the Cypher name for a value type.
   */
  export function cypherName(type: ValueType): string {
    switch (type) {
      case ValueType.LONG:
        return "Integer";
      case ValueType.BIGINT:
        return "BigInt";
      case ValueType.DOUBLE:
      case ValueType.FLOAT:
        return "Float";
      case ValueType.BOOLEAN:
        return "Boolean";
      case ValueType.STRING:
        return "String";
      case ValueType.LONG_ARRAY:
        return "List of Integer";
      case ValueType.BIGINT_ARRAY:
        return "List of BigInt";
      case ValueType.DOUBLE_ARRAY:
      case ValueType.FLOAT_ARRAY:
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
   * Returns the fallback default value for this type.
   */
  export function fallbackValue(type: ValueType): DefaultValue {
    switch (type) {
      case ValueType.LONG:
        return DefaultValue.forLong();
      case ValueType.BIGINT:
        return DefaultValue.of(0n);
      case ValueType.DOUBLE:
        return DefaultValue.forDouble();
      case ValueType.FLOAT:
        return DefaultValue.forDouble();
      case ValueType.BOOLEAN:
        return DefaultValue.of(false);
      case ValueType.STRING:
        return DefaultValue.of("");
      case ValueType.LONG_ARRAY:
        return DefaultValue.forLongArray();
      case ValueType.BIGINT_ARRAY:
        return DefaultValue.of([]);
      case ValueType.DOUBLE_ARRAY:
        return DefaultValue.forDoubleArray();
      case ValueType.FLOAT_ARRAY:
        return DefaultValue.forFloatArray();
      case ValueType.BOOLEAN_ARRAY:
        return DefaultValue.of([]);
      case ValueType.STRING_ARRAY:
        return DefaultValue.of([]);
      case ValueType.UNTYPED_ARRAY:
        return DefaultValue.of([]);
      case ValueType.UNKNOWN:
        return DefaultValue.DEFAULT;
      default:
        const _exhaustiveCheck: never = type;
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
    visitor: Visitor<RESULT>
  ): RESULT | null {
    switch (type) {
      case ValueType.LONG:
        return visitor.visitLong();
      case ValueType.FLOAT:
        return visitor.visitFloat();
      case ValueType.DOUBLE:
        return visitor.visitDouble();
      case ValueType.BOOLEAN:
        return visitor.visitBoolean();
      case ValueType.STRING:
        return visitor.visitString();
      case ValueType.BIGINT:
        return visitor.visitBigInt();
      case ValueType.LONG_ARRAY:
        return visitor.visitLongArray();
      case ValueType.FLOAT_ARRAY:
        return visitor.visitFloatArray();
      case ValueType.DOUBLE_ARRAY:
        return visitor.visitDoubleArray();
      case ValueType.BOOLEAN_ARRAY:
        return visitor.visitBooleanArray();
      case ValueType.STRING_ARRAY:
        return visitor.visitStringArray();
      case ValueType.BIGINT_ARRAY:
        return visitor.visitBigIntArray();
      case ValueType.UNTYPED_ARRAY:
        if (visitor.visitUntypedArray) {
          return visitor.visitUntypedArray();
        }
        return null; // UNTYPED_ARRAY is optional in the visitor
      case ValueType.UNKNOWN:
        if (visitor.visitUnknown) {
          return visitor.visitUnknown();
        }
        return null;
      default:
        //const _exhaustiveCheck: never = type;
        throw new Error(
          `Value Type ${ValueType[type]} not supported by visitor`
        );
    }
  }

  /**
   * Checks if one value type is compatible with another for NeoVM.
   */
  export function isCompatibleWith(type: ValueType, other: ValueType): boolean {
    if (type === other) {
      return true;
    }

    // UNTYPED_ARRAY compatibility
    if (other === ValueType.UNTYPED_ARRAY) {
      switch (type) {
        case ValueType.LONG_ARRAY:
        case ValueType.FLOAT_ARRAY:
        case ValueType.DOUBLE_ARRAY:
        case ValueType.BOOLEAN_ARRAY:
        case ValueType.STRING_ARRAY:
        case ValueType.BIGINT_ARRAY:
        case ValueType.UNTYPED_ARRAY:
          return true;
        default:
          return false;
      }
    }

    // Numeric type compatibilities
    if (type === ValueType.FLOAT && other === ValueType.DOUBLE) {
      return true;
    }
    if (type === ValueType.LONG && other === ValueType.BIGINT) {
      return true;
    }

    return false;
  }

  /**
   * Creates a ValueType from a CSV name.
   */
  export function fromCsvName(csvName: string): ValueType {
    for (const key in ValueType) {
      if (isNaN(Number(key))) {
        const enumValue = ValueType[key as keyof typeof ValueType];
        if (typeof enumValue === "number") {
          try {
            // Fix: Call the namespace function, not the parameter
            if (ValueType.csvName(enumValue as ValueType) === csvName) {
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
          // Fix: Call the namespace function
          return ValueType.csvName(v as ValueType);
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
