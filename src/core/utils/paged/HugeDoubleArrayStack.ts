/**
 * High-performance stack for graph algorithm processing.
 *
 * Essential data structure for:
 * - Depth-First Search (DFS) traversal in massive graphs
 * - Backtracking algorithms (finding cycles, paths)
 * - Recursive algorithm simulation without call stack overflow
 * - Undo/redo operations in graph modifications
 * - Topological sorting and strongly connected components
 *
 * Performance characteristics:
 * - O(1) push/pop operations
 * - Backed by HugeDoubleArray for billion-element capacity
 * - Memory-efficient: Pre-allocated, no dynamic resizing
 * - Cache-friendly: Sequential memory access pattern
 *
 * Data Science Applications:
 * - PageRank convergence tracking (store iteration deltas)
 * - Community detection backtracking (modularity optimization)
 * - Graph neural network layer computations
 * - Feature propagation in knowledge graphs
 *
 * @module HugeDoubleArrayStack
 */

import { HugeDoubleArray } from '@/collections';

export class HugeDoubleArrayStack {
  private readonly array: HugeDoubleArray;
  private readonly capacity: number;
  private _size: number = 0;

  /**
   * Creates a new stack with specified capacity.
   *
   * @param capacity Maximum number of elements (up to billions)
   * @returns New stack instance backed by optimized HugeDoubleArray
   *
   * @example
   * ```typescript
   * // Stack for DFS on million-node graph
   * const dfsStack = HugeDoubleArrayStack.newStack(1_000_000);
   *
   * // Push initial nodes
   * graph.getRootNodes().forEach(node => dfsStack.push(node.id));
   *
   * // DFS traversal
   * while (!dfsStack.isEmpty()) {
   *   const currentNode = dfsStack.pop();
   *   graph.getNeighbors(currentNode).forEach(neighbor => {
   *     if (!visited.has(neighbor)) {
   *       dfsStack.push(neighbor);
   *     }
   *   });
   * }
   * ```
   */
  public static newStack(capacity: number): HugeDoubleArrayStack {
    return new HugeDoubleArrayStack(HugeDoubleArray.newArray(capacity));
  }

  /**
   * Private constructor - use newStack() factory method.
   * Automatically determines optimal storage strategy (single vs paged).
   */
  private constructor(array: HugeDoubleArray) {
    this.capacity = array.size();
    this.array = array;
  }

  /**
   * Pushes a value onto the stack.
   *
   * @param value Number to push (node ID, weight, score, etc.)
   * @throws Error if stack is at capacity
   *
   * Data Science Use Cases:
   * - Push node IDs during graph traversal
   * - Push intermediate computation results
   * - Push backtracking points in optimization
   * - Push layer activations in graph neural networks
   */
  public push(value: number): void {
    if (this._size === this.capacity) {
      throw new Error(`Stack overflow: capacity ${this.capacity} exceeded`);
    }
    this.array.set(this._size++, value);
  }

  /**
   * Pops and returns the top value from the stack.
   *
   * @returns The most recently pushed value
   * @throws Error if stack is empty
   *
   * Performance: O(1) - just decrements size counter, no data movement
   */
  public pop(): number {
    if (this.isEmpty()) {
      throw new Error('Stack underflow: cannot pop from empty stack');
    }
    return this.array.get(--this._size);
  }

  /**
   * Returns the top value without removing it.
   * Useful for examining next item to process without commitment.
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error('Cannot peek empty stack');
    }
    return this.array.get(this._size - 1);
  }

  /**
   * Returns current number of elements in stack.
   * Fast O(1) operation - just returns counter.
   */
  public size(): number {
    return this._size;
  }

  /**
   * Checks if stack is empty.
   * Essential for loop termination in graph algorithms.
   */
  public isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Checks if stack is at capacity.
   * Useful for preventing overflow in bounded algorithms.
   */
  public isFull(): boolean {
    return this._size === this.capacity;
  }

  /**
   * Returns remaining capacity.
   * Helpful for memory management and progress estimation.
   */
  public remainingCapacity(): number {
    return this.capacity - this._size;
  }

  /**
   * Clears the stack without deallocating underlying storage.
   * Fast O(1) operation - just resets size counter.
   *
   * Perfect for reusing the same stack across multiple algorithm runs.
   */
  public clear(): void {
    this._size = 0;
  }

  /**
   * Creates an iterator for stack contents (bottom to top).
   * Does not modify the stack - safe for inspection during debugging.
   *
   * Note: Iteration order is bottom-to-top (insertion order)
   */
  public *[Symbol.iterator](): Iterator<number> {
    for (let i = 0; i < this._size; i++) {
      yield this.array.get(i);
    }
  }

  /**
   * Returns array representation of stack contents (bottom to top).
   * Useful for debugging and testing.
   * Creates new array - does not expose internal storage.
   */
  public toArray(): number[] {
    const result = new Array<number>(this._size);
    for (let i = 0; i < this._size; i++) {
      result[i] = this.array.get(i);
    }
    return result;
  }

  /**
   * Batch operations for high-performance scenarios.
   */
  public pushAll(values: number[]): void {
    if (this._size + values.length > this.capacity) {
      throw new Error(`Batch push would exceed capacity: ${this._size + values.length} > ${this.capacity}`);
    }

    for (const value of values) {
      this.array.set(this._size++, value);
    }
  }

  /**
   * Pops multiple values efficiently.
   * Returns array in pop order (most recent first).
   */
  public popAll(count: number): number[] {
    if (count > this._size) {
      throw new Error(`Cannot pop ${count} elements: only ${this._size} available`);
    }

    const result = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.array.get(--this._size);
    }
    return result;
  }
}
