/**
 * Cursor iterating over the values of relationship properties.
 * A lot of the methods here are very low-level and break when looked at slightly askew.
 * Better iteration methods and defined access patterns will be added under the continuation of
 * Adjacency Compression III – Return of the Iterator
 */
export interface PropertyCursor {
  /**
   * Initialize this cursor to point to the given `index`.
   * The correct value for the index is highly implementation specific.
   * The better way to initialize a cursor is through `AdjacencyProperties.propertyCursor(nodeId)` or related.
   *
   * @param index The starting index
   * @param degree The expected number of properties
   */
  init(index: number, degree: number): void;

  /**
   * Return true iff there is at least one more target to decode.
   *
   * @returns True if there are more properties to read
   */
  hasNextLong(): boolean;

  /**
   * Read the next target id.
   *
   * It is undefined behavior if this is called after `hasNextLong()` returns `false`.
   *
   * @returns The next property value as a number
   */
  nextLong(): number;

  /**
   * Closes this cursor and releases any resources associated with it.
   */
  close(): void;
}

/**
 * Implementation of an empty property cursor that never returns values.
 */
class EmptyPropertyCursor implements PropertyCursor {
  /**
   * Singleton instance of the empty cursor
   */
  private static readonly _INSTANCE: PropertyCursor = new EmptyPropertyCursor();

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}

  /**
   * Returns the singleton instance
   */
  public static get INSTANCE(): PropertyCursor {
    return this._INSTANCE;
  }

  init(_index: number, _degree: number): void {
    // No-op
  }

  hasNextLong(): boolean {
    return false;
  }

  nextLong(): number {
    throw new Error("Cannot get next value from empty cursor");
  }

  close(): void {
    // No-op
  }
}

/**
 * Factory functions and constants related to PropertyCursor.
 */
export namespace PropertyCursor {
  /**
   * Returns a cursor that is always empty.
   *
   * @returns An empty property cursor
   */
  export function empty(): PropertyCursor {
    return EmptyPropertyCursor.INSTANCE;
  }
}
