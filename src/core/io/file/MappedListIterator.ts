/**
 * Utility class representing a key-value pair.
 */
export class Pair<L, R> {
  constructor(
    public readonly left: L,
    public readonly right: R
  ) {}

  // Add getter aliases for compatibility
  get key(): L { return this.left; }
  get value(): R { return this.right; }

  static of<L, R>(left: L, right: R): Pair<L, R> {
    return new Pair(left, right);
  }
}

/**
 * FIXED: Simple, working iterator that flattens Map<KEY, ENTRY[]>
 */
export class MappedListIterator<KEY, ENTRY> implements Iterator<Pair<KEY, ENTRY>> {
  private readonly flattenedEntries: Pair<KEY, ENTRY>[];
  private currentIndex: number = 0;

  constructor(mappedList: Map<KEY, ENTRY[]>) {
    // ✅ SIMPLE: Just flatten everything up front
    this.flattenedEntries = [];

    for (const [key, entries] of mappedList.entries()) {
      for (const entry of entries) {
        this.flattenedEntries.push(Pair.of(key, entry));
      }
    }

    console.log(`🔧 MappedListIterator: Flattened ${this.flattenedEntries.length} entries`);
  }

  hasNext(): boolean {
    return this.currentIndex < this.flattenedEntries.length;
  }

  next(): IteratorResult<Pair<KEY, ENTRY>> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }

    const value = this.flattenedEntries[this.currentIndex];
    this.currentIndex++;

    return {
      done: false,
      value: value
    };
  }

  [Symbol.iterator](): Iterator<Pair<KEY, ENTRY>> {
    return this;
  }
}
