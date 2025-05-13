import { Array as GdsArray } from '../Array'; // Renamed to avoid conflict with global Array
import { DoubleArray } from '../DoubleArray';
import { FloatArray } from '../FloatArray';
import { FloatingPointValue } from '../FloatingPointValue';
import { GdsNoValue } from '../GdsNoValue';
import { GdsValue } from '../GdsValue';
import { IntegralValue } from '../IntegralValue';
import { LongArray } from '../LongArray';

import { ByteLongArrayImpl } from './ByteLongArrayImpl';
import { DoubleArrayImpl } from './DoubleArrayImpl';
import { FloatArrayImpl } from './FloatArrayImpl';
import { FloatingPointValueImpl } from './FloatingPointValueImpl';
import { IntLongArrayImpl } from './IntLongArrayImpl';
import { LongArrayImpl } from './LongArrayImpl';
import { LongValueImpl } from './LongValueImpl';
import { ShortLongArrayImpl } from './ShortLongArrayImpl';

/**
 * Factory class for creating primitive value wrappers.
 */
export class PrimitiveValues {
  private static readonly EMPTY_NUMBERS: number[] = []; // Changed from EMPTY_LONGS to reflect number[] usage
  public static readonly NO_VALUE: GdsNoValue = GdsNoValue.NO_VALUE;
  public static readonly EMPTY_LONG_ARRAY: LongArray = PrimitiveValues.longArray(
    PrimitiveValues.EMPTY_NUMBERS // Use the number[]
  );

  public static create(value: unknown): GdsValue {
    const gdsValue = this.of(value);
    if (gdsValue !== null) {
      return gdsValue;
    }

    if (value === undefined || value === null) {
      // Java version allows null to be passed to create, which then calls of(null) -> NO_VALUE
      // To align, we might want of() to handle this, or create() to return NO_VALUE for null/undefined.
      // For now, matching your existing throw for undefined/null in create if 'of' fails.
      throw new Error("Value cannot be null or undefined if not directly convertible by 'of'.");
    }

    throw new Error(
      `[${value}:${typeof value}] is not a supported property value`
    );
  }

  private static of(value: unknown): GdsValue | null {
    if (value === undefined || value === null) return this.NO_VALUE;

    // Handle single numbers (Java's numberValue logic)
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        // Consistent with your decision to use 'number' for LongValueImpl
        return this.longValue(value);
      } else {
        return this.floatingPointValue(value);
      }
    }
    // No need for a second `typeof value === 'number'` check here.

    // Handle TypedArrays (Java's primitive array[] handling)
    if (value instanceof Uint8Array) {
      return this.byteArray(value); // byte[] in Java
    }
    if (value instanceof Int16Array) {
      return this.shortArray(value); // short[] in Java
    }
    if (value instanceof Int32Array) {
      return this.intArray(value); // int[] in Java
    }
    // For long[], Java takes long[]. In TS, if you expect a "direct long array",
    // it would likely be number[] (per your design) or BigInt64Array.
    // Let's assume number[] for LongArrayImpl for now.
    // We'll handle generic Array.isArray(value) below for more flexibility.

    if (value instanceof Float32Array) {
      return this.floatArray(value); // float[] in Java
    }
    if (value instanceof Float64Array) {
      return this.doubleArray(value); // double[] in Java
    }
    // if (value instanceof BigInt64Array) { // If you decide to support BigInt64Array directly
    //   return this.longArrayFromBigInt(Array.from(value).map(v => BigInt(v))); // Assuming longArray takes bigint[]
    // }


    // Handle generic JavaScript arrays (approximating Java's Object[] handling)
    if (Array.isArray(value)) {
      // This is where the logic from Java's arrayValue(Object[]) comes in.
      // Java checks `value instanceof Float[]`, etc. We need to inspect elements.
      return this.genericArrayToGdsArray(value);
    }

    return null;
  }

  /**
   * Converts a generic JavaScript array to a GdsArray (LongArray, DoubleArray, etc.)
   * This attempts to mimic Java's arrayValue(Object[]) by inspecting element types.
   * @param arr The generic array.
   */
  private static genericArrayToGdsArray(arr: unknown[]): GdsArray | null {
    if (arr.length === 0) {
      // Java's arrayValue would return null for an empty Object[] if it doesn't match a specific type like Float[].
      // However, GDS often treats empty arrays as EMPTY_LONG_ARRAY by convention in some contexts.
      // Let's stick to EMPTY_LONG_ARRAY for empty generic arrays for now, as per your original code.
      return this.EMPTY_LONG_ARRAY;
    }

    const firstElement = arr[0];

    // Check for nulls, Java's copy method throws if an element is null.
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === null || arr[i] === undefined) {
            // Java's PrimitiveValues.copy throws IllegalArgumentException for null elements.
            // We can either throw or return null to indicate non-convertibility.
            // Returning null might be more idiomatic for an 'of'-style converter.
            // throw new Error("Property array value elements may not be null.");
            return null; // Indicates this array cannot be converted due to nulls
        }
    }

    if (typeof firstElement === 'number') {
      // Are all elements numbers?
      if (arr.every(el => typeof el === 'number')) {
        const numArray = arr as number[];
        // Now, are they all integers or do they contain floats?
        if (numArray.every(el => Number.isInteger(el))) {
          // Treat as LongArray (using number[] as per your design)
          return this.longArray(numArray);
        } else {
          // Contains at least one float, treat as DoubleArray
          return this.doubleArray(new Float64Array(numArray));
        }
      }
    }
    // Add more checks here if you expect arrays of other types, e.g., boolean[], string[]
    // if (arr.every(el => typeof el === 'string')) {
    //   return this.stringArray(arr as string[]);
    // }

    // If no specific GDS array type can be determined from the generic array.
    return null;
  }


  // Factory methods for specific types remain largely the same,
  // ensuring they use the correct underlying types (e.g., number[] for LongArrayImpl)

  public static longValue(value: number): IntegralValue {
    return new LongValueImpl(value); // Assumes LongValueImpl constructor takes number
  }

  public static floatingPointValue(value: number): FloatingPointValue {
    return new FloatingPointValueImpl(value);
  }

  public static doubleArray(data: Float64Array): DoubleArray {
    return new DoubleArrayImpl(data);
  }

  public static floatArray(data: Float32Array): FloatArray {
    return new FloatArrayImpl(data);
  }

  /**
   * Creates a LongArray from a number array (representing longs).
   */
  public static longArray(data: number[]): LongArray { // Parameter is number[]
    return new LongArrayImpl(data); // Assumes LongArrayImpl constructor takes number[]
  }

  public static intArray(data: Int32Array): LongArray {
    return new IntLongArrayImpl(data);
  }

  public static shortArray(data: Int16Array): LongArray {
    return new ShortLongArrayImpl(data);
  }

  public static byteArray(data: Uint8Array): LongArray {
    return new ByteLongArrayImpl(data);
  }

  private constructor() {}
}
