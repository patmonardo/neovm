/**
 * High-performance stack for massive graph algorithm processing.
 *
 * Essential for:
 * - Depth-First Search (DFS) on billion-node graphs
 * - Backtracking algorithms (cycle detection, path finding)
 * - Recursive algorithm simulation without call stack overflow
 * - Topological sorting and strongly connected components
 * - Undo/redo operations in graph modifications
 *
 * Performance characteristics:
 * - O(1) push/pop operations
 * - Backed by HugeLongArray for massive capacity (billions of elements)
 * - Memory-efficient: Pre-allocated, no dynamic resizing
 * - Cache-friendly: Sequential memory access pattern
 *
 * Data Science Applications:
 * - DFS for graph connectivity analysis
 * - Backtracking in constraint satisfaction (graph coloring)
 * - Call stack simulation for recursive graph algorithms
 * - State management in graph optimization algorithms
 * - Path reconstruction in shortest path algorithms
 *
 * @module HugeLongArrayStack
 */

import { HugeLongArray } from '@/collections';

export class HugeLongArrayStack {
  private readonly array: HugeLongArray;
  private readonly capacity: number;
  private _size: number = 0;

  /**
   * Creates a new stack with specified capacity.
   *
   * @param capacity Maximum number of elements (up to billions)
   * @returns New stack instance backed by optimized HugeLongArray
   *
   * @example
   * ```typescript
   * // Stack for DFS on massive social network
   * const dfsStack = HugeLongArrayStack.newStack(1_000_000_000);
   *
   * // Push starting nodes
   * graph.getRootNodes().forEach(nodeId => dfsStack.push(nodeId));
   *
   * // DFS traversal
   * while (!dfsStack.isEmpty()) {
   *   const currentNode = dfsStack.pop();
   *
   *   if (!visited.has(currentNode)) {
   *     visited.add(currentNode);
   *
   *     // Push neighbors for exploration
   *     graph.getNeighbors(currentNode).forEach(neighbor => {
   *       if (!visited.has(neighbor)) {
   *         dfsStack.push(neighbor);
   *       }
   *     });
   *   }
   * }
   * ```
   */
  public static newStack(capacity: number): HugeLongArrayStack {
    return new HugeLongArrayStack(HugeLongArray.newArray(capacity));
  }

  /**
   * Memory estimation for capacity planning.
   * Essential for resource allocation in large-scale graph processing.
   */
  public static memoryEstimation(capacity: number): number {
    return HugeLongArray.memoryEstimation(capacity) + 48; // ~48 bytes for stack overhead
  }

  /**
   * Private constructor - use newStack() factory method.
   * Automatically determines optimal storage strategy (single vs paged).
   */
  private constructor(array: HugeLongArray) {
    this.capacity = array.size();
    this.array = array;
    this._size = 0;
  }

  /**
   * Pushes a value onto the stack.
   *
   * @param value Number to push (typically node ID, edge ID, state value)
   * @throws Error if stack is at capacity
   *
   * Data Science Use Cases:
   * - Push node IDs during DFS traversal
   * - Push algorithm states for backtracking
   * - Push intermediate computation results
   * - Push path segments for reconstruction
   */
  public push(value: number): void {
    if (this._size === this.capacity) {
      throw new Error('Stack is full');
    }
    this.array.set(this._size++, value);
  }

  /**
   * Pops and returns the top value from the stack.
   *
   * @returns The most recently pushed value (LIFO order)
   * @throws Error if stack is empty
   *
   * Performance: O(1) - just decrements size counter, no data movement
   */
  public pop(): number {
    if (this.isEmpty()) {
      throw new Error('Stack is empty');
    }
    return this.array.get(--this._size);
  }

  /**
   * Returns the top value without removing it.
   * Useful for examining the next item to process without commitment.
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error('Stack is empty');
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

  /**
   * Advanced: Peek at multiple top elements without popping.
   * Useful for lookahead in algorithms.
   */
  public peekMultiple(count: number): number[] {
    if (count > this._size) {
      throw new Error(`Cannot peek ${count} elements: only ${this._size} available`);
    }

    const result = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.array.get(this._size - 1 - i);
    }
    return result;
  }

  /**
   * Drains all elements from the stack.
   * Returns array of all elements in pop order (LIFO), stack becomes empty.
   */
  public drain(): number[] {
    const result = new Array<number>(this._size);
    for (let i = 0; i < result.length; i++) {
      result[i] = this.array.get(--this._size);
    }
    return result;
  }
}
