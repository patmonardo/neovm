import { Graph } from "@/api";
import { RelationshipCursor } from "@/api/properties/relationships";
import { RelationshipIterator } from "@/api/properties/relationships";

type RelationshipCursorConsumer = (cursor: RelationshipCursor) => void;

export class AllRelationshipsSpliterator {
  private readonly relationshipIterator: RelationshipIterator;
  private readonly fallbackValue: number;
  private current: number;
  private limit: number;
  private cursorIterator: Iterator<RelationshipCursor>;

  constructor(graph: Graph, fallbackValue: number);
  constructor(
    relationshipIterator: RelationshipIterator,
    fromNode: number,
    toNodeExclusive: number,
    fallbackValue: number
  );
  constructor(
    graphOrIterator: Graph | RelationshipIterator,
    fromNodeOrFallback: number,
    toNodeExclusive?: number,
    fallbackValue?: number
  ) {
    if (typeof toNodeExclusive === "number" && typeof fallbackValue === "number") {
      // (RelationshipIterator, fromNode, toNodeExclusive, fallbackValue)
      this.relationshipIterator = (graphOrIterator as RelationshipIterator).concurrentCopy();
      this.current = fromNodeOrFallback;
      this.limit = toNodeExclusive;
      this.fallbackValue = fallbackValue;
    } else {
      // (Graph, fallbackValue)
      const graph = graphOrIterator as Graph;
      this.relationshipIterator = graph as unknown as RelationshipIterator;
      this.current = 0;
      this.limit = graph.nodeCount();
      this.fallbackValue = fromNodeOrFallback;
    }
    this.cursorIterator = this.relationshipIterator
      .streamRelationships(this.current, this.fallbackValue)[Symbol.iterator]();
  }

  tryAdvance(action: RelationshipCursorConsumer): boolean {
    let isAdvanced = this.advance(action);

    while (!isAdvanced && this.hasRemaining()) {
      this.current++;
      this.cursorIterator = this.relationshipIterator
        .streamRelationships(this.current, this.fallbackValue)[Symbol.iterator]();
      isAdvanced = this.advance(action);
    }

    return isAdvanced || this.hasRemaining();
  }

  private advance(action: RelationshipCursorConsumer): boolean {
    const next = this.cursorIterator.next();
    if (!next.done) {
      action(next.value);
      return true;
    }
    return false;
  }

  private hasRemaining(): boolean {
    return this.current < this.limit - 1;
  }

  trySplit(): AllRelationshipsSpliterator | null {
    const remaining = this.limit - this.current;
    if (remaining < 2) {
      return null;
    }
    const split = this.current + Math.floor(remaining / 2);
    const newLimit = this.limit;
    this.limit = split;
    return new AllRelationshipsSpliterator(
      this.relationshipIterator,
      split,
      newLimit,
      this.fallbackValue
    );
  }

  estimateSize(): number {
    return this.limit - this.current;
  }

  // For compatibility, you can define characteristics as constants if needed
  static readonly ORDERED = 0x10;
  static readonly DISTINCT = 0x01;
  static readonly SIZED = 0x40;

  characteristics(): number {
    return (
      AllRelationshipsSpliterator.ORDERED |
      AllRelationshipsSpliterator.DISTINCT |
      AllRelationshipsSpliterator.SIZED
    );
  }
}
