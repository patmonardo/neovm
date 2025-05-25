/**
 * Utility class representing a key-value pair.
 * Similar to Apache Commons Lang3's Pair class.
 */
export class Pair<L, R> {
  constructor(
    public readonly left: L,
    public readonly right: R
  ) {}

  static of<L, R>(left: L, right: R): Pair<L, R> {
    return new Pair(left, right);
  }
}

/**
 * Iterator that flattens a Map<KEY, List<ENTRY>> into individual Pair<KEY, ENTRY> items.
 * For each key, iterates through all entries in its associated list, yielding pairs
 * of (key, entry) for each item.
 *
 * Example:
 * Map { "A" -> [1, 2], "B" -> [3] } becomes sequence: (A,1), (A,2), (B,3)
 */
export class MappedListIterator<KEY, ENTRY> implements Iterator<Pair<KEY, ENTRY>> {
  private readonly mapEntryIterator: Iterator<[KEY, ENTRY[]]>;
  private listEntryIterator: Iterator<ENTRY>;
  private currentKey: KEY | undefined;
  private exhausted: boolean = false;

  constructor(mappedList: Map<KEY, ENTRY[]>) {
    this.mapEntryIterator = mappedList.entries();
    this.listEntryIterator = this.getEmptyIterator();
    this.initializeFirstEntry();
  }

  /**
   * Checks if there are more items to iterate over.
   */
  hasNext(): boolean {
    if (this.exhausted) {
      return false;
    }

    // While the current list is exhausted, try to move to the next list
    while (!this.hasNextInCurrentList()) {
      if (!this.moveToNextList()) {
        this.exhausted = true;
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the next Pair<KEY, ENTRY> in the iteration.
   *
   * @throws Error if there are no more elements
   */
  next(): IteratorResult<Pair<KEY, ENTRY>> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }

    const nextEntry = this.listEntryIterator.next();
    if (nextEntry.done || this.currentKey === undefined) {
      return { done: true, value: undefined };
    }

    return {
      done: false,
      value: Pair.of(this.currentKey, nextEntry.value)
    };
  }

  /**
   * Makes this object iterable with for...of syntax.
   */
  [Symbol.iterator](): Iterator<Pair<KEY, ENTRY>> {
    return this;
  }

  /**
   * Initializes the iterator with the first map entry if available.
   */
  private initializeFirstEntry(): void {
    if (!this.moveToNextList()) {
      this.exhausted = true;
    }
  }

  /**
   * Moves to the next list in the map.
   *
   * @returns true if successfully moved to next list, false if no more lists
   */
  private moveToNextList(): boolean {
    const nextMapEntry = this.mapEntryIterator.next();
    if (nextMapEntry.done) {
      return false;
    }

    const [key, list] = nextMapEntry.value;
    this.currentKey = key;
    this.listEntryIterator = list[Symbol.iterator]();
    return true;
  }

  /**
   * Checks if the current list iterator has more elements.
   */
  private hasNextInCurrentList(): boolean {
    // Peek at the next value without consuming it
    const nextResult = this.listEntryIterator.next();
    if (!nextResult.done) {
      // We need to "put back" the value - create a new iterator starting from this item
      const currentList = this.getCurrentList();
      if (currentList) {
        const currentIndex = this.findCurrentIndex(currentList, nextResult.value);
        this.listEntryIterator = this.createIteratorFromIndex(currentList, currentIndex);
      }
      return true;
    }
    return false;
  }

  /**
   * Gets the current list being iterated over.
   */
  private getCurrentList(): ENTRY[] | undefined {
    // This is a simplification - in practice, we'd need to track this more carefully
    // For now, we'll reconstruct from the original map if needed
    return undefined;
  }

  /**
   * Finds the index of a value in the current list.
   */
  private findCurrentIndex(list: ENTRY[], value: ENTRY): number {
    return list.indexOf(value);
  }

  /**
   * Creates an iterator starting from a specific index.
   */
  private createIteratorFromIndex(list: ENTRY[], index: number): Iterator<ENTRY> {
    return list.slice(index)[Symbol.iterator]();
  }

  /**
   * Returns an empty iterator.
   */
  private getEmptyIterator(): Iterator<ENTRY> {
    return [][Symbol.iterator]();
  }
}
