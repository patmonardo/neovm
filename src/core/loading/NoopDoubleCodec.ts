import { DoubleCodec } from './DoubleCodec';
import { MutableDouble, longBitsToDouble, arraysCopyOfRangeUint8Array } from './doubleCodecUtils'; // Adjust path

export class NoopDoubleCodec extends DoubleCodec {
  private static readonly INSTANCE = new NoopDoubleCodec();

  public static instance(): DoubleCodec {
    return NoopDoubleCodec.INSTANCE;
  }

  private constructor() {
    super();
    // Private constructor for singleton
  }

  public override compressDouble(doubleBits: number, out: Uint8Array, outPos: number): number {
    // Ensure outPos is within bounds if strict checks are needed, though Java might throw AIOOBE
    // For direct translation, assume out array is large enough.
    out[0 + outPos] = Number((BigInt(doubleBits) >> 56n) & 0xFFn);
    out[1 + outPos] = Number((BigInt(doubleBits) >> 48n) & 0xFFn);
    out[2 + outPos] = Number((BigInt(doubleBits) >> 40n) & 0xFFn);
    out[3 + outPos] = Number((BigInt(doubleBits) >> 32n) & 0xFFn);
    out[4 + outPos] = Number((BigInt(doubleBits) >> 24n) & 0xFFn);
    out[5 + outPos] = Number((BigInt(doubleBits) >> 16n) & 0xFFn);
    out[6 + outPos] = Number((BigInt(doubleBits) >> 8n) & 0xFFn);
    out[7 + outPos] = Number(BigInt(doubleBits) & 0xFFn);
    return 8 + outPos;
  }

  public override decompressDouble(data: Uint8Array, pos: number, out: MutableDouble): number {
    // Ensure pos is within bounds if strict checks are needed
    let bits = 0n;
    bits |= (BigInt(data[0 + pos] & 0xFF) << 56n);
    bits |= (BigInt(data[1 + pos] & 0xFF) << 48n);
    bits |= (BigInt(data[2 + pos] & 0xFF) << 40n);
    bits |= (BigInt(data[3 + pos] & 0xFF) << 32n);
    bits |= (BigInt(data[4 + pos] & 0xFF) << 24n);
    bits |= (BigInt(data[5 + pos] & 0xFF) << 16n);
    bits |= (BigInt(data[6 + pos] & 0xFF) << 8n);
    bits |= BigInt(data[7 + pos] & 0xFF);

    out.setValue(longBitsToDouble(bits));
    return 8 + pos;
  }

  public override compressedSize(data: Uint8Array, pos: number): number {
    return 8;
  }

  public override describeCompression(type: number): string {
    return "NOOP";
  }

  public override describeCompressedValue(data: Uint8Array, pos: number, originalInput: number): DoubleCodec.CompressionInfo {
    const compressedData = arraysCopyOfRangeUint8Array(data, pos, 8 + pos);
    // The original Java code calls `decompressDouble(data, pos)` which returns the decompressed double.
    // Our `decompressDouble` (the abstract one) takes a MutableDouble.
    // We can use the concrete `decompressDoubleAt` from the base class if it's suitable,
    // or call our own `decompressDouble` and extract the value.
    const mutableVal = new MutableDouble();
    this.decompressDouble(data, pos, mutableVal); // Use this instance's decompressDouble
    const decompressedValue = mutableVal.doubleValue();

    return DoubleCodec.createCompressionInfo({ // Using the helper factory
      input: originalInput,
      compressed: compressedData,
      decompressed: decompressedValue,
      compressedSize: 8,
      compressedType: 0, // Type 0 for NOOP
      compressionDescription: "NOOP",
    });
  }
}
