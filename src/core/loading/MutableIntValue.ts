/**
 * Mutable integer value container for efficient pass-by-reference semantics.
 *
 * This abstract class provides a simple wrapper around an integer value that can be
 * modified in-place. Useful for scenarios where you need to pass an integer by
 * reference to functions or when implementing counters and accumulators that need
 * to be shared across different contexts.
 *
 * Common use cases:
 * - Counters in parallel processing
 * - Accumulator variables in loops
 * - Pass-by-reference integer parameters
 * - State tracking in builders and processors
 */
export abstract class MutableIntValue {
  /**
   * The mutable integer value.
   * Public for direct access and modification.
   */
  public value: number;

  /**
   * Create a new MutableIntValue with an initial value.
   *
   * @param initialValue The initial integer value (defaults to 0)
   */
  protected constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  /**
   * Set the value.
   *
   * @param newValue The new integer value
   */
  set(newValue: number): void {
    this.value = newValue;
  }

  /**
   * Get the current value.
   *
   * @returns The current integer value
   */
  get(): number {
    return this.value;
  }

  /**
   * Increment the value by a delta.
   *
   * @param delta The amount to add (defaults to 1)
   * @returns The new value after increment
   */
  add(delta: number = 1): number {
    this.value += delta;
    return this.value;
  }

  /**
   * Increment the value by 1.
   *
   * @returns The new value after increment
   */
  increment(): number {
    return ++this.value;
  }

  /**
   * Decrement the value by 1.
   *
   * @returns The new value after decrement
   */
  decrement(): number {
    return --this.value;
  }

  /**
   * Reset the value to zero.
   */
  reset(): void {
    this.value = 0;
  }

  /**
   * Compare and set the value atomically (for single-threaded use).
   *
   * @param expected The expected current value
   * @param newValue The new value to set if current equals expected
   * @returns true if the value was updated, false otherwise
   */
  compareAndSet(expected: number, newValue: number): boolean {
    if (this.value === expected) {
      this.value = newValue;
      return true;
    }
    return false;
  }

  /**
   * Get and increment the value.
   *
   * @returns The value before increment
   */
  getAndIncrement(): number {
    return this.value++;
  }

  /**
   * Get and add a delta to the value.
   *
   * @param delta The amount to add
   * @returns The value before addition
   */
  getAndAdd(delta: number): number {
    const oldValue = this.value;
    this.value += delta;
    return oldValue;
  }

  /**
   * Convert to string representation.
   *
   * @returns String representation of the value
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * Convert to JSON representation.
   *
   * @returns The numeric value for JSON serialization
   */
  toJSON(): number {
    return this.value;
  }
}

/**
 * Concrete implementation of MutableIntValue for general use.
 */
export class SimpleMutableIntValue extends MutableIntValue {
  constructor(initialValue: number = 0) {
    super(initialValue);
  }

  /**
   * Create a new SimpleMutableIntValue with the specified initial value.
   *
   * @param initialValue The initial value
   * @returns A new SimpleMutableIntValue instance
   */
  static of(initialValue: number = 0): SimpleMutableIntValue {
    return new SimpleMutableIntValue(initialValue);
  }

  /**
   * Create a new SimpleMutableIntValue starting at zero.
   *
   * @returns A new SimpleMutableIntValue instance with value 0
   */
  static zero(): SimpleMutableIntValue {
    return new SimpleMutableIntValue(0);
  }

  /**
   * Create a new SimpleMutableIntValue starting at one.
   *
   * @returns A new SimpleMutableIntValue instance with value 1
   */
  static one(): SimpleMutableIntValue {
    return new SimpleMutableIntValue(1);
  }
}

/**
 * Thread-safe mutable integer value using atomic operations (conceptual).
 * Note: JavaScript is single-threaded, but this provides the interface
 * for consistency with the Java pattern.
 */
export class AtomicMutableIntValue extends MutableIntValue {
  constructor(initialValue: number = 0) {
    super(initialValue);
  }

  /**
   * Atomically increment and get the new value.
   *
   * @returns The value after increment
   */
  override increment(): number {
    // In a real multi-threaded environment, this would use atomic operations
    return ++this.value;
  }

  /**
   * Atomically compare and set the value.
   *
   * @param expected The expected current value
   * @param newValue The new value to set
   * @returns true if successful, false otherwise
   */
  override compareAndSet(expected: number, newValue: number): boolean {
    // In a real multi-threaded environment, this would be atomic
    if (this.value === expected) {
      this.value = newValue;
      return true;
    }
    return false;
  }

  /**
   * Atomically add and get the new value.
   *
   * @param delta The amount to add
   * @returns The new value after addition
   */
  addAndGet(delta: number): number {
    this.value += delta;
    return this.value;
  }

  /**
   * Create a new AtomicMutableIntValue.
   *
   * @param initialValue The initial value
   * @returns A new AtomicMutableIntValue instance
   */
  static of(initialValue: number = 0): AtomicMutableIntValue {
    return new AtomicMutableIntValue(initialValue);
  }
}
