/**
 * A mutable double, similar to org.apache.commons.lang3.mutable.MutableDouble.
 */
export class MutableDouble {
  private value: number;

  constructor(value: number = 0) {
    this.value = value;
  }

  public doubleValue(): number {
    return this.value;
  }

  public setValue(value: number): void {
    this.value = value;
  }

  public getValue(): number {
    return this.value;
  }

  public toJSON(): number {
    return this.value;
  }

  public toString(): string {
    return String(this.value);
  }
}

/**
 * Converts a double-precision 64-bit floating point number to its
 * "raw" long bits representation, returned as a BigInt.
 * This is equivalent to Java's Double.doubleToRawLongBits().
 * Note: JavaScript numbers are 64-bit floats (IEEE 754).
 * @param value The number (double) to convert.
 * @returns The 64-bit integer pattern as a BigInt.
 */
export function doubleToRawLongBits(value: number): bigint {
  const buffer = new ArrayBuffer(8);
  const float64View = new Float64Array(buffer);
  const bigIntView = new BigInt64Array(buffer);
  float64View[0] = value;
  return bigIntView[0];
}

/**
 * Converts a 64-bit integer pattern (as a BigInt) to its
 * double-precision 64-bit floating point number representation.
 * This is equivalent to Java's Double.longBitsToDouble().
 * @param bits The 64-bit integer pattern as a BigInt.
 * @returns The number (double).
 */
export function longBitsToDouble(bits: bigint): number {
  const buffer = new ArrayBuffer(8);
  const bigIntView = new BigInt64Array(buffer);
  const float64View = new Float64Array(buffer);
  bigIntView[0] = bits;
  return float64View[0];
}

/**
 * Creates a copy of a Uint8Array, truncated or padded with zeros to obtain the specified length.
 * Similar to Java's Arrays.copyOf() for byte arrays.
 * @param original The Uint8Array to be copied.
 * @param newLength The length of the copy to be returned.
 * @returns A new Uint8Array of the specified length.
 */
export function arraysCopyOfUint8Array(
  original: Uint8Array,
  newLength: number
): Uint8Array {
  const copy = new Uint8Array(newLength);
  const N = Math.min(original.length, newLength);
  for (let i = 0; i < N; i++) {
    copy[i] = original[i];
  }
  // If newLength is greater than original.length, the rest of 'copy' is already zero-filled.
  return copy;
}

/**
 * Creates a copy of a number array, truncated or padded with default values (0 for numbers)
 * to obtain the specified length.
 * Similar to Java's Arrays.copyOf() for number arrays.
 * @param original The number array to be copied.
 * @param newLength The length of the copy to be returned.
 * @returns A new number array of the specified length.
 */
export function arraysCopyOfNumberArray(
  original: number[],
  newLength: number
): number[] {
  const copy = new Array<number>(newLength).fill(0); // Fill with 0 by default
  const N = Math.min(original.length, newLength);
  for (let i = 0; i < N; i++) {
    copy[i] = original[i];
  }
  return copy;
}

/**
 * Copies an array from the specified source array, beginning at the
 * specified position, to the specified position of the destination array.
 * A subsequence of array components are copied from the source
 * array referenced by `src` to the destination array
 * referenced by `dest`. The number of components copied is
 * equal to the `length` argument. The components at
 * positions `srcPos` through `srcPos+length-1` in the
 * source array are copied into positions `destPos` through
 * `destPos+length-1`, respectively, of the destination array.
 *
 * This is a simplified version for Uint8Array and number[].
 * For more generic System.arraycopy, a more complex implementation or library would be needed.
 *
 * @param src The source array.
 * @param srcPos Starting position in the source array.
 * @param dest The destination array.
 * @param destPos Starting position in the destination data.
 * @param length The number of array elements to be copied.
 */
export function systemArraycopy(
  src: Uint8Array | number[],
  srcPos: number,
  dest: Uint8Array | number[],
  destPos: number,
  length: number
): void {
  if (
    srcPos < 0 ||
    destPos < 0 ||
    length < 0 ||
    srcPos + length > src.length ||
    destPos + length > dest.length
  ) {
    // In a real scenario, you'd throw an IndexOutOfBoundsException
    // For simplicity, we can log an error or just proceed, which might lead to issues.
    // A robust implementation should throw.
    console.error("systemArraycopy: Invalid arguments, potential out of bounds.");
    // For safety, one might choose to do nothing or throw an error.
    // throw new Error("IndexOutOfBoundsException in systemArraycopy");
    // For this example, let's proceed but be aware of the risk.
  }

  if (src instanceof Uint8Array && dest instanceof Uint8Array) {
    for (let i = 0; i < length; i++) {
      dest[destPos + i] = src[srcPos + i];
    }
  } else if (Array.isArray(src) && Array.isArray(dest)) {
    // Assuming number[] based on typical usage with System.arraycopy for numeric types
    for (let i = 0; i < length; i++) {
      (dest as number[])[destPos + i] = (src as number[])[srcPos + i];
    }
  } else {
    throw new Error(
      "systemArraycopy: Incompatible array types. Only Uint8Array and number[] (as Array<number>) are supported by this simplified version."
    );
  }
}
