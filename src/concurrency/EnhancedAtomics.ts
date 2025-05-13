/**
 * Enhanced atomic operations beyond what's provided by the standard JavaScript Atomics API.
 */
export class EnhancedAtomics {
  /**
   * Performs a spin-lock wait until a specific value appears at a specific index.
   * 
   * @param typedArray The array to operate on
   * @param index The index to wait on
   * @param expectedValue The value to wait for
   * @param maxAttempts Maximum number of attempts before giving up (-1 for infinite)
   * @returns True if the expected value was found, false if timed out
   */
  public static spinWait<T extends Int32Array | Uint32Array>(
    typedArray: T,
    index: number,
    expectedValue: number,
    maxAttempts: number = -1
  ): boolean {
    let attempts = 0;
    while (Atomics.load(typedArray, index) !== expectedValue) {
      // Check if we've exceeded maximum attempts
      if (maxAttempts >= 0 && ++attempts > maxAttempts) {
        return false;
      }
      
      // Brief pause to reduce CPU usage
      // Note: In a browser environment we might use setTimeout(0) instead
      Atomics.wait(typedArray, index, Atomics.load(typedArray, index), 1);
    }
    return true;
  }
  
  /**
   * Performs an atomic update operation using a function
   * 
   * @param typedArray The array to operate on
   * @param index The index to update
   * @param updateFn Function that calculates new value from current value
   * @returns The previous value
   */
  public static update<T extends Int32Array | Uint32Array>(
    typedArray: T, 
    index: number,
    updateFn: (currentValue: number) => number
  ): number {
    let oldValue: number;
    let newValue: number;
    
    do {
      oldValue = Atomics.load(typedArray, index);
      newValue = updateFn(oldValue);
    } while (Atomics.compareExchange(typedArray, index, oldValue, newValue) !== oldValue);
    
    return oldValue;
  }
}

/**
 * A thread-safe counter implementation.
 */
export class AtomicCounter {
  private readonly buffer: SharedArrayBuffer;
  private readonly view: Int32Array;
  
  /**
   * Creates a new counter with the given initial value.
   * 
   * @param initialValue Initial value for the counter (default: 0)
   */
  constructor(initialValue: number = 0) {
    this.buffer = new SharedArrayBuffer(4); // 4 bytes for Int32
    this.view = new Int32Array(this.buffer);
    
    if (initialValue !== 0) {
      Atomics.store(this.view, 0, initialValue);
    }
  }
  
  /**
   * Gets the current value.
   */
  public get(): number {
    return Atomics.load(this.view, 0);
  }
  
  /**
   * Sets to a new value and returns the previous value.
   */
  public getAndSet(newValue: number): number {
    return Atomics.exchange(this.view, 0, newValue);
  }
  
  /**
   * Increments the value and returns the updated value.
   */
  public incrementAndGet(): number {
    return Atomics.add(this.view, 0, 1) + 1;
  }
  
  /**
   * Decrements the value and returns the updated value.
   */
  public decrementAndGet(): number {
    return Atomics.sub(this.view, 0, 1) - 1;
  }
  
  /**
   * Adds a value and returns the previous value.
   */
  public getAndAdd(delta: number): number {
    return Atomics.add(this.view, 0, delta);
  }
  
  /**
   * Adds a value and returns the updated value.
   */
  public addAndGet(delta: number): number {
    return Atomics.add(this.view, 0, delta) + delta;
  }
}

/**
 * A thread-safe flag that can be set exactly once.
 */
export class LatchFlag {
  private readonly buffer: SharedArrayBuffer;
  private readonly view: Int32Array;
  
  constructor() {
    this.buffer = new SharedArrayBuffer(4);
    this.view = new Int32Array(this.buffer);
  }
  
  /**
   * Sets the flag if it hasn't been set before.
   * 
   * @returns true if this call set the flag, false if it was already set
   */
  public trySet(): boolean {
    return Atomics.compareExchange(this.view, 0, 0, 1) === 0;
  }
  
  /**
   * Checks if the flag is set.
   */
  public isSet(): boolean {
    return Atomics.load(this.view, 0) === 1;
  }
  
  /**
   * Waits until the flag is set.
   * 
   * @param timeout Maximum time to wait in milliseconds (-1 for infinite)
   * @returns true if the flag was set, false if timed out
   */
  public waitUntilSet(timeout: number = -1): boolean {
    if (this.isSet()) {
      return true;
    }
    
    const result = Atomics.wait(this.view, 0, 0, timeout);
    return this.isSet();
  }
}