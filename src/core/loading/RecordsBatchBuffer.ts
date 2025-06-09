/**
 * Abstract base class for buffering records in batches during graph loading.
 * Faithful translation of Neo4j GDS RecordsBatchBuffer.
 */
export abstract class RecordsBatchBuffer {
  public static readonly DEFAULT_BUFFER_SIZE = 100_000;

  protected readonly buffer: number[];
  protected length: number = 0;

  protected constructor(capacity: number) {
    this.buffer = new Array(capacity);
  }

  public getLength(): number {
    return this.length;
  }

  public capacity(): number {
    return this.buffer.length;
  }

  public isFull(): boolean {
    return this.length >= this.buffer.length;
  }

  public reset(): void {
    this.length = 0;
  }

  public batch(): number[] {
    return this.buffer;
  }
}
