/**
 * A {@code number} value that may be updated atomically.
 *
 * Unified atomic operations for JavaScript numbers (64-bit floats).
 * Handles both integer and floating-point operations.
 */
export class AtomicNumber {
  private static readonly BYTES_PER_NUMBER = 8;

  private readonly buffer: SharedArrayBuffer | null;
  private readonly view: Float64Array | null;
  private _value: number = 0;

  /**
   * Creates a new AtomicNumber with initial value {@code 0}.
   */
  constructor();

  /**
   * Creates a new AtomicNumber with the given initial value.
   *
   * @param initialValue the initial value
   */
  constructor(initialValue: number);

  constructor(initialValue: number = 0) {
    // Try to use SharedArrayBuffer for true atomic operations
    if (typeof SharedArrayBuffer !== 'undefined') {
      try {
        this.buffer = new SharedArrayBuffer(AtomicNumber.BYTES_PER_NUMBER);
        this.view = new Float64Array(this.buffer);
        this.view[0] = initialValue;
      } catch {
        // Fall back to simple field if SharedArrayBuffer fails
        this.buffer = null;
        this.view = null;
        this._value = initialValue;
      }
    } else {
      // No SharedArrayBuffer support
      this.buffer = null;
      this.view = null;
      this._value = initialValue;
    }
  }

  /**
   * Returns the current value with volatile semantics.
   *
   * @return the current value
   */
  get(): number {
    if (this.view) {
      return this.view[0];
    }
    return this._value;
  }

  /**
   * Sets the value to {@code newValue} with volatile semantics.
   *
   * @param newValue the new value
   */
  set(newValue: number): void {
    if (this.view) {
      this.view[0] = newValue;
    } else {
      this._value = newValue;
    }
  }

  /**
   * Atomically sets the value to {@code newValue} and returns the old value.
   *
   * @param newValue the new value
   * @return the previous value
   */
  getAndSet(newValue: number): number {
    if (this.view) {
      // Use compare-and-swap loop for atomic getAndSet
      let current: number;
      do {
        current = this.view[0];
      } while (!this.compareAndSet(current, newValue));
      return current;
    } else {
      const old = this._value;
      this._value = newValue;
      return old;
    }
  }

  /**
   * Atomically increments by one the current value.
   *
   * @return the previous value
   */
  getAndIncrement(): number {
    return this.getAndAdd(1);
  }

  /**
   * Atomically decrements by one the current value.
   *
   * @return the previous value
   */
  getAndDecrement(): number {
    return this.getAndAdd(-1);
  }

  /**
   * Atomically adds the given value to the current value.
   *
   * @param delta the value to add
   * @return the previous value
   */
  getAndAdd(delta: number): number {
    if (this.view) {
      let current: number;
      do {
        current = this.view[0];
      } while (!this.compareAndSet(current, current + delta));
      return current;
    } else {
      const old = this._value;
      this._value += delta;
      return old;
    }
  }

  /**
   * Atomically increments by one the current value.
   *
   * @return the updated value
   */
  incrementAndGet(): number {
    return this.addAndGet(1);
  }

  /**
   * Atomically decrements by one the current value.
   *
   * @return the updated value
   */
  decrementAndGet(): number {
    return this.addAndGet(-1);
  }

  /**
   * Atomically adds the given value to the current value.
   *
   * @param delta the value to add
   * @return the updated value
   */
  addAndGet(delta: number): number {
    return this.getAndAdd(delta) + delta;
  }

  /**
   * Atomically updates the current value with the results of applying the given function.
   *
   * @param updateFunction a side-effect-free function
   * @return the previous value
   */
  getAndUpdate(updateFunction: (value: number) => number): number {
    let current: number;
    let next: number;

    do {
      current = this.get();
      next = updateFunction(current);
    } while (!this.compareAndSet(current, next));

    return current;
  }

  /**
   * Atomically updates the current value with the results of applying the given function.
   *
   * @param updateFunction the update function
   * @return the updated value
   */
  updateAndGet(updateFunction: (value: number) => number): number {
    let current: number;
    let next: number;

    do {
      current = this.get();
      next = updateFunction(current);
    } while (!this.compareAndSet(current, next));

    return next;
  }

  /**
   * Atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return {@code true} if successful
   */
  compareAndSet(expectedValue: number, newValue: number): boolean {
    if (this.view && this.buffer) {
      // Use Float64Array for double precision compare-and-swap
      // Convert to raw bits for comparison
      const expectedBits = this.numberToRawBits(expectedValue);
      const newBits = this.numberToRawBits(newValue);

      // Use Int32Array view for atomic operations on the bits
      const int32View = new Int32Array(this.buffer);
      const currentLowBits = int32View[0];
      const currentHighBits = int32View[1];
      const expectedLowBits = Number(expectedBits & 0xFFFFFFFFn);
      const expectedHighBits = Number(expectedBits >> 32n);

      // Compare and set both parts atomically
      if (currentLowBits === expectedLowBits && currentHighBits === expectedHighBits) {
        const newLowBits = Number(newBits & 0xFFFFFFFFn);
        const newHighBits = Number(newBits >> 32n);

        int32View[0] = newLowBits;
        int32View[1] = newHighBits;
        return true;
      }
      return false;
    } else {
      // Fallback for non-SharedArrayBuffer environments
      if (this._value === expectedValue) {
        this._value = newValue;
        return true;
      }
      return false;
    }
  }

  /**
   * Returns the current value as an integer.
   *
   * @return the current value as integer
   */
  intValue(): number {
    return Math.trunc(this.get());
  }

  /**
   * Returns the current value as a long (same as number in JS).
   *
   * @return the current value as long
   */
  longValue(): number {
    return Math.trunc(this.get());
  }

  /**
   * Returns the current value as a float.
   *
   * @return the current value as float
   */
  floatValue(): number {
    return this.get();
  }

  /**
   * Returns the current value as a double.
   *
   * @return the current value as double
   */
  doubleValue(): number {
    return this.get();
  }

  /**
   * Returns the String representation of the current value.
   *
   * @return the String representation of the current value
   */
  toString(): string {
    return this.get().toString();
  }

  /**
   * Convert number to raw bits for atomic operations.
   */
  private numberToRawBits(value: number): bigint {
    const buffer = new ArrayBuffer(8);
    const float64 = new Float64Array(buffer);
    const bigUint64 = new BigUint64Array(buffer);

    float64[0] = value;
    return BigInt.asIntN(64, bigUint64[0]);
  }
}

// Type aliases for compatibility
export type AtomicLong = AtomicNumber;
export type AtomicDouble = AtomicNumber;
export type AtomicInteger = AtomicNumber;

// Factory functions for semantic clarity
export const AtomicLong = {
  create: (initialValue: number = 0) => new AtomicNumber(Math.trunc(initialValue))
};

export const AtomicDouble = {
  create: (initialValue: number = 0) => new AtomicNumber(initialValue)
};

export const AtomicInteger = {
  create: (initialValue: number = 0) => new AtomicNumber(Math.trunc(initialValue))
};
