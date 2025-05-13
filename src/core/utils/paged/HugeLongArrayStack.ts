import { HugeLongArray } from '../../../collections/ha/HugeLongArray';
import { MemoryEstimation, MemoryEstimations } from '../../mem/MemoryEstimation';
import { Estimate } from '../../mem/Estimate';

/**
 * A stack implementation using HugeLongArray as storage.
 * Allows pushing and popping number values with a fixed capacity.
 */
export class HugeLongArrayStack {
  private readonly array: HugeLongArray;
  private readonly capacity: number;
  private _size: number = 0;

  /**
   * Creates a new stack with the given capacity.
   *
   * @param capacity Maximum number of elements the stack can hold
   * @returns A new HugeLongArrayStack
   */
  public static newStack(capacity: number): HugeLongArrayStack {
    return new HugeLongArrayStack(HugeLongArray.newArray(capacity));
  }

  /**
   * Returns a memory estimation for this data structure.
   *
   * @returns Memory estimation
   */
  public static memoryEstimation(): MemoryEstimation {
    return MemoryEstimations.builder(HugeLongArrayStack)
      .perNode("array", HugeLongArray.memoryEstimation)
      .build();
  }

  /**
   * Private constructor to enforce factory method usage.
   *
   * @param array The backing array for the stack
   */
  private constructor(array: HugeLongArray) {
    this.capacity = array.size();
    this.array = array;
  }

  /**
   * Pushes a value onto the stack.
   *
   * @param v The value to push
   * @throws Error if the stack is full
   */
  public push(v: number): void {
    if (this._size === this.capacity) {
      throw new Error("Stack is full.");
    }
    this.array.set(this._size++, v);
  }

  /**
   * Removes and returns the top value from the stack.
   *
   * @returns The top value
   * @throws Error if the stack is empty
   */
  public pop(): number {
    if (this.isEmpty()) {
      throw new Error("Stack is empty.");
    }
    return this.array.get(--this._size);
  }

  /**
   * Returns the top value without removing it.
   *
   * @returns The top value
   * @throws Error if the stack is empty
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error("Stack is empty.");
    }
    return this.array.get(this._size - 1);
  }

  /**
   * Returns the number of elements in the stack.
   *
   * @returns The size
   */
  public size(): number {
    return this._size;
  }

  /**
   * Returns whether the stack is empty.
   *
   * @returns true if the stack is empty
   */
  public isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Clears all elements from the stack.
   */
  public clear(): void {
    this._size = 0;
  }
}
