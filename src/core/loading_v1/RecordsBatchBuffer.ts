/**
 * Abstract base class for a buffer that batches records, stored as `number` values.
 * Subclasses are expected to provide methods for adding specific types of records
 * to the buffer.
 */
export abstract class RecordsBatchBuffer {
  /**
   * Default size for the buffer if no specific capacity is provided.
   */
  public static readonly DEFAULT_BUFFER_SIZE: number = 100_000;

  /**
   * The underlying buffer storing the records as `number`.
   * Marked as readonly to prevent reassignment of the array itself,
   * though its contents are mutable.
   */
  protected readonly buffer: number[];

  /**
   * The current number of elements (individual `number` values) in the buffer.
   * This should be managed by subclasses when adding records.
   * For example, if a record consists of two `number`s, `length` would increment by 2.
   */
  protected length: number;

  /**
   * Protected constructor to be called by subclasses.
   * Initializes the buffer with the given capacity.
   * @param capacity The maximum number of `number` values the buffer can hold.
   */
  protected constructor(capacity: number) {
    // Initialize with 0n to mimic Java's default long value (0L)
    this.buffer = new Array<number>(capacity).fill(0n);
    this.length = 0;
  }

  /**
   * @returns The current number of `number` values stored in the buffer.
   */
  public currentLength(): number { // Renamed from length() to avoid conflict with array.length if used directly
    return this.length;
  }

  /**
   * @returns The total capacity of the buffer (maximum number of `number` values it can hold).
   */
  public capacity(): number {
    return this.buffer.length;
  }

  /**
   * Checks if the buffer is full.
   * @returns `true` if the current length has reached the buffer's capacity, `false` otherwise.
   */
  public isFull(): boolean {
    return this.length >= this.buffer.length;
  }

  /**
   * Resets the buffer by setting its current length to 0.
   * The existing data in the buffer is not cleared but will be overwritten
   * by subsequent additions.
   */
  public reset(): void {
    this.length = 0;
  }

  /**
   * Returns the underlying batch buffer.
   * Note: This returns a direct reference to the internal buffer.
   * Modifications to the returned array will affect the internal state.
   * The valid data in the buffer is up to the `currentLength()`.
   * @returns The `number` array used as the buffer.
   */
  public batch(): number[] {
    return this.buffer;
  }
}
