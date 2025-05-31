import { AdjacencyPacking } from "@/core/compression/packed/AdjacencyPacking"; // Adjust path as needed
import { BitUtil } from "../../mem/BitUtil"; // Adjust path as needed

/**
 * A buffer class that wraps a long array (BigInt64Array or number[] in TypeScript).
 * It provides a method to ensure the buffer has a minimum capacity, aligning
 * the capacity to AdjacencyPacking.BLOCK_SIZE.
 * If the buffer needs to be resized, existing data is discarded.
 */
export class LongArrayBuffer {
  /**
   * A shared, empty BigInt64Array instance.
   */
  private static readonly EMPTY_BUFFER: number[] = [];

  /**
   * The underlying long array.
   */
  public buffer: number[];

  /**
   * The current "logical" length of the data stored in the buffer,
   * which might be less than the actual capacity of `this.buffer`.
   */
  public length: number;

  /**
   * Initializes a new instance of the LongArrayBuffer,
   * starting with an empty buffer and zero length.
   */
  constructor() {
    this.buffer = LongArrayBuffer.EMPTY_BUFFER;
    this.length = 0;
  }

  /**
   * Test-only constructor.
   * Initializes a new instance of the LongArrayBuffer with a pre-existing buffer and length.
   *
   * @param buffer The initial buffer to use.
   * @param length The initial logical length.
   * @remarks This constructor is marked as `@TestOnly`.
   */
  public static createForTest(buffer: number[], length: number): LongArrayBuffer {
    const instance = new LongArrayBuffer();
    instance.buffer = buffer;
    instance.length = length;
    return instance;
  }

  /**
   * Ensures that the buffer can hold at least `requiredLength` elements.
   * The actual capacity will be aligned to `AdjacencyPacking.BLOCK_SIZE`.
   * If the current buffer's capacity is smaller than the required aligned length,
   * a new buffer of the aligned length is created, and any existing data in the
   * old buffer is discarded.
   *
   * @param requiredLength The minimum required capacity of the buffer before alignment.
   */
  public ensureCapacity(requiredLength: number): void {
    // Ensure requiredLength is not negative
    const nonNegativeLength = Math.max(0, requiredLength);
    // BitUtil.align might return a number if its Java counterpart returns long.
    // TypedArray constructors take a number for length.
    const alignedLengthValue = BitUtil.align(nonNegativeLength, AdjacencyPacking.BLOCK_SIZE);
    const alignedLength = Number(alignedLengthValue); // Convert number to number for array length

    if (this.buffer.length < alignedLength) {
      this.buffer = new Array<number>(alignedLength);
    }
  }

  /**
   * Resets the buffer to an empty state and zero length.
   */
  public reset(): void {
    this.buffer = LongArrayBuffer.EMPTY_BUFFER;
    this.length = 0;
  }

  /**
   * Gets the current capacity of the underlying buffer.
   * @returns The capacity of the buffer.
   */
  public get capacity(): number {
    return this.buffer.length;
  }
}

// Example Usage:
// const myLongBuffer = new LongArrayBuffer();
// console.log(myLongBuffer.capacity); // Output: 0
// console.log(myLongBuffer.length);   // Output: 0
//
// myLongBuffer.ensureCapacity(10);
// // Assuming AdjacencyPacking.BLOCK_SIZE is, for example, 8:
// // alignedLength would be Number(BitUtil.align(BigInt(10), BigInt(8)))
// // which might be 16 (if align rounds up to multiple of block size)
// console.log(myLongBuffer.capacity); // Output: (e.g., 16)
// console.log(myLongBuffer.length);   // Output: 0
//
// // If AdjacencyPacking.BLOCK_SIZE and BitUtil.align are not available,
// // you might need to implement or mock them:
// class AdjacencyPacking { static BLOCK_SIZE = 8; }
// class BitUtil {
//   static align(value: number, alignment: number): number {
//     if (alignment === 0n) return value;
//     const remainder = value % alignment;
//     if (remainder === 0n) return value;
//     return value + alignment - remainder; // Align up
//   }
// }
