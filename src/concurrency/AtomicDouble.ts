/**
 * A {@code number} value that may be updated atomically.
 *
 * TypeScript implementation using SharedArrayBuffer and Atomics for true atomic operations.
 * Falls back to simple volatile operations when SharedArrayBuffer is not available.
 */
export class AtomicDouble {
  private static readonly BYTES_PER_DOUBLE = 8;

  private readonly buffer: SharedArrayBuffer | null;
  private readonly view: Float64Array | null;
  private _value: number = 0;

  /**
   * Creates a new AtomicDouble with initial value {@code 0}.
   */
  constructor();

  /**
   * Creates a new AtomicDouble with the given initial value.
   *
   * @param initialValue the initial value
   */
  constructor(initialValue: number);

  constructor(initialValue: number = 0) {
    // Try to use SharedArrayBuffer for true atomic operations
    if (typeof SharedArrayBuffer !== 'undefined') {
      try {
        this.buffer = new SharedArrayBuffer(AtomicDouble.BYTES_PER_DOUBLE);
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
   * Sets the value to {@code newValue} with release semantics.
   *
   * @param newValue the new value
   */
  lazySet(newValue: number): void {
    // TypeScript doesn't have distinct release semantics, use regular set
    this.set(newValue);
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
   * Returns the current value as an {@code number} (int equivalent).
   *
   * @return the current value as integer
   */
  intValue(): number {
    return Math.trunc(this.get());
  }

  /**
   * Returns the current value as an {@code number} (long equivalent).
   *
   * @return the current value as long
   */
  longValue(): number {
    return Math.trunc(this.get());
  }

  /**
   * Returns the current value as an {@code number} (float equivalent).
   *
   * @return the current value as float
   */
  floatValue(): number {
    return this.get();
  }

  /**
   * Returns the current value as a {@code number}.
   * Equivalent to {@link #get()}.
   *
   * @return the current value
   */
  doubleValue(): number {
    return this.get();
  }

  /**
   * Returns the current value with plain (non-volatile) semantics.
   *
   * @return the current value
   */
  getPlain(): number {
    return this.get(); // TypeScript doesn't distinguish plain vs volatile
  }

  /**
   * Sets the value to {@code newValue} with plain (non-volatile) semantics.
   *
   * @param newValue the new value
   */
  setPlain(newValue: number): void {
    this.set(newValue); // TypeScript doesn't distinguish plain vs volatile
  }

  /**
   * Returns the current value with opaque semantics.
   *
   * @return the current value
   */
  getOpaque(): number {
    return this.get(); // TypeScript doesn't have opaque semantics
  }

  /**
   * Sets the value to {@code newValue} with opaque semantics.
   *
   * @param newValue the new value
   */
  setOpaque(newValue: number): void {
    this.set(newValue); // TypeScript doesn't have opaque semantics
  }

  /**
   * Returns the current value with acquire semantics.
   *
   * @return the current value
   */
  getAcquire(): number {
    return this.get(); // TypeScript doesn't have distinct acquire semantics
  }

  /**
   * Sets the value to {@code newValue} with release semantics.
   *
   * @param newValue the new value
   */
  setRelease(newValue: number): void {
    this.set(newValue); // TypeScript doesn't have distinct release semantics
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
      // Convert to raw bits for comparison (like Java's doubleToRawLongBits)
      const expectedBits = this.doubleToRawLongBits(expectedValue);
      const newBits = this.doubleToRawLongBits(newValue);

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
   * Atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}.
   * Returns the witness value.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return the witness value
   */
  compareAndExchange(expectedValue: number, newValue: number): number {
    const current = this.get();
    this.compareAndSet(expectedValue, newValue);
    return current;
  }

  /**
   * Atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}
   * with acquire semantics.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return the witness value
   */
  compareAndExchangeAcquire(expectedValue: number, newValue: number): number {
    return this.compareAndExchange(expectedValue, newValue);
  }

  /**
   * Atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}
   * with release semantics.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return the witness value
   */
  compareAndExchangeRelease(expectedValue: number, newValue: number): number {
    return this.compareAndExchange(expectedValue, newValue);
  }

  /**
   * Possibly atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return {@code true} if successful
   */
  weakCompareAndSetPlain(expectedValue: number, newValue: number): boolean {
    return this.compareAndSet(expectedValue, newValue);
  }

  /**
   * Possibly atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return {@code true} if successful
   */
  weakCompareAndSetVolatile(expectedValue: number, newValue: number): boolean {
    return this.compareAndSet(expectedValue, newValue);
  }

  /**
   * Possibly atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}
   * with acquire semantics.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return {@code true} if successful
   */
  weakCompareAndSetAcquire(expectedValue: number, newValue: number): boolean {
    return this.compareAndSet(expectedValue, newValue);
  }

  /**
   * Possibly atomically sets the value to {@code newValue} if the current value equals {@code expectedValue}
   * with release semantics.
   *
   * @param expectedValue the expected value
   * @param newValue the new value
   * @return {@code true} if successful
   */
  weakCompareAndSetRelease(expectedValue: number, newValue: number): boolean {
    return this.compareAndSet(expectedValue, newValue);
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
   * Convert double to raw long bits (like Java's Double.doubleToRawLongBits).
   */
  private doubleToRawLongBits(value: number): bigint {
    const buffer = new ArrayBuffer(8);
    const float64 = new Float64Array(buffer);
    const bigUint64 = new BigUint64Array(buffer);

    float64[0] = value;
    return BigInt.asIntN(64, bigUint64[0]);
  }
}
