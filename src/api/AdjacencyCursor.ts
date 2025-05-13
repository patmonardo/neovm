/**
 * Cursor iterating over the target ids of one adjacency list.
 * A lot of the methods here are very low-level and break when looked at slightly askew.
 * Better iteration methods and defined access patterns will be added under the continuation of
 * Adjacency Compression III – Return of the Iterator
 */
export interface AdjacencyCursor {
  /**
   * Initialize this cursor to point to the given index.
   * The correct value for the index is highly implementation specific.
   * The better way get initialize a cursor is through AdjacencyList.adjacencyCursor(long) or related.
   *
   * @param index The starting index for this cursor
   * @param degree The number of target nodes
   */
  init(index: number, degree: number): void;

  /**
   * Return how many targets can be decoded in total. This is equivalent to the degree.
   *
   * @returns The total size/degree
   */
  size(): number;

  /**
   * Return true iff there is at least one more target to decode.
   *
   * @returns true if there are more elements
   */
  hasNextVLong(): boolean;

  /**
   * Read and decode the next target id.
   * It is undefined behavior if this is called after hasNextVLong() returns false.
   *
   * @returns The next target node ID
   */
  nextVLong(): number;

  /**
   * Decode and peek the next target id. Does not progress the internal cursor unlike nextVLong().
   * It is undefined behavior if this is called after hasNextVLong() returns false.
   *
   * @returns The next target node ID without advancing
   */
  peekVLong(): number;

  /**
   * Return how many targets are still left to be decoded.
   *
   * @returns The number of remaining elements
   */
  remaining(): number;

  /**
   * Read and decode target ids until it is strictly larger than (>) the provided nodeId.
   * If there are no such targets before this cursor is exhausted, -1 is returned.
   *
   * @param nodeId The node ID to skip until
   * @returns The first node ID larger than the given one, or NOT_FOUND
   */
  skipUntil(nodeId: number): number;

  /**
   * Read and decode target ids until it is larger than or equal (>=) the provided nodeId.
   * If there are no such targets before this cursor is exhausted, -1 is returned.
   *
   * @param nodeId The node ID to advance to
   * @returns The first node ID larger than or equal to the given one, or NOT_FOUND
   */
  advance(nodeId: number): number;

  /**
   * Advance this cursor by n elements.
   * For a cursor in its initial position, this is equivalent to nth.
   *
   * @param n the number of elements to advance by. Must be positive.
   * @returns the target after the advancement or NOT_FOUND if the cursor is exhausted.
   */
  advanceBy(n: number): number;
}

/**
 * Utilities and constants for AdjacencyCursor.
 */
export namespace AdjacencyCursor {
  /**
   * Special ID value that could be returned to indicate that no valid value can be produced
   */
  export const NOT_FOUND: number = -1;

  /**
   * Returns a cursor that is always empty.
   */
  export function empty(): AdjacencyCursor {
    return EmptyAdjacencyCursor.INSTANCE;
  }
}

/**
 * Singleton implementation of an empty adjacency cursor.
 */
export enum EmptyAdjacencyCursorEnum {
  INSTANCE
}

/**
 * Implementation of an empty adjacency cursor.
 */
class EmptyAdjacencyCursor implements AdjacencyCursor {
  public static readonly INSTANCE: AdjacencyCursor = new EmptyAdjacencyCursor();

  // Private constructor to prevent instantiation
  private constructor() {}

  public init(index: number, degree: number): void {
    // No-op for empty cursor
  }

  public size(): number {
    return 0;
  }

  public hasNextVLong(): boolean {
    return false;
  }

  public nextVLong(): number {
    return AdjacencyCursor.NOT_FOUND;
  }

  public peekVLong(): number {
    return AdjacencyCursor.NOT_FOUND;
  }

  public remaining(): number {
    return 0;
  }

  public skipUntil(nodeId: number): number {
    return AdjacencyCursor.NOT_FOUND;
  }

  public advance(nodeId: number): number {
    return AdjacencyCursor.NOT_FOUND;
  }

  public advanceBy(n: number): number {
    return AdjacencyCursor.NOT_FOUND;
  }
}
