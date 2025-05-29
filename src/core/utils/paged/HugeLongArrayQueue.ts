/**
 * High-performance circular queue for graph algorithm processing.
 *
 * Essential for:
 * - Breadth-First Search (BFS) on billion-node graphs
 * - Level-order traversal in massive trees
 * - Producer-consumer patterns in parallel graph processing
 * - Stream processing with bounded memory
 * - Message passing between graph algorithm workers
 *
 * Performance characteristics:
 * - O(1) enqueue/dequeue operations
 * - Circular buffer design: memory-efficient wraparound
 * - Backed by HugeLongArray for massive capacity
 * - No dynamic allocation during operation
 *
 * Data Science Applications:
 * - BFS for shortest path algorithms (Dijkstra, A*)
 * - Layer-by-layer processing in graph neural networks
 * - Streaming graph updates with bounded buffers
 * - Work distribution in parallel PageRank computation
 * - Event queues for temporal graph analysis
 *
 * @module HugeLongArrayQueue
 */

import { HugeLongArray } from '@/collections';

export class HugeLongArrayQueue {
  private readonly array: HugeLongArray;
  private readonly capacity: number;
  private head: number = 0;
  private tail: number = 0;

  /**
   * Creates a new queue with specified capacity.
   *
   * Note: Actual storage is capacity + 1 to distinguish full vs empty.
   * This is a classic circular buffer optimization.
   *
   * @param capacity Maximum number of elements that can be queued
   * @returns New queue instance backed by optimized HugeLongArray
   *
   * @example
   * ```typescript
   * // Queue for BFS on million-node social network
   * const bfsQueue = HugeLongArrayQueue.newQueue(1_000_000);
   *
   * // Start BFS from multiple seed nodes
   * seedNodes.forEach(node => bfsQueue.add(node));
   *
   * // BFS traversal
   * while (!bfsQueue.isEmpty()) {
   *   const currentNode = bfsQueue.remove();
   *   const neighbors = graph.getNeighbors(currentNode);
   *
   *   neighbors.forEach(neighbor => {
   *     if (!visited.has(neighbor)) {
   *       bfsQueue.add(neighbor);
   *       visited.add(neighbor);
   *     }
   *   });
   * }
   * ```
   */
  public static newQueue(capacity: number): HugeLongArrayQueue {
    // +1 for circular buffer: distinguish between full and empty
    return new HugeLongArrayQueue(HugeLongArray.newArray(capacity + 1));
  }

  /**
   * Memory estimation for capacity planning.
   * Helps with resource allocation in large-scale graph processing.
   */
  public static memoryEstimation(capacity: number): number {
    // Estimate: HugeLongArray storage + queue instance overhead
    return HugeLongArray.memoryEstimation(capacity + 1) + 64; // ~64 bytes for queue overhead
  }

  /**
   * Private constructor - use newQueue() factory method.
   * Automatically determines optimal storage strategy (single vs paged).
   */
  private constructor(array: HugeLongArray) {
    this.head = 0;
    this.tail = 0;
    this.capacity = array.size();
    this.array = array;
  }

  /**
   * Adds an element to the rear of the queue.
   *
   * @param value Number to enqueue (typically node ID, edge ID, etc.)
   * @throws Error if queue is at capacity
   *
   * Data Science Use Cases:
   * - Enqueue nodes for BFS traversal
   * - Add work items for parallel processing
   * - Queue events for temporal analysis
   * - Buffer streaming graph updates
   */
  public add(value: number): void {
    const newTail = (this.tail + 1) % this.capacity;
    if (newTail === this.head) {
      throw new Error('Queue is full');
    }
    this.array.set(this.tail, value);
    this.tail = newTail;
  }

  /**
   * Removes and returns the element from the front of the queue.
   *
   * @returns The oldest enqueued value (FIFO order)
   * @throws Error if queue is empty
   *
   * Performance: O(1) with no data movement - just pointer manipulation
   */
  public remove(): number {
    if (this.isEmpty()) {
      throw new Error('Queue is empty');
    }
    const removed = this.array.get(this.head);
    this.head = (this.head + 1) % this.capacity;
    return removed;
  }

  /**
   * Returns the front element without removing it.
   * Useful for examining the next item to process without commitment.
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error('Queue is empty');
    }
    return this.array.get(this.head);
  }

  /**
   * Returns current number of elements in queue.
   * Handles circular buffer wraparound correctly.
   */
  public size(): number {
    let diff = this.tail - this.head;
    if (diff < 0) {
      diff += this.capacity;
    }
    return diff;
  }

  /**
   * Checks if queue is empty.
   * Essential for loop termination in graph algorithms.
   */
  public isEmpty(): boolean {
    return this.head === this.tail;
  }

  /**
   * Checks if queue is at capacity.
   * Useful for flow control in producer-consumer scenarios.
   */
  public isFull(): boolean {
    return (this.tail + 1) % this.capacity === this.head;
  }

  /**
   * Returns remaining capacity.
   * Helpful for memory management and backpressure control.
   */
  public remainingCapacity(): number {
    return this.capacity - 1 - this.size(); // -1 for circular buffer overhead
  }

  /**
   * Clears the queue without deallocating underlying storage.
   * Fast O(1) operation - just resets head/tail pointers.
   *
   * Perfect for reusing the same queue across multiple algorithm runs.
   */
  public clear(): void {
    this.head = 0;
    this.tail = 0;
  }

  /**
   * Creates an iterator for queue contents (front to back).
   * Does not modify the queue - safe for inspection during debugging.
   *
   * Note: Iteration order is front-to-back (FIFO order)
   */
  public *[Symbol.iterator](): Iterator<number> {
    let current = this.head;
    const queueSize = this.size();

    for (let i = 0; i < queueSize; i++) {
      yield this.array.get(current);
      current = (current + 1) % this.capacity;
    }
  }

  /**
   * Returns array representation of queue contents (front to back).
   * Useful for debugging and testing.
   * Creates new array - does not expose internal storage.
   */
  public toArray(): number[] {
    const queueSize = this.size();
    const result = new Array<number>(queueSize);
    let current = this.head;

    for (let i = 0; i < queueSize; i++) {
      result[i] = this.array.get(current);
      current = (current + 1) % this.capacity;
    }
    return result;
  }

  /**
   * Batch operations for high-performance scenarios.
   */
  public addAll(values: number[]): void {
    if (values.length > this.remainingCapacity()) {
      throw new Error(`Batch add would exceed capacity: ${values.length} > ${this.remainingCapacity()}`);
    }

    for (const value of values) {
      this.add(value);
    }
  }

  /**
   * Removes multiple values efficiently.
   * Returns array in removal order (FIFO order).
   */
  public removeAll(count: number): number[] {
    if (count > this.size()) {
      throw new Error(`Cannot remove ${count} elements: only ${this.size()} available`);
    }

    const result = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.remove();
    }
    return result;
  }

  /**
   * Drains all elements from the queue.
   * Returns array of all elements in FIFO order, queue becomes empty.
   */
  public drain(): number[] {
    const result = this.toArray();
    this.clear();
    return result;
  }
}
