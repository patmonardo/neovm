import {
  MutableDouble,
  doubleToRawLongBits,
  arraysCopyOfUint8Array,
} from "./DoubleCodecUtils"; // Adjust path as needed

export namespace DoubleCodec {
  /**
   * Information about a compressed double value.
   * For debugging or testing.
   * @TestOnly
   */
  export interface CompressionInfo {
    input(): number;
    compressed(): Uint8Array;
    decompressed(): number;
    compressedSize(): number;
    compressedType(): number;
    compressionDescription(): string;
  }
}

/**
 * A class for compressing and decompressing `double`s (numbers in TypeScript).
 *
 * Implementors need to implement only `compressDouble(long, byte[], int)` (which takes the bigint bit pattern)
 * and `decompressDouble(byte[], int, MutableDouble)` for decompressing.
 */
export abstract class DoubleCodec {
  /**
   * The number of logical bits in the significand of a
   * `double` number, including the implicit bit.
   */
  static readonly SIGNIFICAND_WIDTH = 53;

  /**
   * The number of physical bits in the significand of a `double` number.
   */
  protected static readonly SIGNIFICAND_BITS =
    DoubleCodec.SIGNIFICAND_WIDTH - 1;

  /**
   * The number of physical bits in the exponent of a `double` number.
   */
  static readonly EXPONENT_BITS = 11;

  /**
   * Bias used in representing a `double` exponent.
   */
  protected static readonly EXP_BIAS = 1023;

  /**
   * Exponent in representing a `NaN` or `Infinity` value.
   */
  protected static readonly SUPER_NORMAL_EXPONENT =
    (1 << DoubleCodec.EXPONENT_BITS) - 1;

  /**
   * Bit mask to isolate the sign bit of a `double`.
   * This operates on the 64-bit integer (long) representation.
   */
  static readonly SIGN_BIT_MASK = 0x8000000000000000n;

  /**
   * Bit mask to isolate the exponent field of a `double`.
   * This operates on the 64-bit integer (long) representation.
   */
  protected static readonly EXP_BIT_MASK = 0x7ff0000000000000n;

  /**
   * Bit mask to isolate the significand field of a `double`.
   * This operates on the 64-bit integer (long) representation.
   */
  protected static readonly SIGNIFICAND_BIT_MASK = 0x000fffffffffffffn; // Corrected from SIGNIFICANT_BIT_MASK in Java

  /**
   * Get the sign bit from the 64-bit integer representation of a `double`.
   * @param bits The 64-bit integer pattern (as bigint).
   * @returns The sign bit (0 or 1) as a number.
   */
  protected static getSign(bits: bigint): number {
    const signBit =
      (bits & DoubleCodec.SIGN_BIT_MASK) >>
      BigInt(DoubleCodec.SIGNIFICAND_BITS + DoubleCodec.EXPONENT_BITS);
    return Number(signBit);
  }

  /**
   * Get the unbiased exponent from the 64-bit integer representation of a `double`.
   * @param bits The 64-bit integer pattern (as bigint).
   * @returns The unbiased exponent as a number.
   */
  protected static getUnbiasedExponent(bits: bigint): number {
    return Number(
      (bits & DoubleCodec.EXP_BIT_MASK) >> BigInt(DoubleCodec.SIGNIFICAND_BITS)
    );
  }

  /**
   * Get the significand from the 64-bit integer representation of a `double`.
   * @param bits The 64-bit integer pattern (as bigint).
   * @returns The significand as a bigint.
   */
  protected static getSignificand(bits: bigint): bigint {
    return bits & DoubleCodec.SIGNIFICAND_BIT_MASK;
  }

  // --- Core abstract methods to be implemented by subclasses ---
  // These operate on the `long` (bigint) bit representation for compression.

  /**
   * Compress the double from its 64-bit integer representation and write result into out.
   * @param doubleBitsAsBigInt The double value as its 64-bit integer pattern (bigint).
   * @param out The output buffer (Uint8Array).
   * @param outPos At which position to write the compressed value in `out`.
   * @returns The new value of `outPos` (after writing).
   */
  public abstract compressDouble(
    doubleBitsAsBigInt: bigint,
    out: Uint8Array,
    outPos: number
  ): number;

  /**
   * Decompress a single double from the given byte array and write the result into out.
   * @param data The compressed data (Uint8Array).
   * @param pos Start reading from `data` at this position.
   * @param out Output value (MutableDouble), the result should be written using `setValue()`.
   * @returns The new value of `pos` after reading the compressed value.
   */
  public abstract decompressDouble(
    data: Uint8Array,
    pos: number,
    out: MutableDouble
  ): number;

  /**
   * Return the number of bytes used to compress the current value.
   * @param data The compressed data (Uint8Array).
   * @param pos Start reading from `data` at this position.
   * @returns The number of bytes that the compressed value at `pos` occupies.
   */
  public abstract compressedSize(data: Uint8Array, pos: number): number;

  // --- Public helper methods for compression (taking `number` for double values) ---

  /**
   * Compress many `double`s (numbers) in one call.
   * @param data The input array of numbers (doubles) to compress.
   * @param length How many values to compress from `data`.
   * @param out The output buffer (Uint8Array).
   * @returns The number of bytes written into `out`.
   */
  public compressDoubles(
    data: number[],
    length: number,
    out: Uint8Array
  ): number {
    let outPos = 0;
    const effectiveLength = Math.min(data.length, length);
    for (let i = 0; i < effectiveLength; i++) {
      const bitsAsBigInt = doubleToRawLongBits(data[i]);
      outPos = this.compressDouble(bitsAsBigInt, out, outPos);
    }
    return outPos;
  }

  /**
   * Compress many `double`s from their `long` (bigint) representation in one call.
   * This corresponds to the Java version taking `long[]`.
   * @param data The input array of bigints (raw 64-bit patterns) to compress.
   * @param length How many values to compress.
   * @param out The output buffer (Uint8Array).
   * @returns The number of bytes written into `out`.
   */
  public compressDoublesFromBitPatterns(
    data: bigint[], // Changed from number[] to bigint[] to match Java long[]
    length: number,
    out: Uint8Array
  ): number {
    let outPos = 0;
    const effectiveLength = Math.min(data.length, length);
    for (let i = 0; i < effectiveLength; i++) {
      const datumAsBigInt = data[i];
      outPos = this.compressDouble(datumAsBigInt!, out, outPos);
    }
    return outPos;
  }

  /**
   * Compress all provided `double`s (numbers) in one call.
   * @param data The input array of numbers (doubles) to compress.
   * @returns The compressed `double`s as a `Uint8Array`.
   */
  public compressAllDoubles(data: number[]): Uint8Array {
    // Estimate initial buffer size. Max 10 bytes per double is a common heuristic.
    // This might need adjustment based on the specific compression scheme.
    const initialCapacity = data.length * 10 || 10; // Handle empty array
    let out = new Uint8Array(initialCapacity);
    let outPos = 0;

    for (const datum of data) {
      const bitsAsBigInt = doubleToRawLongBits(datum);
      // Ensure 'out' is large enough.
      // This is a simplified resizing strategy. More sophisticated strategies exist.
      if (outPos + 10 > out.length) { // Assuming max 10 bytes for next compression
        const newOut = new Uint8Array(Math.max(out.length * 2, outPos + 10));
        newOut.set(out.subarray(0, outPos));
        out = newOut;
      }
      outPos = this.compressDouble(bitsAsBigInt, out, outPos);
    }
    return arraysCopyOfUint8Array(out, outPos);
  }

  /**
   * Compress a single `double` (number).
   * @param value The number (double) to compress.
   * @returns The compressed `double` as a `Uint8Array`.
   */
  public compressDoubleToNewArray(value: number): Uint8Array {
    const out = new Uint8Array(10); // Max 10 bytes, adjust if needed
    const bitsAsBigInt = doubleToRawLongBits(value);
    const outLength = this.compressDouble(bitsAsBigInt, out, 0);
    return arraysCopyOfUint8Array(out, outLength);
  }

  /**
   * Compress a single `double` (number) into a provided output buffer.
   * @param value The number (double) to compress.
   * @param out The output buffer (Uint8Array).
   * @returns The number of bytes written into `out`.
   */
  public compressDoubleInto(value: number, out: Uint8Array): number {
    const bitsAsBigInt = doubleToRawLongBits(value);
    return this.compressDouble(bitsAsBigInt, out, 0);
  }

  // --- Public helper methods for decompression (returning `number` for double values) ---

  /**
   * Decompress a single `double` (number). Data is read from index 0.
   * @param data The compressed data (Uint8Array).
   * @returns The decompressed number (double).
   */
  public decompressDoubleFrom(data: Uint8Array): number {
    const mutableOut = new MutableDouble();
    this.decompressDouble(data, 0, mutableOut);
    return mutableOut.doubleValue();
  }

  /**
   * Decompress many `double`s (numbers) in one call. Data is read from index 0.
   * @param data The compressed data (Uint8Array).
   * @param length How many values to decompress.
   * @returns The decompressed numbers (doubles) as a number array.
   */
  public decompressDoublesArray(data: Uint8Array, length: number): number[] {
    return this.decompressDoublesAt(data, 0, length);
  }

  /**
   * Decompress many `double`s (numbers) in one call. Data is read from the provided index.
   * @param data The compressed data (Uint8Array).
   * @param pos Start reading from `data` at this position.
   * @param length How many values to decompress.
   * @returns The decompressed numbers (doubles) as a number array.
   */
  public decompressDoublesAt(
    data: Uint8Array,
    pos: number,
    length: number
  ): number[] {
    const outArray = new Array<number>(length);
    this.decompressDoublesToOutput(data, pos, length, outArray, 0);
    return outArray;
  }

  /**
   * Decompress many `double`s (numbers) in one call. Data is read from index 0 into a provided output array.
   * @param data The compressed data (Uint8Array).
   * @param length How many values to decompress.
   * @param out The output buffer (number array) where the decompressed values are written to.
   * @param outPos At which position to start writing the decompressed values in `out`.
   * @returns The position where the next write to `out` should occur.
   */
  public decompressDoublesTo(
    data: Uint8Array,
    length: number,
    out: number[],
    outPos: number
  ): number {
    return this.decompressDoublesToOutput(data, 0, length, out, outPos);
  }

  /**
   * Decompress many `double`s (numbers) in one call. Data is read from `inPos` into a provided output array.
   * @param data The compressed data (Uint8Array).
   * @param inPos Where to start reading the compressed data from `data`.
   * @param length How many values to decompress.
   * @param out The output buffer (number array).
   * @param outPos At which position to start writing in `out`.
   * @returns The position where the next write to `out` should occur.
   */
  public decompressDoublesToOutput(
    data: Uint8Array,
    inPos: number,
    length: number,
    out: number[],
    outPos: number
  ): number {
    const mutableValue = new MutableDouble();
    let currentInPos = inPos;
    let currentOutPos = outPos;
    for (let i = 0; i < length; i++) {
      currentInPos = this.decompressDouble(data, currentInPos, mutableValue);
      out[currentOutPos++] = mutableValue.doubleValue();
    }
    return currentOutPos;
  }

  /**
   * Decompress a single `double` (number) from the given byte array and return it.
   * @param data The compressed data (Uint8Array).
   * @param pos Start reading from `data` at this position.
   * @returns The decompressed number (double).
   */
  public decompressDoubleAt(data: Uint8Array, pos: number): number {
    const mutableOut = new MutableDouble();
    this.decompressDouble(data, pos, mutableOut);
    return mutableOut.doubleValue();
  }

  // --- TestOnly methods ---
  /**
   * Return some string description on how the data is compressed.
   * For debugging or testing.
   * @param type A type identifier.
   * @returns Some string for describing how the data is compressed.
   * @TestOnly
   */
  public abstract describeCompression(type: number): string;

  /**
   * Return debug info about how the current value is compressed.
   * For debugging or testing.
   * @param data The compressed data (Uint8Array).
   * @param pos Start reading from `data` at this position.
   * @param originalInput The original double value that was compressed.
   * @returns Info object describing the current compressed value.
   * @TestOnly
   */
  public abstract describeCompressedValue(
    data: Uint8Array,
    pos: number,
    originalInput: number
  ): DoubleCodec.CompressionInfo;

  /**
   * @returns The guaranteed maximum significand width.
   * If the compression is lossless, this value must equal `SIGNIFICAND_WIDTH`.
   * @TestOnly
   */
  public supportedSignificandWidth(): number {
    return DoubleCodec.SIGNIFICAND_WIDTH;
  }
}
