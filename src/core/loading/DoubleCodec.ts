/**
 * DOUBLE CODEC - ABSTRACT BASE FOR DOUBLE COMPRESSION
 *
 * Base class for compressing and decompressing double values using various algorithms.
 * Uses proper IEEE 754 bit manipulation with native JavaScript APIs.
 */

// Simple mutable double class (only thing we need)
class MutableDouble {
  private value: number = 0;

  doubleValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    this.value = value;
  }
}

// Proper bit conversion functions using DataView
export function doubleToRawLongBits(value: number): bigint {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, true); // little endian
  return view.getBigUint64(0, true);
}

export function longBitsToDouble(bits: bigint): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, bits, true); // little endian
  return view.getFloat64(0, true);
}

export namespace DoubleCodec {
  export interface CompressionInfo {
    input(): number;
    compressed(): Uint8Array;
    decompressed(): number;
    compressedSize(): number;
    compressedType(): number;
    compressionDescription(): string;
  }
}

export abstract class DoubleCodec {
  // IEEE 754 Double precision constants
  static readonly SIGNIFICAND_WIDTH = 53;
  protected static readonly SIGNIFICAND_BITS = DoubleCodec.SIGNIFICAND_WIDTH - 1;
  static readonly EXPONENT_BITS = 11;
  protected static readonly EXP_BIAS = 1023;
  protected static readonly SUPER_NORMAL_EXPONENT = (1 << DoubleCodec.EXPONENT_BITS) - 1;

  // Bit masks for 64-bit operations (using BigInt literals)
  static readonly SIGN_BIT_MASK = 0x8000000000000000n;
  protected static readonly EXP_BIT_MASK = 0x7ff0000000000000n;
  protected static readonly SIGNIFICAND_BIT_MASK = 0x000fffffffffffffn;

  /**
   * Extract sign bit from double's bit representation.
   */
  protected static getSign(bits: bigint): number {
    const signBit = (bits & DoubleCodec.SIGN_BIT_MASK) >>
      BigInt(DoubleCodec.SIGNIFICAND_BITS + DoubleCodec.EXPONENT_BITS);
    return Number(signBit);
  }

  /**
   * Extract unbiased exponent from double's bit representation.
   */
  protected static getUnbiasedExponent(bits: bigint): number {
    return Number((bits & DoubleCodec.EXP_BIT_MASK) >> BigInt(DoubleCodec.SIGNIFICAND_BITS));
  }

  /**
   * Extract significand from double's bit representation.
   */
  protected static getSignificand(bits: bigint): bigint {
    return bits & DoubleCodec.SIGNIFICAND_BIT_MASK;
  }

  // =============================================================================
  // ABSTRACT METHODS
  // =============================================================================

  public abstract compressDouble(
    doubleBitsAsBigInt: bigint,
    out: Uint8Array,
    outPos: number
  ): number;

  public abstract decompressDouble(
    data: Uint8Array,
    pos: number,
    out: MutableDouble
  ): number;

  public abstract compressedSize(data: Uint8Array, pos: number): number;

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  public compressDoubleToNewArray(value: number): Uint8Array {
    const out = new Uint8Array(10); // Max estimate
    const bitsAsBigInt = doubleToRawLongBits(value);
    const outLength = this.compressDouble(bitsAsBigInt, out, 0);
    return out.slice(0, outLength); // Use native slice instead of custom function
  }

  public decompressDoubleFrom(data: Uint8Array): number {
    const mutableOut = new MutableDouble();
    this.decompressDouble(data, 0, mutableOut);
    return mutableOut.doubleValue();
  }

  public compressAllDoubles(data: number[]): Uint8Array {
    const out = new Uint8Array(data.length * 10); // Estimate
    let outPos = 0;

    for (const datum of data) {
      const bitsAsBigInt = doubleToRawLongBits(datum);
      outPos = this.compressDouble(bitsAsBigInt, out, outPos);
    }

    return out.slice(0, outPos); // Use native slice
  }

  // =============================================================================
  // ABSTRACT METHODS FOR IMPLEMENTATION
  // =============================================================================

  public abstract describeCompression(type: number): string;

  public abstract describeCompressedValue(
    data: Uint8Array,
    pos: number,
    originalInput: number
  ): DoubleCodec.CompressionInfo;

  public supportedSignificandWidth(): number {
    return DoubleCodec.SIGNIFICAND_WIDTH;
  }
}
