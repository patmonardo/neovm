/**
 * A class that provides atomic operations on a 64-bit integer value.
 *
 * Includes padding to help prevent false sharing in multi-threaded environments.
 * Note: In JavaScript, we don't have the same low-level control over memory layout,
 * so this padding may not be as effective as in Java.
 *
 * @see http://mechanical-sympathy.blogspot.ch/2011/08/false-sharing-java-7.html
 */
export class PaddedAtomicLong {
  // Shared buffer for atomic operations using SharedArrayBuffer
  private static sharedBufferAvailable = typeof SharedArrayBuffer !== 'undefined';
  private buffer: SharedArrayBuffer | null = null;
  private view: BigInt64Array | null = null;

  // Padding fields to reduce false sharing
  // Note: In JavaScript, these don't guarantee memory alignment like in Java
  public p1: number = 1n;
  public p2: number = 2n;
  public p3: number = 3n;
  public p4: number = 4n;
  public p5: number = 5n;
  public p6: number = 6n;
  public p7: number = 7n;

  // Fallback value when SharedArrayBuffer is not available
  private fallbackValue: number = 0n;

  /**
   * Creates a new PaddedAtomicLong with an initial value.
   *
   * @param initialValue The initial value (default: 0)
   */
  constructor(initialValue: number = 0n) {
    if (PaddedAtomicLong.sharedBufferAvailable) {
      this.buffer = new SharedArrayBuffer(8); // 8 bytes for a 64-bit integer
      this.view = new BigInt64Array(this.buffer);
      this.view[0] = initialValue;
    } else {
      this.fallbackValue = initialValue;
      console.warn(
        'SharedArrayBuffer is not available. ' +
        'PaddedAtomicLong will fallback to non-atomic operations.'
      );
    }
  }

  /**
   * Gets the current value.
   *
   * @returns The current value
   */
  public get(): number {
    if (this.view) {
      return Atomics.load(this.view, 0);
    }
    return this.fallbackValue;
  }

  /**
   * Sets to the given value.
   *
   * @param newValue The new value
   */
  public set(newValue: number): void {
    if (this.view) {
      Atomics.store(this.view, 0, newValue);
    } else {
      this.fallbackValue = newValue;
    }
  }

  /**
   * Atomically sets to the given value and returns the old value.
   *
   * @param newValue The new value
   * @returns The previous value
   */
  public getAndSet(newValue: number): number {
    if (this.view) {
      return Atomics.exchange(this.view, 0, newValue);
    } else {
      const oldValue = this.fallbackValue;
      this.fallbackValue = newValue;
      return oldValue;
    }
  }

  /**
   * Atomically increments by one and returns the old value.
   *
   * @returns The previous value
   */
  public getAndIncrement(): number {
    return this.getAndAdd(1n);
  }

  /**
   * Atomically decrements by one and returns the old value.
   *
   * @returns The previous value
   */
  public getAndDecrement(): number {
    return this.getAndAdd(-1n);
  }

  /**
   * Atomically adds the given value and returns the old value.
   *
   * @param delta The value to add
   * @returns The previous value
   */
  public getAndAdd(delta: number): number {
    if (this.view) {
      return Atomics.add(this.view, 0, delta);
    } else {
      const oldValue = this.fallbackValue;
      this.fallbackValue += delta;
      return oldValue;
    }
  }

  /**
   * Atomically increments by one and returns the new value.
   *
   * @returns The updated value
   */
  public incrementAndGet(): number {
    return this.addAndGet(1n);
  }

  /**
   * Atomically decrements by one and returns the new value.
   *
   * @returns The updated value
   */
  public decrementAndGet(): number {
    return this.addAndGet(-1n);
  }

  /**
   * Atomically adds the given value and returns the new value.
   *
   * @param delta The value to add
   * @returns The updated value
   */
  public addAndGet(delta: number): number {
    if (this.view) {
      return Atomics.add(this.view, 0, delta) + delta;
    } else {
      this.fallbackValue += delta;
      return this.fallbackValue;
    }
  }

  /**
   * Atomically updates the value if the current value equals the expected value.
   *
   * @param expectedValue The expected current value
   * @param newValue The new value
   * @returns true if successful
   */
  public compareAndSet(expectedValue: number, newValue: number): boolean {
    if (this.view) {
      return Atomics.compareExchange(this.view, 0, expectedValue, newValue) === expectedValue;
    } else {
      if (this.fallbackValue === expectedValue) {
        this.fallbackValue = newValue;
        return true;
      }
      return false;
    }
  }

  /**
   * Helper method to prevent compiler optimization from removing padding.
   *
   * @returns Sum of padding fields
   */
  public sum(): number {
    return this.p1 + this.p2 + this.p3 + this.p4 + this.p5 + this.p6 + this.p7;
  }
}
