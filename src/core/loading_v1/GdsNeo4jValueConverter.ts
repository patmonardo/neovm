import {
  AnyValue,
  Value,
  NoValue,
  SequenceValue,
  ListValue,
  ArrayValue,
  IntegralValue,
  FloatValue,
  DoubleValue,
  ValueGroup,
  GdsValue,
  GdsNoValue,
  GdsArray,
  PrimitiveValues,
  StringFormatting,
} from './valueConverterTypes'; // Adjust path as needed

// @NotNull annotations are for static analysis in Java and not directly translated.
// TypeScript's type system handles non-nullability for non-optional parameters.

export namespace GdsNeo4jValueConverter {
  export function toValue(value: AnyValue): GdsValue {
    if (value === NoValue.NO_VALUE) {
      return GdsNoValue.NO_VALUE;
    }
    if (value.isSequenceValue()) {
      // Type assertion needed as isSequenceValue is a type guard in spirit
      return convertSequenceValueOrFail(value as SequenceValue);
    }
    // Check if it's an instance of our mock Value to access valueGroup
    if (value instanceof IntegralValue) {
        return PrimitiveValues.longValue(value.longValue());
    } else if (value instanceof FloatValue) { // Order matters: Float before Double if Double could be a FloatValue
        return PrimitiveValues.floatingPointValue(value.floatValue());
    } else if (value instanceof DoubleValue) {
        return PrimitiveValues.floatingPointValue(value.doubleValue());
    }
    // Fallback for other Value types that might have ValueGroup.NUMBER but aren't explicitly handled above
    // This part of the Java code: `value instanceof Value storableValue && storableValue.valueGroup() == ValueGroup.NUMBER`
    // is tricky because `Value` is an interface in the mock.
    // The explicit instanceof checks for IntegralValue, FloatValue, DoubleValue cover the specific cases.
    // If there were other `Value` implementers with `ValueGroup.NUMBER`, they'd need specific checks.

    throw new Error( // Changed from IllegalArgumentException for simplicity
      StringFormatting.formatWithLocale(
        "Unsupported conversion to GDS Value from Neo4j Value with type `%s`.",
        value.getTypeName()
      )
    );
  }

  function convertSequenceValueOrFail(value: SequenceValue): GdsValue {
    if (value instanceof ListValue) {
      return convertListValueOrFail(value);
    } else if (value instanceof ArrayValue) {
      return convertArrayValueOrFail(value);
    } else {
      throw failOnBadInput(value, "SequenceValue type not ListValue or ArrayValue");
    }
  }

  function convertListValueOrFail(listValue: ListValue): GdsArray {
    if (listValue.isEmpty()) {
      return PrimitiveValues.EMPTY_LONG_ARRAY;
    }
    try {
      // The ListValue.toStorableArray() mock needs to correctly produce an ArrayValue
      // that convertArrayValueOrFail can handle.
      return convertArrayValueOrFail(listValue.toStorableArray());
    } catch (e: any) {
      // Catching RuntimeException in Java, broad catch here.
      throw failOnBadInput(listValue, e.message || "Failed to convert ListValue to StorableArray");
    }
  }

  function convertArrayValueOrFail(array: ArrayValue): GdsArray {
    if (array.valueGroup() !== ValueGroup.NUMBER_ARRAY) {
      throw failOnBadInput(array, "ArrayValue group is not NUMBER_ARRAY");
    }
    if (array.isEmpty()) {
      // The Java code returns EMPTY_LONG_ARRAY for any empty numeric array.
      return PrimitiveValues.EMPTY_LONG_ARRAY;
    }

    const arrayCopy = array.asObjectCopy(); // This mock returns the typed array directly

    if (arrayCopy instanceof Int8Array) { // byte[]
      return PrimitiveValues.byteArray(arrayCopy);
    } else if (arrayCopy instanceof Int16Array) { // short[]
      return PrimitiveValues.shortArray(arrayCopy);
    } else if (arrayCopy instanceof Int32Array) { // int[]
      return PrimitiveValues.intArray(arrayCopy);
    } else if (arrayCopy instanceof BigInt64Array) { // long[]
      return PrimitiveValues.longArray(arrayCopy);
    } else if (arrayCopy instanceof Float32Array) { // float[]
      return PrimitiveValues.floatArray(arrayCopy);
    } else if (arrayCopy instanceof Float64Array) { // double[]
      return PrimitiveValues.doubleArray(arrayCopy);
    }
    // The Java code has specific checks for `byte[]`, `short[]`, etc.
    // If `asObjectCopy()` returns a plain `number[]` or `number[]` instead of typed arrays,
    // these `instanceof` checks won't work as intended. The mock for `ArrayValue.asObjectCopy()`
    // is crucial here. The current mock returns the underlying typed array.

    // If it's a plain number[] or number[] from a less specific ArrayValue mock,
    // we might need a fallback or more info from ArrayValue's type.
    // For now, assume asObjectCopy gives a typed array.

    else {
      throw failOnBadInput(array, "ArrayValue data type not a recognized primitive array");
    }
  }

  function failOnBadInput(badInput: AnyValue, specificError?: string): Error {
    const message = StringFormatting.formatWithLocale(
      "Unsupported conversion to GDS Value from Neo4j Value `%s`.%s",
      badInput.toString(), // Use toString() for more details on the value itself
      specificError ? ` Details: ${specificError}` : ""
    );
    return new Error(message); // Changed from IllegalArgumentException
  }

  // Private constructor in Java implies it's a utility class not meant to be instantiated.
  // A namespace achieves this naturally in TypeScript.
}
