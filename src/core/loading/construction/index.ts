export * from "./GraphFactory";
export * from "./LocalNodesBuilder";
export * from "./LocalNodesBuilderProvider";
export * from "./LocalRelationshipsBuilder";
export * from "./LocalRelationshipsBuilderProvider";
export * from "./NodeLabelTokens";
export * from "./NodeLabelTokenToPropertyKeys";
export * from "./NodeLabelToken";
export * from "./NodesBuilder";
export * from "./NodesBuilderContext";
export * from "./TokenToNodeLabels";
export * from "./PropertyValues";
export * from "./RelationshipsBuilder";
export * from "./SingleTypeRelationshipsBuilder";

/**
 * Thread-safe atomic long adder for counting across threads.
 * Simple implementation for tracking imported node counts.
 */
export class LongAdder {
  private value = 0;

  /** Add a value to the counter */
  add(delta: number): void {
    this.value += delta;
  }

  /** Get the current sum */
  sum(): number {
    return this.value;
  }

  /** Reset counter to zero */
  reset(): void {
    this.value = 0;
  }
}

/**
 * Predicate type for checking if a node ID has been seen.
 * Used for deduplication during node import.
 */
export type LongPredicate = (value: number) => boolean;

/**
 * AutoCloseable interface for resource management.
 * Ensures proper cleanup of resources.
 */
export interface AutoCloseable {
  close(): void;
}
