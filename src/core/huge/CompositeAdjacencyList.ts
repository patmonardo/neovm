import { AdjacencyCursor } from "@/api";
import { AdjacencyList } from "@/api";
import { FilteredIdMap } from "@/api";
import { MemoryInfo } from "@/core/compression/MemoryInfo";
import { CompositeAdjacencyCursor } from "./CompositeAdjacencyCursor";
import { NodeFilteredAdjacencyCursor } from "./NodeFilteredAdjacencyCursor";
import { ImmutableHistogram } from "../compression/common/ImmutableHistogram";
import { Optional } from "@/utils/Optional";

/**
 * CompositeAdjacencyList merges multiple AdjacencyLists into one.
 */
export class CompositeAdjacencyList implements AdjacencyList {
  private readonly adjacencyLists: AdjacencyList[];
  private readonly compositeAdjacencyCursorFactory: (
    cursors: AdjacencyCursor[]
  ) => CompositeAdjacencyCursor;
  private readonly adjacencyCursorWrapperFactory: (
    cursor: AdjacencyCursor
  ) => AdjacencyCursor;

  static of(adjacencyLists: AdjacencyList[]): CompositeAdjacencyList {
    return new CompositeAdjacencyList(
      adjacencyLists,
      (cursors) => new CompositeAdjacencyCursor(cursors),
      (cursor) => cursor // Identity wrapper
    );
  }

  static withFilteredIdMap(
    adjacencyLists: AdjacencyList[],
    filteredIdMap: FilteredIdMap
  ): CompositeAdjacencyList {
    const adjacencyCursorWrapperFactory = (cursor: AdjacencyCursor) =>
      new NodeFilteredAdjacencyCursor(cursor, filteredIdMap);

    const compositeAdjacencyCursorFactory = (cursors: AdjacencyCursor[]) =>
      new CompositeAdjacencyCursor(cursors.map(adjacencyCursorWrapperFactory));

    return new CompositeAdjacencyList(
      adjacencyLists,
      compositeAdjacencyCursorFactory,
      adjacencyCursorWrapperFactory
    );
  }

  private constructor(
    adjacencyLists: AdjacencyList[],
    compositeAdjacencyCursorFactory: (
      cursors: AdjacencyCursor[]
    ) => CompositeAdjacencyCursor,
    adjacencyCursorWrapperFactory: (cursor: AdjacencyCursor) => AdjacencyCursor
  ) {
    this.adjacencyLists = adjacencyLists;
    this.compositeAdjacencyCursorFactory = compositeAdjacencyCursorFactory;
    this.adjacencyCursorWrapperFactory = adjacencyCursorWrapperFactory;
  }

  size(): number {
    return this.adjacencyLists.length;
  }

  degree(node: number): number {
    return this.adjacencyLists.reduce((sum, adj) => sum + adj.degree(node), 0);
  }

  // Overloads
  adjacencyCursor(node: number): CompositeAdjacencyCursor;
  adjacencyCursor(
    node: number,
    fallbackValue: number
  ): CompositeAdjacencyCursor;
  adjacencyCursor(
    reuse: AdjacencyCursor | null,
    node: number
  ): CompositeAdjacencyCursor;
  adjacencyCursor(
    reuse: AdjacencyCursor | null,
    node: number,
    fallbackValue: number
  ): CompositeAdjacencyCursor;

  // Implementation
  adjacencyCursor(
    arg1: number | AdjacencyCursor | null,
    arg2?: number,
    arg3?: number
  ): CompositeAdjacencyCursor {
    // adjacencyCursor(node: number)
    if (typeof arg1 === "number" && typeof arg2 === "undefined") {
      return this.adjacencyCursor(arg1, Number.NaN);
    }
    // adjacencyCursor(node: number, fallbackValue: number)
    if (typeof arg1 === "number" && typeof arg2 === "number") {
      const node = arg1;
      const fallbackValue = arg2;
      const cursors = this.adjacencyLists.map((adj) =>
        adj.adjacencyCursor(node, fallbackValue)
      );
      return this.compositeAdjacencyCursorFactory(cursors);
    }
    // adjacencyCursor(reuse: AdjacencyCursor | null, node: number)
    if (
      (arg1 === null || typeof arg1 === "object") &&
      typeof arg2 === "number" &&
      typeof arg3 === "undefined"
    ) {
      return this.adjacencyCursor(arg1, arg2, Number.NaN);
    }
    // adjacencyCursor(reuse: AdjacencyCursor | null, node: number, fallbackValue: number)
    if (
      (arg1 === null || typeof arg1 === "object") &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      const reuse = arg1 as AdjacencyCursor | null;
      const node = arg2;
      const fallbackValue = arg3;
      if (reuse instanceof CompositeAdjacencyCursor) {
        const compositeReuse = reuse as CompositeAdjacencyCursor;
        compositeReuse.cursorsList().forEach((cursor, index) => {
          const newCursor = this.adjacencyLists[index].adjacencyCursor(
            cursor,
            node,
            fallbackValue
          );
          if (newCursor !== cursor) {
            compositeReuse.cursorsList()[index] =
              this.adjacencyCursorWrapperFactory(newCursor);
          }
        });
        compositeReuse.reinitializeCursors();
        return compositeReuse;
      }
      return this.adjacencyCursor(node, fallbackValue);
    }
    throw new Error("Invalid arguments for adjacencyCursor");
  }

  rawAdjacencyCursor(): CompositeAdjacencyCursor {
    const cursors = this.adjacencyLists.map((adj) => adj.rawAdjacencyCursor());
    return this.compositeAdjacencyCursorFactory(cursors);
  }

  memoryInfo(): MemoryInfo {
    const infos = this.adjacencyLists.map((adj) => adj.memoryInfo());
    const pages = infos.reduce((sum, info) => sum + info.pages(), 0);
    const bytesOnHeap = infos.reduce(
      (sum, info) => sum + info.bytesOnHeap().orElse(0),
      0
    );
    const bytesOffHeap = infos.reduce(
      (sum, info) => sum + info.bytesOffHeap().orElse(0),
      0
    );
    return MemoryInfo.of({
      pages: pages,
      bytesOnHeap: Optional.of(bytesOnHeap),
      bytesOffHeap: Optional.of(bytesOffHeap),
      heapAllocations: ImmutableHistogram.EMPTY,
      nativeAllocations: ImmutableHistogram.EMPTY,
      pageSizes: ImmutableHistogram.EMPTY,
      headerBits: ImmutableHistogram.EMPTY,
      headerAllocations: ImmutableHistogram.EMPTY,
      //
    });
  }
}
