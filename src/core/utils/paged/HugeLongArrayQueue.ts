import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { MemoryEstimation, MemoryEstimations } from '../../mem/MemoryEstimation';
import { Estimate } from '../../mem/Estimate';

/**
 * A queue implementation using HugeLongArray as storage.
 * Implements a circular buffer to efficiently use memory.
 */
export class HugeLongArrayQueue {
  private readonly array: HugeLongArray;
  private readonly capacity: number;
  private head: number = 0;
  private tail: number = 0;

  /**
   * Creates a new queue with the given capacity.
   *
   * @param capacity Maximum number of elements the queue can hold
   * @returns A new HugeLongArrayQueue
   */
  public static newQueue(capacity: number): HugeLongArrayQueue {
    // +1 because one slot is always empty to distinguish between empty and full
    return new HugeLongArrayQueue(HugeLongArray.newArray(capacity + 1));
  }

  /**
   * Returns a memory estimation for this data structure.
   *
   * @returns Memory estimation
   */
  public static memoryEstimation(): MemoryEstimation {
    return MemoryEstimations.builder(HugeLongArrayQueue)
      .perNode("array", HugeLongArray.memoryEstimation)
      .build();
  }

  /**
   * Returns a fixed memory estimation for a queue of the given size.
   *
   * @param fixedSize The size to estimate for
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(fixedSize: number): number {
    return HugeLongArray.memoryEstimation(fixedSize) + Estimate.sizeOfInstance(HugeLongArrayQueue);
  }

  /**
   * Private constructor to enforce factory method usage.
   *
   * @param array The backing array for the queue
   */
  private constructor(array: HugeLongArray) {
    this.head = 0;
    this.tail = 0;
    this.capacity = array.size();
    this.array = array;
  }

  /**
   * Adds a value to the end of the queue.
   *
   * @param v The value to add
   * @throws Error if the queue is full
   */
  public add(v: number): void {
    const newTail = (this.tail + 1) % this.capacity;
    if (newTail === this.head) {
      throw new Error("Queue is full.");
    }
    this.array.set(this.tail, v);
    this.tail = newTail;
  }

  /**
   * Removes and returns the value at the head of the queue.
   *
   * @returns The value at the head of the queue
   * @throws Error if the queue is empty
   */
  public remove(): number {
    if (this.isEmpty()) {
      throw new Error("Queue is empty.");
    }
    const removed = this.array.get(this.head);
    this.head = (this.head + 1) % this.capacity;
    return removed;
  }

  /**
   * Returns the value at the head of the queue without removing it.
   *
   * @returns The value at the head of the queue
   * @throws Error if the queue is empty
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error("Queue is empty.");
    }
    return this.array.get(this.head);
  }

  /**
   * Returns the number of elements in the queue.
   *
   * @returns The size
   */
  public size(): number {
    let diff = this.tail - this.head;
    if (diff < 0) {
      diff += this.capacity;
    }
    return diff;
  }

  /**
   * Returns whether the queue is empty.
   *
   * @returns true if the queue is empty
   */
  public isEmpty(): boolean {
    return this.head === this.tail;
  }
}
