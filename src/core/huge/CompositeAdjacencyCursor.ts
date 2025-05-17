import { AdjacencyCursor } from "@/api/AdjacencyCursor";

/**
 * CompositeAdjacencyCursor merges multiple AdjacencyCursors into one,
 * yielding the next smallest target node ID from all cursors.
 */
export class CompositeAdjacencyCursor implements AdjacencyCursor {
  private readonly cursors: AdjacencyCursor[];
  private cursorQueue: AdjacencyCursor[];

  constructor(cursors: AdjacencyCursor[]) {
    this.cursors = cursors;
    this.cursorQueue = [];
    this.initializeQueue();
  }

  private initializeQueue() {
    this.cursorQueue = [];
    for (const cursor of this.cursors) {
      if (cursor && cursor.hasNextVLong()) {
        this.cursorQueue.push(cursor);
      }
    }
    this.sortQueue();
  }

  private sortQueue() {
    this.cursorQueue.sort((a, b) => a.peekVLong() - b.peekVLong());
  }

  public cursorsList(): AdjacencyCursor[] {
    return this.cursors;
  }

  public reinitializeCursors(): void {
    this.initializeQueue();
  }

  size(): number {
    return this.cursors.reduce((sum, cursor) => sum + cursor.size(), 0);
  }

  hasNextVLong(): boolean {
    return this.cursorQueue.length > 0;
  }

  nextVLong(): number {
    if (!this.hasNextVLong()) {
      throw new Error("No more elements");
    }
    const current = this.cursorQueue.shift()!;
    const targetNodeId = current.nextVLong();
    if (current.hasNextVLong()) {
      this.cursorQueue.push(current);
      this.sortQueue();
    }
    return targetNodeId;
  }

  peekVLong(): number {
    if (!this.hasNextVLong()) {
      throw new Error("No more elements");
    }
    return this.cursorQueue[0].peekVLong();
  }

  remaining(): number {
    return this.cursors.reduce((sum, cursor) => sum + cursor.remaining(), 0);
  }

  skipUntil(target: number): number {
    for (const cursor of this.cursors) {
      this.cursorQueue = this.cursorQueue.filter(c => c !== cursor);
      while (cursor.hasNextVLong() && cursor.peekVLong() <= target) {
        cursor.nextVLong();
      }
      if (cursor.hasNextVLong()) {
        this.cursorQueue.push(cursor);
      }
    }
    this.sortQueue();
    return this.cursorQueue.length === 0 ? AdjacencyCursor.NOT_FOUND : this.nextVLong();
  }

  advance(target: number): number {
    for (const cursor of this.cursors) {
      this.cursorQueue = this.cursorQueue.filter(c => c !== cursor);
      while (cursor.hasNextVLong() && cursor.peekVLong() < target) {
        cursor.nextVLong();
      }
      if (cursor.hasNextVLong()) {
        this.cursorQueue.push(cursor);
      }
    }
    this.sortQueue();
    return this.cursorQueue.length === 0 ? AdjacencyCursor.NOT_FOUND : this.nextVLong();
  }

  advanceBy(n: number): number {
    if (n < 0) throw new Error("n must be >= 0");
    while (this.hasNextVLong()) {
      const target = this.nextVLong();
      if (n-- === 0) {
        return target;
      }
    }
    return AdjacencyCursor.NOT_FOUND;
  }

  init(_index: number, _degree: number): void {
    throw new Error(
      "CompositeAdjacencyCursor does not support init, use CompositeAdjacencyList.decompressingCursor instead."
    );
  }
}
