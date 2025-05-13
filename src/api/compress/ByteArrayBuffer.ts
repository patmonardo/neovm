/**
 * A simple buffer class that wraps a byte array (Uint8Array in TypeScript).
 * It provides a method to ensure the buffer has a minimum capacity.
 * If the buffer needs to be resized to meet the capacity, existing data is discarded.
 */
export class ByteArrayBuffer {
  /**
   * A shared, empty Uint8Array instance.
   */
  private static readonly EMPTY_BUFFER: Uint8Array = new Uint8Array(0);

  /**
   * The underlying byte array.
   * In TypeScript, `Uint8Array` is the standard way to represent a byte array.
   */
  public buffer: Uint8Array;

  /**
   * Initializes a new instance of the ByteArrayBuffer,
   * starting with an empty buffer.
   */
  constructor() {
    this.buffer = ByteArrayBuffer.EMPTY_BUFFER;
  }

  /**
   * Ensures that the buffer can hold at least `length` elements.
   * If the current buffer is smaller than the required length, a new buffer
   * of the specified length is created, and any existing data in the old buffer
   * is discarded.
   *
   * @param length The minimum required capacity of the buffer.
   */
  public ensureCapacity(length: number): void {
    if (this.buffer.length < length) {
      this.buffer = new Uint8Array(length);
    }
  }

  /**
   * Resets the buffer to an empty state.
   * This is equivalent to ensuring a capacity of 0, but can be more explicit.
   */
  public reset(): void {
    this.buffer = ByteArrayBuffer.EMPTY_BUFFER;
  }

  /**
   * Gets the current length (capacity) of the buffer.
   * @returns The length of the buffer.
   */
  public get length(): number {
    return this.buffer.length;
  }
}

// Example Usage:
// const myBuffer = new ByteArrayBuffer();
// console.log(myBuffer.length); // Output: 0
//
// myBuffer.ensureCapacity(1024);
// console.log(myBuffer.length); // Output: 1024
//
// // Fill the buffer with some data (example)
// for (let i = 0; i < myBuffer.length; i++) {
//   myBuffer.buffer[i] = i % 256;
// }
//
// myBuffer.ensureCapacity(512); // This will create a new buffer, data is lost
// console.log(myBuffer.length); // Output: 512
//
// myBuffer.reset();
// console.log(myBuffer.length); // Output: 0
