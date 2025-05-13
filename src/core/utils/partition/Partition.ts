/**
 * Represents a partition of nodes in a graph.
 */
export class Partition {
  private readonly startNode: number;
  private readonly nodeCount: number;

  /**
   * Maximum number of nodes in a partition.
   */
  public static readonly MAX_NODE_COUNT = (Number.MAX_SAFE_INTEGER - 32) >> 1;

  /**
   * Creates a new partition.
   * 
   * @param startNode The first node ID in this partition
   * @param nodeCount The number of nodes in this partition
   */
  constructor(startNode: number, nodeCount: number) {
    this.startNode = startNode;
    this.nodeCount = nodeCount;
  }

  /**
   * Returns the start node ID of this partition.
   */
  public startNode(): number {
    return this.startNode;
  }

  /**
   * Returns the number of nodes in this partition.
   */
  public nodeCount(): number {
    return this.nodeCount;
  }

  /**
   * Applies the given consumer function to each node ID in the partition.
   * 
   * @param consumer Function that accepts a node ID
   */
  public consume(consumer: (id: number) => void): void {
    const startNode = this.startNode();
    const endNode = startNode + this.nodeCount();
    
    for (let id = startNode; id < endNode; id++) {
      consumer(id);
    }
  }

  /**
   * Creates a new partition with the specified start node and count.
   * 
   * @param startNode The first node ID in the partition
   * @param nodeCount The number of nodes in the partition
   * @returns A new partition
   */
  public static of(startNode: number, nodeCount: number): Partition {
    return new Partition(startNode, nodeCount);
  }

  /**
   * Returns an iterator that yields each node ID in the partition.
   * 
   * @returns An iterator of node IDs
   */
  public *[Symbol.iterator](): Iterator<number> {
    const start = this.startNode();
    const end = start + this.nodeCount();
    
    for (let i = start; i < end; i++) {
      yield i;
    }
  }

  /**
   * Returns an array of node IDs in this partition.
   * Note: This can use a lot of memory for large partitions.
   * 
   * @returns Array of node IDs
   */
  public toArray(): number[] {
    return Array.from(this);
  }

  /**
   * Checks if this partition equals another object.
   * 
   * @param other The object to compare with
   * @returns true if the objects are equal
   */
  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof Partition)) return false;
    if (this.constructor !== other.constructor) return false;
    
    return this.startNode === other.startNode && 
           this.nodeCount === other.nodeCount;
  }

  /**
   * Returns a string representation of this partition.
   * 
   * @returns String representation
   */
  public toString(): string {
    return `Partition{start:${this.startNode}, length:${this.nodeCount}}`;
  }

  /**
   * Returns a hash code for this partition.
   * 
   * @returns Hash code
   */
  public hashCode(): number {
    let result = 17;
    result = 31 * result + this.startNode;
    result = 31 * result + this.nodeCount;
    return result;
  }
}