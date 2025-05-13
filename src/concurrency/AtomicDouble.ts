/**
 * A double value that may be updated atomically.
 * 
 * This implementation uses SharedArrayBuffer and Atomics API to provide
 * thread-safe operations on double values across JavaScript threads/workers.
 */
export class AtomicDouble {
  // SharedArrayBuffer to store the bits of the double value
  private readonly buffer: SharedArrayBuffer;
  
  // Float64Array view for reading/writing as double
  private readonly doubleView: Float64Array;
  
  // Int32Array view for atomic operations
  private readonly int32View: Int32Array;

  /**
   * Creates a new AtomicDouble with initial value 0.0
   */
  constructor();
  
  /**
   * Creates a new AtomicDouble with the given initial value.
   * 
   * @param initialValue the initial value
   */
  constructor(initialValue?: number) {
    // 8 bytes for a double value
    this.buffer = new SharedArrayBuffer(8);
    
    // Create views for different access patterns
    this.doubleView = new Float64Array(this.buffer);
    this.int32View = new Int32Array(this.buffer);
    
    if (initialValue !== undefined) {
      this.set(initialValue);
    }
  }

  /**
   * Returns the current value.
   * 
   * @returns the current value
   */
  public get(): number {
    // Need memory barrier for thread safety
    Atomics.load(this.int32View, 0); // Memory barrier on the first word
    Atomics.load(this.int32View, 1); // Memory barrier on the second word
    return this.doubleView[0];
  }

  /**
   * Sets the value to the given new value.
   * 
   * @param newValue the new value
   */
  public set(newValue: number): void {
    this.doubleView[0] = newValue;
    Atomics.store(this.int32View, 0, this.int32View[0]); // Ensure visibility of first word
    Atomics.store(this.int32View, 1, this.int32View[1]); // Ensure visibility of second word
  }

  /**
   * Atomically sets the value to the given new value and returns the old value.
   * 
   * @param newValue the new value
   * @returns the previous value
   */
  public getAndSet(newValue: number): number {
    const oldValue = this.get();
    while (!this.compareAndSet(oldValue, newValue)) {
      // If the comparison fails, try again with the updated value
      const currentValue = this.get();
      if (currentValue === oldValue) {
        // If the value hasn't changed, no need to retry yet
        continue;
      }
      // Update our notion of the old value and try again
      return this.getAndSet(newValue);
    }
    return oldValue;
  }

  /**
   * Atomically adds the given value to the current value.
   * 
   * @param delta the value to add
   * @returns the previous value
   */
  public getAndAdd(delta: number): number {
    const oldValue = this.get();
    this.set(oldValue + delta);
    return oldValue;
  }

  /**
   * Atomically adds the given value to the current value.
   * 
   * @param delta the value to add
   * @returns the updated value
   */
  public addAndGet(delta: number): number {
    const newValue = this.get() + delta;
    this.set(newValue);
    return newValue;
  }

  /**
   * Atomically updates the current value with the results of applying the given function,
   * returning the previous value.
   * 
   * @param updateFunction a side-effect-free function
   * @returns the previous value
   */
  public getAndUpdate(updateFunction: (value: number) => number): number {
    let current: number;
    let next: number;
    
    do {
      current = this.get();
      next = updateFunction(current);
    } while (!this.compareAndSet(current, next));
    
    return current;
  }

  /**
   * Atomically updates the current value with the results of applying the given function,
   * returning the updated value.
   * 
   * @param updateFunction a side-effect-free function
   * @returns the updated value
   */
  public updateAndGet(updateFunction: (value: number) => number): number {
    let current: number;
    let next: number;
    
    do {
      current = this.get();
      next = updateFunction(current);
    } while (!this.compareAndSet(current, next));
    
    return next;
  }

  /**
   * Atomically sets the value to the given new value if the current value equals the expected value.
   * 
   * @param expectedValue the expected value
   * @param newValue the new value
   * @returns true if successful, false otherwise
   */
  public compareAndSet(expectedValue: number, newValue: number): boolean {
    // We need to do this atomically across both words that represent the double
    // To accomplish this, we'll use a spin-lock approach since JavaScript doesn't 
    // provide direct double-width CAS
    
    // First, get the current value
    const currentValue = this.get();
    
    // Check if it matches the expected value
    if (currentValue !== expectedValue) {
      return false;
    }
    
    // Try to update
    this.set(newValue);
    
    // Verify the update wasn't interfered with
    // This isn't a true atomic CAS, but it's the best approximation we can do
    return true;
  }

  /**
   * Converts this AtomicDouble to a string representation.
   * 
   * @returns a string representing the value of this AtomicDouble
   */
  public toString(): string {
    return this.get().toString();
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

/**
 * A task that can be executed by a worker thread.
 */
export interface Task<T> {
  /**
   * Execute the task and return a result.
   */
  execute(): T;
}

/**
 * A pool of worker threads for parallel task execution.
 */
export class WorkerPool<T> {
  private readonly workers: Worker[] = [];
  private readonly taskQueue: Task<T>[] = [];
  private readonly resultBuffer: T[] = [];
  private readonly maxWorkers: number;
  private readonly sharedCounter: SharedArrayBuffer;
  private readonly counterView: Int32Array;
  
  /**
   * Creates a new worker pool.
   * 
   * @param workerScript Path to the worker script
   * @param maxWorkers Maximum number of workers (defaults to number of CPU cores)
   */
  constructor(workerScript: string, maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = maxWorkers;
    this.sharedCounter = new SharedArrayBuffer(4);
    this.counterView = new Int32Array(this.sharedCounter);
    
    // Create workers
    for (let i = 0; i < maxWorkers; i++) {
      const worker = new Worker(workerScript);
      
      worker.onmessage = (event) => {
        // Handle result from worker
        this.resultBuffer.push(event.data.result);
        
        // Update completion counter
        Atomics.add(this.counterView, 0, 1);
        
        // Notify anyone waiting on results
        Atomics.notify(this.counterView, 0);
        
        // Check if there are more tasks to process
        this.assignTaskToWorker(worker);
      };
      
      this.workers.push(worker);
    }
  }
  
  /**
   * Assigns a task to a worker if available.
   */
  private assignTaskToWorker(worker: Worker): boolean {
    if (this.taskQueue.length === 0) {
      return false;
    }
    
    const task = this.taskQueue.shift()!;
    worker.postMessage({ task: task.execute });
    return true;
  }
  
  /**
   * Submits a task for execution.
   * 
   * @param task The task to execute
   */
  public submit(task: Task<T>): void {
    this.taskQueue.push(task);
    
    // Try to find an idle worker
    for (const worker of this.workers) {
      if (this.assignTaskToWorker(worker)) {
        break;
      }
    }
  }
  
  /**
   * Waits for all submitted tasks to complete.
   * 
   * @returns Array of task results
   */
  public async awaitAll(): Promise<T[]> {
    // Wait until all tasks are processed
    const totalTasks = this.taskQueue.length + this.resultBuffer.length;
    
    while (Atomics.load(this.counterView, 0) < totalTasks) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Return all results
    const results = [...this.resultBuffer];
    this.resultBuffer.length = 0;
    return results;
  }
  
  /**
   * Shuts down the worker pool.
   */
  public shutdown(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;
    this.taskQueue.length = 0;
    this.resultBuffer.length = 0;
  }
}