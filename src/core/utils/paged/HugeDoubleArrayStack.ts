import { HugeDoubleArray } from '../../../collections/ha/HugeDoubleArray';

/**
 * A stack implementation using HugeDoubleArray as storage.
 * Allows pushing and popping double values with a fixed capacity.
 */
export class HugeDoubleArrayStack {
  private readonly array: HugeDoubleArray;
  private readonly capacity: number;
  private _size: number = 0;

  /**
   * Creates a new stack with the given capacity.
   * 
   * @param capacity Maximum number of elements the stack can hold
   * @returns A new HugeDoubleArrayStack
   */
  public static newStack(capacity: number): HugeDoubleArrayStack {
    return new HugeDoubleArrayStack(HugeDoubleArray.newArray(capacity));
  }

  /**
   * Private constructor to enforce factory method usage.
   * 
   * @param array The backing array for the stack
   */
  private constructor(array: HugeDoubleArray) {
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
}