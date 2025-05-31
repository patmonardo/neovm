import { BitUtil } from "@/mem";
import { AdjacencyPacking } from "@/core/compression";

/**
 * A buffer class that wraps a double array (Float64Array or number[] in TypeScript).
 * It provides a method to ensure the buffer has a minimum capacity, aligning
 * the capacity to AdjacencyPacking.BLOCK_SIZE.
 * If the buffer needs to be resized, existing data is discarded.
 */
export class DoubleArrayBuffer {
  /**
   * A shared, empty Float64Array instance.
   */
  private static readonly EMPTY_BUFFER: Float64Array = new Float64Array(0);

  /**
   * The underlying double array.
   * In TypeScript, `Float64Array` is the standard typed array for 64-bit floating-point numbers (doubles).
   * Alternatively, `number[]` could be used if typed arrays are not strictly necessary,
   * but `Float64Array` is closer to Java's `double[]` in terms of memory representation.
   */
  public buffer: Float64Array;

  /**
   * The current "logical" length of the data stored in the buffer,
   * which might be less than the actual capacity of `this.buffer`.
   * Note: The original Java class has a public `length` field, which seems to be
   * managed externally or by other methods not shown in the excerpt.
   * For this translation, I'll initialize it but its update logic would depend on how it's used.
   */
  public length: number;

  /**
   * Initializes a new instance of the DoubleArrayBuffer,
   * starting with an empty buffer and zero length.
   */
  constructor() {
    this.buffer = DoubleArrayBuffer.EMPTY_BUFFER;
    this.length = 0;
  }

  /**
   * Test-only constructor.
   * Initializes a new instance of the DoubleArrayBuffer with a pre-existing buffer and length.
   *
   * @param buffer The initial buffer to use.
   * @param length The initial logical length.
   * @remarks This constructor is marked as `@TestOnly`.
   */
  public static createForTest(
    buffer: Float64Array,
    length: number
  ): DoubleArrayBuffer {
    const instance = new DoubleArrayBuffer();
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
    const alignedLength = BitUtil.align(
      nonNegativeLength,
      AdjacencyPacking.BLOCK_SIZE
    );

    if (this.buffer.length < alignedLength) {
      this.buffer = new Float64Array(alignedLength);
    }
    // Note: The 'this.length' field is not updated by this method in the original Java code.
    // Its management seems to be external to ensureCapacity.
  }

  /**
   * Resets the buffer to an empty state and zero length.
   */
  public reset(): void {
    this.buffer = DoubleArrayBuffer.EMPTY_BUFFER;
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
// const myDblBuffer = new DoubleArrayBuffer();
// console.log(myDblBuffer.capacity); // Output: 0
// console.log(myDblBuffer.length);   // Output: 0
//
// myDblBuffer.ensureCapacity(10);
// // Assuming AdjacencyPacking.BLOCK_SIZE is, for example, 8:
// // alignedLength would be BitUtil.align(10, 8) which might be 16 (if align rounds up to multiple of block size)
// console.log(myDblBuffer.capacity); // Output: (e.g., 16 or whatever align(10, BLOCK_SIZE) is)
// console.log(myDblBuffer.length);   // Output: 0 (ensureCapacity doesn't change this.length)
//
// myDblBuffer.length = 5; // Manually setting the logical length
//
// // If AdjacencyPacking.BLOCK_SIZE and BitUtil.align are not available,
// // you might need to implement or mock them:
// class AdjacencyPacking { static BLOCK_SIZE = 8; }
// class BitUtil {
//   static align(value: number, alignment: number): number {
//     if (alignment === 0) return value;
//     return Math.ceil(value / alignment) * alignment;
//   }
// }
