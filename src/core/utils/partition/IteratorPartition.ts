/**
 * A partition that's defined by an iterator over node IDs.
 */
export class IteratorPartition {
  private readonly iterator: Iterator<number>;
  private readonly _length: number;

  /**
   * Creates a new iterator partition.
   * 
   * @param iterator Iterator over node IDs
   * @param length Number of nodes in the partition
   */
  constructor(iterator: Iterator<number>, length: number) {
    this.iterator = iterator;
    this._length = length;
  }

  /**
   * Returns the number of nodes in this partition.
   * 
   * @returns Node count
   */
  public length(): number {
    return this._length;
  }

  /**
   * Applies the given consumer function to each node ID in the partition.
   * 
   * @param consumer Function that accepts a node ID
   */
  public consume(consumer: (nodeId: number) => void): void {
    for (let i = 0; i < this._length; i++) {
      const next = this.iterator.next();
      if (next.done) {
        throw new Error("Iterator exhausted before length was reached");
      }
      consumer(next.value);
    }
  }

  /**
   * Returns a string representation of this partition.
   */
  public toString(): string {
    return `IteratorPartition{length=${this._length}}`;
  }

  /**
   * Materializes the partition into an array.
   * For testing purposes only.
   * 
   * @returns Array of node IDs
   */
  public materialize(): number[] {
    const values: number[] = [];
    this.consume(value => values.push(value));
    return values;
  }
}