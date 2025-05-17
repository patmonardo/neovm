import { AdjacencyCursor } from "@/api/AdjacencyCursor";
import { FilteredIdMap } from "@/api/FilteredIdMap";

/**
 * Filters an AdjacencyCursor so that only nodes present in the FilteredIdMap are returned.
 */
export class NodeFilteredAdjacencyCursor implements AdjacencyCursor {
  private readonly innerCursor: AdjacencyCursor;
  private readonly idMap: FilteredIdMap;
  private nextLongValue: number = -1;

  constructor(innerCursor: AdjacencyCursor, idMap: FilteredIdMap) {
    this.innerCursor = innerCursor;
    this.idMap = idMap;
  }

  init(index: number, degree: number): void {
    this.innerCursor.init(index, degree);
  }

  size(): number {
    throw new Error(
      `AdjacencyCursor#size is not implemented for ${this.constructor.name}`
    );
  }

  hasNextVLong(): boolean {
    while (this.innerCursor.hasNextVLong()) {
      const innerNextLong = this.innerCursor.peekVLong();
      if (!this.idMap.containsRootNodeId(innerNextLong)) {
        this.innerCursor.nextVLong();
        continue;
      }
      this.nextLongValue = this.idMap.toFilteredNodeId(innerNextLong);
      return true;
    }
    return false;
  }

  nextVLong(): number {
    if (this.innerCursor.hasNextVLong()) {
      this.innerCursor.nextVLong();
    }
    return this.nextLongValue;
  }

  peekVLong(): number {
    return this.nextLongValue;
  }

  remaining(): number {
    throw new Error(
      `AdjacencyCursor#remaining is not implemented for ${this.constructor.name}`
    );
  }

  skipUntil(nodeId: number): number {
    while (this.nextLongValue <= nodeId) {
      if (this.hasNextVLong()) {
        this.nextVLong();
      } else {
        return AdjacencyCursor.NOT_FOUND;
      }
    }
    return this.nextLongValue;
  }

  advance(nodeId: number): number {
    while (this.nextLongValue < nodeId) {
      if (this.hasNextVLong()) {
        this.nextVLong();
      } else {
        return AdjacencyCursor.NOT_FOUND;
      }
    }
    return this.nextLongValue;
  }

  advanceBy(n: number): number {
    if (n < 0) throw new Error("n must be >= 0");
    while (this.hasNextVLong()) {
      this.nextVLong();
      if (n-- === 0) {
        return this.nextLongValue;
      }
    }
    return AdjacencyCursor.NOT_FOUND;
  }
}
