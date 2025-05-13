import { Partition } from './Partition';

/**
 * A partition that also tracks the number of relationships (degrees) within it.
 */
export class DegreePartition extends Partition {
  private readonly _relationshipCount: number;

  /**
   * Creates a new degree partition.
   * 
   * @param startNode The first node ID in this partition
   * @param nodeCount The number of nodes in this partition
   * @param relationshipCount The total number of relationships in this partition
   */
  constructor(startNode: number, nodeCount: number, relationshipCount: number) {
    super(startNode, nodeCount);
    this._relationshipCount = relationshipCount;
  }

  /**
   * Returns the number of relationships in this partition.
   */
  public relationshipCount(): number {
    return this._relationshipCount;
  }

  /**
   * Creates a new degree partition.
   * 
   * @param startNode The first node ID in this partition
   * @param nodeCount The number of nodes in this partition
   * @param totalDegree The total degree (relationship count) in this partition
   * @returns A new degree partition
   */
  public static of(startNode: number, nodeCount: number, totalDegree: number): DegreePartition {
    return new DegreePartition(startNode, nodeCount, totalDegree);
  }

  /**
   * Checks if this partition equals another object.
   */
  public override equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof DegreePartition)) return false;
    if (!super.equals(other)) return false;
    
    return this._relationshipCount === other._relationshipCount;
  }

  /**
   * Returns a hash code for this partition.
   */
  public override hashCode(): number {
    return super.hashCode() * 31 + this._relationshipCount;
  }

  /**
   * Returns a string representation of this partition.
   */
  public override toString(): string {
    return `DegreePartition{start:${this.startNode()}, length:${this.nodeCount()}, relationshipCount=${this._relationshipCount}}`;
  }
}